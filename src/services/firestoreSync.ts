import type { User as FirebaseUser } from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import type { PublicBootstrapData } from '../pages/PublicHomePage';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  isBootstrappedAdminEmail,
  sanitizeBootstrapForFirestore,
} from '../utils/firebaseHelpers';

const PUBLIC_BOOTSTRAP_PATH = 'public_data/bootstrap';

function isPermissionDeniedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return msg.includes('permission') || msg.includes('insufficient permissions');
}

export async function ensureFirebaseUserDocuments(user: FirebaseUser): Promise<void> {
  if (!user.uid || !user.emailVerified) return;

  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const role: 'ADMIN' | 'STUDENT' = isBootstrappedAdminEmail(user.email, user.emailVerified)
    ? 'ADMIN'
    : 'STUDENT';

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: (user.displayName || user.email?.split('@')[0] || 'User').slice(0, 120),
        ...(user.photoURL ? { photoUrl: user.photoURL.slice(0, 500) } : {}),
        role: 'STUDENT',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        displayName: (user.displayName || user.email?.split('@')[0] || 'User').slice(0, 120),
        ...(user.photoURL ? { photoUrl: user.photoURL.slice(0, 500) } : {}),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  const privatePath = `users/${user.uid}/private/info`;
  const privateRef = doc(db, 'users', user.uid, 'private', 'info');
  try {
    const privateSnap = await getDoc(privateRef);
    if (!privateSnap.exists()) {
      await setDoc(privateRef, {
        uid: user.uid,
        email: (user.email || '').slice(0, 160),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(privateRef, {
        email: (user.email || '').slice(0, 160),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, privatePath);
  }

  if (role === 'ADMIN') {
    const adminPath = `admins/${user.uid}`;
    const adminRef = doc(db, 'admins', user.uid);
    try {
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists()) {
        await setDoc(adminRef, {
          uid: user.uid,
          email: (user.email || '').slice(0, 160),
          name: (user.displayName || 'SHIKKHANIR Admin').slice(0, 120),
          role: 'ADMIN',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, adminPath);
    }
  }
}

export async function fetchPublicBootstrapFromFirestore(): Promise<unknown | null> {
  const ref = doc(db, 'public_data', 'bootstrap');
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return snap.data();
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      handleFirestoreError(error, OperationType.GET, PUBLIC_BOOTSTRAP_PATH);
    }
    return null;
  }
}

export function subscribePublicBootstrap(
  onData: (data: unknown) => void
): Unsubscribe {
  const ref = doc(db, 'public_data', 'bootstrap');
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        onData(snap.data());
      }
    },
    (error) => {
      if (isPermissionDeniedError(error)) {
        handleFirestoreError(error, OperationType.GET, PUBLIC_BOOTSTRAP_PATH);
      }
    }
  );
}

export async function publishPublicBootstrapToFirestore(
  data: Omit<PublicBootstrapData, 'supabaseConfigured'>
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Firebase ক্লাউডে সেভ করতে অনুগ্রহ করে আগে Google অ্যাকাউন্ট দিয়ে যুক্ত হোন।');
  }
  const ref = doc(db, 'public_data', 'bootstrap');
  const sanitized = sanitizeBootstrapForFirestore(data);
  try {
    await setDoc(ref, {
      ...sanitized,
      updatedByUid: currentUser.uid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, PUBLIC_BOOTSTRAP_PATH);
  }
}

export async function submitAdmissionToFirestore(input: {
  id: string;
  applicationId: string;
  studentName: string;
  dateOfBirth: string;
  phone: string;
  email?: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
  previousSchool: string;
  classId: 'class-8' | 'class-9' | 'class-10' | 'ssc-batch';
  batchId: string;
  academicInfo?: string;
}): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return false;
  }
  const admissionPath = `admissions/${input.id}`;
  const ref = doc(db, 'admissions', input.id);
  try {
    await setDoc(ref, {
      applicationId: input.applicationId.slice(0, 40),
      applicantUid: currentUser.uid,
      studentName: input.studentName.trim().slice(0, 120),
      dateOfBirth: input.dateOfBirth.slice(0, 24),
      phone: input.phone.trim().slice(0, 20),
      ...(input.email?.trim() ? { email: input.email.trim().slice(0, 160) } : {}),
      guardianName: input.guardianName.trim().slice(0, 120),
      guardianPhone: input.guardianPhone.trim().slice(0, 20),
      address: input.address.trim().slice(0, 300),
      previousSchool: input.previousSchool.trim().slice(0, 200),
      classId: input.classId,
      batchId: input.batchId.slice(0, 64),
      ...(input.academicInfo?.trim() ? { academicInfo: input.academicInfo.trim().slice(0, 600) } : {}),
      status: 'Submitted',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, admissionPath);
  }
}

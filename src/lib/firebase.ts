import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  OperationType,
  buildFirestoreErrorInfo,
  type FirestoreErrorInfo,
} from '../utils/firebaseHelpers';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export { OperationType };
export type { FirestoreErrorInfo };

let analyticsInitialized = false;
export async function initFirebaseAnalytics() {
  if (analyticsInitialized || typeof window === 'undefined' || !firebaseConfig.measurementId) {
    return null;
  }
  try {
    const supported = await isSupported();
    if (supported) {
      analyticsInitialized = true;
      return getAnalytics(app);
    }
  } catch {
    // Ignore analytics errors in restricted iframes or privacy browsers
  }
  return null;
}

let connectionCheckPromise: Promise<boolean> | null = null;

export function testFirestoreConnection(): Promise<boolean> {
  if (connectionCheckPromise) {
    return connectionCheckPromise;
  }
  connectionCheckPromise = (async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error('Please check your Firebase configuration.');
        return false;
      }
      return true;
    }
  })();
  return connectionCheckPromise;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path, auth.currentUser);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

export function onFirebaseAuthChanged(cb: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export const firebaseProjectId = firebaseConfig.projectId;
export const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId;

import type { PublicBootstrapData } from '../pages/PublicHomePage';
import type { WebsiteSettings } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirebaseAuthSnapshot {
  uid?: string | null;
  email?: string | null;
  emailVerified?: boolean | null;
  isAnonymous?: boolean | null;
  tenantId?: string | null;
  providerData?: {
    providerId?: string | null;
    email?: string | null;
  }[];
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export const BOOTSTRAPPED_ADMIN_EMAIL = 'welxon.imb@gmail.com';

export function isBootstrappedAdminEmail(email?: string | null, emailVerified?: boolean | null): boolean {
  if (!email || !emailVerified) return false;
  return email.trim().toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL;
}

export function isValidFirestoreDocId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-zA-Z0-9_\-]+$/.test(id);
}

export function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  currentUser: FirebaseAuthSnapshot | null | undefined
): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: currentUser?.uid ?? undefined,
      email: currentUser?.email ?? undefined,
      emailVerified: currentUser?.emailVerified ?? undefined,
      isAnonymous: currentUser?.isAnonymous ?? undefined,
      tenantId: currentUser?.tenantId ?? undefined,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId ?? undefined,
          email: provider.email ?? undefined,
        })) || [],
    },
  };
}

export function sanitizeSettingsForFirestore(settings: WebsiteSettings): WebsiteSettings {
  const heroBannerUrl =
    typeof settings.heroBannerUrl === 'string' && settings.heroBannerUrl.length <= 850000
      ? settings.heroBannerUrl
      : '';

  return {
    instituteNameBn: String(settings.instituteNameBn || 'শিক্ষানীর').slice(0, 120),
    instituteNameEn: String(settings.instituteNameEn || 'SHIKKHANIR').slice(0, 120),
    tagline: String(settings.tagline || '').slice(0, 240),
    heroTitle: String(settings.heroTitle || '').slice(0, 240),
    heroSubtitle: String(settings.heroSubtitle || '').slice(0, 600),
    heroBannerUrl,
    address: String(settings.address || '').slice(0, 300),
    phone: String(settings.phone || '').slice(0, 40),
    email: String(settings.email || '').slice(0, 160),
    officeHours: String(settings.officeHours || '').slice(0, 160),
    admissionOpen: Boolean(settings.admissionOpen),
    academicYear: Number.isFinite(settings.academicYear) ? Math.trunc(settings.academicYear) : 2026,
    achievementStats: {
      totalStudents: String(settings.achievementStats?.totalStudents ?? '৫০০+'),
      experiencedTeachers: String(settings.achievementStats?.experiencedTeachers ?? '১৮+'),
      passRate: String(settings.achievementStats?.passRate ?? '৯৮.৫%'),
      gpa5Count: String(settings.achievementStats?.gpa5Count ?? '১২০+'),
    },
  };
}

export function sanitizeBootstrapForFirestore(data: Omit<PublicBootstrapData, 'supabaseConfigured'>) {
  return {
    settings: sanitizeSettingsForFirestore(data.settings),
    classes: (data.classes || []).slice(0, 20),
    batches: (data.batches || []).slice(0, 60),
    subjects: (data.subjects || []).slice(0, 100),
    // Strip personal teacher email/phone from public Firestore catalog snapshot
    teachers: (data.teachers || []).slice(0, 60).map((t) => ({
      ...t,
      phone: '',
      email: '',
    })),
    notices: (data.notices || []).slice(0, 100),
    exams: (data.exams || []).slice(0, 100),
    results: (data.results || []).slice(0, 200),
  };
}

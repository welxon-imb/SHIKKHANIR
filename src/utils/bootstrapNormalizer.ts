import { DEFAULT_PUBLIC_BOOTSTRAP } from '../data/defaultPublicBootstrap';
import type { PublicBootstrapData } from '../pages/PublicHomePage';
import type {
  AcademicClass,
  Batch,
  Exam,
  ExamResult,
  Notice,
  Subject,
  Teacher,
  WebsiteSettings,
} from '../types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asNonEmptyString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function isValidBootstrapPayload(raw: unknown): raw is Partial<PublicBootstrapData> {
  if (!isPlainObject(raw)) return false;
  return (
    isPlainObject(raw.settings) ||
    Array.isArray(raw.classes) ||
    Array.isArray(raw.notices) ||
    Array.isArray(raw.teachers)
  );
}

function normalizeSettings(rawSettings: unknown): WebsiteSettings {
  const def = DEFAULT_PUBLIC_BOOTSTRAP.settings;
  if (!isPlainObject(rawSettings)) {
    return {
      ...def,
      achievementStats: { ...def.achievementStats },
    };
  }
  const rawStats = isPlainObject(rawSettings.achievementStats)
    ? rawSettings.achievementStats
    : {};

  return {
    instituteNameBn: asNonEmptyString(rawSettings.instituteNameBn, def.instituteNameBn),
    instituteNameEn: asNonEmptyString(rawSettings.instituteNameEn, def.instituteNameEn),
    tagline: asNonEmptyString(rawSettings.tagline, def.tagline),
    heroTitle: asNonEmptyString(rawSettings.heroTitle, def.heroTitle),
    heroSubtitle: asNonEmptyString(rawSettings.heroSubtitle, def.heroSubtitle),
    heroBannerUrl: asString(rawSettings.heroBannerUrl, def.heroBannerUrl ?? ''),
    address: asNonEmptyString(rawSettings.address, def.address),
    phone: asNonEmptyString(rawSettings.phone, def.phone),
    email: asNonEmptyString(rawSettings.email, def.email),
    officeHours: asNonEmptyString(rawSettings.officeHours, def.officeHours),
    admissionOpen:
      typeof rawSettings.admissionOpen === 'boolean' ? rawSettings.admissionOpen : def.admissionOpen,
    academicYear: asNumber(rawSettings.academicYear, def.academicYear),
    achievementStats: {
      totalStudents: asNonEmptyString(rawStats.totalStudents, def.achievementStats.totalStudents),
      experiencedTeachers: asNonEmptyString(
        rawStats.experiencedTeachers,
        def.achievementStats.experiencedTeachers
      ),
      passRate: asNonEmptyString(rawStats.passRate, def.achievementStats.passRate),
      gpa5Count: asNonEmptyString(rawStats.gpa5Count, def.achievementStats.gpa5Count),
    },
  };
}

function normalizeClasses(rawClasses: unknown): AcademicClass[] {
  if (!Array.isArray(rawClasses) || rawClasses.length === 0) {
    return DEFAULT_PUBLIC_BOOTSTRAP.classes;
  }
  const valid = rawClasses
    .filter((item): item is Record<string, unknown> => isPlainObject(item) && typeof item.id === 'string')
    .map((item) => ({
      ...(item as unknown as AcademicClass),
      nameBn: asNonEmptyString(item.nameBn, String(item.id)),
      nameEn: asString(item.nameEn, String(item.id)),
      shortCode: asNonEmptyString(item.shortCode, String(item.id)),
      description: asString(item.description, ''),
      monthlyFee: asNumber(item.monthlyFee, 0),
      scheduleSummary: asString(item.scheduleSummary, ''),
      highlights: Array.isArray(item.highlights)
        ? item.highlights.filter((h): h is string => typeof h === 'string')
        : [],
      subjects: Array.isArray(item.subjects)
        ? item.subjects.filter((s): s is string => typeof s === 'string')
        : [],
      targetGroup: asString(item.targetGroup, ''),
    }));

  return valid.length > 0 ? valid : DEFAULT_PUBLIC_BOOTSTRAP.classes;
}

function normalizeTeachers(rawTeachers: unknown): Teacher[] {
  if (!Array.isArray(rawTeachers)) {
    return DEFAULT_PUBLIC_BOOTSTRAP.teachers;
  }
  return rawTeachers
    .filter((item): item is Record<string, unknown> => isPlainObject(item) && typeof item.id === 'string')
    .map((item) => ({
      ...(item as unknown as Teacher),
      name: asNonEmptyString(item.name, 'শিক্ষক'),
      designation: asString(item.designation, ''),
      qualification: asString(item.qualification, ''),
      bio: asString(item.bio, ''),
      avatarUrl: asNonEmptyString(
        item.avatarUrl,
        '/src/assets/images/teacher_male_senior_1795498507581.jpg'
      ),
      experienceYears: asNumber(item.experienceYears, 0),
      subjects: Array.isArray(item.subjects)
        ? item.subjects.filter((s): s is string => typeof s === 'string')
        : [],
      assignedClassIds: Array.isArray(item.assignedClassIds)
        ? (item.assignedClassIds.filter((c): c is string => typeof c === 'string') as Teacher['assignedClassIds'])
        : [],
    }));
}

function normalizeResults(rawResults: unknown): ExamResult[] {
  if (!Array.isArray(rawResults)) {
    return DEFAULT_PUBLIC_BOOTSTRAP.results;
  }
  return rawResults
    .filter(
      (item): item is Record<string, unknown> =>
        isPlainObject(item) && typeof item.id === 'string' && typeof item.examId === 'string'
    )
    .map((item) => ({
      ...(item as unknown as ExamResult),
      gpa: asNumber(item.gpa, 0),
      totalObtained: asNumber(item.totalObtained, 0),
      totalFullMarks: asNumber(item.totalFullMarks, 100),
      classRank: asNumber(item.classRank, 1),
      batchRank: asNumber(item.batchRank, 1),
      grade: asNonEmptyString(item.grade, '-'),
      rollNumber: asString(item.rollNumber, ''),
      studentName: asNonEmptyString(item.studentName, 'শিক্ষার্থী'),
      studentCode: asString(item.studentCode, ''),
      subjectMarks: Array.isArray(item.subjectMarks)
        ? item.subjectMarks.filter(isPlainObject).map((m) => ({
            subjectName: asString(m.subjectName, ''),
            fullMarks: asNumber(m.fullMarks, 100),
            passMarks: asNumber(m.passMarks, 33),
            obtainedMarks: asNumber(m.obtainedMarks, 0),
            gpa: asNumber(m.gpa, 0),
            grade: asString(m.grade, '-'),
            remarks: typeof m.remarks === 'string' ? m.remarks : undefined,
          }))
        : [],
    }));
}

export function normalizePublicBootstrapData(
  raw: unknown,
  defaultSupabaseConfigured = false
): PublicBootstrapData {
  if (!isValidBootstrapPayload(raw)) {
    return {
      ...DEFAULT_PUBLIC_BOOTSTRAP,
      supabaseConfigured: defaultSupabaseConfigured || DEFAULT_PUBLIC_BOOTSTRAP.supabaseConfigured,
    };
  }

  const batches: Batch[] = Array.isArray(raw.batches)
    ? (raw.batches.filter((b) => isPlainObject(b) && typeof b.id === 'string') as unknown as Batch[])
    : DEFAULT_PUBLIC_BOOTSTRAP.batches;

  const subjects: Subject[] = Array.isArray(raw.subjects)
    ? (raw.subjects.filter((s) => isPlainObject(s) && typeof s.id === 'string') as unknown as Subject[])
    : DEFAULT_PUBLIC_BOOTSTRAP.subjects;

  const notices: Notice[] = Array.isArray(raw.notices)
    ? (raw.notices.filter((n) => isPlainObject(n) && typeof n.id === 'string') as unknown as Notice[])
    : DEFAULT_PUBLIC_BOOTSTRAP.notices;

  const exams: Exam[] = Array.isArray(raw.exams)
    ? (raw.exams.filter((e) => isPlainObject(e) && typeof e.id === 'string') as unknown as Exam[])
    : DEFAULT_PUBLIC_BOOTSTRAP.exams;

  return {
    settings: normalizeSettings(raw.settings),
    classes: normalizeClasses(raw.classes),
    batches,
    subjects,
    teachers: normalizeTeachers(raw.teachers),
    notices,
    exams,
    results: normalizeResults(raw.results),
    supabaseConfigured:
      typeof raw.supabaseConfigured === 'boolean'
        ? raw.supabaseConfigured || defaultSupabaseConfigured
        : defaultSupabaseConfigured,
  };
}

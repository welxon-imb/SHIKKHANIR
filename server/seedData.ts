import {
  BENGALI_MONTHS,
  assignMeritRanks,
  compileStudentResult,
} from '../src/utils/academicLogic';
import type {
  AcademicClass,
  ActivityLog,
  AdmissionApplication,
  AppNotification,
  AttendanceRecord,
  Batch,
  ChatMessage,
  ClassRoutine,
  Conversation,
  Exam,
  ExamResult,
  Homework,
  HomeworkSubmission,
  MonthlyInvoice,
  Notice,
  PaymentRecord,
  Student,
  StudyMaterial,
  Subject,
  Teacher,
  UserRole,
  WebsiteSettings,
} from '../src/types';
import { hashPassword } from './auth';

export interface StoredUser {
  id: string;
  userCode: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  passwordHash: string;
  avatarUrl?: string;
  isActive: boolean;
  studentId?: string;
  teacherId?: string;
  passwordVersion?: number;
}

export interface DatabaseState {
  users: StoredUser[];
  classes: AcademicClass[];
  batches: Batch[];
  subjects: Subject[];
  teachers: Teacher[];
  students: Student[];
  admissions: AdmissionApplication[];
  routines: ClassRoutine[];
  attendance: AttendanceRecord[];
  invoices: MonthlyInvoice[];
  payments: PaymentRecord[];
  exams: Exam[];
  results: ExamResult[];
  notices: Notice[];
  studyMaterials: StudyMaterial[];
  homework: Homework[];
  homeworkSubmissions: HomeworkSubmission[];
  conversations: Conversation[];
  messages: ChatMessage[];
  notifications: AppNotification[];
  activityLogs: ActivityLog[];
  settings: WebsiteSettings;
  resetCodes: Record<string, { code: string; expiresAt: number }>;
}

export const DEFAULT_ADMIN_PASS_HASH =
  'f500d3dd72988d786dc9850fc09f1d37:f9c04ac781f979cc674ad5775840594f55484d0d8eaf6ddbf217ef24bf07cacdd30d99a1e7ee98d84d014f316e75a48325144ba1d11f5ccfcaa167d252f61784';

export function createInitialSeedState(): DatabaseState {
  const adminPass = DEFAULT_ADMIN_PASS_HASH;
  const teacherPass = hashPassword('Teacher@2026');
  const studentPass = hashPassword('Student@2026');

  const classes: AcademicClass[] = [
    {
      id: 'class-8',
      nameBn: 'অষ্টম শ্রেণি',
      nameEn: 'Class 8',
      shortCode: '৮ম',
      description: 'গণিত, বিজ্ঞান ও ইংরেজির শক্তিশালী ভিত্তি গঠনের পাশাপাশি সৃজনশীল ও বহুনির্বাচনি দক্ষতা অর্জনের পূর্ণাঙ্গ একাডেমিক প্রোগ্রাম।',
      monthlyFee: 1200,
      scheduleSummary: 'শনি – বৃহস্পতি · বিকাল ৩:০০ – ৫:৩০',
      highlights: ['সাপ্তাহিক মূল্যায়ন পরীক্ষা', 'বিষয়ভিত্তিক লেকচার শিট', 'দুর্বল শিক্ষার্থীদের অতিরিক্ত কেয়ার ক্লাস'],
      subjects: ['বাংলা', 'ইংরেজি', 'সাধারণ গণিত', 'বিজ্ঞান', 'তথ্য ও যোগাযোগ প্রযুক্তি'],
      targetGroup: 'অষ্টম শ্রেণির সকল শিক্ষার্থী',
    },
    {
      id: 'class-9',
      nameBn: 'নবম শ্রেণি',
      nameEn: 'Class 9',
      shortCode: '৯ম',
      description: 'বিজ্ঞান ও সাধারণ শাখার শিক্ষার্থীদের জন্য বোর্ড সিলেবাসভিত্তিক গভীর পাঠদান, গাণিতিক সমস্যা সমাধান ও নিয়মিত অধ্যায়ভিত্তিক পরীক্ষা।',
      monthlyFee: 1500,
      scheduleSummary: 'শনি – বৃহস্পতি · বিকাল ৩:৩০ – ৬:০০',
      highlights: ['উচ্চতর গণিত ও পদার্থ-রসায়ন ফাউন্ডেশন', 'মাসিক মেধা মূল্যায়ন', 'অভিভাবক প্রগ্রেস রিপোর্ট'],
      subjects: ['বাংলা', 'ইংরেজি', 'সাধারণ গণিত', 'উচ্চতর গণিত', 'পদার্থবিজ্ঞান', 'রসায়ন', 'জীববিজ্ঞান'],
      targetGroup: 'নবম শ্রেণির বিজ্ঞান ও সাধারণ বিভাগ',
    },
    {
      id: 'class-10',
      nameBn: 'দশম শ্রেণি',
      nameEn: 'Class 10',
      shortCode: '১০ম',
      description: 'বোর্ড পরীক্ষার চূড়ান্ত প্রস্তুতির পূর্বে সম্পূর্ণ পাঠ্যবই রিভিশন, সৃজনশীল লেখা কৌশল এবং নিবিড় তত্ত্বাবধান।',
      monthlyFee: 1600,
      scheduleSummary: 'শনি – বৃহস্পতি · সকাল ৭:৩০ – ১০:০০ / বিকাল ৪:০০ – ৬:৩০',
      highlights: ['অধ্যায়ভিত্তিক মডেল টেস্ট', 'বোর্ড প্রশ্ন বিশ্লেষণ', 'ব্যক্তিগত দুর্বলতা সমাধান সেশন'],
      subjects: ['বাংলা', 'ইংরেজি', 'সাধারণ গণিত', 'উচ্চতর গণিত', 'পদার্থবিজ্ঞান', 'রসায়ন', 'জীববিজ্ঞান'],
      targetGroup: 'দশম শ্রেণির নিয়মিত শিক্ষার্থী',
    },
    {
      id: 'ssc-batch',
      nameBn: 'SSC ব্যাচ',
      nameEn: 'SSC Exam Batch',
      shortCode: 'SSC',
      description: 'দশম শ্রেণির পরীক্ষার্থীদের জন্য বিশেষ পরীক্ষাভিত্তিক চূড়ান্ত প্রস্তুতি ব্যাচ। পূর্ণাঙ্গ মডেল টেস্ট, উত্তরপত্র মূল্যায়ন ও জিপিএ-৫ লক্ষ্যমাত্রা।',
      monthlyFee: 1800,
      scheduleSummary: 'শনি – বৃহস্পতি · সকাল ৮:০০ – ১০:৩০',
      highlights: ['৩০+ পূর্ণাঙ্গ বোর্ড স্ট্যান্ডার্ড মডেল টেস্ট', 'OMR ও লিখিত খাতা মূল্যায়ন', 'দশম শ্রেণির বিদ্যমান আইডিতেই এনরোলমেন্ট সুবিধা'],
      subjects: ['বাংলা ১ম ও ২য়', 'ইংরেজি ১ম ও ২য়', 'গণিত', 'উচ্চতর গণিত', 'পদার্থবিজ্ঞান', 'রসায়ন', 'জীববিজ্ঞান'],
      targetGroup: 'এসএসসি পরীক্ষার্থী (বিদ্যমান দশম শ্রেণির শিক্ষার্থীরা একই অ্যাকাউন্টে যুক্ত হতে পারবে)',
      isExamBatch: true,
    },
  ];

  const batches: Batch[] = [
    { id: 'batch-8-morning', classId: 'class-8', name: 'প্রভাতি ব্যাচ (ক)', timeSlot: 'সকাল ৮:০০ – ১০:০০', room: 'কক্ষ ২০১', capacity: 35, academicYear: 2026 },
    { id: 'batch-8-evening', classId: 'class-8', name: 'বৈকালিক ব্যাচ (খ)', timeSlot: 'বিকাল ৩:০০ – ৫:০০', room: 'কক্ষ ২০২', capacity: 35, academicYear: 2026 },
    { id: 'batch-9-science', classId: 'class-9', name: 'বিজ্ঞান ব্যাচ (ক)', timeSlot: 'বিকাল ৩:৩০ – ৫:৪৫', room: 'কক্ষ ৩০১', capacity: 40, academicYear: 2026 },
    { id: 'batch-10-science', classId: 'class-10', name: 'দশম বিজ্ঞান (ক)', timeSlot: 'বিকাল ৪:০০ – ৬:৩০', room: 'কক্ষ ৩০২', capacity: 40, academicYear: 2026 },
    { id: 'batch-ssc-special', classId: 'ssc-batch', name: 'SSC চূড়ান্ত মডেল ব্যাচ', timeSlot: 'সকাল ৮:০০ – ১০:৩০', room: 'হল-১', capacity: 50, academicYear: 2026 },
  ];

  const subjects: Subject[] = [
    { id: 'sub-8-ban', classId: 'class-8', nameBn: 'বাংলা', code: 'BAN-8', fullMarks: 100, passMarks: 33 },
    { id: 'sub-8-eng', classId: 'class-8', nameBn: 'ইংরেজি', code: 'ENG-8', fullMarks: 100, passMarks: 33 },
    { id: 'sub-8-math', classId: 'class-8', nameBn: 'গণিত', code: 'MAT-8', fullMarks: 100, passMarks: 33 },
    { id: 'sub-8-sci', classId: 'class-8', nameBn: 'বিজ্ঞান', code: 'SCI-8', fullMarks: 100, passMarks: 33 },
    { id: 'sub-9-math', classId: 'class-9', nameBn: 'সাধারণ গণিত', code: 'MAT-9', fullMarks: 100, passMarks: 33 },
    { id: 'sub-9-phy', classId: 'class-9', nameBn: 'পদার্থবিজ্ঞান', code: 'PHY-9', fullMarks: 100, passMarks: 33 },
    { id: 'sub-9-che', classId: 'class-9', nameBn: 'রসায়ন', code: 'CHE-9', fullMarks: 100, passMarks: 33 },
    { id: 'sub-9-eng', classId: 'class-9', nameBn: 'ইংরেজি', code: 'ENG-9', fullMarks: 100, passMarks: 33 },
    { id: 'sub-10-math', classId: 'class-10', nameBn: 'গণিত', code: 'MAT-10', fullMarks: 100, passMarks: 33 },
    { id: 'sub-10-phy', classId: 'class-10', nameBn: 'পদার্থবিজ্ঞান', code: 'PHY-10', fullMarks: 100, passMarks: 33 },
    { id: 'sub-10-che', classId: 'class-10', nameBn: 'রসায়ন', code: 'CHE-10', fullMarks: 100, passMarks: 33 },
    { id: 'sub-10-eng', classId: 'class-10', nameBn: 'ইংরেজি', code: 'ENG-10', fullMarks: 100, passMarks: 33 },
    { id: 'sub-ssc-math', classId: 'ssc-batch', nameBn: 'গণিত', code: 'MAT-SSC', fullMarks: 100, passMarks: 33 },
    { id: 'sub-ssc-phy', classId: 'ssc-batch', nameBn: 'পদার্থবিজ্ঞান', code: 'PHY-SSC', fullMarks: 100, passMarks: 33 },
    { id: 'sub-ssc-eng', classId: 'ssc-batch', nameBn: 'ইংরেজি', code: 'ENG-SSC', fullMarks: 100, passMarks: 33 },
  ];

  const teachers: Teacher[] = [
    {
      id: 'tch-1',
      userCode: 'TCH-01',
      name: 'মোঃ মাহবুবুর রহমান',
      designation: 'সিনিয়র প্রভাষক (গণিত ও উচ্চতর গণিত)',
      qualification: 'এম.এসসি (গণিত), ঢাকা বিশ্ববিদ্যালয়',
      subjects: ['সাধারণ গণিত', 'উচ্চতর গণিত', 'গণিত'],
      assignedClassIds: ['class-8', 'class-9', 'class-10', 'ssc-batch'],
      phone: '01711223344',
      email: 'mahbub@shikkhanir.edu.bd',
      avatarUrl: '/src/assets/images/teacher_male_senior_1795498507581.jpg',
      bio: '১২ বছরের বোর্ড পরীক্ষক ও কোচিং শিক্ষাদানের অভিজ্ঞতা। জটিল গাণিতিক সমস্যা সহজভাবে উপস্থাপনে দক্ষ।',
      experienceYears: 12,
      isActive: true,
      joinedAt: '2018-01-10',
    },
    {
      id: 'tch-2',
      userCode: 'TCH-02',
      name: 'ফারহানা ইয়াসমিন',
      designation: 'সিনিয়র শিক্ষিকা (ইংরেজি ও বাংলা)',
      qualification: 'এম.এ (ইংরেজি সাহিত্য), রাজশাহী বিশ্ববিদ্যালয়',
      subjects: ['ইংরেজি', 'বাংলা'],
      assignedClassIds: ['class-8', 'class-9', 'class-10'],
      phone: '01811223344',
      email: 'farhana@shikkhanir.edu.bd',
      avatarUrl: '/src/assets/images/teacher_female_senior_1795498506436.jpg',
      bio: 'ইংরেজি গ্রামার, ফ্রি-হ্যান্ড রাইটিং এবং সৃজনশীল বাংলা শিক্ষাদানে ৯ বছরের অভিজ্ঞতা।',
      experienceYears: 9,
      isActive: true,
      joinedAt: '2020-02-01',
    },
    {
      id: 'tch-3',
      userCode: 'TCH-03',
      name: 'তানভীর আহমেদ চৌধুরী',
      designation: 'প্রভাষক (পদার্থ ও রসায়ন বিজ্ঞান)',
      qualification: 'বি.এসসি (ইঞ্জিনিয়ারিং), কুয়েট',
      subjects: ['পদার্থবিজ্ঞান', 'রসায়ন', 'বিজ্ঞান'],
      assignedClassIds: ['class-9', 'class-10', 'ssc-batch'],
      phone: '01911223344',
      email: 'tanvir@shikkhanir.edu.bd',
      avatarUrl: '/src/assets/images/teacher_male_science_1795498507832.jpg',
      bio: 'প্র্যাকটিক্যাল উদাহরণ ও চিত্রসহ পদার্থ ও রসায়নের কনসেপ্ট পরিষ্কার করার জন্য শিক্ষার্থীদের প্রিয় শিক্ষক।',
      experienceYears: 7,
      isActive: true,
      joinedAt: '2021-03-15',
    },
  ];

  const students: Student[] = [
    {
      id: 'stu-1',
      studentCode: 'SHK-2026-101',
      name: 'আরিফুল ইসলাম তানজিম',
      photoUrl: '/src/assets/images/teacher_male_science_1795498507832.jpg',
      dateOfBirth: '2010-04-14',
      phone: '01755001101',
      email: 'tanjim@student.shikkhanir.edu.bd',
      guardianName: 'মোঃ রফিকুল ইসলাম',
      guardianPhone: '01712001101',
      address: 'মজমপুর, কুষ্টিয়া সদর, কুষ্টিয়া',
      previousSchool: 'কুষ্টিয়া জিলা স্কুল',
      admissionDate: '2026-01-05',
      isActive: true,
      enrollments: [
        {
          id: 'enr-1',
          studentId: 'stu-1',
          classId: 'class-10',
          batchId: 'batch-10-science',
          rollNumber: '01',
          academicYear: 2026,
          isPrimary: true,
          status: 'ACTIVE',
          enrolledAt: '2026-01-05',
        },
        {
          id: 'enr-1-ssc',
          studentId: 'stu-1',
          classId: 'ssc-batch',
          batchId: 'batch-ssc-special',
          rollNumber: '01',
          academicYear: 2026,
          isPrimary: false,
          status: 'ACTIVE',
          enrolledAt: '2026-08-01',
        },
      ],
    },
    {
      id: 'stu-2',
      studentCode: 'SHK-2026-102',
      name: 'নুসরাত জাহান মিম',
      dateOfBirth: '2010-07-22',
      phone: '01755001102',
      email: 'mim@student.shikkhanir.edu.bd',
      guardianName: 'আব্দুল করিম বিশ্বাস',
      guardianPhone: '01712001102',
      address: 'থানাপাড়া, কুষ্টিয়া',
      previousSchool: 'কুষ্টিয়া সরকারি বালিকা উচ্চ বিদ্যালয়',
      admissionDate: '2026-01-06',
      isActive: true,
      enrollments: [
        {
          id: 'enr-2',
          studentId: 'stu-2',
          classId: 'class-10',
          batchId: 'batch-10-science',
          rollNumber: '02',
          academicYear: 2026,
          isPrimary: true,
          status: 'ACTIVE',
          enrolledAt: '2026-01-06',
        },
        {
          id: 'enr-2-ssc',
          studentId: 'stu-2',
          classId: 'ssc-batch',
          batchId: 'batch-ssc-special',
          rollNumber: '02',
          academicYear: 2026,
          isPrimary: false,
          status: 'ACTIVE',
          enrolledAt: '2026-08-01',
        },
      ],
    },
    {
      id: 'stu-3',
      studentCode: 'SHK-2026-103',
      name: 'সাদমান সাকিব',
      dateOfBirth: '2010-09-10',
      phone: '01755001103',
      email: 'sadman@student.shikkhanir.edu.bd',
      guardianName: 'মোঃ সাইফুল আলম',
      guardianPhone: '01712001103',
      address: 'আড়ুয়াপাড়া, কুষ্টিয়া',
      previousSchool: 'কুষ্টিয়া জিলা স্কুল',
      admissionDate: '2026-01-08',
      isActive: true,
      enrollments: [
        {
          id: 'enr-3',
          studentId: 'stu-3',
          classId: 'class-10',
          batchId: 'batch-10-science',
          rollNumber: '03',
          academicYear: 2026,
          isPrimary: true,
          status: 'ACTIVE',
          enrolledAt: '2026-01-08',
        },
      ],
    },
    {
      id: 'stu-4',
      studentCode: 'SHK-2026-104',
      name: 'তাসনিম তাবাসসুম',
      dateOfBirth: '2010-11-02',
      phone: '01755001104',
      email: 'tasnim@student.shikkhanir.edu.bd',
      guardianName: 'জাহিদুল ইসলাম',
      guardianPhone: '01712001104',
      address: 'কোর্টপাড়া, কুষ্টিয়া',
      previousSchool: 'কুষ্টিয়া সরকারি বালিকা উচ্চ বিদ্যালয়',
      admissionDate: '2026-01-10',
      isActive: true,
      enrollments: [
        {
          id: 'enr-4',
          studentId: 'stu-4',
          classId: 'class-10',
          batchId: 'batch-10-science',
          rollNumber: '04',
          academicYear: 2026,
          isPrimary: true,
          status: 'ACTIVE',
          enrolledAt: '2026-01-10',
        },
      ],
    },
    {
      id: 'stu-5',
      studentCode: 'SHK-2026-201',
      name: 'মেহেদী হাসান রাব্বি',
      dateOfBirth: '2011-03-19',
      phone: '01755002201',
      email: 'rabbi@student.shikkhanir.edu.bd',
      guardianName: 'মোঃ কামাল উদ্দিন',
      guardianPhone: '01712002201',
      address: 'লাহিনী বটতলা, কুষ্টিয়া',
      previousSchool: 'পুলিশ লাইনস স্কুল অ্যান্ড কলেজ',
      admissionDate: '2026-01-12',
      isActive: true,
      enrollments: [
        {
          id: 'enr-5',
          studentId: 'stu-5',
          classId: 'class-9',
          batchId: 'batch-9-science',
          rollNumber: '01',
          academicYear: 2026,
          isPrimary: true,
          status: 'ACTIVE',
          enrolledAt: '2026-01-12',
        },
      ],
    },
    {
      id: 'stu-6',
      studentCode: 'SHK-2026-301',
      name: 'সুমাইয়া আক্তার মৌ',
      dateOfBirth: '2012-06-25',
      phone: '01755003301',
      email: 'mou@student.shikkhanir.edu.bd',
      guardianName: 'মোঃ নাজমুল হক',
      guardianPhone: '01712003301',
      address: 'আমলাপাড়া, কুষ্টিয়া',
      previousSchool: 'কুষ্টিয়া সরকারি বালিকা উচ্চ বিদ্যালয়',
      admissionDate: '2026-01-15',
      isActive: true,
      enrollments: [
        {
          id: 'enr-6',
          studentId: 'stu-6',
          classId: 'class-8',
          batchId: 'batch-8-morning',
          rollNumber: '01',
          academicYear: 2026,
          isPrimary: true,
          status: 'ACTIVE',
          enrolledAt: '2026-01-15',
        },
      ],
    },
  ];

  const users: StoredUser[] = [
    {
      id: 'usr-admin',
      userCode: 'ADMIN-01',
      name: 'মোঃ খাইরুল বাশার (পরিচালক)',
      email: 'admin@shikkhanir.edu.bd',
      phone: '01712345678',
      role: 'ADMIN',
      passwordHash: adminPass,
      isActive: true,
      passwordVersion: 2,
    },
    {
      id: 'usr-tch-1',
      userCode: 'TCH-01',
      name: teachers[0].name,
      email: teachers[0].email,
      phone: teachers[0].phone,
      role: 'TEACHER',
      passwordHash: teacherPass,
      avatarUrl: teachers[0].avatarUrl,
      isActive: true,
      teacherId: 'tch-1',
    },
    {
      id: 'usr-tch-2',
      userCode: 'TCH-02',
      name: teachers[1].name,
      email: teachers[1].email,
      phone: teachers[1].phone,
      role: 'TEACHER',
      passwordHash: teacherPass,
      avatarUrl: teachers[1].avatarUrl,
      isActive: true,
      teacherId: 'tch-2',
    },
    {
      id: 'usr-tch-3',
      userCode: 'TCH-03',
      name: teachers[2].name,
      email: teachers[2].email,
      phone: teachers[2].phone,
      role: 'TEACHER',
      passwordHash: teacherPass,
      avatarUrl: teachers[2].avatarUrl,
      isActive: true,
      teacherId: 'tch-3',
    },
    ...students.map((s) => ({
      id: `usr-${s.id}`,
      userCode: s.studentCode,
      name: s.name,
      email: s.email ?? `${s.studentCode.toLowerCase()}@student.shikkhanir.edu.bd`,
      phone: s.phone,
      role: 'STUDENT' as UserRole,
      passwordHash: studentPass,
      avatarUrl: s.photoUrl,
      isActive: s.isActive,
      studentId: s.id,
    })),
  ];

  const admissions: AdmissionApplication[] = [
    {
      id: 'adm-1',
      applicationId: 'APP-2026-041',
      studentName: 'রাফিউল করিম শ্রাবণ',
      dateOfBirth: '2011-05-12',
      phone: '01799887766',
      email: 'srabon@example.com',
      guardianName: 'মোঃ বজলুর করিম',
      guardianPhone: '01711887766',
      address: 'চৌড়হাস মোড়, কুষ্টিয়া',
      previousSchool: 'কুষ্টিয়া জিলা স্কুল',
      classId: 'class-9',
      batchId: 'batch-9-science',
      academicInfo: 'অষ্টম শ্রেণিতে বার্ষিক পরীক্ষায় GPA 5.00 অর্জন।',
      status: 'Submitted',
      submittedAt: '2026-11-22T10:30:00Z',
    },
    {
      id: 'adm-2',
      applicationId: 'APP-2026-042',
      studentName: 'আফসানা মিমি',
      dateOfBirth: '2012-02-18',
      phone: '01899887755',
      guardianName: 'মোঃ শরিফুল ইসলাম',
      guardianPhone: '01811887755',
      address: 'কালীশংকরপুর, কুষ্টিয়া',
      previousSchool: 'কলকাকলি মাধ্যমিক বিদ্যালয়',
      classId: 'class-8',
      batchId: 'batch-8-evening',
      academicInfo: 'সপ্তম শ্রেণিতে প্রথম স্থান।',
      status: 'Under Review',
      submittedAt: '2026-11-21T14:15:00Z',
    },
  ];

  const routines: ClassRoutine[] = [
    { id: 'rt-1', classId: 'class-10', batchId: 'batch-10-science', day: 'শনিবার', startTime: '04:00 PM', endTime: '05:10 PM', subjectName: 'গণিত', teacherId: 'tch-1', teacherName: teachers[0].name, room: 'কক্ষ ৩০২' },
    { id: 'rt-2', classId: 'class-10', batchId: 'batch-10-science', day: 'শনিবার', startTime: '05:15 PM', endTime: '06:25 PM', subjectName: 'পদার্থবিজ্ঞান', teacherId: 'tch-3', teacherName: teachers[2].name, room: 'কক্ষ ৩০২' },
    { id: 'rt-3', classId: 'class-10', batchId: 'batch-10-science', day: 'রবিবার', startTime: '04:00 PM', endTime: '05:10 PM', subjectName: 'ইংরেজি', teacherId: 'tch-2', teacherName: teachers[1].name, room: 'কক্ষ ৩০২' },
    { id: 'rt-4', classId: 'class-10', batchId: 'batch-10-science', day: 'রবিবার', startTime: '05:15 PM', endTime: '06:25 PM', subjectName: 'রসায়ন', teacherId: 'tch-3', teacherName: teachers[2].name, room: 'কক্ষ ৩০২' },
    { id: 'rt-5', classId: 'class-10', batchId: 'batch-10-science', day: 'সোমবার', startTime: '04:00 PM', endTime: '05:10 PM', subjectName: 'গণিত', teacherId: 'tch-1', teacherName: teachers[0].name, room: 'কক্ষ ৩০২' },
    { id: 'rt-6', classId: 'class-10', batchId: 'batch-10-science', day: 'মঙ্গলবার', startTime: '04:00 PM', endTime: '05:10 PM', subjectName: 'ইংরেজি', teacherId: 'tch-2', teacherName: teachers[1].name, room: 'কক্ষ ৩০২' },
    { id: 'rt-7', classId: 'class-10', batchId: 'batch-10-science', day: 'বুধবার', startTime: '04:00 PM', endTime: '05:10 PM', subjectName: 'পদার্থবিজ্ঞান', teacherId: 'tch-3', teacherName: teachers[2].name, room: 'কক্ষ ৩০২' },
    { id: 'rt-8', classId: 'class-10', batchId: 'batch-10-science', day: 'বৃহস্পতিবার', startTime: '04:00 PM', endTime: '05:30 PM', subjectName: 'সাপ্তাহিক মূল্যায়ন পরীক্ষা', teacherId: 'tch-1', teacherName: teachers[0].name, room: 'হল-১' },
    { id: 'rt-9', classId: 'ssc-batch', batchId: 'batch-ssc-special', day: 'শনিবার', startTime: '08:00 AM', endTime: '10:30 AM', subjectName: 'মডেল টেস্ট ও সল্ভ ক্লাস (গণিত)', teacherId: 'tch-1', teacherName: teachers[0].name, room: 'হল-১' },
    { id: 'rt-10', classId: 'ssc-batch', batchId: 'batch-ssc-special', day: 'সোমবার', startTime: '08:00 AM', endTime: '10:30 AM', subjectName: 'পদার্থবিজ্ঞান চূড়ান্ত রিভিশন', teacherId: 'tch-3', teacherName: teachers[2].name, room: 'হল-১' },
    { id: 'rt-11', classId: 'class-9', batchId: 'batch-9-science', day: 'রবিবার', startTime: '03:30 PM', endTime: '04:45 PM', subjectName: 'সাধারণ গণিত', teacherId: 'tch-1', teacherName: teachers[0].name, room: 'কক্ষ ৩০১' },
    { id: 'rt-12', classId: 'class-8', batchId: 'batch-8-morning', day: 'শনিবার', startTime: '08:00 AM', endTime: '09:30 AM', subjectName: 'বাংলা ও ইংরেজি', teacherId: 'tch-2', teacherName: teachers[1].name, room: 'কক্ষ ২০১' },
  ];

  const attendance: AttendanceRecord[] = [
    { id: 'att-1', date: '2026-11-23', classId: 'class-10', batchId: 'batch-10-science', studentId: 'stu-1', studentCode: 'SHK-2026-101', studentName: students[0].name, rollNumber: '01', status: 'Present', markedBy: teachers[0].name },
    { id: 'att-2', date: '2026-11-23', classId: 'class-10', batchId: 'batch-10-science', studentId: 'stu-2', studentCode: 'SHK-2026-102', studentName: students[1].name, rollNumber: '02', status: 'Present', markedBy: teachers[0].name },
    { id: 'att-3', date: '2026-11-23', classId: 'class-10', batchId: 'batch-10-science', studentId: 'stu-3', studentCode: 'SHK-2026-103', studentName: students[2].name, rollNumber: '03', status: 'Late', markedBy: teachers[0].name },
    { id: 'att-4', date: '2026-11-23', classId: 'class-10', batchId: 'batch-10-science', studentId: 'stu-4', studentCode: 'SHK-2026-104', studentName: students[3].name, rollNumber: '04', status: 'Absent', markedBy: teachers[0].name },
    { id: 'att-5', date: '2026-11-22', classId: 'class-10', batchId: 'batch-10-science', studentId: 'stu-1', studentCode: 'SHK-2026-101', studentName: students[0].name, rollNumber: '01', status: 'Present', markedBy: teachers[2].name },
    { id: 'att-6', date: '2026-11-22', classId: 'class-10', batchId: 'batch-10-science', studentId: 'stu-2', studentCode: 'SHK-2026-102', studentName: students[1].name, rollNumber: '02', status: 'Present', markedBy: teachers[2].name },
    { id: 'att-7', date: '2026-11-21', classId: 'class-10', batchId: 'batch-10-science', studentId: 'stu-1', studentCode: 'SHK-2026-101', studentName: students[0].name, rollNumber: '01', status: 'Present', markedBy: teachers[1].name },
  ];

  // Generate 12-month invoices (Jan-Dec 2026) for stu-1 and core months for others
  const invoices: MonthlyInvoice[] = [];
  const payments: PaymentRecord[] = [];
  let invSeq = 1001;
  let paySeq = 5001;

  for (const st of students) {
    const primary = st.enrollments[0];
    const cls = classes.find((c) => c.id === primary.classId)!;
    for (let m = 1; m <= 12; m++) {
      const isPaid = m <= 10;
      const isPending = m === 11 && st.id === 'stu-1';
      const invId = `inv-${st.id}-${m}`;
      const invoiceNo = `INV-2026-${invSeq++}`;
      invoices.push({
        id: invId,
        invoiceNo,
        studentId: st.id,
        studentCode: st.studentCode,
        studentName: st.name,
        classId: primary.classId,
        batchId: primary.batchId,
        monthIndex: m,
        monthNameBn: BENGALI_MONTHS[m - 1],
        academicYear: 2026,
        amount: cls.monthlyFee,
        paidAmount: isPaid ? cls.monthlyFee : 0,
        status: isPaid ? 'Paid' : isPending ? 'Pending' : 'Unpaid',
        dueDate: `2026-${String(m).padStart(2, '0')}-10`,
      });
      if (isPaid && m >= 9) {
        payments.push({
          id: `pay-${st.id}-${m}`,
          receiptNo: `RCP-2026-${paySeq++}`,
          invoiceId: invId,
          studentId: st.id,
          studentCode: st.studentCode,
          studentName: st.name,
          amount: cls.monthlyFee,
          method: m % 2 === 0 ? 'বিকাশ' : 'নগদ',
          transactionId: `TXN${st.studentCode.slice(-3)}${m}889`,
          senderPhone: st.phone,
          status: 'Verified',
          submittedAt: `2026-${String(m).padStart(2, '0')}-07T11:20:00Z`,
          verifiedAt: `2026-${String(m).padStart(2, '0')}-07T15:00:00Z`,
          verifiedBy: 'মোঃ খাইরুল বাশার (পরিচালক)',
        });
      }
      if (isPending) {
        payments.push({
          id: `pay-${st.id}-${m}`,
          receiptNo: `RCP-2026-${paySeq++}`,
          invoiceId: invId,
          studentId: st.id,
          studentCode: st.studentCode,
          studentName: st.name,
          amount: cls.monthlyFee,
          method: 'বিকাশ',
          transactionId: 'BKS99441122',
          senderPhone: st.phone,
          status: 'Pending',
          submittedAt: '2026-11-23T09:15:00Z',
          notes: 'নভেম্বর মাসের ফি বিকাশ সেন্ড মানি করা হয়েছে।',
        });
      }
    }
  }

  const exams: Exam[] = [
    {
      id: 'ex-10-nov',
      title: 'নভেম্বর মাসিক মূল্যায়ন পরীক্ষা ২০২৬',
      classId: 'class-10',
      batchId: 'batch-10-science',
      academicYear: 2026,
      examDate: '2026-11-15',
      examTime: 'বিকাল ৪:০০ – ৬:০০',
      subjects: [
        { subjectName: 'গণিত', fullMarks: 100, passMarks: 33 },
        { subjectName: 'পদার্থবিজ্ঞান', fullMarks: 100, passMarks: 33 },
        { subjectName: 'রসায়ন', fullMarks: 100, passMarks: 33 },
        { subjectName: 'ইংরেজি', fullMarks: 100, passMarks: 33 },
      ],
      isPublished: true,
    },
    {
      id: 'ex-ssc-model',
      title: 'SSC প্রাক-নির্বাচনী মডেল টেস্ট ০৩',
      classId: 'ssc-batch',
      batchId: 'batch-ssc-special',
      academicYear: 2026,
      examDate: '2026-11-28',
      examTime: 'সকাল ৮:০০ – ১১:০০',
      subjects: [
        { subjectName: 'গণিত', fullMarks: 100, passMarks: 33 },
        { subjectName: 'পদার্থবিজ্ঞান', fullMarks: 100, passMarks: 33 },
        { subjectName: 'ইংরেজি', fullMarks: 100, passMarks: 33 },
      ],
      isPublished: false,
    },
    {
      id: 'ex-9-nov',
      title: 'নবম শ্রেণি ত্রৈমাসিক পরীক্ষা ২০২৬',
      classId: 'class-9',
      batchId: 'batch-9-science',
      academicYear: 2026,
      examDate: '2026-11-14',
      examTime: 'বিকাল ৩:৩০ – ৫:৩০',
      subjects: [
        { subjectName: 'সাধারণ গণিত', fullMarks: 100, passMarks: 33 },
        { subjectName: 'পদার্থবিজ্ঞান', fullMarks: 100, passMarks: 33 },
        { subjectName: 'ইংরেজি', fullMarks: 100, passMarks: 33 },
      ],
      isPublished: true,
    },
  ];

  const rawResults: ExamResult[] = [
    {
      id: 'res-stu-1',
      examId: 'ex-10-nov',
      examTitle: exams[0].title,
      classId: 'class-10',
      batchId: 'batch-10-science',
      academicYear: 2026,
      studentId: 'stu-1',
      studentCode: 'SHK-2026-101',
      studentName: students[0].name,
      rollNumber: '01',
      photoUrl: students[0].photoUrl,
      ...compileStudentResult([
        { subjectName: 'গণিত', fullMarks: 100, passMarks: 33, obtainedMarks: 95, remarks: 'অসাধারণ' },
        { subjectName: 'পদার্থবিজ্ঞান', fullMarks: 100, passMarks: 33, obtainedMarks: 89, remarks: 'খুব ভালো' },
        { subjectName: 'রসায়ন', fullMarks: 100, passMarks: 33, obtainedMarks: 86, remarks: 'ভালো' },
        { subjectName: 'ইংরেজি', fullMarks: 100, passMarks: 33, obtainedMarks: 84, remarks: 'উত্তম' },
      ]),
      classRank: 0,
      batchRank: 0,
      isPublished: true,
      publishedAt: '2026-11-18',
    },
    {
      id: 'res-stu-2',
      examId: 'ex-10-nov',
      examTitle: exams[0].title,
      classId: 'class-10',
      batchId: 'batch-10-science',
      academicYear: 2026,
      studentId: 'stu-2',
      studentCode: 'SHK-2026-102',
      studentName: students[1].name,
      rollNumber: '02',
      ...compileStudentResult([
        { subjectName: 'গণিত', fullMarks: 100, passMarks: 33, obtainedMarks: 92, remarks: 'চমৎকার' },
        { subjectName: 'পদার্থবিজ্ঞান', fullMarks: 100, passMarks: 33, obtainedMarks: 90, remarks: 'অসাধারণ' },
        { subjectName: 'রসায়ন', fullMarks: 100, passMarks: 33, obtainedMarks: 88, remarks: 'খুব ভালো' },
        { subjectName: 'ইংরেজি', fullMarks: 100, passMarks: 33, obtainedMarks: 87, remarks: 'অসাধারণ' },
      ]),
      classRank: 0,
      batchRank: 0,
      isPublished: true,
      publishedAt: '2026-11-18',
    },
    {
      id: 'res-stu-3',
      examId: 'ex-10-nov',
      examTitle: exams[0].title,
      classId: 'class-10',
      batchId: 'batch-10-science',
      academicYear: 2026,
      studentId: 'stu-3',
      studentCode: 'SHK-2026-103',
      studentName: students[2].name,
      rollNumber: '03',
      ...compileStudentResult([
        { subjectName: 'গণিত', fullMarks: 100, passMarks: 33, obtainedMarks: 84 },
        { subjectName: 'পদার্থবিজ্ঞান', fullMarks: 100, passMarks: 33, obtainedMarks: 78 },
        { subjectName: 'রসায়ন', fullMarks: 100, passMarks: 33, obtainedMarks: 75 },
        { subjectName: 'ইংরেজি', fullMarks: 100, passMarks: 33, obtainedMarks: 79 },
      ]),
      classRank: 0,
      batchRank: 0,
      isPublished: true,
      publishedAt: '2026-11-18',
    },
    {
      id: 'res-stu-4',
      examId: 'ex-10-nov',
      examTitle: exams[0].title,
      classId: 'class-10',
      batchId: 'batch-10-science',
      academicYear: 2026,
      studentId: 'stu-4',
      studentCode: 'SHK-2026-104',
      studentName: students[3].name,
      rollNumber: '04',
      ...compileStudentResult([
        { subjectName: 'গণিত', fullMarks: 100, passMarks: 33, obtainedMarks: 76 },
        { subjectName: 'পদার্থবিজ্ঞান', fullMarks: 100, passMarks: 33, obtainedMarks: 71 },
        { subjectName: 'রসায়ন', fullMarks: 100, passMarks: 33, obtainedMarks: 68 },
        { subjectName: 'ইংরেজি', fullMarks: 100, passMarks: 33, obtainedMarks: 74 },
      ]),
      classRank: 0,
      batchRank: 0,
      isPublished: true,
      publishedAt: '2026-11-18',
    },
    {
      id: 'res-stu-5',
      examId: 'ex-9-nov',
      examTitle: exams[2].title,
      classId: 'class-9',
      batchId: 'batch-9-science',
      academicYear: 2026,
      studentId: 'stu-5',
      studentCode: 'SHK-2026-201',
      studentName: students[4].name,
      rollNumber: '01',
      ...compileStudentResult([
        { subjectName: 'সাধারণ গণিত', fullMarks: 100, passMarks: 33, obtainedMarks: 88 },
        { subjectName: 'পদার্থবিজ্ঞান', fullMarks: 100, passMarks: 33, obtainedMarks: 82 },
        { subjectName: 'ইংরেজি', fullMarks: 100, passMarks: 33, obtainedMarks: 81 },
      ]),
      classRank: 0,
      batchRank: 0,
      isPublished: true,
      publishedAt: '2026-11-17',
    },
  ];

  const results = assignMeritRanks(rawResults);

  const notices: Notice[] = [
    {
      id: 'not-1',
      title: 'SSC ২০২৭ চূড়ান্ত মডেল টেস্ট ব্যাচে ভর্তি ও রুটিন প্রকাশ',
      description: 'আগামী ১ ডিসেম্বর থেকে SSC পরীক্ষার্থীদের বিশেষ মডেল টেস্ট শুরু হবে। দশম শ্রেণির নিয়মিত শিক্ষার্থীরা নতুন অ্যাকাউন্ট না খুলে অফিস বা স্টুডেন্ট প্যানেল থেকে ব্যাচ এনরোলমেন্ট সম্পন্ন করতে পারবে।',
      type: 'ভর্তি বিজ্ঞপ্তি',
      date: '2026-11-22',
      targetClassId: 'ALL',
      targetBatchId: 'ALL',
      isPinned: true,
      publishedBy: 'মোঃ খাইরুল বাশার (পরিচালক)',
    },
    {
      id: 'not-2',
      title: 'নভেম্বর মাসিক পরীক্ষার ফলাফল ও মেধা তালিকা প্রকাশ',
      description: 'দশম ও নবম শ্রেণির নভেম্বর মাসের মূল্যায়ন পরীক্ষার ফলাফল প্রকাশিত হয়েছে। শিক্ষার্থীরা ড্যাশবোর্ড থেকে মার্কশিট ডাউনলোড করতে পারবে।',
      type: 'পরীক্ষার নোটিশ',
      date: '2026-11-18',
      targetClassId: 'class-10',
      targetBatchId: 'ALL',
      isPinned: true,
      publishedBy: 'মোঃ খাইরুল বাশার (পরিচালক)',
    },
    {
      id: 'not-3',
      title: 'শীতকালীন সময়সূচি অনুযায়ী ক্লাস শুরুর নির্দেশনা',
      description: 'শনিবার থেকে প্রভাতি ব্যাচের সকল ক্লাস সকাল ৮:০০টায় এবং বৈকালিক ব্যাচ বিকাল ৩:০০টায় শুরু হবে। নির্ধারিত সময়ের ১০ মিনিট পূর্বে উপস্থিত থাকার অনুরোধ করা হলো।',
      type: 'জরুরি নোটিশ',
      date: '2026-11-16',
      targetClassId: 'ALL',
      targetBatchId: 'ALL',
      isPinned: false,
      publishedBy: 'মোঃ খাইরুল বাশার (পরিচালক)',
    },
    {
      id: 'not-4',
      title: 'অভিভাবক-শিক্ষক মতবিনিময় সভা আগামী শনিবার',
      description: 'অষ্টম, নবম ও দশম শ্রেণির শিক্ষার্থীদের একাডেমিক অগ্রগতি পর্যালোচনায় আগামী শনিবার সকাল ১০:৩০টায় অভিভাবক সভা অনুষ্ঠিত হবে।',
      type: 'সাধারণ নোটিশ',
      date: '2026-11-12',
      targetClassId: 'ALL',
      targetBatchId: 'ALL',
      isPinned: false,
      publishedBy: 'মোঃ খাইরুল বাশার (পরিচালক)',
    },
  ];

  const studyMaterials: StudyMaterial[] = [
    {
      id: 'mat-1',
      title: 'ত্রিকোণমিতি (অধ্যায় ৯) সম্পূর্ণ সূত্র ও সৃজনশীল শিট',
      subject: 'গণিত',
      classId: 'class-10',
      batchId: 'batch-10-science',
      description: 'দশম শ্রেণি ও SSC ব্যাচের জন্য বোর্ড প্রশ্নের সমাধানসহ পিডিএফ লেকচার নোট।',
      fileName: 'Trigonometry_Chapter9_Shikkhanir.pdf',
      fileSize: '১.৮ MB',
      fileUrl: '#material-trigonometry',
      uploadedBy: teachers[0].name,
      uploadedAt: '2026-11-20',
    },
    {
      id: 'mat-2',
      title: 'আলোর প্রতিফলন ও প্রতিসরণ — চিত্রসহ ব্যাখ্যা',
      subject: 'বিজ্ঞান',
      classId: 'class-10',
      batchId: 'batch-10-science',
      description: 'পদার্থবিজ্ঞান অধ্যায় ৮ ও ৯-এর রশ্মিচিত্র এবং গাণিতিক সমস্যাবলি।',
      fileName: 'Physics_Optics_Notes.pdf',
      fileSize: '২.৪ MB',
      fileUrl: '#material-optics',
      uploadedBy: teachers[2].name,
      uploadedAt: '2026-11-19',
    },
    {
      id: 'mat-3',
      title: 'Completing Sentences & Transformation Rules',
      subject: 'ইংরেজি',
      classId: 'class-9',
      batchId: 'batch-9-science',
      description: 'নবম ও দশম শ্রেণির ইংরেজি ২য় পত্রের জন্য গুরুত্বপূর্ণ গ্রামার হ্যান্ডআউট।',
      fileName: 'English_Grammar_Sheet.pdf',
      fileSize: '১.১ MB',
      fileUrl: '#material-english',
      uploadedBy: teachers[1].name,
      uploadedAt: '2026-11-15',
    },
    {
      id: 'mat-4',
      title: 'বাংলা ব্যাকরণ: সমাস ও উপসর্গ সংক্ষিপ্ত নোট',
      subject: 'বাংলা',
      classId: 'class-8',
      batchId: 'ALL',
      description: 'অষ্টম শ্রেণির জন্য সহজ উদাহরণসহ বাংলা ২য় পত্র নোট।',
      fileName: 'Bangla_Grammar_Class8.pdf',
      fileSize: '৯২০ KB',
      fileUrl: '#material-bangla',
      uploadedBy: teachers[1].name,
      uploadedAt: '2026-11-14',
    },
  ];

  const homework: Homework[] = [
    {
      id: 'hw-1',
      title: 'অনুশীলনী ৯.২ এর সৃজনশীল প্রশ্ন ১–৫ সমাধান',
      description: 'খাতায় ধাপ অনুযায়ী সমাধান করে ছবি বা পিডিএফ আপলোড করো অথবা আগামী ক্লাসে জমা দাও।',
      subject: 'গণিত',
      classId: 'class-10',
      batchId: 'batch-10-science',
      teacherId: 'tch-1',
      teacherName: teachers[0].name,
      deadline: '2026-11-26',
      attachmentName: 'Math_HW_9_2.pdf',
      createdAt: '2026-11-21',
    },
    {
      id: 'hw-2',
      title: 'Write a paragraph on Digital Learning in Rural Bangladesh',
      description: '১৫০–১৮০ শব্দের মধ্যে নিজ হাতে লিখে জমা দাও।',
      subject: 'ইংরেজি',
      classId: 'class-10',
      batchId: 'batch-10-science',
      teacherId: 'tch-2',
      teacherName: teachers[1].name,
      deadline: '2026-11-25',
      createdAt: '2026-11-20',
    },
  ];

  const homeworkSubmissions: HomeworkSubmission[] = [
    {
      id: 'hws-1',
      homeworkId: 'hw-2',
      studentId: 'stu-1',
      studentCode: 'SHK-2026-101',
      studentName: students[0].name,
      note: 'মিস, অনুচ্ছেদটি লিখে জমা দিলাম।',
      fileName: 'Tanjim_Paragraph.pdf',
      submittedAt: '2026-11-22T17:10:00Z',
      status: 'Checked',
      teacherFeedback: 'চমৎকার বাক্য গঠন, শুধুমাত্র ২টি বানান সংশোধন করে দিয়েছি।',
    },
  ];

  const conversations: Conversation[] = [
    { id: 'conv-grp-8', type: 'GROUP', title: 'অষ্টম শ্রেণি স্টাডি গ্রুপ', classId: 'class-8', participantIds: ['usr-admin', 'usr-tch-1', 'usr-tch-2', 'usr-stu-6'], participantRoles: ['ADMIN', 'TEACHER', 'STUDENT'] },
    { id: 'conv-grp-9', type: 'GROUP', title: 'নবম শ্রেণি বিজ্ঞান গ্রুপ', classId: 'class-9', participantIds: ['usr-admin', 'usr-tch-1', 'usr-tch-3', 'usr-stu-5'], participantRoles: ['ADMIN', 'TEACHER', 'STUDENT'] },
    { id: 'conv-grp-10', type: 'GROUP', title: 'দশম শ্রেণি স্টাডি গ্রুপ', classId: 'class-10', participantIds: ['usr-admin', 'usr-tch-1', 'usr-tch-2', 'usr-tch-3', 'usr-stu-1', 'usr-stu-2', 'usr-stu-3', 'usr-stu-4'], participantRoles: ['ADMIN', 'TEACHER', 'STUDENT'] },
    { id: 'conv-grp-ssc', type: 'GROUP', title: 'SSC পরীক্ষার্থী স্পেশাল গ্রুপ', classId: 'ssc-batch', participantIds: ['usr-admin', 'usr-tch-1', 'usr-tch-3', 'usr-stu-1', 'usr-stu-2'], participantRoles: ['ADMIN', 'TEACHER', 'STUDENT'] },
    { id: 'conv-priv-st1-t1', type: 'PRIVATE', title: 'আরিফুল (দশম) ↔ মোঃ মাহবুবুর রহমান', participantIds: ['usr-stu-1', 'usr-tch-1'], participantRoles: ['STUDENT', 'TEACHER'] },
    { id: 'conv-priv-st1-adm', type: 'PRIVATE', title: 'আরিফুল (দশম) ↔ অফিস অ্যাডমিন', participantIds: ['usr-stu-1', 'usr-admin'], participantRoles: ['STUDENT', 'ADMIN'] },
    { id: 'conv-priv-t1-adm', type: 'PRIVATE', title: 'মোঃ মাহবুবুর রহমান ↔ অফিস অ্যাডমিন', participantIds: ['usr-tch-1', 'usr-admin'], participantRoles: ['TEACHER', 'ADMIN'] },
  ];

  const messages: ChatMessage[] = [
    {
      id: 'msg-1',
      conversationId: 'conv-grp-10',
      senderId: 'usr-tch-1',
      senderName: teachers[0].name,
      senderRole: 'TEACHER',
      text: 'আগামীকাল বিকাল ৪টায় ত্রিকোণমিতির সৃজনশীল অংশ নিয়ে বিশেষ সল্ভ ক্লাস হবে। সবাই অনুশীলনী ৯.২ দেখে আসবে।',
      sentAt: '2026-11-23T08:30:00Z',
      readBy: ['usr-tch-1', 'usr-stu-1'],
    },
    {
      id: 'msg-2',
      conversationId: 'conv-grp-10',
      senderId: 'usr-stu-2',
      senderName: students[1].name,
      senderRole: 'STUDENT',
      text: 'স্যার, উদাহরণ ১২ নম্বর অঙ্কটি কি কাল ক্লাসে দেখানো হবে?',
      sentAt: '2026-11-23T08:42:00Z',
      readBy: ['usr-stu-2', 'usr-tch-1'],
    },
    {
      id: 'msg-3',
      conversationId: 'conv-priv-st1-t1',
      senderId: 'usr-stu-1',
      senderName: students[0].name,
      senderRole: 'STUDENT',
      text: 'স্যার, উচ্চতর গণিতের অসীম ধারা অধ্যায়ের ৫ নম্বর প্রশ্নে একটু সমস্যা হচ্ছে।',
      sentAt: '2026-11-23T09:10:00Z',
      readBy: ['usr-stu-1'],
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'notif-1',
      userId: 'usr-stu-1',
      title: 'নভেম্বর পরীক্ষার ফলাফল প্রকাশিত',
      body: 'আপনার নভেম্বর মাসিক মূল্যায়ন পরীক্ষার ফলাফল ও মার্কশিট ড্যাশবোর্ডে যুক্ত হয়েছে।',
      category: 'result',
      isRead: false,
      createdAt: '2026-11-18T12:00:00Z',
    },
    {
      id: 'notif-2',
      userId: 'usr-stu-1',
      title: 'নতুন হোমওয়ার্ক: গণিত অনুশীলনী ৯.২',
      body: 'জমা দেওয়ার শেষ তারিখ ২৬ নভেম্বর ২০২৬।',
      category: 'homework',
      isRead: false,
      createdAt: '2026-11-21T16:00:00Z',
    },
    {
      id: 'notif-3',
      userId: 'usr-admin',
      title: 'নতুন অনলাইন ভর্তি আবেদন',
      body: 'রাফিউল করিম শ্রাবণ (নবম শ্রেণি) একটি নতুন ভর্তি আবেদন জমা দিয়েছেন।',
      category: 'admission',
      isRead: false,
      createdAt: '2026-11-22T10:30:00Z',
    },
  ];

  const activityLogs: ActivityLog[] = [
    {
      id: 'log-1',
      actorName: 'মোঃ খাইরুল বাশার (পরিচালক)',
      actorRole: 'ADMIN',
      action: 'ফলাফল প্রকাশ',
      details: 'নভেম্বর মাসিক মূল্যায়ন পরীক্ষা ২০২৬ (দশম শ্রেণি) এর ফলাফল ও মেধা তালিকা প্রকাশিত।',
      timestamp: '2026-11-18T12:05:00Z',
    },
  ];

  const settings: WebsiteSettings = {
    instituteNameBn: 'শিক্ষানীর',
    instituteNameEn: 'SHIKKHANIR',
    tagline: 'সুশিক্ষায় গড়ি আগামীর সুন্দর ভবিষ্যৎ',
    heroTitle: 'সুশিক্ষায় গড়ি আগামীর সুন্দর ভবিষ্যৎ',
    heroSubtitle: 'শিক্ষানীর — জ্ঞান, দক্ষতা ও সাফল্যের নির্ভরযোগ্য শিক্ষাকেন্দ্র। অষ্টম, নবম, দশম ও SSC পরীক্ষার্থীদের জন্য সুপরিকল্পিত পাঠদান ও নিবিড় তত্ত্বাবধান।',
    heroBannerUrl: '',
    address: 'রবীন্দ্র মৈত্রী সড়ক, মজমপুর, কুষ্টিয়া-৭০০০, বাংলাদেশ',
    phone: '01712-345678',
    email: 'shikkhanircc@gmail.com',
    officeHours: 'শনি – বৃহস্পতি · সকাল ৮:০০ – রাত ৮:০০',
    admissionOpen: true,
    academicYear: 2026,
    achievementStats: {
      totalStudents: '৫০০+',
      experiencedTeachers: '১৮+',
      passRate: '৯৮.৫%',
      gpa5Count: '১২০+',
    },
  };

  return {
    users,
    classes,
    batches,
    subjects,
    teachers,
    students,
    admissions,
    routines,
    attendance,
    invoices,
    payments,
    exams,
    results,
    notices,
    studyMaterials,
    homework,
    homeworkSubmissions,
    conversations,
    messages,
    notifications,
    activityLogs,
    settings,
    resetCodes: {},
  };
}

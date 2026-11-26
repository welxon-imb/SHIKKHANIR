export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export type AcademicClassId = 'class-8' | 'class-9' | 'class-10' | 'ssc-batch';

export interface AuthUser {
  id: string;
  userCode: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  studentId?: string;
  teacherId?: string;
}

export interface AcademicClass {
  id: AcademicClassId;
  nameBn: string;
  nameEn: string;
  shortCode: string;
  description: string;
  monthlyFee: number;
  scheduleSummary: string;
  highlights: string[];
  subjects: string[];
  targetGroup: string;
  isExamBatch?: boolean;
}

export interface Batch {
  id: string;
  classId: AcademicClassId;
  name: string;
  timeSlot: string;
  room: string;
  capacity: number;
  academicYear: number;
}

export interface Subject {
  id: string;
  classId: AcademicClassId;
  nameBn: string;
  code: string;
  fullMarks: number;
  passMarks: number;
}

export interface Teacher {
  id: string;
  userCode: string;
  name: string;
  designation: string;
  qualification: string;
  subjects: string[];
  assignedClassIds: AcademicClassId[];
  phone: string;
  email: string;
  avatarUrl: string;
  bio: string;
  experienceYears: number;
  isActive: boolean;
  joinedAt: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  classId: AcademicClassId;
  batchId: string;
  rollNumber: string;
  academicYear: number;
  isPrimary: boolean;
  status: 'ACTIVE' | 'COMPLETED' | 'INACTIVE';
  enrolledAt: string;
}

export interface Student {
  id: string;
  studentCode: string;
  name: string;
  photoUrl?: string;
  dateOfBirth: string;
  phone: string;
  email?: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
  previousSchool: string;
  admissionDate: string;
  isActive: boolean;
  enrollments: Enrollment[];
}

export type AdmissionStatus = 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';

export interface AdmissionApplication {
  id: string;
  applicationId: string;
  studentName: string;
  photoUrl?: string;
  dateOfBirth: string;
  phone: string;
  email?: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
  previousSchool: string;
  classId: AcademicClassId;
  batchId: string;
  academicInfo: string;
  status: AdmissionStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
  approvedStudentCode?: string;
  assignedRoll?: string;
}

export type DayOfWeek =
  | 'শনিবার'
  | 'রবিবার'
  | 'সোমবার'
  | 'মঙ্গলবার'
  | 'বুধবার'
  | 'বৃহস্পতিবার';

export interface ClassRoutine {
  id: string;
  classId: AcademicClassId;
  batchId: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  room: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Leave';

export interface AttendanceRecord {
  id: string;
  date: string;
  classId: AcademicClassId;
  batchId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  rollNumber: string;
  status: AttendanceStatus;
  markedBy: string;
  remarks?: string;
}

export type InvoiceStatus = 'Paid' | 'Unpaid' | 'Pending' | 'Partial';

export interface MonthlyInvoice {
  id: string;
  invoiceNo: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  classId: AcademicClassId;
  batchId: string;
  monthIndex: number; // 1-12
  monthNameBn: string;
  academicYear: number;
  amount: number;
  paidAmount: number;
  status: InvoiceStatus;
  dueDate: string;
}

export type PaymentMethodType = 'বিকাশ' | 'নগদ' | 'ব্যাংক' | 'নগদ (অফিস)' | 'অনলাইন গেটওয়ে';

export interface PaymentRecord {
  id: string;
  receiptNo: string;
  invoiceId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  amount: number;
  method: PaymentMethodType;
  transactionId: string;
  senderPhone?: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  submittedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  notes?: string;
}

export interface Exam {
  id: string;
  title: string;
  classId: AcademicClassId;
  batchId: string;
  academicYear: number;
  examDate: string;
  examTime: string;
  subjects: {
    subjectName: string;
    fullMarks: number;
    passMarks: number;
  }[];
  isPublished: boolean;
}

export interface SubjectMark {
  subjectName: string;
  fullMarks: number;
  passMarks: number;
  obtainedMarks: number;
  gpa: number;
  grade: string;
  remarks?: string;
}

export interface ExamResult {
  id: string;
  examId: string;
  examTitle: string;
  classId: AcademicClassId;
  batchId: string;
  academicYear: number;
  studentId: string;
  studentCode: string;
  studentName: string;
  rollNumber: string;
  photoUrl?: string;
  subjectMarks: SubjectMark[];
  totalFullMarks: number;
  totalObtained: number;
  gpa: number;
  grade: string;
  passed: boolean;
  classRank: number;
  batchRank: number;
  isPublished: boolean;
  publishedAt?: string;
}

export type NoticeType =
  | 'সাধারণ নোটিশ'
  | 'জরুরি নোটিশ'
  | 'পরীক্ষার নোটিশ'
  | 'ভর্তি বিজ্ঞপ্তি'
  | 'ছুটির নোটিশ'
  | 'ক্লাসের নোটিশ';

export interface Notice {
  id: string;
  title: string;
  description: string;
  type: NoticeType;
  date: string;
  targetClassId: AcademicClassId | 'ALL';
  targetBatchId?: string | 'ALL';
  isPinned: boolean;
  attachmentName?: string;
  attachmentUrl?: string;
  publishedBy: string;
}

export interface StudyMaterial {
  id: string;
  title: string;
  subject: string;
  classId: AcademicClassId;
  batchId: string | 'ALL';
  description: string;
  fileName: string;
  fileSize: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Homework {
  id: string;
  title: string;
  description: string;
  subject: string;
  classId: AcademicClassId;
  batchId: string;
  teacherId: string;
  teacherName: string;
  deadline: string;
  attachmentName?: string;
  createdAt: string;
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  note: string;
  fileName?: string;
  submittedAt: string;
  status: 'Submitted' | 'Checked';
  teacherFeedback?: string;
}

export interface Conversation {
  id: string;
  type: 'GROUP' | 'PRIVATE';
  title: string;
  classId?: AcademicClassId;
  participantIds: string[];
  participantRoles: UserRole[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  attachmentName?: string;
  attachmentType?: 'image' | 'pdf';
  attachmentUrl?: string;
  replyToId?: string;
  replyToPreview?: string;
  sentAt: string;
  readBy: string[];
  reportedBy?: string[];
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  category: 'notice' | 'message' | 'exam' | 'result' | 'payment' | 'admission' | 'homework';
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actorName: string;
  actorRole: UserRole | 'PUBLIC';
  action: string;
  details: string;
  timestamp: string;
}

export interface WebsiteSettings {
  instituteNameBn: string;
  instituteNameEn: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBannerUrl?: string;
  address: string;
  phone: string;
  email: string;
  officeHours: string;
  admissionOpen: boolean;
  academicYear: number;
  achievementStats: {
    totalStudents: string;
    experiencedTeachers: string;
    passRate: string;
    gpa5Count: string;
  };
}

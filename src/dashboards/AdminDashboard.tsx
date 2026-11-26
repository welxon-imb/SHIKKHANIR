import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Edit3,
  FileText,
  FolderOpen,
  Globe,
  GraduationCap,
  Home,
  Layers,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Printer,
  Settings,
  Trash2,
  Trophy,
  Upload,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { MessagingCenter } from '../components/MessagingCenter';
import { PrintableMarksheet } from '../components/PrintableMarksheet';
import { PrintableReceipt } from '../components/PrintableReceipt';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../services/api';
import type {
  AcademicClass,
  AcademicClassId,
  ActivityLog,
  AdmissionApplication,
  AppNotification,
  AttendanceRecord,
  Batch,
  ClassRoutine,
  DayOfWeek,
  Exam,
  ExamResult,
  Homework,
  HomeworkSubmission,
  MonthlyInvoice,
  Notice,
  NoticeType,
  PaymentRecord,
  Student,
  StudyMaterial,
  Subject,
  Teacher,
  WebsiteSettings,
} from '../types';
import {
  calculateAttendancePercentage,
  calculateInvoiceSummary,
  exportRowsToCsv,
  formatBengaliOrdinal,
  formatTaka,
  getClassNameBn,
  toBengaliDigits,
} from '../utils/academicLogic';
import { AdminReportsPanel } from './AdminReportsPanel';

interface AdminOverviewData {
  students: Student[];
  teachers: Teacher[];
  classes: AcademicClass[];
  batches: Batch[];
  subjects: Subject[];
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
  activityLogs: ActivityLog[];
  settings: WebsiteSettings;
}

type AdminTab =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'classes'
  | 'batches'
  | 'admissions'
  | 'routines'
  | 'attendance'
  | 'payments'
  | 'exams'
  | 'results'
  | 'rankings'
  | 'messaging'
  | 'notices'
  | 'materials'
  | 'homework'
  | 'reports'
  | 'website'
  | 'profile';

export const AdminDashboard: React.FC<{ onSettingsUpdated?: () => void }> = ({
  onSettingsUpdated,
}) => {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Pagination
  const [stuSearch, setStuSearch] = useState('');
  const [stuClassFilter, setStuClassFilter] = useState('ALL');
  const [stuPage, setStuPage] = useState(1);
  const [payFilter, setPayFilter] = useState<'ALL' | 'Pending' | 'Verified' | 'Rejected'>('ALL');
  const [rankExamFilter, setRankExamFilter] = useState('');

  // Modals / Forms
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [stuForm, setStuForm] = useState({
    name: '',
    phone: '',
    guardianName: '',
    guardianPhone: '',
    address: '',
    previousSchool: '',
    classId: 'class-8' as AcademicClassId,
    batchId: 'batch-8-morning',
    rollNumber: '',
  });

  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [tchForm, setTchForm] = useState({
    name: '',
    designation: '',
    qualification: '',
    subjects: 'গণিত',
    assignedClassIds: ['class-8'] as AcademicClassId[],
    phone: '',
    email: '',
    bio: '',
    experienceYears: '5',
    avatarUrl: '/src/assets/images/teacher_male_science_1795498507832.jpg',
  });

  const [batchForm, setBatchForm] = useState({
    classId: 'class-8' as AcademicClassId,
    name: '',
    timeSlot: '',
    room: '',
    capacity: '40',
  });

  const [subjectForm, setSubjectForm] = useState({
    classId: 'class-8' as AcademicClassId,
    nameBn: '',
    code: '',
    fullMarks: '100',
    passMarks: '33',
  });

  const [routineForm, setRoutineForm] = useState({
    classId: 'class-10' as AcademicClassId,
    batchId: 'batch-10-science',
    day: 'শনিবার' as DayOfWeek,
    startTime: '03:00 PM',
    endTime: '04:00 PM',
    subjectName: 'গণিত',
    teacherId: 'tch-1',
    room: 'কক্ষ ৩০২',
  });

  const [examForm, setExamForm] = useState({
    title: '',
    classId: 'class-10' as AcademicClassId,
    batchId: 'batch-10-science',
    examDate: '2026-12-05',
    examTime: 'বিকাল ৪:০০ – ৬:০০',
    subjectNames: 'গণিত, পদার্থবিজ্ঞান, ইংরেজি',
  });

  const [noticeForm, setNoticeForm] = useState({
    title: '',
    description: '',
    type: 'সাধারণ নোটিশ' as NoticeType,
    targetClassId: 'ALL',
    isPinned: false,
  });

  const [matForm, setMatForm] = useState({
    title: '',
    subject: 'গণিত',
    classId: 'class-10' as AcademicClassId,
    description: '',
    fileName: '',
  });

  const [hwForm, setHwForm] = useState({
    title: '',
    description: '',
    subject: 'গণিত',
    classId: 'class-10' as AcademicClassId,
    batchId: 'batch-10-science',
    deadline: '2026-11-30',
  });

  const [settingsDraft, setSettingsDraft] = useState<WebsiteSettings | null>(null);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '' });
  const [marksheetTarget, setMarksheetTarget] = useState<ExamResult | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<PaymentRecord | null>(null);
  const [offlinePayInvId, setOfflinePayInvId] = useState('');
  const [offlinePayAmt, setOfflinePayAmt] = useState('');
  const [editingClass, setEditingClass] = useState<AcademicClass | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setErrorMsg(null);
    window.setTimeout(() => setToast(null), 3500);
  };

  const loadAll = async () => {
    try {
      const [overview, notifs] = await Promise.all([
        apiFetch<AdminOverviewData>('/api/admin/overview'),
        apiFetch<{ notifications: AppNotification[] }>('/api/notifications'),
      ]);
      setData(overview);
      setSettingsDraft(overview.settings);
      setNotifications(notifs.notifications);
      if (!rankExamFilter && overview.exams[0]) {
        setRankExamFilter(overview.exams[0].id);
      }
      if (!offlinePayInvId) {
        const firstUnpaid = overview.invoices.find((i) => i.status !== 'Paid');
        if (firstUnpaid) {
          setOfflinePayInvId(firstUnpaid.id);
          setOfflinePayAmt(String(firstUnpaid.amount - firstUnpaid.paidAmount));
        }
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await apiFetch('/api/admin/students', {
        method: 'POST',
        body: JSON.stringify(stuForm),
      });
      setShowAddStudent(false);
      setStuForm({
        name: '',
        phone: '',
        guardianName: '',
        guardianPhone: '',
        address: '',
        previousSchool: '',
        classId: 'class-8',
        batchId: 'batch-8-morning',
        rollNumber: '',
      });
      await loadAll();
      notify('শিক্ষার্থী সফলভাবে যুক্ত হয়েছে।');
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleSaveEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;
    await apiFetch(`/api/admin/students/${editStudent.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: editStudent.name,
        phone: editStudent.phone,
        guardianName: editStudent.guardianName,
        guardianPhone: editStudent.guardianPhone,
        address: editStudent.address,
        rollNumber: editStudent.enrollments[0]?.rollNumber,
      }),
    });
    setEditStudent(null);
    await loadAll();
    notify('শিক্ষার্থীর তথ্য হালনাগাদ হয়েছে।');
  };

  const handleToggleStudentActive = async (s: Student) => {
    await apiFetch(`/api/admin/students/${s.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    await loadAll();
    notify(`${s.name} এখন ${!s.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}।`);
  };

  const handleAdmissionAction = async (appItem: AdmissionApplication, action: 'review' | 'approve' | 'reject') => {
    try {
      await apiFetch(`/api/admin/admissions/${appItem.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      await loadAll();
      notify(
        action === 'approve'
          ? `${appItem.studentName} অনুমোদিত ও স্টুডেন্ট অ্যাকাউন্ট সক্রিয় হয়েছে।`
          : action === 'reject'
            ? 'আবেদন বাতিল করা হয়েছে।'
            : 'আবেদনটি যাচাই পর্যায়ে নেওয়া হয়েছে।'
      );
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const readImageFile = (file: File, onDone: (dataUrl: string) => void, maxMb = 1.5) => {
    if (file.size > maxMb * 1024 * 1024) {
      setErrorMsg(`ছবির সাইজ ${maxMb} MB-এর কম হতে হবে।`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onDone(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/teachers', {
        method: 'POST',
        body: JSON.stringify({
          ...tchForm,
          subjects: tchForm.subjects.split(',').map((s) => s.trim()).filter(Boolean),
          experienceYears: Number(tchForm.experienceYears) || 3,
        }),
      });
      setShowAddTeacher(false);
      setTchForm({
        name: '',
        designation: '',
        qualification: '',
        subjects: 'গণিত',
        assignedClassIds: ['class-8'],
        phone: '',
        email: '',
        bio: '',
        experienceYears: '5',
        avatarUrl: '/src/assets/images/teacher_male_science_1795498507832.jpg',
      });
      await loadAll();
      onSettingsUpdated?.();
      notify('নতুন শিক্ষক যুক্ত হয়েছেন এবং ওয়েবসাইটে প্রকাশিত হয়েছে।');
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleSaveEditTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    try {
      await apiFetch(`/api/admin/teachers/${editingTeacher.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editingTeacher.name,
          designation: editingTeacher.designation,
          qualification: editingTeacher.qualification,
          phone: editingTeacher.phone,
          email: editingTeacher.email,
          subjects: editingTeacher.subjects,
          bio: editingTeacher.bio,
          experienceYears: editingTeacher.experienceYears,
          avatarUrl: editingTeacher.avatarUrl,
          assignedClassIds: editingTeacher.assignedClassIds,
          isActive: editingTeacher.isActive,
        }),
      });
      setEditingTeacher(null);
      await loadAll();
      onSettingsUpdated?.();
      notify('শিক্ষকের নাম, ছবি ও তথ্য হালনাগাদ হয়েছে।');
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleVerifyPayment = async (p: PaymentRecord, action: 'verify' | 'reject') => {
    try {
      await apiFetch(`/api/admin/payments/${p.id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      await loadAll();
      notify(action === 'verify' ? `পেমেন্ট (${p.receiptNo}) যাচাই ও নিশ্চিত হয়েছে।` : 'পেমেন্ট বাতিল হয়েছে।');
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleOfflinePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offlinePayInvId || !offlinePayAmt) return;
    await apiFetch('/api/admin/payments/offline', {
      method: 'POST',
      body: JSON.stringify({
        invoiceId: offlinePayInvId,
        amount: Number(offlinePayAmt),
        method: 'নগদ (অফিস)',
      }),
    });
    await loadAll();
    notify('অফিস নগদ পেমেন্ট ও রসিদ সংরক্ষিত হয়েছে।');
  };

  const handlePublishExam = async (examId: string) => {
    await apiFetch(`/api/admin/exams/${examId}/publish`, { method: 'POST' });
    await loadAll();
    notify('পরীক্ষার ফলাফল ও মেধা তালিকা প্রকাশিত হয়েছে।');
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.title.trim()) return;
    await apiFetch('/api/admin/exams', {
      method: 'POST',
      body: JSON.stringify({
        title: examForm.title,
        classId: examForm.classId,
        batchId: examForm.batchId,
        examDate: examForm.examDate,
        examTime: examForm.examTime,
        subjects: examForm.subjectNames.split(',').map((s) => ({
          subjectName: s.trim(),
          fullMarks: 100,
          passMarks: 33,
        })),
      }),
    });
    setExamForm((p) => ({ ...p, title: '' }));
    await loadAll();
    notify('নতুন পরীক্ষা সময়সূচি তৈরি হয়েছে।');
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeForm.title.trim() || !noticeForm.description.trim()) return;
    await apiFetch('/api/admin/notices', {
      method: 'POST',
      body: JSON.stringify(noticeForm),
    });
    setNoticeForm({ title: '', description: '', type: 'সাধারণ নোটিশ', targetClassId: 'ALL', isPinned: false });
    await loadAll();
    notify('নতুন নোটিশ প্রকাশিত হয়েছে।');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsDraft) return;
    await apiFetch('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(settingsDraft),
    });
    await loadAll();
    onSettingsUpdated?.();
    notify('ওয়েবসাইট সেটিংস সফলভাবে সংরক্ষিত হয়েছে।');
  };

  const filteredStudents = useMemo(() => {
    if (!data) return [];
    return data.students
      .filter((s) => stuClassFilter === 'ALL' || s.enrollments.some((e) => e.classId === stuClassFilter))
      .filter(
        (s) =>
          !stuSearch.trim() ||
          s.name.toLowerCase().includes(stuSearch.toLowerCase()) ||
          s.studentCode.toLowerCase().includes(stuSearch.toLowerCase()) ||
          s.phone.includes(stuSearch.trim())
      );
  }, [data, stuClassFilter, stuSearch]);

  const pageSize = 6;
  const paginatedStudents = filteredStudents.slice((stuPage - 1) * pageSize, stuPage * pageSize);
  const totalStudentPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));

  if (loading || !data || !user || !settingsDraft) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-600">
        অ্যাডমিন প্যানেল লোড হচ্ছে...
      </div>
    );
  }

  const {
    students,
    teachers,
    classes,
    batches,
    subjects,
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
    activityLogs,
    settings,
  } = data;

  const activeStudentsCount = students.filter((s) => s.isActive).length;
  const pendingAdmissionsCount = admissions.filter((a) => a.status === 'Submitted' || a.status === 'Under Review').length;
  const upcomingExamsCount = exams.filter((e) => !e.isPublished).length;
  const feeSummary = calculateInvoiceSummary(invoices);
  const attSummary = calculateAttendancePercentage(attendance);
  const unreadNotifs = notifications.filter((n) => !n.isRead).length;

  const sidebarItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: <Home className="w-4 h-4" /> },
    { id: 'students', label: 'শিক্ষার্থী ব্যবস্থাপনা', icon: <Users className="w-4 h-4" /> },
    { id: 'teachers', label: 'শিক্ষক ব্যবস্থাপনা', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'classes', label: 'শ্রেণি ও বিষয়', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'batches', label: 'ব্যাচ ব্যবস্থাপনা', icon: <Layers className="w-4 h-4" /> },
    { id: 'admissions', label: 'ভর্তি আবেদন', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'routines', label: 'রুটিন ব্যবস্থাপনা', icon: <Calendar className="w-4 h-4" /> },
    { id: 'attendance', label: 'হাজিরা ব্যবস্থাপনা', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'payments', label: 'পেমেন্ট ব্যবস্থাপনা', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'exams', label: 'পরীক্ষা ব্যবস্থাপনা', icon: <FileText className="w-4 h-4" /> },
    { id: 'results', label: 'ফলাফল ব্যবস্থাপনা', icon: <Award className="w-4 h-4" /> },
    { id: 'rankings', label: 'মেধা তালিকা', icon: <Trophy className="w-4 h-4" /> },
    { id: 'messaging', label: 'মেসেজিং', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'notices', label: 'নোটিশ ব্যবস্থাপনা', icon: <Bell className="w-4 h-4" /> },
    { id: 'materials', label: 'স্টাডি ম্যাটেরিয়াল', icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'homework', label: 'হোমওয়ার্ক', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'reports', label: 'রিপোর্ট ও বিশ্লেষণ', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'website', label: 'ওয়েবসাইট সেটিংস', icon: <Globe className="w-4 h-4" /> },
    { id: 'profile', label: 'প্রোফাইল সেটিংস', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <div className="bg-white border-b border-slate-200 px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="মেনু" className="lg:hidden p-2 rounded-lg border border-slate-200">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-xs sm:text-sm font-bold text-[#0F2942]">অ্যাডমিন কন্ট্রোল প্যানেল</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowNotifs(!showNotifs)}
            aria-label="নোটিফিকেশন"
            className="relative p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadNotifs}
              </span>
            )}
          </button>
          <div className="hidden sm:block text-right leading-tight pl-2 border-l border-slate-200">
            <p className="text-xs font-bold text-[#0F2942]">{user.name}</p>
            <p className="text-[11px] font-mono text-slate-500">{user.userCode}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="w-3.5 h-3.5" /> লগআউট
          </button>
        </div>
      </div>

      <div className="flex-1 flex max-w-[1440px] w-full mx-auto">
        <aside className="hidden lg:block w-64 shrink-0 bg-white border-r border-slate-200 p-3 space-y-0.5 overflow-y-auto no-print">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                tab === item.id ? 'bg-[#0F2942] text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-[#0F2942]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div className="w-64 bg-white h-full border-r border-slate-200 p-3 space-y-0.5 overflow-y-auto">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
                <span className="font-bold text-sm text-[#0F2942]">অ্যাডমিন মেনু</span>
                <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="বন্ধ করুন"><X className="w-4 h-4" /></button>
              </div>
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setTab(item.id); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                    tab === item.id ? 'bg-[#0F2942] text-white' : 'text-slate-700'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            <div className="flex-1 bg-slate-900/40" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 space-y-6 min-w-0">
          {toast && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 no-print">
              {toast}
            </div>
          )}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 no-print">
              {errorMsg}
            </div>
          )}

          {/* 1. DASHBOARD OVERVIEW (9 CARDS) */}
          {tab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-xl font-bold text-[#0F2942]">প্রশাসনিক সারসংক্ষেপ</h1>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setTab('admissions')} className="px-3.5 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold">
                    ভর্তি যাচাই ({toBengaliDigits(pendingAdmissionsCount)})
                  </button>
                  <button type="button" onClick={() => setTab('payments')} className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-[#0F2942]">
                    পেমেন্ট যাচাই
                  </button>
                  <button type="button" onClick={() => setTab('reports')} className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-[#1D4ED8]">
                    রিপোর্ট দেখুন
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">মোট শিক্ষার্থী</p>
                  <p className="text-2xl font-bold text-[#0F2942] tabular-nums mt-1">{toBengaliDigits(students.length)} জন</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">সক্রিয় শিক্ষার্থী</p>
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">{toBengaliDigits(activeStudentsCount)} জন</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">মোট শিক্ষক</p>
                  <p className="text-2xl font-bold text-[#0F2942] tabular-nums mt-1">{toBengaliDigits(teachers.length)} জন</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">মোট ব্যাচ</p>
                  <p className="text-2xl font-bold text-[#1D4ED8] tabular-nums mt-1">{toBengaliDigits(batches.length)}টি</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">উপস্থিতির হার</p>
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">{toBengaliDigits(attSummary.percentage)}%</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">মোট আদায়কৃত আয়</p>
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">{formatTaka(feeSummary.totalPaid)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">মোট বকেয়া</p>
                  <p className="text-2xl font-bold text-red-600 tabular-nums mt-1">{formatTaka(feeSummary.totalDue)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">নতুন ভর্তি আবেদন</p>
                  <p className="text-2xl font-bold text-[#C59B38] tabular-nums mt-1">{toBengaliDigits(pendingAdmissionsCount)}টি</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">আসন্ন / অপ্রকাশিত পরীক্ষা</p>
                  <p className="text-2xl font-bold text-[#1D4ED8] tabular-nums mt-1">{toBengaliDigits(upcomingExamsCount)}টি</p>
                </div>
              </div>
            </div>
          )}

          {/* 2. STUDENT MANAGEMENT */}
          {tab === 'students' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-[#0F2942]">শিক্ষার্থী ব্যবস্থাপনা</h2>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="search"
                    value={stuSearch}
                    onChange={(e) => { setStuSearch(e.target.value); setStuPage(1); }}
                    placeholder="নাম, আইডি বা ফোন..."
                    className="px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                  <select
                    value={stuClassFilter}
                    onChange={(e) => { setStuClassFilter(e.target.value); setStuPage(1); }}
                    className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="ALL">সকল শ্রেণি</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.nameBn}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddStudent(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold"
                  >
                    <Plus className="w-4 h-4" /> নতুন শিক্ষার্থী
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <tr>
                      <th className="py-3 px-4">Student ID</th>
                      <th className="py-3 px-4">নাম</th>
                      <th className="py-3 px-4">শ্রেণি ও রোল</th>
                      <th className="py-3 px-4">মোবাইল</th>
                      <th className="py-3 px-4">অবস্থা</th>
                      <th className="py-3 px-4 text-right">ব্যবস্থাপনা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedStudents.map((s) => (
                      <tr key={s.id}>
                        <td className="py-3 px-4 font-mono text-xs">{s.studentCode}</td>
                        <td className="py-3 px-4 font-semibold">{s.name}</td>
                        <td className="py-3 px-4 text-xs">
                          {s.enrollments.map((e) => `${getClassNameBn(e.classId)} (রোল ${toBengaliDigits(e.rollNumber)})`).join(' + ')}
                        </td>
                        <td className="py-3 px-4 tabular-nums text-xs">{s.phone}</td>
                        <td className="py-3 px-4 text-xs font-bold">
                          <span className={s.isActive ? 'text-emerald-700' : 'text-red-600'}>
                            {s.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                          <button type="button" onClick={() => setEditStudent(s)} className="text-xs font-semibold text-[#1D4ED8] hover:underline">
                            সম্পাদনা
                          </button>
                          <button type="button" onClick={() => void handleToggleStudentActive(s)} className="text-xs font-semibold text-slate-600 hover:underline">
                            {s.isActive ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <span>পৃষ্ঠা {toBengaliDigits(stuPage)} / {toBengaliDigits(totalStudentPages)}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={stuPage <= 1}
                    onClick={() => setStuPage((p) => p - 1)}
                    className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40"
                  >
                    পূর্ববর্তী
                  </button>
                  <button
                    type="button"
                    disabled={stuPage >= totalStudentPages}
                    onClick={() => setStuPage((p) => p + 1)}
                    className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40"
                  >
                    পরবর্তী
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. TEACHER MANAGEMENT */}
          {tab === 'teachers' && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[#0F2942]">শিক্ষক ব্যবস্থাপনা</h2>
                  <p className="text-xs text-slate-500 mt-0.5">শিক্ষকের নাম, ছবি, পদবি ও তথ্য যুক্ত বা সম্পাদনা করুন (সরাসরি পাবলিক ওয়েবসাইটে প্রদর্শিত হবে)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddTeacher(true)}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-[#0F2942] text-white text-xs font-semibold hover:bg-[#173a5e]"
                >
                  <Plus className="w-4 h-4" /> শিক্ষক যোগ করুন
                </button>
              </div>

              {/* Mobile Card View */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {teachers.map((t) => (
                  <div key={t.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={t.avatarUrl}
                        alt={t.name}
                        className="w-14 h-14 rounded-full object-cover object-top border border-slate-200 shrink-0 bg-white"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] text-slate-500">{t.userCode}</span>
                          <span className={`text-[11px] font-semibold ${t.isActive ? 'text-emerald-700' : 'text-red-600'}`}>
                            {t.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                          </span>
                        </div>
                        <p className="font-bold text-sm text-[#0F2942] truncate">{t.name}</p>
                        <p className="text-xs text-[#1D4ED8] truncate">{t.designation}</p>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p>বিষয়: {t.subjects.join(', ')}</p>
                      <p>শ্রেণি: {t.assignedClassIds.map(getClassNameBn).join(', ')}</p>
                      <p className="tabular-nums">ফোন: {t.phone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingTeacher({ ...t })}
                      className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-[#0F2942] hover:bg-slate-100"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> ছবি ও তথ্য সম্পাদনা
                    </button>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <tr>
                      <th className="py-3 px-4">কোড</th>
                      <th className="py-3 px-4">শিক্ষক (ছবি ও নাম)</th>
                      <th className="py-3 px-4">বিষয়</th>
                      <th className="py-3 px-4">অনুমোদিত শ্রেণি</th>
                      <th className="py-3 px-4">ফোন</th>
                      <th className="py-3 px-4">অবস্থা</th>
                      <th className="py-3 px-4 text-right">সম্পাদনা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teachers.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono text-xs">{t.userCode}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={t.avatarUrl}
                              alt={t.name}
                              className="w-10 h-10 rounded-full object-cover object-top border border-slate-200 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <p className="font-semibold text-[#0F2942]">{t.name}</p>
                              <p className="text-xs text-slate-500">{t.designation}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs">{t.subjects.join(', ')}</td>
                        <td className="py-3 px-4 text-xs">{t.assignedClassIds.map(getClassNameBn).join(', ')}</td>
                        <td className="py-3 px-4 tabular-nums text-xs">{t.phone}</td>
                        <td className="py-3 px-4 text-xs font-semibold">
                          <span className={t.isActive ? 'text-emerald-700' : 'text-red-600'}>
                            {t.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setEditingTeacher({ ...t })}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-[#0F2942] hover:bg-slate-50"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> সম্পাদনা
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. CLASS & SUBJECT MANAGEMENT */}
          {tab === 'classes' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classes.map((c) => (
                  <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-bold text-[#0F2942]">{c.nameBn}</h3>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#1D4ED8] tabular-nums">{formatTaka(c.monthlyFee)}/মাস</span>
                        <button
                          type="button"
                          onClick={() => setEditingClass({ ...c })}
                          className="text-xs font-semibold text-[#0F2942] border border-slate-200 px-2.5 py-1 rounded-md hover:bg-slate-50"
                        >
                          ফি/সময় সম্পাদনা
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">{c.scheduleSummary}</p>
                    <p className="text-xs text-slate-600">বিষয়সমূহ: {subjects.filter((s) => s.classId === c.id).map((s) => s.nameBn).join(', ')}</p>
                  </div>
                ))}
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiFetch('/api/admin/subjects', { method: 'POST', body: JSON.stringify(subjectForm) });
                  setSubjectForm((p) => ({ ...p, nameBn: '', code: '' }));
                  await loadAll();
                  notify('নতুন বিষয় যুক্ত হয়েছে।');
                }}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <h3 className="text-base font-bold text-[#0F2942]">নতুন বিষয় তৈরি করুন</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <select value={subjectForm.classId} onChange={(e) => setSubjectForm({ ...subjectForm, classId: e.target.value as AcademicClassId })} className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white">
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.nameBn}</option>)}
                  </select>
                  <input type="text" value={subjectForm.nameBn} onChange={(e) => setSubjectForm({ ...subjectForm, nameBn: e.target.value })} placeholder="বিষয়ের নাম" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                  <input type="text" value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} placeholder="কোড (যেমন: BIO-10)" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                  <button type="submit" className="px-4 py-2 rounded-lg bg-[#0F2942] text-white text-sm font-semibold">বিষয় যুক্ত করুন</button>
                </div>
              </form>
            </div>
          )}

          {/* 5. BATCH MANAGEMENT */}
          {tab === 'batches' && (
            <div className="space-y-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiFetch('/api/admin/batches', { method: 'POST', body: JSON.stringify(batchForm) });
                  setBatchForm((p) => ({ ...p, name: '', timeSlot: '', room: '' }));
                  await loadAll();
                  notify('নতুন ব্যাচ তৈরি হয়েছে।');
                }}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <h2 className="text-lg font-bold text-[#0F2942]">নতুন ব্যাচ তৈরি করুন</h2>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <select value={batchForm.classId} onChange={(e) => setBatchForm({ ...batchForm, classId: e.target.value as AcademicClassId })} className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white">
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.nameBn}</option>)}
                  </select>
                  <input type="text" value={batchForm.name} onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })} placeholder="ব্যাচের নাম" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                  <input type="text" value={batchForm.timeSlot} onChange={(e) => setBatchForm({ ...batchForm, timeSlot: e.target.value })} placeholder="সময় (যেমন: বিকাল ৩:০০)" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                  <input type="text" value={batchForm.room} onChange={(e) => setBatchForm({ ...batchForm, room: e.target.value })} placeholder="কক্ষ নম্বর" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                  <button type="submit" className="px-4 py-2 rounded-lg bg-[#0F2942] text-white text-sm font-semibold">তৈরি করুন</button>
                </div>
              </form>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {batches.map((b) => (
                  <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-semibold text-[#1D4ED8]">{getClassNameBn(b.classId)}</p>
                    <h3 className="font-bold text-[#0F2942] mt-0.5">{b.name}</h3>
                    <p className="text-xs text-slate-600 mt-1">{b.timeSlot} · {b.room} · আসন: {toBengaliDigits(b.capacity)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. ADMISSION MANAGEMENT */}
          {tab === 'admissions' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <h2 className="text-xl font-bold text-[#0F2942]">অনলাইন ভর্তি আবেদন ব্যবস্থাপনা</h2>
              <div className="space-y-4">
                {admissions.map((a) => (
                  <div key={a.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-[#0F2942]">{a.applicationId}</span>
                        <span>·</span>
                        <span className="font-semibold text-[#1D4ED8]">{getClassNameBn(a.classId)}</span>
                        <span>·</span>
                        <span className={`font-bold ${
                          a.status === 'Approved' ? 'text-emerald-700' : a.status === 'Rejected' ? 'text-red-600' : 'text-amber-700'
                        }`}>
                          {a.status}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#0F2942]">{a.studentName}</h3>
                      <p className="text-xs text-slate-600">
                        ফোন: {a.phone} · অভিভাবক: {a.guardianName} ({a.guardianPhone}) · বিদ্যালয়: {a.previousSchool}
                      </p>
                      {a.approvedStudentCode && (
                        <p className="text-xs font-semibold text-emerald-700">
                          অনুমোদিত Student ID: {a.approvedStudentCode} · রোল: {a.assignedRoll}
                        </p>
                      )}
                    </div>
                    {a.status !== 'Approved' && a.status !== 'Rejected' && (
                      <div className="flex flex-wrap gap-2">
                        {a.status === 'Submitted' && (
                          <button type="button" onClick={() => void handleAdmissionAction(a, 'review')} className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold">
                            Under Review
                          </button>
                        )}
                        <button type="button" onClick={() => void handleAdmissionAction(a, 'approve')} className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800">
                          অনুমোদন করুন
                        </button>
                        <button type="button" onClick={() => void handleAdmissionAction(a, 'reject')} className="px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                          বাতিল
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. ROUTINE MANAGEMENT */}
          {tab === 'routines' && (
            <div className="space-y-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiFetch('/api/admin/routines', { method: 'POST', body: JSON.stringify(routineForm) });
                  await loadAll();
                  notify('নতুন ক্লাস রুটিন যুক্ত হয়েছে।');
                }}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <h2 className="text-lg font-bold text-[#0F2942]">নতুন রুটিন স্লট যোগ করুন (শনি – বৃহস্পতি)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <select value={routineForm.classId} onChange={(e) => setRoutineForm({ ...routineForm, classId: e.target.value as AcademicClassId, batchId: batches.find((b) => b.classId === e.target.value)?.id ?? '' })} className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white">
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.nameBn}</option>)}
                  </select>
                  <select value={routineForm.day} onChange={(e) => setRoutineForm({ ...routineForm, day: e.target.value as DayOfWeek })} className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white">
                    {['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার'].map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input type="text" value={routineForm.subjectName} onChange={(e) => setRoutineForm({ ...routineForm, subjectName: e.target.value })} placeholder="বিষয়" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                  <select value={routineForm.teacherId} onChange={(e) => setRoutineForm({ ...routineForm, teacherId: e.target.value })} className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white">
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <input type="text" value={routineForm.startTime} onChange={(e) => setRoutineForm({ ...routineForm, startTime: e.target.value })} placeholder="শুরুর সময়" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                  <input type="text" value={routineForm.endTime} onChange={(e) => setRoutineForm({ ...routineForm, endTime: e.target.value })} placeholder="শেষ সময়" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                  <input type="text" value={routineForm.room} onChange={(e) => setRoutineForm({ ...routineForm, room: e.target.value })} placeholder="কক্ষ নম্বর" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                  <button type="submit" className="px-4 py-2 rounded-lg bg-[#0F2942] text-white text-sm font-semibold">রুটিন যোগ</button>
                </div>
              </form>
              <div className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <tr>
                      <th className="py-3 px-4">বার</th>
                      <th className="py-3 px-4">সময়</th>
                      <th className="py-3 px-4">শ্রেণি</th>
                      <th className="py-3 px-4">বিষয়</th>
                      <th className="py-3 px-4">শিক্ষক</th>
                      <th className="py-3 px-4 text-right">মুছুন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {routines.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-bold">{r.day}</td>
                        <td className="py-3 px-4 tabular-nums">{r.startTime} – {r.endTime}</td>
                        <td className="py-3 px-4">{getClassNameBn(r.classId)}</td>
                        <td className="py-3 px-4">{r.subjectName}</td>
                        <td className="py-3 px-4">{r.teacherName}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/admin/routines/${r.id}`, { method: 'DELETE' });
                              await loadAll();
                            }}
                            aria-label="মুছুন"
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 8. ATTENDANCE REPORTS */}
          {tab === 'attendance' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-[#0F2942]">হাজিরা প্রতিবেদন</h2>
                <button
                  type="button"
                  onClick={() =>
                    exportRowsToCsv(
                      'shikkhanir_attendance.csv',
                      ['তারিখ', 'শ্রেণি', 'রোল', 'শিক্ষার্থী', 'অবস্থা', 'শিক্ষক'],
                      attendance.map((a) => [a.date, getClassNameBn(a.classId), a.rollNumber, a.studentName, a.status, a.markedBy])
                    )
                  }
                  className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
                >
                  Excel / CSV ডাউনলোড
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <tr>
                      <th className="py-3 px-4">তারিখ</th>
                      <th className="py-3 px-4">শ্রেণি</th>
                      <th className="py-3 px-4">রোল</th>
                      <th className="py-3 px-4">নাম</th>
                      <th className="py-3 px-4">অবস্থা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendance.map((a) => (
                      <tr key={a.id}>
                        <td className="py-3 px-4 tabular-nums">{toBengaliDigits(a.date)}</td>
                        <td className="py-3 px-4">{getClassNameBn(a.classId)}</td>
                        <td className="py-3 px-4 font-mono">{toBengaliDigits(a.rollNumber)}</td>
                        <td className="py-3 px-4 font-semibold">{a.studentName}</td>
                        <td className="py-3 px-4 font-bold">
                          <span className={a.status === 'Present' ? 'text-emerald-700' : a.status === 'Absent' ? 'text-red-600' : 'text-amber-700'}>
                            {a.status === 'Present' ? 'উপস্থিত' : a.status === 'Absent' ? 'অনুপস্থিত' : a.status === 'Late' ? 'বিলম্ব' : 'ছুটি'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 9. PAYMENT MANAGEMENT */}
          {tab === 'payments' && (
            <div className="space-y-6">
              <form onSubmit={(e) => void handleOfflinePayment(e)} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#0F2942]">অফিস নগদ ফি গ্রহণ (সরাসরি রসিদ)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select value={offlinePayInvId} onChange={(e) => setOfflinePayInvId(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white">
                    {invoices.filter((i) => i.status !== 'Paid').slice(0, 40).map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.studentName} ({inv.monthNameBn}) — বকেয়া {formatTaka(inv.amount - inv.paidAmount)}
                      </option>
                    ))}
                  </select>
                  <input type="number" value={offlinePayAmt} onChange={(e) => setOfflinePayAmt(e.target.value)} placeholder="টাকার পরিমাণ" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                  <button type="submit" className="px-4 py-2 rounded-lg bg-[#0F2942] text-white text-sm font-semibold">নগদ গ্রহণ ও রসিদ</button>
                </div>
              </form>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-[#0F2942]">পেমেন্ট যাচাই ও লেনদেন তালিকা</h2>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    {(['ALL', 'Pending', 'Verified', 'Rejected'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setPayFilter(st)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md ${payFilter === st ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600'}`}
                      >
                        {st === 'ALL' ? 'সকল' : st === 'Pending' ? 'অপেক্ষমাণ' : st === 'Verified' ? 'নিশ্চিত' : 'বাতিল'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                      <tr>
                        <th className="py-3 px-4">রসিদ</th>
                        <th className="py-3 px-4">শিক্ষার্থী</th>
                        <th className="py-3 px-4">মাধ্যম ও TxID</th>
                        <th className="py-3 px-4 text-right">টাকা</th>
                        <th className="py-3 px-4">অবস্থা</th>
                        <th className="py-3 px-4 text-right">কার্যক্রম</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments
                        .filter((p) => payFilter === 'ALL' || p.status === payFilter)
                        .map((p) => (
                          <tr key={p.id}>
                            <td className="py-3 px-4 font-mono text-xs">{p.receiptNo}</td>
                            <td className="py-3 px-4 font-semibold">{p.studentName}</td>
                            <td className="py-3 px-4 text-xs">{p.method} · <span className="font-mono">{p.transactionId}</span></td>
                            <td className="py-3 px-4 text-right font-bold tabular-nums">{formatTaka(p.amount)}</td>
                            <td className="py-3 px-4 text-xs font-bold">
                              <span className={p.status === 'Verified' ? 'text-emerald-700' : p.status === 'Rejected' ? 'text-red-600' : 'text-amber-700'}>
                                {p.status === 'Verified' ? 'নিশ্চিত' : p.status === 'Rejected' ? 'বাতিল' : 'অপেক্ষমাণ'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                              {p.status === 'Pending' && (
                                <>
                                  <button type="button" onClick={() => void handleVerifyPayment(p, 'verify')} className="px-2.5 py-1 rounded bg-emerald-700 text-white text-xs font-semibold">
                                    নিশ্চিত
                                  </button>
                                  <button type="button" onClick={() => void handleVerifyPayment(p, 'reject')} className="px-2.5 py-1 rounded bg-red-50 text-red-700 text-xs font-semibold">
                                    বাতিল
                                  </button>
                                </>
                              )}
                              <button type="button" onClick={() => setReceiptTarget(p)} className="text-xs font-semibold text-[#1D4ED8] hover:underline">
                                রসিদ
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 10. EXAM MANAGEMENT */}
          {tab === 'exams' && (
            <div className="space-y-6">
              <form onSubmit={(e) => void handleCreateExam(e)} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#0F2942]">নতুন পরীক্ষা তৈরি করুন</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="text" value={examForm.title} onChange={(e) => setExamForm({ ...examForm, title: e.target.value })} placeholder="পরীক্ষার নাম" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                  <select value={examForm.classId} onChange={(e) => setExamForm({ ...examForm, classId: e.target.value as AcademicClassId, batchId: batches.find((b) => b.classId === e.target.value)?.id ?? '' })} className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white">
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.nameBn}</option>)}
                  </select>
                  <input type="date" value={examForm.examDate} onChange={(e) => setExamForm({ ...examForm, examDate: e.target.value })} className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                  <input type="text" value={examForm.examTime} onChange={(e) => setExamForm({ ...examForm, examTime: e.target.value })} placeholder="সময়" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                  <input type="text" value={examForm.subjectNames} onChange={(e) => setExamForm({ ...examForm, subjectNames: e.target.value })} placeholder="বিষয়সমূহ (কমা দিয়ে)" className="sm:col-span-2 px-3 py-2 text-sm rounded-lg border border-slate-300" />
                </div>
                <button type="submit" className="px-5 py-2 rounded-lg bg-[#0F2942] text-white text-sm font-semibold">পরীক্ষা যুক্ত করুন</button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exams.map((ex) => (
                  <div key={ex.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-[#1D4ED8]">{getClassNameBn(ex.classId)} · {toBengaliDigits(ex.examDate)}</p>
                      <h3 className="font-bold text-[#0F2942] mt-0.5">{ex.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{ex.subjects.map((s) => s.subjectName).join(', ')}</p>
                    </div>
                    {ex.isPublished ? (
                      <span className="text-xs font-bold text-emerald-700">প্রকাশিত</span>
                    ) : (
                      <button type="button" onClick={() => void handlePublishExam(ex.id)} className="px-3.5 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold whitespace-nowrap">
                        ফলাফল প্রকাশ
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 11. RESULT MANAGEMENT */}
          {tab === 'results' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-xl font-bold text-[#0F2942]">ফলাফল ও মার্কশিট ব্যবস্থাপনা</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <tr>
                      <th className="py-3 px-4">পরীক্ষা</th>
                      <th className="py-3 px-4">শিক্ষার্থী</th>
                      <th className="py-3 px-4 text-right">মোট নম্বর</th>
                      <th className="py-3 px-4 text-right">GPA</th>
                      <th className="py-3 px-4">অবস্থা</th>
                      <th className="py-3 px-4 text-right">মার্কশিট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 text-xs font-semibold">{r.examTitle}</td>
                        <td className="py-3 px-4 font-semibold">{r.studentName} ({r.studentCode})</td>
                        <td className="py-3 px-4 text-right tabular-nums">{toBengaliDigits(r.totalObtained)}</td>
                        <td className="py-3 px-4 text-right font-bold text-[#1D4ED8] tabular-nums">{toBengaliDigits(r.gpa.toFixed(2))} ({r.grade})</td>
                        <td className="py-3 px-4 text-xs font-bold">{r.isPublished ? 'প্রকাশিত' : 'খসড়া'}</td>
                        <td className="py-3 px-4 text-right">
                          <button type="button" onClick={() => setMarksheetTarget(r)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8]">
                            <Printer className="w-3.5 h-3.5" /> মার্কশিট
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 12. RANKING MANAGEMENT */}
          {tab === 'rankings' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-[#0F2942]">মেধা তালিকা ব্যবস্থাপনা</h2>
                <select value={rankExamFilter} onChange={(e) => setRankExamFilter(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white">
                  {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <tr>
                      <th className="py-3 px-4">শ্রেণি র‍্যাংক</th>
                      <th className="py-3 px-4">ব্যাচ র‍্যাংক</th>
                      <th className="py-3 px-4">রোল</th>
                      <th className="py-3 px-4">নাম</th>
                      <th className="py-3 px-4 text-right">মোট নম্বর</th>
                      <th className="py-3 px-4 text-right">GPA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results
                      .filter((r) => r.examId === rankExamFilter && r.isPublished)
                      .sort((a, b) => a.classRank - b.classRank)
                      .map((r) => (
                        <tr key={r.id}>
                          <td className="py-3 px-4 font-bold text-[#0F2942] tabular-nums">{formatBengaliOrdinal(r.classRank)}</td>
                          <td className="py-3 px-4 font-semibold text-[#1D4ED8] tabular-nums">{formatBengaliOrdinal(r.batchRank)}</td>
                          <td className="py-3 px-4 font-mono">{toBengaliDigits(r.rollNumber)}</td>
                          <td className="py-3 px-4 font-semibold">{r.studentName}</td>
                          <td className="py-3 px-4 text-right tabular-nums">{toBengaliDigits(r.totalObtained)}</td>
                          <td className="py-3 px-4 text-right font-bold tabular-nums">{toBengaliDigits(r.gpa.toFixed(2))}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 13. MESSAGING */}
          {tab === 'messaging' && <MessagingCenter currentUser={user} />}

          {/* 14. NOTICE MANAGEMENT */}
          {tab === 'notices' && (
            <div className="space-y-6">
              <form onSubmit={(e) => void handleCreateNotice(e)} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#0F2942]">নতুন নোটিশ প্রকাশ করুন</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="text" value={noticeForm.title} onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })} placeholder="নোটিশের শিরোনাম" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                  <select value={noticeForm.type} onChange={(e) => setNoticeForm({ ...noticeForm, type: e.target.value as NoticeType })} className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white">
                    {['সাধারণ নোটিশ', 'জরুরি নোটিশ', 'পরীক্ষার নোটিশ', 'ভর্তি বিজ্ঞপ্তি', 'ছুটির নোটিশ', 'ক্লাসের নোটিশ'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={noticeForm.targetClassId} onChange={(e) => setNoticeForm({ ...noticeForm, targetClassId: e.target.value })} className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white">
                    <option value="ALL">সকল শ্রেণি</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.nameBn}</option>)}
                  </select>
                </div>
                <textarea rows={3} value={noticeForm.description} onChange={(e) => setNoticeForm({ ...noticeForm, description: e.target.value })} placeholder="বিস্তারিত বিবরণ..." className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300" />
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <input type="checkbox" checked={noticeForm.isPinned} onChange={(e) => setNoticeForm({ ...noticeForm, isPinned: e.target.checked })} />
                    গুরুত্বপূর্ণ হিসেবে পিন করুন
                  </label>
                  <button type="submit" className="px-5 py-2 rounded-lg bg-[#0F2942] text-white text-sm font-semibold">নোটিশ প্রকাশ</button>
                </div>
              </form>
              <div className="space-y-3">
                {notices.map((n) => (
                  <div key={n.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-[#1D4ED8]">{n.type} · {toBengaliDigits(n.date)} {n.isPinned ? '· পিন করা' : ''}</p>
                      <h3 className="font-bold text-[#0F2942] mt-0.5">{n.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{n.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/admin/notices/${n.id}`, { method: 'DELETE' });
                        await loadAll();
                      }}
                      aria-label="নোটিশ মুছুন"
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 15. STUDY MATERIALS */}
          {tab === 'materials' && (
            <div className="space-y-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiFetch('/api/teacher/materials', { method: 'POST', body: JSON.stringify(matForm) });
                  setMatForm({ title: '', subject: 'গণিত', classId: 'class-10', description: '', fileName: '' });
                  await loadAll();
                  notify('ম্যাটেরিয়াল যুক্ত হয়েছে।');
                }}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-3"
              >
                <h2 className="text-lg font-bold text-[#0F2942]">স্টাডি ম্যাটেরিয়াল আপলোড</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="text" value={matForm.title} onChange={(e) => setMatForm({ ...matForm, title: e.target.value })} placeholder="শিরোনাম" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                  <select value={matForm.classId} onChange={(e) => setMatForm({ ...matForm, classId: e.target.value as AcademicClassId })} className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white">
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.nameBn}</option>)}
                  </select>
                  <input type="text" value={matForm.fileName} onChange={(e) => setMatForm({ ...matForm, fileName: e.target.value })} placeholder="ফাইলের নাম (PDF)" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                </div>
                <button type="submit" className="px-5 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold">আপলোড</button>
              </form>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studyMaterials.map((m) => (
                  <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-[#1D4ED8]">{m.subject} · {getClassNameBn(m.classId)}</p>
                    <h3 className="font-bold text-[#0F2942]">{m.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{m.fileName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 16. HOMEWORK */}
          {tab === 'homework' && (
            <div className="space-y-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiFetch('/api/teacher/homework', { method: 'POST', body: JSON.stringify(hwForm) });
                  setHwForm((p) => ({ ...p, title: '', description: '' }));
                  await loadAll();
                  notify('হোমওয়ার্ক প্রকাশিত হয়েছে।');
                }}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-3"
              >
                <h2 className="text-lg font-bold text-[#0F2942]">নতুন হোমওয়ার্ক দিন</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="text" value={hwForm.title} onChange={(e) => setHwForm({ ...hwForm, title: e.target.value })} placeholder="শিরোনাম" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                  <select value={hwForm.classId} onChange={(e) => setHwForm({ ...hwForm, classId: e.target.value as AcademicClassId, batchId: batches.find((b) => b.classId === e.target.value)?.id ?? '' })} className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white">
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.nameBn}</option>)}
                  </select>
                  <input type="date" value={hwForm.deadline} onChange={(e) => setHwForm({ ...hwForm, deadline: e.target.value })} className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                </div>
                <textarea rows={2} value={hwForm.description} onChange={(e) => setHwForm({ ...hwForm, description: e.target.value })} placeholder="বিবরণ" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300" />
                <button type="submit" className="px-5 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold">প্রকাশ করুন</button>
              </form>
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                <h3 className="font-bold text-[#0F2942]">সক্রিয় হোমওয়ার্ক ও জমা ({toBengaliDigits(homeworkSubmissions.length)})</h3>
                {homework.map((h) => (
                  <div key={h.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-xs text-[#1D4ED8] font-semibold">{getClassNameBn(h.classId)} · {h.subject} · শেষ তারিখ: {toBengaliDigits(h.deadline)}</p>
                    <p className="font-bold text-[#0F2942] text-sm">{h.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 17. REPORTS */}
          {tab === 'reports' && (
            <AdminReportsPanel
              classes={classes}
              students={students}
              admissions={admissions}
              attendance={attendance}
              invoices={invoices}
              results={results}
              activityLogs={activityLogs}
            />
          )}

          {/* 18. WEBSITE SETTINGS */}
          {tab === 'website' && (
            <form onSubmit={(e) => void handleSaveSettings(e)} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 max-w-2xl">
              <h2 className="text-xl font-bold text-[#0F2942]">ওয়েবসাইট তথ্য ও হোমপেজ ব্যানার সেটিংস</h2>

              {/* Homepage Top Hero Banner Image Manager */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F2942]">হোমপেজ উপরের ব্যানার ছবি (Hero Image)</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      হোমপেজের একদম উপরের ব্যানার ছবি এখান থেকে আপলোড বা পরিবর্তন করুন (সর্বোচ্চ ২.৫ MB)।
                    </p>
                  </div>
                  {settingsDraft.heroBannerUrl && (
                    <button
                      type="button"
                      onClick={() => setSettingsDraft({ ...settingsDraft, heroBannerUrl: '' })}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      ডিফল্ট ডিজাইনে ফিরুন
                    </button>
                  )}
                </div>

                {settingsDraft.heroBannerUrl ? (
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex justify-center">
                    <img
                      src={settingsDraft.heroBannerUrl}
                      alt="হোমপেজ হিরো ব্যানার প্রিভিউ"
                      className="w-full max-h-52 object-contain object-center"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-blue-300 bg-white px-4 py-5 text-center text-xs text-slate-600">
                    বর্তমানে <strong className="text-[#0F2942]">ডিফল্ট শিক্ষানীর হিরো ডিজাইন</strong> চালু আছে। নিচে থেকে নতুন ছবি আপলোড করলে সেটি হোমপেজে দেখাবে।
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <label className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-bold cursor-pointer shrink-0">
                    <Upload className="w-4 h-4" />
                    <span>নতুন ব্যানার ছবি আপলোড</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          readImageFile(
                            file,
                            (url) => setSettingsDraft((prev) => (prev ? { ...prev, heroBannerUrl: url } : prev)),
                            2.5
                          );
                        }
                      }}
                    />
                  </label>
                  <input
                    type="text"
                    value={settingsDraft.heroBannerUrl?.startsWith('data:image/') ? '' : (settingsDraft.heroBannerUrl ?? '')}
                    onChange={(e) => setSettingsDraft({ ...settingsDraft, heroBannerUrl: e.target.value })}
                    placeholder="অথবা ছবির URL দিন (https://...)"
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">হিরো শিরোনাম</label>
                  <input type="text" value={settingsDraft.heroTitle} onChange={(e) => setSettingsDraft({ ...settingsDraft, heroTitle: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">হিরো বর্ণনা</label>
                  <textarea rows={2} value={settingsDraft.heroSubtitle} onChange={(e) => setSettingsDraft({ ...settingsDraft, heroSubtitle: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ফোন নম্বর</label>
                    <input type="text" value={settingsDraft.phone} onChange={(e) => setSettingsDraft({ ...settingsDraft, phone: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ইমেইল</label>
                    <input type="email" value={settingsDraft.email} onChange={(e) => setSettingsDraft({ ...settingsDraft, email: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ক্যাম্পাস ঠিকানা</label>
                  <input type="text" value={settingsDraft.address} onChange={(e) => setSettingsDraft({ ...settingsDraft, address: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300" />
                </div>
              </div>
              <button type="submit" className="px-6 py-2.5 rounded-lg bg-[#0F2942] text-white text-sm font-semibold">সেটিংস সংরক্ষণ</button>
            </form>
          )}

          {/* 19. PROFILE SETTINGS */}
          {tab === 'profile' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await apiFetch('/api/auth/change-password', { method: 'POST', body: JSON.stringify(pwdForm) });
                setPwdForm({ currentPassword: '', newPassword: '' });
                notify('অ্যাডমিন পাসওয়ার্ড পরিবর্তন হয়েছে।');
              }}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 max-w-md"
            >
              <h2 className="text-xl font-bold text-[#0F2942]">অ্যাডমিন পাসওয়ার্ড পরিবর্তন</h2>
              <input type="password" value={pwdForm.currentPassword} onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })} placeholder="বর্তমান পাসওয়ার্ড" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300" />
              <input type="password" value={pwdForm.newPassword} onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })} placeholder="নতুন পাসওয়ার্ড" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300" />
              <button type="submit" className="px-5 py-2.5 rounded-lg bg-[#0F2942] text-white text-sm font-semibold">আপডেট করুন</button>
            </form>
          )}
        </main>
      </div>

      {/* Mobile Bottom Quick Bar for Admin */}
      <nav
        aria-label="অ্যাডমিন মোবাইল নেভিগেশন"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 h-14 no-print"
      >
        {[
          { id: 'dashboard' as AdminTab, label: 'ড্যাশবোর্ড', icon: <Home className="w-4 h-4" /> },
          { id: 'students' as AdminTab, label: 'শিক্ষার্থী', icon: <Users className="w-4 h-4" /> },
          { id: 'teachers' as AdminTab, label: 'শিক্ষক', icon: <UserCheck className="w-4 h-4" /> },
          { id: 'admissions' as AdminTab, label: 'ভর্তি', icon: <GraduationCap className="w-4 h-4" /> },
          { id: 'payments' as AdminTab, label: 'পেমেন্ট', icon: <CreditCard className="w-4 h-4" /> },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
              tab === item.id ? 'text-[#0F2942] bg-slate-50' : 'text-slate-500'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Add Student Modal */}
      {showAddStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#0F2942]">নতুন শিক্ষার্থী যোগ করুন</h3>
              <button type="button" onClick={() => setShowAddStudent(false)} aria-label="বন্ধ করুন"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={(e) => void handleAddStudent(e)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={stuForm.name} onChange={(e) => setStuForm({ ...stuForm, name: e.target.value })} placeholder="নাম *" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                <input type="tel" value={stuForm.phone} onChange={(e) => setStuForm({ ...stuForm, phone: e.target.value })} placeholder="ফোন (017...) *" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                <input type="text" value={stuForm.guardianName} onChange={(e) => setStuForm({ ...stuForm, guardianName: e.target.value })} placeholder="অভিভাবকের নাম *" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                <input type="tel" value={stuForm.guardianPhone} onChange={(e) => setStuForm({ ...stuForm, guardianPhone: e.target.value })} placeholder="অভিভাবকের ফোন *" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                <select value={stuForm.classId} onChange={(e) => setStuForm({ ...stuForm, classId: e.target.value as AcademicClassId, batchId: batches.find((b) => b.classId === e.target.value)?.id ?? '' })} className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white">
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.nameBn}</option>)}
                </select>
                <input type="text" value={stuForm.rollNumber} onChange={(e) => setStuForm({ ...stuForm, rollNumber: e.target.value })} placeholder="রোল নম্বর (ঐচ্ছিক)" className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-lg bg-[#0F2942] text-white text-sm font-semibold">সংরক্ষণ করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#0F2942]">শিক্ষার্থী সম্পাদনা ({editStudent.studentCode})</h3>
              <button type="button" onClick={() => setEditStudent(null)} aria-label="বন্ধ করুন"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={(e) => void handleSaveEditStudent(e)} className="space-y-3">
              <input type="text" value={editStudent.name} onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300" />
              <input type="tel" value={editStudent.phone} onChange={(e) => setEditStudent({ ...editStudent, phone: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300" />
              <input
                type="text"
                value={editStudent.enrollments[0]?.rollNumber ?? ''}
                onChange={(e) => {
                  const next = [...editStudent.enrollments];
                  if (next[0]) next[0] = { ...next[0], rollNumber: e.target.value };
                  setEditStudent({ ...editStudent, enrollments: next });
                }}
                placeholder="রোল নম্বর"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
              />
              <button type="submit" className="w-full py-2.5 rounded-lg bg-[#0F2942] text-white text-sm font-semibold">আপডেট করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Teacher Modal */}
      {showAddTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 p-5 sm:p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#0F2942]">নতুন শিক্ষক যোগ করুন</h3>
              <button type="button" onClick={() => setShowAddTeacher(false)} aria-label="বন্ধ করুন" className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={(e) => void handleAddTeacher(e)} className="space-y-3.5">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <img
                  src={tchForm.avatarUrl}
                  alt="শিক্ষকের ছবি"
                  className="w-16 h-16 rounded-full object-cover object-top border border-slate-200 shrink-0 bg-white"
                  referrerPolicy="no-referrer"
                />
                <div className="space-y-2 flex-1 min-w-0">
                  <label className="inline-flex items-center gap-2 min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-[#0F2942] cursor-pointer hover:bg-slate-50">
                    <Upload className="w-3.5 h-3.5" />
                    ছবি আপলোড করুন
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) readImageFile(file, (url) => setTchForm((p) => ({ ...p, avatarUrl: url })));
                      }}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    value={tchForm.avatarUrl.startsWith('data:') ? '' : tchForm.avatarUrl}
                    onChange={(e) => setTchForm({ ...tchForm, avatarUrl: e.target.value })}
                    placeholder="অথবা ছবির URL দিন"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" value={tchForm.name} onChange={(e) => setTchForm({ ...tchForm, name: e.target.value })} placeholder="শিক্ষকের নাম *" className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300" />
                <input type="text" value={tchForm.designation} onChange={(e) => setTchForm({ ...tchForm, designation: e.target.value })} placeholder="পদবি *" className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300" />
                <input type="tel" value={tchForm.phone} onChange={(e) => setTchForm({ ...tchForm, phone: e.target.value })} placeholder="মোবাইল *" className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300" />
                <input type="email" value={tchForm.email} onChange={(e) => setTchForm({ ...tchForm, email: e.target.value })} placeholder="ইমেইল *" className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300" />
                <input type="text" value={tchForm.qualification} onChange={(e) => setTchForm({ ...tchForm, qualification: e.target.value })} placeholder="শিক্ষাগত যোগ্যতা" className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300" />
                <input type="number" min={0} value={tchForm.experienceYears} onChange={(e) => setTchForm({ ...tchForm, experienceYears: e.target.value })} placeholder="অভিজ্ঞতা (বছর)" className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300" />
              </div>

              <input type="text" value={tchForm.subjects} onChange={(e) => setTchForm({ ...tchForm, subjects: e.target.value })} placeholder="বিষয়সমূহ (কমা দিয়ে)" className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300" />
              <textarea rows={2} value={tchForm.bio} onChange={(e) => setTchForm({ ...tchForm, bio: e.target.value })} placeholder="সংক্ষিপ্ত পরিচিতি (ঐচ্ছিক)" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300" />

              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1.5">অনুমোদিত শ্রেণিসমূহ</p>
                <div className="flex flex-wrap gap-2">
                  {classes.map((c) => {
                    const checked = tchForm.assignedClassIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setTchForm((p) => ({
                            ...p,
                            assignedClassIds: checked
                              ? p.assignedClassIds.filter((x) => x !== c.id)
                              : [...p.assignedClassIds, c.id],
                          }));
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                          checked ? 'bg-[#0F2942] text-white border-[#0F2942]' : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        {c.nameBn}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button type="submit" className="w-full min-h-[44px] py-2.5 rounded-xl bg-[#0F2942] text-white text-sm font-semibold hover:bg-[#173a5e]">
                সংরক্ষণ করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Teacher Modal (Photo, Name, Profile) */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 p-5 sm:p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#0F2942]">শিক্ষক সম্পাদনা ({editingTeacher.userCode})</h3>
              <button type="button" onClick={() => setEditingTeacher(null)} aria-label="বন্ধ করুন" className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={(e) => void handleSaveEditTeacher(e)} className="space-y-3.5">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <img
                  src={editingTeacher.avatarUrl}
                  alt={editingTeacher.name}
                  className="w-16 h-16 rounded-full object-cover object-top border border-slate-200 shrink-0 bg-white"
                  referrerPolicy="no-referrer"
                />
                <div className="space-y-2 flex-1 min-w-0">
                  <label className="inline-flex items-center gap-2 min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-[#0F2942] cursor-pointer hover:bg-slate-50">
                    <Upload className="w-3.5 h-3.5" />
                    নতুন ছবি আপলোড করুন
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          readImageFile(file, (url) =>
                            setEditingTeacher((prev) => (prev ? { ...prev, avatarUrl: url } : null))
                          );
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    value={editingTeacher.avatarUrl.startsWith('data:') ? '' : editingTeacher.avatarUrl}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, avatarUrl: e.target.value })}
                    placeholder="অথবা ছবির URL দিন"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">শিক্ষকের নাম *</label>
                  <input type="text" value={editingTeacher.name} onChange={(e) => setEditingTeacher({ ...editingTeacher, name: e.target.value })} className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">পদবি *</label>
                  <input type="text" value={editingTeacher.designation} onChange={(e) => setEditingTeacher({ ...editingTeacher, designation: e.target.value })} className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">মোবাইল</label>
                  <input type="tel" value={editingTeacher.phone} onChange={(e) => setEditingTeacher({ ...editingTeacher, phone: e.target.value })} className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">ইমেইল</label>
                  <input type="email" value={editingTeacher.email} onChange={(e) => setEditingTeacher({ ...editingTeacher, email: e.target.value })} className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">শিক্ষাগত যোগ্যতা</label>
                  <input type="text" value={editingTeacher.qualification} onChange={(e) => setEditingTeacher({ ...editingTeacher, qualification: e.target.value })} className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">অভিজ্ঞতা (বছর)</label>
                  <input type="number" min={0} value={editingTeacher.experienceYears} onChange={(e) => setEditingTeacher({ ...editingTeacher, experienceYears: Number(e.target.value) })} className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">বিষয়সমূহ (কমা দিয়ে)</label>
                <input
                  type="text"
                  value={editingTeacher.subjects.join(', ')}
                  onChange={(e) =>
                    setEditingTeacher({
                      ...editingTeacher,
                      subjects: e.target.value.split(',').map((s) => s.trim()),
                    })
                  }
                  className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">পরিচিতি</label>
                <textarea rows={2} value={editingTeacher.bio} onChange={(e) => setEditingTeacher({ ...editingTeacher, bio: e.target.value })} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300" />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTeacher.isActive}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, isActive: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  ওয়েবসাইটে প্রদর্শন করুন (সক্রিয়)
                </label>
              </div>

              <button type="submit" className="w-full min-h-[44px] py-2.5 rounded-xl bg-[#0F2942] text-white text-sm font-semibold hover:bg-[#173a5e]">
                পরিবর্তন সংরক্ষণ করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {showNotifs && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <div className="bg-white w-full max-w-sm h-full p-5 flex flex-col border-l border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-[#0F2942]">বিজ্ঞপ্তিসমূহ</h3>
              <button type="button" onClick={() => setShowNotifs(false)} aria-label="বন্ধ করুন"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 mt-2">
              {notifications.map((n) => (
                <div key={n.id} className="py-3">
                  <p className="text-xs font-bold text-[#0F2942]">{n.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{n.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {marksheetTarget && (
        <PrintableMarksheet
          result={marksheetTarget}
          settings={settings}
          onClose={() => setMarksheetTarget(null)}
        />
      )}

      {receiptTarget && (
        <PrintableReceipt
          payment={receiptTarget}
          invoice={invoices.find((i) => i.id === receiptTarget.invoiceId)}
          settings={settings}
          onClose={() => setReceiptTarget(null)}
        />
      )}

      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#0F2942]">{editingClass.nameBn} — ফি ও সময়সূচি</h3>
              <button type="button" onClick={() => setEditingClass(null)} aria-label="বন্ধ করুন"><X className="w-4 h-4" /></button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await apiFetch(`/api/admin/classes/${editingClass.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({
                    monthlyFee: editingClass.monthlyFee,
                    scheduleSummary: editingClass.scheduleSummary,
                    description: editingClass.description,
                  }),
                });
                setEditingClass(null);
                await loadAll();
                onSettingsUpdated?.();
                notify('শ্রেণির ফি ও সময়সূচি হালনাগাদ হয়েছে।');
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মাসিক টিউশন ফি (৳)</label>
                <input
                  type="number"
                  min={100}
                  value={editingClass.monthlyFee}
                  onChange={(e) => setEditingClass({ ...editingClass, monthlyFee: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">সময়সূচি সারসংক্ষেপ</label>
                <input
                  type="text"
                  value={editingClass.scheduleSummary}
                  onChange={(e) => setEditingClass({ ...editingClass, scheduleSummary: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বিবরণ</label>
                <textarea
                  rows={2}
                  value={editingClass.description}
                  onChange={(e) => setEditingClass({ ...editingClass, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-lg bg-[#0F2942] text-white text-sm font-semibold">
                সংরক্ষণ করুন
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

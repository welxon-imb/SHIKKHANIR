import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileText,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Printer,
  Settings,
  Trophy,
  User,
  X,
} from 'lucide-react';
import { MessagingCenter } from '../components/MessagingCenter';
import { PrintableMarksheet } from '../components/PrintableMarksheet';
import { PrintableReceipt } from '../components/PrintableReceipt';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../services/api';
import type {
  AcademicClass,
  AppNotification,
  AttendanceRecord,
  Batch,
  ClassRoutine,
  Exam,
  ExamResult,
  Homework,
  HomeworkSubmission,
  MonthlyInvoice,
  Notice,
  PaymentMethodType,
  PaymentRecord,
  Student,
  StudyMaterial,
  WebsiteSettings,
} from '../types';
import {
  calculateAttendancePercentage,
  calculateInvoiceSummary,
  formatBengaliOrdinal,
  formatTaka,
  getClassNameBn,
  toBengaliDigits,
} from '../utils/academicLogic';

interface StudentDashboardData {
  student: Student;
  classes: AcademicClass[];
  batches: Batch[];
  routines: ClassRoutine[];
  attendance: AttendanceRecord[];
  invoices: MonthlyInvoice[];
  payments: PaymentRecord[];
  exams: Exam[];
  myResults: ExamResult[];
  rankings: ExamResult[];
  notices: Notice[];
  studyMaterials: StudyMaterial[];
  homework: Homework[];
  homeworkSubmissions: HomeworkSubmission[];
  onlineGatewayConfigured: boolean;
}

type StudentTab =
  | 'overview'
  | 'profile'
  | 'routine'
  | 'attendance'
  | 'payments'
  | 'results'
  | 'ranking'
  | 'materials'
  | 'homework'
  | 'messages'
  | 'notices'
  | 'settings';

export const StudentDashboard: React.FC<{ settings: WebsiteSettings }> = ({ settings }) => {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<StudentTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Interactive states
  const [marksheetResult, setMarksheetResult] = useState<ExamResult | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<PaymentRecord | null>(null);
  const [payInvoice, setPayInvoice] = useState<MonthlyInvoice | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethodType>('বিকাশ');
  const [payTxId, setPayTxId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState<string | null>(null);
  const [gatewayMsg, setGatewayMsg] = useState<string | null>(null);

  const [materialSubjectFilter, setMaterialSubjectFilter] = useState('ALL');
  const [previewMaterial, setPreviewMaterial] = useState<StudyMaterial | null>(null);
  const [hwSubmitTarget, setHwSubmitTarget] = useState<Homework | null>(null);
  const [hwNote, setHwNote] = useState('');
  const [hwFileName, setHwFileName] = useState('');
  const [rankingMode, setRankingMode] = useState<'class' | 'batch'>('class');
  const [rankingExamId, setRankingExamId] = useState<string>('');
  const [routineDayFilter, setRoutineDayFilter] = useState<string>('ALL');

  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      const [dash, notifs] = await Promise.all([
        apiFetch<StudentDashboardData>('/api/student/dashboard'),
        apiFetch<{ notifications: AppNotification[] }>('/api/notifications'),
      ]);
      setData(dash);
      setNotifications(notifs.notifications);
      if (!rankingExamId && dash.myResults[0]) {
        setRankingExamId(dash.myResults[0].examId);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  };

  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const handleMarkAllRead = async () => {
    await apiFetch('/api/notifications/read-all', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInvoice) return;
    setPayError(null);
    try {
      await apiFetch('/api/student/payments/manual', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: payInvoice.id,
          amount: Number(payAmount),
          method: payMethod,
          transactionId: payTxId,
          notes: payNotes,
        }),
      });
      setPayInvoice(null);
      setPayTxId('');
      setPayAmount('');
      setPayNotes('');
      await loadAll();
      showToast('পেমেন্ট তথ্য জমা হয়েছে। অ্যাডমিন যাচাইয়ের পর রসিদ সক্রিয় হবে।');
    } catch (err) {
      setPayError((err as Error).message);
    }
  };

  const handleOnlinePaymentClick = async () => {
    setGatewayMsg(null);
    try {
      await apiFetch('/api/payments/online/init', { method: 'POST' });
    } catch (err) {
      setGatewayMsg((err as Error).message);
    }
  };

  const handleHomeworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwSubmitTarget) return;
    await apiFetch('/api/student/homework/submit', {
      method: 'POST',
      body: JSON.stringify({
        homeworkId: hwSubmitTarget.id,
        note: hwNote,
        fileName: hwFileName,
      }),
    });
    setHwSubmitTarget(null);
    setHwNote('');
    setHwFileName('');
    await loadAll();
    showToast('হোমওয়ার্ক সফলভাবে জমা দেওয়া হয়েছে।');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(pwdForm),
      });
      setPwdMsg(res.message);
      setPwdForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setPwdMsg((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-600">
        শিক্ষার্থী ড্যাশবোর্ড লোড হচ্ছে...
      </div>
    );
  }

  if (error || !data || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <p className="text-sm font-semibold text-red-600">{error || 'তথ্য লোড করা যায়নি।'}</p>
        <button type="button" onClick={logout} className="px-4 py-2 rounded-lg bg-[#0F2942] text-white text-sm">
          লগইন পেজে ফিরুন
        </button>
      </div>
    );
  }

  const { student, batches, routines, attendance, invoices, payments, exams, myResults, rankings, notices, studyMaterials, homework, homeworkSubmissions } = data;
  const primaryEnrollment = student.enrollments[0];
  const primaryBatch = batches.find((b) => b.id === primaryEnrollment?.batchId);
  const attSummary = calculateAttendancePercentage(attendance);
  const feeSummary = calculateInvoiceSummary(invoices);
  const latestResult = myResults[0] ?? null;

  const navItems: { id: StudentTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'ড্যাশবোর্ড', icon: <Home className="w-4 h-4" /> },
    { id: 'profile', label: 'আমার প্রোফাইল', icon: <User className="w-4 h-4" /> },
    { id: 'routine', label: 'ক্লাস রুটিন', icon: <Calendar className="w-4 h-4" /> },
    { id: 'attendance', label: 'উপস্থিতি', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'payments', label: 'বেতন ও পেমেন্ট', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'results', label: 'পরীক্ষা ও ফলাফল', icon: <Award className="w-4 h-4" /> },
    { id: 'ranking', label: 'মেধা তালিকা', icon: <Trophy className="w-4 h-4" /> },
    { id: 'materials', label: 'স্টাডি ম্যাটেরিয়াল', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'homework', label: 'হোমওয়ার্ক', icon: <FileText className="w-4 h-4" /> },
    { id: 'messages', label: 'বার্তা ও গ্রুপ', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'notices', label: 'নোটিশ', icon: <Bell className="w-4 h-4" /> },
    { id: 'settings', label: 'অ্যাকাউন্ট সেটিংস', icon: <Settings className="w-4 h-4" /> },
  ];

  const activeRankingExamId = rankingExamId || exams.find((e) => e.isPublished)?.id || '';
  const filteredRankings = rankings
    .filter((r) => !activeRankingExamId || r.examId === activeRankingExamId)
    .filter((r) => rankingMode === 'class' || r.batchId === primaryEnrollment?.batchId)
    .sort((a, b) => (rankingMode === 'class' ? a.classRank - b.classRank : a.batchRank - b.batchRank));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Role Bar */}
      <div className="bg-white border-b border-slate-200 px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="মেনু"
            className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-xs sm:text-sm font-bold text-[#0F2942]">শিক্ষার্থী পোর্টাল</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowNotifDrawer(!showNotifDrawer)}
            aria-label="নোটিফিকেশন"
            className="relative p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                {unreadNotifCount}
              </span>
            )}
          </button>

          <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <img
              src={student.photoUrl || '/assets/aistudio/58308189f4f51a82ecf9cadd15c397c1_5dfd1b78.jpg'}
              alt={student.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
              referrerPolicy="no-referrer"
            />
            <div className="text-left leading-tight">
              <p className="text-xs font-bold text-[#0F2942]">{student.name}</p>
              <p className="text-[11px] font-mono text-slate-500">{student.studentCode}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">লগআউট</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 bg-white border-r border-slate-200 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                tab === item.id
                  ? 'bg-[#0F2942] text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#0F2942]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div className="w-64 bg-white h-full border-r border-slate-200 p-4 space-y-1 overflow-y-auto">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
                <span className="font-bold text-[#0F2942]">মেনু</span>
                <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="বন্ধ করুন">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold ${
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

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-10 space-y-6 min-w-0">
          {toast && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              {toast}
            </div>
          )}

          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* Student Profile Strip */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={student.photoUrl || '/assets/aistudio/58308189f4f51a82ecf9cadd15c397c1_5dfd1b78.jpg'}
                    alt={student.name}
                    className="w-14 h-14 rounded-full object-cover border border-slate-200 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h1 className="text-lg font-bold text-[#0F2942]">{student.name}</h1>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      আইডি: <strong className="font-mono text-[#0F2942]">{student.studentCode}</strong> · রোল:{' '}
                      <strong>{toBengaliDigits(primaryEnrollment?.rollNumber ?? '01')}</strong> ·{' '}
                      {student.enrollments.map((e) => getClassNameBn(e.classId)).join(' + ')}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ব্যাচ: {primaryBatch?.name ?? '-'} · অভিভাবক: {student.guardianPhone}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('payments')}
                  className="px-4 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold hover:bg-[#173a5e] self-start sm:self-center whitespace-nowrap"
                >
                  বেতন পরিশোধ করুন
                </button>
              </div>

              {/* 8 Requested Dashboard Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">মোট সাপ্তাহিক ক্লাস</p>
                  <p className="text-2xl font-bold text-[#0F2942] tabular-nums mt-1">
                    {toBengaliDigits(routines.length)}টি
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">উপস্থিতির হার</p>
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">
                    {toBengaliDigits(attSummary.percentage)}%
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">সর্বশেষ ফলাফল</p>
                  <p className="text-2xl font-bold text-[#1D4ED8] tabular-nums mt-1">
                    {latestResult ? `GPA ${toBengaliDigits(latestResult.gpa.toFixed(2))}` : 'প্রকাশিত নয়'}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">শ্রেণি ও ব্যাচ মেধাক্রম</p>
                  <p className="text-2xl font-bold text-[#C59B38] tabular-nums mt-1">
                    {latestResult
                      ? `${formatBengaliOrdinal(latestResult.classRank)} / ${formatBengaliOrdinal(latestResult.batchRank)}`
                      : '-'}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">মাসিক পরিশোধিত ফি</p>
                  <p className="text-xl font-bold text-emerald-700 tabular-nums mt-1">
                    {formatTaka(feeSummary.totalPaid)}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">মোট বকেয়া</p>
                  <p className="text-xl font-bold text-red-600 tabular-nums mt-1">
                    {formatTaka(feeSummary.totalDue)}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">চলমান হোমওয়ার্ক</p>
                  <p className="text-xl font-bold text-[#0F2942] tabular-nums mt-1">
                    {toBengaliDigits(homework.length)}টি
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">অপঠিত বিজ্ঞপ্তি</p>
                  <p className="text-xl font-bold text-[#1D4ED8] tabular-nums mt-1">
                    {toBengaliDigits(unreadNotifCount)}টি
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-[#0F2942]">সাম্প্রতিক নোটিশ</h2>
                    <button type="button" onClick={() => setTab('notices')} className="text-xs font-semibold text-[#1D4ED8]">
                      সব দেখুন →
                    </button>
                  </div>
                  <div className="space-y-3">
                    {notices.slice(0, 3).map((n) => (
                      <div key={n.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                        <p className="text-xs text-slate-500">{n.type} · {toBengaliDigits(n.date)}</p>
                        <p className="text-sm font-bold text-[#0F2942] mt-0.5">{n.title}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-[#0F2942]">সর্বশেষ পরীক্ষার নম্বরপত্র</h2>
                    {latestResult && (
                      <button
                        type="button"
                        onClick={() => setMarksheetResult(latestResult)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8]"
                      >
                        <Printer className="w-3.5 h-3.5" /> মার্কশিট ডাউনলোড
                      </button>
                    )}
                  </div>
                  {latestResult ? (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-slate-900">{latestResult.examTitle}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {latestResult.subjectMarks.map((m) => (
                          <div key={m.subjectName} className="flex justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
                            <span>{m.subjectName}</span>
                            <strong className="tabular-nums">{toBengaliDigits(m.obtainedMarks)} ({m.grade})</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">এখনও কোনো ফলাফল প্রকাশিত হয়নি।</p>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* PROFILE TAB */}
          {tab === 'profile' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <h2 className="text-xl font-bold text-[#0F2942]">শিক্ষার্থীর প্রোফাইল</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="block text-xs text-slate-500">Student ID</span>
                  <span className="font-mono font-bold text-[#0F2942]">{student.studentCode}</span>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="block text-xs text-slate-500">পূর্ণ নাম</span>
                  <span className="font-bold">{student.name}</span>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="block text-xs text-slate-500">নিবন্ধিত শ্রেণি ও রোল</span>
                  <span className="font-semibold">
                    {student.enrollments.map((e) => `${getClassNameBn(e.classId)} (রোল ${toBengaliDigits(e.rollNumber)})`).join(' · ')}
                  </span>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="block text-xs text-slate-500">মোবাইল নম্বর</span>
                  <span className="tabular-nums font-semibold">{student.phone}</span>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="block text-xs text-slate-500">অভিভাবক ও যোগাযোগ</span>
                  <span className="font-semibold">{student.guardianName} · {student.guardianPhone}</span>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="block text-xs text-slate-500">ভর্তি তারিখ ও বিদ্যালয়</span>
                  <span className="font-semibold">{toBengaliDigits(student.admissionDate)} · {student.previousSchool}</span>
                </div>
              </div>
            </div>
          )}

          {/* ROUTINE TAB */}
          {tab === 'routine' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-[#0F2942]">সাপ্তাহিক ক্লাস রুটিন (শনি – বৃহস্পতি)</h2>
                <select
                  value={routineDayFilter}
                  onChange={(e) => setRoutineDayFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                >
                  <option value="ALL">সকল দিন</option>
                  {['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার'].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <tr>
                      <th className="py-3 px-4">বার</th>
                      <th className="py-3 px-4">সময়</th>
                      <th className="py-3 px-4">শ্রেণি</th>
                      <th className="py-3 px-4">বিষয়</th>
                      <th className="py-3 px-4">শিক্ষক</th>
                      <th className="py-3 px-4">কক্ষ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {routines
                      .filter((r) => routineDayFilter === 'ALL' || r.day === routineDayFilter)
                      .map((r) => (
                        <tr key={r.id}>
                          <td className="py-3 px-4 font-bold text-[#0F2942]">{r.day}</td>
                          <td className="py-3 px-4 tabular-nums">{r.startTime} – {r.endTime}</td>
                          <td className="py-3 px-4">{getClassNameBn(r.classId)}</td>
                          <td className="py-3 px-4 font-semibold">{r.subjectName}</td>
                          <td className="py-3 px-4">{r.teacherName}</td>
                          <td className="py-3 px-4">{r.room}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ATTENDANCE TAB */}
          {tab === 'attendance' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-[#0F2942]">আমার উপস্থিতির বিবরণ</h2>
                <div className="flex gap-4 text-xs font-semibold">
                  <span className="text-emerald-700">উপস্থিত: {toBengaliDigits(attSummary.presentCount)}</span>
                  <span className="text-amber-700">বিলম্ব: {toBengaliDigits(attSummary.lateCount)}</span>
                  <span className="text-red-600">অনুপস্থিত: {toBengaliDigits(attSummary.absentCount)}</span>
                  <span className="text-[#0F2942]">হার: {toBengaliDigits(attSummary.percentage)}%</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <tr>
                      <th className="py-3 px-4">তারিখ</th>
                      <th className="py-3 px-4">শ্রেণি</th>
                      <th className="py-3 px-4">অবস্থা</th>
                      <th className="py-3 px-4">শিক্ষক</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendance.map((a) => (
                      <tr key={a.id}>
                        <td className="py-3 px-4 tabular-nums">{toBengaliDigits(a.date)}</td>
                        <td className="py-3 px-4">{getClassNameBn(a.classId)}</td>
                        <td className="py-3 px-4 font-semibold">
                          <span className={
                            a.status === 'Present'
                              ? 'text-emerald-700'
                              : a.status === 'Absent'
                                ? 'text-red-600'
                                : 'text-amber-700'
                          }>
                            {a.status === 'Present' ? 'উপস্থিত' : a.status === 'Absent' ? 'অনুপস্থিত' : a.status === 'Late' ? 'বিলম্ব' : 'ছুটি'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{a.markedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PAYMENTS TAB */}
          {tab === 'payments' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-[#0F2942]">মাসিক বেতন ইনভয়েস (জানুয়ারি – ডিসেম্বর)</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      মোট বিল: {formatTaka(feeSummary.totalBilled)} · পরিশোধিত: {formatTaka(feeSummary.totalPaid)} · বকেয়া: {formatTaka(feeSummary.totalDue)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleOnlinePaymentClick()}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-[#0F2942] hover:bg-slate-50"
                  >
                    অনলাইন গেটওয়ে পেমেন্ট ({data.onlineGatewayConfigured ? 'সক্রিয়' : 'Integration Pending'})
                  </button>
                </div>

                {gatewayMsg && (
                  <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-medium text-amber-900">
                    {gatewayMsg}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                      <tr>
                        <th className="py-3 px-4">মাস</th>
                        <th className="py-3 px-4">ইনভয়েস নং</th>
                        <th className="py-3 px-4 text-right">নির্ধারিত ফি</th>
                        <th className="py-3 px-4 text-right">পরিশোধিত</th>
                        <th className="py-3 px-4">অবস্থা</th>
                        <th className="py-3 px-4 text-right">কার্যক্রম</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="py-3 px-4 font-semibold text-[#0F2942]">{inv.monthNameBn}</td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-600">{inv.invoiceNo}</td>
                          <td className="py-3 px-4 text-right tabular-nums">{formatTaka(inv.amount)}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-emerald-700 font-semibold">
                            {formatTaka(inv.paidAmount)}
                          </td>
                          <td className="py-3 px-4 text-xs font-bold">
                            <span className={
                              inv.status === 'Paid'
                                ? 'text-emerald-700'
                                : inv.status === 'Pending'
                                  ? 'text-[#1D4ED8]'
                                  : inv.status === 'Partial'
                                    ? 'text-amber-700'
                                    : 'text-red-600'
                            }>
                              {inv.status === 'Paid' ? 'পরিশোধিত' : inv.status === 'Pending' ? 'যাচাইধীন' : inv.status === 'Partial' ? 'আংশিক' : 'বকেয়া'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {inv.status !== 'Paid' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPayInvoice(inv);
                                  setPayAmount(String(inv.amount - inv.paidAmount));
                                  setPayError(null);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#0F2942] text-white text-xs font-semibold hover:bg-[#173a5e]"
                              >
                                ম্যানুয়াল পেমেন্ট
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-[#0F2942]">পেমেন্ট ইতিহাস ও রসিদ</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                      <tr>
                        <th className="py-3 px-4">রসিদ নং</th>
                        <th className="py-3 px-4">মাধ্যম</th>
                        <th className="py-3 px-4">TxID</th>
                        <th className="py-3 px-4 text-right">টাকা</th>
                        <th className="py-3 px-4">অবস্থা</th>
                        <th className="py-3 px-4 text-right">রসিদ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-3 px-4 font-mono text-xs">{p.receiptNo}</td>
                          <td className="py-3 px-4">{p.method}</td>
                          <td className="py-3 px-4 font-mono text-xs">{p.transactionId}</td>
                          <td className="py-3 px-4 text-right font-semibold tabular-nums">{formatTaka(p.amount)}</td>
                          <td className="py-3 px-4 text-xs font-bold">
                            <span className={p.status === 'Verified' ? 'text-emerald-700' : p.status === 'Rejected' ? 'text-red-600' : 'text-amber-700'}>
                              {p.status === 'Verified' ? 'নিশ্চিত' : p.status === 'Rejected' ? 'বাতিল' : 'যাচাইধীন'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setReceiptPayment(p)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:underline"
                            >
                              <Printer className="w-3.5 h-3.5" /> রসিদ
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

          {/* RESULTS & SCHEDULE TAB */}
          {tab === 'results' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="text-xl font-bold text-[#0F2942]">পরীক্ষার সময়সূচি</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {exams.map((ex) => (
                    <div key={ex.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs font-semibold text-[#1D4ED8]">{getClassNameBn(ex.classId)} · {toBengaliDigits(ex.examDate)}</p>
                      <h3 className="font-bold text-[#0F2942] mt-1">{ex.title}</h3>
                      <p className="text-xs text-slate-600 mt-1">সময়: {ex.examTime} · বিষয়: {ex.subjects.map((s) => s.subjectName).join(', ')}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="text-xl font-bold text-[#0F2942]">প্রকাশিত ফলাফল ও মার্কশিট</h2>
                {myResults.length === 0 ? (
                  <p className="text-sm text-slate-500">আপনার কোনো প্রকাশিত পরীক্ষার ফলাফল এখনও যুক্ত হয়নি।</p>
                ) : (
                  <div className="space-y-4">
                    {myResults.map((r) => (
                      <div key={r.id} className="border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-[#0F2942]">{r.examTitle}</h3>
                          <p className="text-xs text-slate-600 mt-1 tabular-nums">
                            মোট নম্বর: <strong>{toBengaliDigits(r.totalObtained)} / {toBengaliDigits(r.totalFullMarks)}</strong> · GPA:{' '}
                            <strong className="text-[#1D4ED8]">{toBengaliDigits(r.gpa.toFixed(2))}</strong> ({r.grade}) · শ্রেণি মেধাক্রম: {formatBengaliOrdinal(r.classRank)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMarksheetResult(r)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold hover:bg-[#173a5e] self-start sm:self-center"
                        >
                          <Printer className="w-4 h-4" />
                          মার্কশিট ডাউনলোড
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RANKING TAB */}
          {tab === 'ranking' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-[#0F2942]">শ্রেণি ও ব্যাচ মেধা তালিকা</h2>
                <div className="flex flex-wrap items-center gap-2">
                  {exams.filter((e) => e.isPublished).length > 1 && (
                    <select
                      aria-label="পরীক্ষা নির্বাচন"
                      value={activeRankingExamId}
                      onChange={(e) => setRankingExamId(e.target.value)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-[#0F2942]"
                    >
                      {exams
                        .filter((e) => e.isPublished)
                        .map((ex) => (
                          <option key={ex.id} value={ex.id}>{ex.title}</option>
                        ))}
                    </select>
                  )}
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setRankingMode('class')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md ${rankingMode === 'class' ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600'}`}
                    >
                      শ্রেণি র‍্যাংকিং
                    </button>
                    <button
                      type="button"
                      onClick={() => setRankingMode('batch')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md ${rankingMode === 'batch' ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600'}`}
                    >
                      ব্যাচ র‍্যাংকিং
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <tr>
                      <th className="py-3 px-4">ক্রম</th>
                      <th className="py-3 px-4">রোল</th>
                      <th className="py-3 px-4">শিক্ষার্থীর নাম</th>
                      <th className="py-3 px-4 text-right">মোট নম্বর</th>
                      <th className="py-3 px-4 text-right">GPA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRankings.map((r) => (
                      <tr key={r.id} className={r.studentId === student.id ? 'bg-blue-50/70 font-semibold' : ''}>
                        <td className="py-3 px-4 font-bold text-[#0F2942] tabular-nums">
                          {formatBengaliOrdinal(rankingMode === 'class' ? r.classRank : r.batchRank)}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums">{toBengaliDigits(r.rollNumber)}</td>
                        <td className="py-3 px-4">{r.studentName} {r.studentId === student.id ? '(আপনি)' : ''}</td>
                        <td className="py-3 px-4 text-right tabular-nums">{toBengaliDigits(r.totalObtained)}</td>
                        <td className="py-3 px-4 text-right font-bold text-[#1D4ED8] tabular-nums">{toBengaliDigits(r.gpa.toFixed(2))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STUDY MATERIALS TAB */}
          {tab === 'materials' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-[#0F2942]">স্টাডি ম্যাটেরিয়াল ও লেকচার শিট</h2>
                <select
                  value={materialSubjectFilter}
                  onChange={(e) => setMaterialSubjectFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                >
                  <option value="ALL">সকল বিষয়</option>
                  {['বাংলা', 'ইংরেজি', 'গণিত', 'বিজ্ঞান'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studyMaterials
                  .filter((m) => materialSubjectFilter === 'ALL' || m.subject === materialSubjectFilter)
                  .map((m) => (
                    <div key={m.id} className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-[#1D4ED8]">
                          {m.subject} · {getClassNameBn(m.classId)} · {m.fileSize}
                        </p>
                        <h3 className="font-bold text-[#0F2942] mt-1">{m.title}</h3>
                        <p className="text-xs text-slate-600 mt-1">{m.description}</p>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-xs">
                        <span className="text-slate-500">আপলোড: {m.uploadedBy}</span>
                        <button
                          type="button"
                          onClick={() => setPreviewMaterial(m)}
                          className="font-semibold text-[#1D4ED8] hover:underline"
                        >
                          প্রিভিউ ও ডাউনলোড
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* HOMEWORK TAB */}
          {tab === 'homework' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <h2 className="text-xl font-bold text-[#0F2942]">আমার হোমওয়ার্ক ও অ্যাসাইনমেন্ট</h2>
              <div className="space-y-4">
                {homework.map((hw) => {
                  const sub = homeworkSubmissions.find((s) => s.homeworkId === hw.id);
                  return (
                    <div key={hw.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-[#1D4ED8]">
                            {hw.subject} · শেষ সময়: {toBengaliDigits(hw.deadline)} · {hw.teacherName}
                          </p>
                          <h3 className="font-bold text-[#0F2942] mt-0.5">{hw.title}</h3>
                        </div>
                        {sub ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <CheckCircle2 className="w-4 h-4" />
                            {sub.status === 'Checked' ? 'পরীক্ষিত' : 'জমা দেওয়া হয়েছে'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setHwSubmitTarget(hw)}
                            className="px-4 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold self-start"
                          >
                            কাজ জমা দিন
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{hw.description}</p>
                      {sub?.teacherFeedback && (
                        <div className="p-3 rounded-lg bg-white border border-emerald-200 text-xs text-emerald-900">
                          <strong>শিক্ষকের মন্তব্য:</strong> {sub.teacherFeedback}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MESSAGING TAB */}
          {tab === 'messages' && <MessagingCenter currentUser={user} />}

          {/* NOTICES TAB */}
          {tab === 'notices' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-xl font-bold text-[#0F2942]">নোটিশ বোর্ড</h2>
              {notices.map((n) => (
                <div key={n.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs font-semibold text-[#1D4ED8]">{n.type} · {toBengaliDigits(n.date)}</p>
                  <h3 className="font-bold text-[#0F2942] mt-1">{n.title}</h3>
                  <p className="text-sm text-slate-600 mt-1.5">{n.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* SETTINGS TAB */}
          {tab === 'settings' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-lg space-y-4">
              <h2 className="text-xl font-bold text-[#0F2942]">পাসওয়ার্ড পরিবর্তন</h2>
              <form onSubmit={(e) => void handlePasswordChange(e)} className="space-y-4">
                <div>
                  <label htmlFor="st-cur-pwd" className="block text-xs font-semibold text-slate-700 mb-1.5">বর্তমান পাসওয়ার্ড</label>
                  <input
                    id="st-cur-pwd"
                    type="password"
                    value={pwdForm.currentPassword}
                    onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label htmlFor="st-new-pwd" className="block text-xs font-semibold text-slate-700 mb-1.5">নতুন পাসওয়ার্ড</label>
                  <input
                    id="st-new-pwd"
                    type="password"
                    value={pwdForm.newPassword}
                    onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300"
                  />
                </div>
                {pwdMsg && <p className="text-xs font-semibold text-[#1D4ED8]">{pwdMsg}</p>}
                <button type="submit" className="px-5 py-2.5 rounded-lg bg-[#0F2942] text-white text-sm font-semibold">
                  পাসওয়ার্ড সংরক্ষণ
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation (< 15% aggregate sticky height) */}
      <nav
        aria-label="শিক্ষার্থী মোবাইল নেভিগেশন"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 h-14"
      >
        {[
          { id: 'overview' as StudentTab, label: 'হোম', icon: <Home className="w-4 h-4" /> },
          { id: 'routine' as StudentTab, label: 'রুটিন', icon: <Calendar className="w-4 h-4" /> },
          { id: 'results' as StudentTab, label: 'ফলাফল', icon: <Award className="w-4 h-4" /> },
          { id: 'payments' as StudentTab, label: 'পেমেন্ট', icon: <CreditCard className="w-4 h-4" /> },
          { id: 'messages' as StudentTab, label: 'বার্তা', icon: <MessageSquare className="w-4 h-4" /> },
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

      {/* Notifications Drawer */}
      {showNotifDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <div className="bg-white w-full max-w-sm h-full p-5 flex flex-col border-l border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-[#0F2942]">বিজ্ঞপ্তিসমূহ</h3>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => void handleMarkAllRead()} className="text-xs font-semibold text-[#1D4ED8]">
                  সব পঠিত
                </button>
                <button type="button" onClick={() => setShowNotifDrawer(false)} aria-label="বন্ধ করুন">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 mt-2">
              {notifications.map((n) => (
                <div key={n.id} className={`py-3 ${!n.isRead ? 'bg-blue-50/40 px-2 rounded' : ''}`}>
                  <p className="text-xs font-bold text-[#0F2942]">{n.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{n.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manual Payment Modal */}
      {payInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#0F2942]">{payInvoice.monthNameBn} মাসের ফি জমা দিন</h3>
              <button type="button" onClick={() => setPayInvoice(null)} aria-label="বন্ধ করুন">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={(e) => void handleManualPaymentSubmit(e)} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পেমেন্ট মাধ্যম</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethodType)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                >
                  <option value="বিকাশ">বিকাশ (bKash)</option>
                  <option value="নগদ">নগদ (Nagad)</option>
                  <option value="ব্যাংক">ব্যাংক ট্রান্সফার</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">টাকার পরিমাণ</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction ID *</label>
                <input
                  type="text"
                  value={payTxId}
                  onChange={(e) => setPayTxId(e.target.value)}
                  placeholder="যেমন: BKS88991122"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="প্রেরকের নম্বর বা তথ্য"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>
              {payError && <p className="text-xs font-semibold text-red-600">{payError}</p>}
              <button type="submit" className="w-full py-2.5 rounded-lg bg-[#0F2942] text-white text-sm font-semibold">
                যাচাইয়ের জন্য জমা দিন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Homework Submit Modal */}
      {hwSubmitTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#0F2942]">হোমওয়ার্ক জমা দিন</h3>
              <button type="button" onClick={() => setHwSubmitTarget(null)} aria-label="বন্ধ করুন">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={(e) => void handleHomeworkSubmit(e)} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বর্ণনা / উত্তর</label>
                <textarea
                  rows={3}
                  value={hwNote}
                  onChange={(e) => setHwNote(e.target.value)}
                  placeholder="আপনার সমাধান বা মন্তব্য লিখুন..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ফাইলের নাম (PDF/ছবি)</label>
                <input
                  type="text"
                  value={hwFileName}
                  onChange={(e) => setHwFileName(e.target.value)}
                  placeholder="যেমন: Math_Assignment.pdf"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-lg bg-[#0F2942] text-white text-sm font-semibold">
                জমা নিশ্চিত করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Material Preview Modal */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#0F2942]">{previewMaterial.title}</h3>
              <button type="button" onClick={() => setPreviewMaterial(null)} aria-label="বন্ধ করুন">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-sm">
              <p><strong>ফাইল:</strong> {previewMaterial.fileName} ({previewMaterial.fileSize})</p>
              <p><strong>বিষয়:</strong> {previewMaterial.subject} · {getClassNameBn(previewMaterial.classId)}</p>
              <p className="text-slate-600">{previewMaterial.description}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([`${previewMaterial.title}\n\n${previewMaterial.description}\nশিক্ষানীর কোচিং সেন্টার`], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${previewMaterial.fileName}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold"
              >
                নোট ডাউনলোড করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {marksheetResult && (
        <PrintableMarksheet
          result={marksheetResult}
          settings={settings}
          onClose={() => setMarksheetResult(null)}
        />
      )}

      {receiptPayment && (
        <PrintableReceipt
          payment={receiptPayment}
          invoice={invoices.find((i) => i.id === receiptPayment.invoiceId)}
          settings={settings}
          onClose={() => setReceiptPayment(null)}
        />
      )}
    </div>
  );
};

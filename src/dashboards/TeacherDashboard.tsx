import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  User,
  Users,
  X,
} from 'lucide-react';
import { MessagingCenter } from '../components/MessagingCenter';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../services/api';
import type {
  AcademicClass,
  AcademicClassId,
  AppNotification,
  AttendanceRecord,
  AttendanceStatus,
  Batch,
  ClassRoutine,
  Exam,
  ExamResult,
  Homework,
  HomeworkSubmission,
  Notice,
  Student,
  StudyMaterial,
  Subject,
  Teacher,
} from '../types';
import { getClassNameBn, toBengaliDigits } from '../utils/academicLogic';

interface TeacherDashboardData {
  teacher: Teacher;
  classes: AcademicClass[];
  batches: Batch[];
  subjects: Subject[];
  students: Student[];
  routines: ClassRoutine[];
  attendance: AttendanceRecord[];
  exams: Exam[];
  results: ExamResult[];
  studyMaterials: StudyMaterial[];
  homework: Homework[];
  homeworkSubmissions: HomeworkSubmission[];
  notices: Notice[];
}

type TeacherTab =
  | 'overview'
  | 'profile'
  | 'classes'
  | 'students'
  | 'routine'
  | 'attendance'
  | 'exams'
  | 'materials'
  | 'homework'
  | 'messages'
  | 'notices';

export const TeacherDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<TeacherTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Attendance state
  const [attDate, setAttDate] = useState('2026-11-23');
  const [attClassId, setAttClassId] = useState<AcademicClassId>('class-10');
  const [attBatchId, setAttBatchId] = useState('');
  const [attDraft, setAttDraft] = useState<Record<string, AttendanceStatus>>({});

  // Marks entry state
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [marksDraft, setMarksDraft] = useState<Record<string, string>>({});

  // Study material & Homework forms
  const [matForm, setMatForm] = useState({
    title: '',
    subject: 'গণিত',
    classId: 'class-10' as AcademicClassId,
    description: '',
    fileName: '',
    fileSize: '১.৫ MB',
  });
  const [hwForm, setHwForm] = useState({
    title: '',
    description: '',
    subject: 'গণিত',
    classId: 'class-10' as AcademicClassId,
    batchId: '',
    deadline: '2026-11-30',
  });

  const [studentSearch, setStudentSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState<string>('ALL');

  const showMsg = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 3500);
  };

  const loadAll = async () => {
    const [dash, notifs] = await Promise.all([
      apiFetch<TeacherDashboardData>('/api/teacher/dashboard'),
      apiFetch<{ notifications: AppNotification[] }>('/api/notifications'),
    ]);
    setData(dash);
    setNotifications(notifs.notifications);
    const targetClassId =
      dash.classes.some((c) => c.id === attClassId)
        ? attClassId
        : (dash.classes[0]?.id ?? 'class-10');
    if (targetClassId !== attClassId) {
      setAttClassId(targetClassId);
    }
    const matchingBatches = dash.batches.filter((b) => b.classId === targetClassId);
    if (!attBatchId || !matchingBatches.some((b) => b.id === attBatchId)) {
      setAttBatchId(matchingBatches[0]?.id ?? '');
    }
    if (!hwForm.batchId) {
      const hwBatch = dash.batches.find((b) => b.classId === hwForm.classId)?.id ?? dash.batches[0]?.id ?? '';
      setHwForm((p) => ({ ...p, batchId: hwBatch }));
    }
    if (!selectedExamId && dash.exams[0]) setSelectedExamId(dash.exams[0].id);
    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const activeAttStudents = useMemo(() => {
    if (!data) return [];
    return data.students.filter((s) =>
      s.enrollments.some((e) => e.classId === attClassId && (!attBatchId || e.batchId === attBatchId))
    );
  }, [data, attClassId, attBatchId]);

  useEffect(() => {
    if (!data) return;
    const map: Record<string, AttendanceStatus> = {};
    for (const s of activeAttStudents) {
      const existing = data.attendance.find(
        (a) => a.date === attDate && a.classId === attClassId && a.studentId === s.id
      );
      map[s.id] = existing?.status ?? 'Present';
    }
    setAttDraft(map);
  }, [attDate, attClassId, attBatchId, activeAttStudents, data]);

  const handleSaveAttendance = async () => {
    const entries = activeAttStudents.map((s) => ({
      studentId: s.id,
      status: attDraft[s.id] ?? 'Present',
    }));
    await apiFetch('/api/teacher/attendance', {
      method: 'POST',
      body: JSON.stringify({
        date: attDate,
        classId: attClassId,
        batchId: attBatchId || data?.batches.find((b) => b.classId === attClassId)?.id,
        entries,
      }),
    });
    await loadAll();
    showMsg('হাজিরা সফলভাবে সংরক্ষিত হয়েছে।');
  };

  const activeExam = useMemo(
    () => data?.exams.find((e) => e.id === selectedExamId) ?? data?.exams[0] ?? null,
    [data, selectedExamId]
  );

  const examStudents = useMemo(() => {
    if (!data || !activeExam) return [];
    return data.students.filter((s) =>
      s.enrollments.some((e) => e.classId === activeExam.classId)
    );
  }, [data, activeExam]);

  useEffect(() => {
    if (!activeExam) return;
    if (!selectedStudentId && examStudents[0]) {
      setSelectedStudentId(examStudents[0].id);
      return;
    }
    const existingRes = data?.results.find(
      (r) => r.examId === activeExam.id && r.studentId === selectedStudentId
    );
    const nextDraft: Record<string, string> = {};
    for (const sub of activeExam.subjects) {
      const m = existingRes?.subjectMarks.find((x) => x.subjectName === sub.subjectName);
      nextDraft[sub.subjectName] = m ? String(m.obtainedMarks) : '';
    }
    setMarksDraft(nextDraft);
  }, [activeExam, selectedStudentId, examStudents, data]);

  const handleSaveMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExam || !selectedStudentId) return;
    const numericMap: Record<string, number> = {};
    for (const sub of activeExam.subjects) {
      numericMap[sub.subjectName] = Number(marksDraft[sub.subjectName] || 0);
    }
    await apiFetch('/api/teacher/marks', {
      method: 'POST',
      body: JSON.stringify({
        examId: activeExam.id,
        studentId: selectedStudentId,
        marksBySubject: numericMap,
      }),
    });
    await loadAll();
    showMsg('নম্বর ও গ্রেড হিসাব সংরক্ষিত হয়েছে (অ্যাডমিন অনুমোদনের পর প্রকাশিত হবে)।');
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matForm.title.trim() || !matForm.fileName.trim()) return;
    await apiFetch('/api/teacher/materials', {
      method: 'POST',
      body: JSON.stringify(matForm),
    });
    setMatForm((p) => ({ ...p, title: '', description: '', fileName: '' }));
    await loadAll();
    showMsg('স্টাডি ম্যাটেরিয়াল আপলোড সম্পন্ন হয়েছে।');
  };

  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwForm.title.trim() || !hwForm.description.trim()) return;
    await apiFetch('/api/teacher/homework', {
      method: 'POST',
      body: JSON.stringify(hwForm),
    });
    setHwForm((p) => ({ ...p, title: '', description: '' }));
    await loadAll();
    showMsg('নতুন হোমওয়ার্ক শিক্ষার্থীদের কাছে পাঠানো হয়েছে।');
  };

  if (loading || !data || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-600">
        শিক্ষক ড্যাশবোর্ড লোড হচ্ছে...
      </div>
    );
  }

  const { teacher, classes, batches, students, routines, attendance, exams, results, studyMaterials, homework, homeworkSubmissions, notices } = data;
  const unreadNotifs = notifications.filter((n) => !n.isRead).length;
  const filteredStudents = students
    .filter((s) => studentClassFilter === 'ALL' || s.enrollments.some((e) => e.classId === studentClassFilter))
    .filter((s) => !studentSearch.trim() || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.studentCode.toLowerCase().includes(studentSearch.toLowerCase()));

  const navItems: { id: TeacherTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'ড্যাশবোর্ড', icon: <Home className="w-4 h-4" /> },
    { id: 'profile', label: 'আমার প্রোফাইল', icon: <User className="w-4 h-4" /> },
    { id: 'classes', label: 'আমার শ্রেণি', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'students', label: 'শিক্ষার্থী তালিকা', icon: <Users className="w-4 h-4" /> },
    { id: 'routine', label: 'ক্লাস রুটিন', icon: <Calendar className="w-4 h-4" /> },
    { id: 'attendance', label: 'হাজিরা ব্যবস্থাপনা', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'exams', label: 'পরীক্ষা ও নম্বর এন্ট্রি', icon: <Award className="w-4 h-4" /> },
    { id: 'materials', label: 'স্টাডি ম্যাটেরিয়াল', icon: <FileText className="w-4 h-4" /> },
    { id: 'homework', label: 'হোমওয়ার্ক', icon: <Plus className="w-4 h-4" /> },
    { id: 'messages', label: 'বার্তা ও গ্রুপ', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'notices', label: 'নোটিশ', icon: <Bell className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <div className="bg-white border-b border-slate-200 px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="মেনু" className="lg:hidden p-2 rounded-lg border border-slate-200">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-xs sm:text-sm font-bold text-[#0F2942]">শিক্ষক প্যানেল</span>
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
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
            <img src={teacher.avatarUrl} alt={teacher.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" referrerPolicy="no-referrer" />
            <div className="leading-tight">
              <p className="text-xs font-bold text-[#0F2942]">{teacher.name}</p>
              <p className="text-[11px] font-mono text-slate-500">{teacher.userCode}</p>
            </div>
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

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <aside className="hidden lg:block w-64 shrink-0 bg-white border-r border-slate-200 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
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
            <div className="w-64 bg-white h-full border-r border-slate-200 p-4 space-y-1 overflow-y-auto">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
                <span className="font-bold text-[#0F2942]">শিক্ষক মেনু</span>
                <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="বন্ধ করুন"><X className="w-5 h-5" /></button>
              </div>
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setTab(item.id); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold ${tab === item.id ? 'bg-[#0F2942] text-white' : 'text-slate-700'}`}
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
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              {toast}
            </div>
          )}

          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">অনুমোদিত শ্রেণি</p>
                  <p className="text-2xl font-bold text-[#0F2942] tabular-nums mt-1">{toBengaliDigits(classes.length)}টি</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">মোট শিক্ষার্থী</p>
                  <p className="text-2xl font-bold text-[#1D4ED8] tabular-nums mt-1">{toBengaliDigits(students.length)} জন</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">সাপ্তাহিক ক্লাস স্লট</p>
                  <p className="text-2xl font-bold text-[#0F2942] tabular-nums mt-1">{toBengaliDigits(routines.length)}টি</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">আসন্ন / চলমান পরীক্ষা</p>
                  <p className="text-2xl font-bold text-[#C59B38] tabular-nums mt-1">{toBengaliDigits(exams.length)}টি</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">নম্বর জমাকৃত ফলাফল</p>
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">{toBengaliDigits(results.length)} জন</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">প্রদত্ত হোমওয়ার্ক</p>
                  <p className="text-2xl font-bold text-[#0F2942] tabular-nums mt-1">{toBengaliDigits(homework.length)}টি</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap gap-3">
                <button type="button" onClick={() => setTab('attendance')} className="px-4 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold">
                  আজকের হাজিরা নিন
                </button>
                <button type="button" onClick={() => setTab('exams')} className="px-4 py-2 rounded-lg bg-[#1D4ED8] text-white text-xs font-semibold">
                  নম্বর এন্ট্রি করুন
                </button>
                <button type="button" onClick={() => setTab('homework')} className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-[#0F2942]">
                  নতুন হোমওয়ার্ক দিন
                </button>
              </div>
            </div>
          )}

          {tab === 'profile' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 max-w-2xl">
              <div className="flex items-center gap-4">
                <img src={teacher.avatarUrl} alt={teacher.name} className="w-20 h-20 rounded-full object-cover border border-slate-200" referrerPolicy="no-referrer" />
                <div>
                  <h2 className="text-xl font-bold text-[#0F2942]">{teacher.name}</h2>
                  <p className="text-sm text-[#1D4ED8] font-semibold">{teacher.designation}</p>
                  <p className="text-xs text-slate-500 mt-1">{teacher.qualification}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">{teacher.bio}</p>
              <div className="grid grid-cols-2 gap-3 text-sm pt-2">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block">মোবাইল</span>
                  <span className="font-semibold">{teacher.phone}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block">অনুমোদিত শ্রেণি</span>
                  <span className="font-semibold">{teacher.assignedClassIds.map(getClassNameBn).join(', ')}</span>
                </div>
              </div>
            </div>
          )}

          {tab === 'classes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {classes.map((c) => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
                  <h3 className="text-lg font-bold text-[#0F2942]">{c.nameBn}</h3>
                  <p className="text-xs text-slate-500">{c.scheduleSummary}</p>
                  <p className="text-sm text-slate-600">{c.description}</p>
                  <p className="text-xs font-semibold text-[#1D4ED8] pt-2">
                    ব্যাচসমূহ: {batches.filter((b) => b.classId === c.id).map((b) => b.name).join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          )}

          {tab === 'students' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-[#0F2942]">অনুমোদিত শিক্ষার্থী তালিকা</h2>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="search"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="নাম বা আইডি খুঁজুন..."
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-300"
                  />
                  <select
                    value={studentClassFilter}
                    onChange={(e) => setStudentClassFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="ALL">সকল শ্রেণি</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nameBn}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <tr>
                      <th className="py-3 px-4">আইডি</th>
                      <th className="py-3 px-4">নাম</th>
                      <th className="py-3 px-4">শ্রেণি ও রোল</th>
                      <th className="py-3 px-4">অভিভাবকের ফোন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((s) => (
                      <tr key={s.id}>
                        <td className="py-3 px-4 font-mono text-xs">{s.studentCode}</td>
                        <td className="py-3 px-4 font-semibold">{s.name}</td>
                        <td className="py-3 px-4">{s.enrollments.map((e) => `${getClassNameBn(e.classId)} (${toBengaliDigits(e.rollNumber)})`).join(' · ')}</td>
                        <td className="py-3 px-4 tabular-nums">{s.guardianPhone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'routine' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-xl font-bold text-[#0F2942]">ক্লাস রুটিন</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <tr>
                      <th className="py-3 px-4">বার</th>
                      <th className="py-3 px-4">সময়</th>
                      <th className="py-3 px-4">শ্রেণি</th>
                      <th className="py-3 px-4">বিষয়</th>
                      <th className="py-3 px-4">কক্ষ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {routines.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-bold">{r.day}</td>
                        <td className="py-3 px-4 tabular-nums">{r.startTime} – {r.endTime}</td>
                        <td className="py-3 px-4">{getClassNameBn(r.classId)}</td>
                        <td className="py-3 px-4">{r.subjectName}</td>
                        <td className="py-3 px-4">{r.room}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'attendance' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-end gap-3 justify-between">
                  <h2 className="text-xl font-bold text-[#0F2942]">দৈনিক হাজিরা এন্ট্রি</h2>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="date"
                      value={attDate}
                      onChange={(e) => setAttDate(e.target.value)}
                      className="px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                    <select
                      value={attClassId}
                      onChange={(e) => {
                        const cid = e.target.value as AcademicClassId;
                        setAttClassId(cid);
                        const fb = batches.find((b) => b.classId === cid)?.id ?? '';
                        setAttBatchId(fb);
                      }}
                      className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      {classes.map((c) => <option key={c.id} value={c.id}>{c.nameBn}</option>)}
                    </select>
                    <select
                      value={attBatchId}
                      onChange={(e) => setAttBatchId(e.target.value)}
                      className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      {batches.filter((b) => b.classId === attClassId).map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                      <tr>
                        <th className="py-3 px-4">রোল</th>
                        <th className="py-3 px-4">নাম</th>
                        <th className="py-3 px-4">উপস্থিতির অবস্থা</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeAttStudents.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-sm text-slate-500">
                            নির্বাচিত শ্রেণি ও ব্যাচে কোনো শিক্ষার্থী পাওয়া যায়নি।
                          </td>
                        </tr>
                      ) : (
                        activeAttStudents.map((s) => {
                          const enr = s.enrollments.find((e) => e.classId === attClassId);
                          return (
                            <tr key={s.id}>
                              <td className="py-3 px-4 font-mono tabular-nums">{toBengaliDigits(enr?.rollNumber ?? '01')}</td>
                              <td className="py-3 px-4 font-semibold">{s.name}</td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1.5">
                                  {(['Present', 'Absent', 'Late', 'Leave'] as AttendanceStatus[]).map((st) => (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() => setAttDraft((prev) => ({ ...prev, [s.id]: st }))}
                                      className={`px-3 py-1 text-xs font-semibold rounded-md border ${
                                        attDraft[s.id] === st
                                          ? st === 'Present'
                                            ? 'bg-emerald-700 text-white border-emerald-700'
                                            : st === 'Absent'
                                              ? 'bg-red-600 text-white border-red-600'
                                              : 'bg-amber-600 text-white border-amber-600'
                                          : 'bg-white text-slate-600 border-slate-200'
                                      }`}
                                    >
                                      {st === 'Present' ? 'উপস্থিত' : st === 'Absent' ? 'অনুপস্থিত' : st === 'Late' ? 'বিলম্ব' : 'ছুটি'}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={() => void handleSaveAttendance()}
                  className="px-5 py-2.5 rounded-lg bg-[#0F2942] text-white text-sm font-semibold hover:bg-[#173a5e]"
                >
                  হাজিরা সংরক্ষণ করুন
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                <h3 className="text-base font-bold text-[#0F2942]">অনুপস্থিত শিক্ষার্থী ও সাম্প্রতিক ইতিহাস</h3>
                <div className="space-y-2 text-xs">
                  {attendance.slice(0, 8).map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span>{toBengaliDigits(a.date)} · {a.studentName} ({getClassNameBn(a.classId)})</span>
                      <span className={`font-bold ${a.status === 'Absent' ? 'text-red-600' : a.status === 'Present' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {a.status === 'Present' ? 'উপস্থিত' : a.status === 'Absent' ? 'অনুপস্থিত' : a.status === 'Late' ? 'বিলম্ব' : 'ছুটি'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'exams' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <h2 className="text-xl font-bold text-[#0F2942]">পরীক্ষার নম্বর এন্ট্রি ও ফলাফল প্রস্তুতি</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">পরীক্ষা নির্বাচন</label>
                  <select
                    value={activeExam?.id ?? ''}
                    onChange={(e) => {
                      setSelectedExamId(e.target.value);
                      setSelectedStudentId('');
                    }}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>{ex.title} ({getClassNameBn(ex.classId)})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">শিক্ষার্থী নির্বাচন</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    {examStudents.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.studentCode})</option>
                    ))}
                  </select>
                </div>
              </div>

              {activeExam && (
                <form onSubmit={(e) => void handleSaveMarks(e)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeExam.subjects.map((sub) => (
                      <div key={sub.subjectName} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <label className="block text-xs font-bold text-[#0F2942] mb-1.5">
                          {sub.subjectName} (পূর্ণমান: {toBengaliDigits(sub.fullMarks)})
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={sub.fullMarks}
                          value={marksDraft[sub.subjectName] ?? ''}
                          onChange={(e) => setMarksDraft((p) => ({ ...p, [sub.subjectName]: e.target.value }))}
                          placeholder="প্রাপ্ত নম্বর"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                    ))}
                  </div>
                  <button type="submit" className="px-6 py-2.5 rounded-lg bg-[#0F2942] text-white text-sm font-semibold hover:bg-[#173a5e]">
                    নম্বর সংরক্ষণ ও GPA প্রস্তুত করুন
                  </button>
                </form>
              )}
            </div>
          )}

          {tab === 'materials' && (
            <div className="space-y-6">
              <form onSubmit={(e) => void handleUploadMaterial(e)} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#0F2942]">নতুন স্টাডি ম্যাটেরিয়াল আপলোড</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={matForm.title}
                    onChange={(e) => setMatForm({ ...matForm, title: e.target.value })}
                    placeholder="শিটের শিরোনাম"
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                  <select
                    value={matForm.classId}
                    onChange={(e) => setMatForm({ ...matForm, classId: e.target.value as AcademicClassId })}
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.nameBn}</option>)}
                  </select>
                  <input
                    type="text"
                    value={matForm.fileName}
                    onChange={(e) => setMatForm({ ...matForm, fileName: e.target.value })}
                    placeholder="ফাইলের নাম (যেমন: Note.pdf)"
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>
                <textarea
                  rows={2}
                  value={matForm.description}
                  onChange={(e) => setMatForm({ ...matForm, description: e.target.value })}
                  placeholder="সংক্ষিপ্ত বিবরণ"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
                <button type="submit" className="px-5 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold">
                  ম্যাটেরিয়াল প্রকাশ করুন
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studyMaterials.map((m) => (
                  <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-[#1D4ED8]">{m.subject} · {getClassNameBn(m.classId)}</p>
                    <h3 className="font-bold text-[#0F2942] mt-1">{m.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{m.fileName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'homework' && (
            <div className="space-y-6">
              <form onSubmit={(e) => void handleCreateHomework(e)} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#0F2942]">নতুন হোমওয়ার্ক যুক্ত করুন</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={hwForm.title}
                    onChange={(e) => setHwForm({ ...hwForm, title: e.target.value })}
                    placeholder="হোমওয়ার্ক শিরোনাম"
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                  <select
                    value={hwForm.classId}
                    onChange={(e) => {
                      const cid = e.target.value as AcademicClassId;
                      const fb = batches.find((b) => b.classId === cid)?.id ?? '';
                      setHwForm({ ...hwForm, classId: cid, batchId: fb });
                    }}
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.nameBn}</option>)}
                  </select>
                  <input
                    type="date"
                    value={hwForm.deadline}
                    onChange={(e) => setHwForm({ ...hwForm, deadline: e.target.value })}
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>
                <textarea
                  rows={2}
                  value={hwForm.description}
                  onChange={(e) => setHwForm({ ...hwForm, description: e.target.value })}
                  placeholder="নির্দেশনা লিখুন..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
                <button type="submit" className="px-5 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold">
                  হোমওয়ার্ক পাঠান
                </button>
              </form>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                <h3 className="font-bold text-[#0F2942]">শিক্ষার্থীদের জমা দেওয়া হোমওয়ার্ক ({toBengaliDigits(homeworkSubmissions.length)})</h3>
                {homeworkSubmissions.map((s) => (
                  <div key={s.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[#0F2942]">{s.studentName} ({s.studentCode})</p>
                      <p className="text-slate-600 mt-0.5">{s.note} {s.fileName ? `· ${s.fileName}` : ''}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-4 h-4" /> {s.status === 'Checked' ? 'পরীক্ষিত' : 'জমা হয়েছে'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'messages' && <MessagingCenter currentUser={user} />}

          {tab === 'notices' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-xl font-bold text-[#0F2942]">প্রতিষ্ঠানের নোটিশ</h2>
              {notices.map((n) => (
                <div key={n.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs font-semibold text-[#1D4ED8]">{n.type} · {toBengaliDigits(n.date)}</p>
                  <h3 className="font-bold text-[#0F2942] mt-1">{n.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{n.description}</p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Quick Bar for Teacher */}
      <nav
        aria-label="শিক্ষক মোবাইল নেভিগেশন"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 h-14"
      >
        {[
          { id: 'overview' as TeacherTab, label: 'ড্যাশবোর্ড', icon: <Home className="w-4 h-4" /> },
          { id: 'attendance' as TeacherTab, label: 'হাজিরা', icon: <ClipboardCheck className="w-4 h-4" /> },
          { id: 'exams' as TeacherTab, label: 'নম্বর এন্ট্রি', icon: <Award className="w-4 h-4" /> },
          { id: 'homework' as TeacherTab, label: 'হোমওয়ার্ক', icon: <Plus className="w-4 h-4" /> },
          { id: 'messages' as TeacherTab, label: 'বার্তা', icon: <MessageSquare className="w-4 h-4" /> },
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

      {showNotifs && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <div className="bg-white w-full max-w-sm h-full p-5 flex flex-col border-l border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-[#0F2942]">বিজ্ঞপ্তি</h3>
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
    </div>
  );
};

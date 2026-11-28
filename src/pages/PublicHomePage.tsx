import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Home,
  LayoutGrid,
  LogIn,
  Mail,
  MapPin,
  Megaphone,
  MonitorPlay,
  Phone,
  Pin,
  ShieldCheck,
  Trophy,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { HeroSection } from '../components/HeroSection';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useSecretLogoTap } from '../hooks/useSecretLogoTap';
import { apiFetch } from '../services/api';
import type {
  AcademicClass,
  AcademicClassId,
  Batch,
  Exam,
  ExamResult,
  Notice,
  Subject,
  Teacher,
  WebsiteSettings,
} from '../types';
import { formatBengaliOrdinal, formatTaka, getClassNameBn, toBengaliDigits } from '../utils/academicLogic';
import { enqueuePendingItem } from '../utils/offlineQueue';

export interface PublicBootstrapData {
  settings: WebsiteSettings;
  classes: AcademicClass[];
  batches: Batch[];
  subjects: Subject[];
  teachers: Teacher[];
  notices: Notice[];
  exams: Exam[];
  results: ExamResult[];
  supabaseConfigured: boolean;
}

interface PublicHomePageProps {
  data: PublicBootstrapData;
  onNavigateAdmission: (preselectedClassId?: AcademicClassId) => void;
  onNavigateLogin: (portalHint?: 'TEACHER' | 'STUDENT') => void;
  selectedClassDetail: AcademicClassId | null;
  onSelectClassDetail: (classId: AcademicClassId | null) => void;
  onLogoSecretTrigger?: () => void;
}

const COURSE_TILE_STYLES: Record<AcademicClassId, { badge: string; bg: string }> = {
  'class-8': {
    badge: '8',
    bg: 'bg-[#1D4ED8] text-white hover:bg-[#1e40af]',
  },
  'class-9': {
    badge: '9',
    bg: 'bg-[#0F2942] text-white hover:bg-[#173a5e]',
  },
  'class-10': {
    badge: '10',
    bg: 'bg-[#047857] text-white hover:bg-[#065f46]',
  },
  'ssc-batch': {
    badge: 'SSC',
    bg: 'bg-[#B47E19] text-white hover:bg-[#996912]',
  },
};

export const PublicHomePage: React.FC<PublicHomePageProps> = ({
  data,
  onNavigateAdmission,
  onNavigateLogin,
  selectedClassDetail,
  onSelectClassDetail,
  onLogoSecretTrigger,
}) => {
  const { settings, classes, batches, subjects, teachers, notices, exams, results } = data;
  const isOnline = useOnlineStatus();
  const { registerTap } = useSecretLogoTap(onLogoSecretTrigger);

  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [noticeFilter, setNoticeFilter] = useState<string>('ALL');
  const [rankingExamId, setRankingExamId] = useState<string>(exams?.[0]?.id ?? '');
  const [contactForm, setContactForm] = useState({ name: '', phone: '', message: '' });
  const [contactStatus, setContactStatus] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [mobileSection, setMobileSection] = useState<'top' | 'classes' | 'notices' | 'results'>('top');

  useEffect(() => {
    if (!exams.some((e) => e.id === rankingExamId) && exams[0]?.id) {
      setRankingExamId(exams[0].id);
    }
  }, [exams, rankingExamId]);

  const handleMainLogoTap = (e: React.MouseEvent) => {
    e.preventDefault();
    const unlocked = registerTap();
    if (!unlocked) {
      if (selectedClassDetail) {
        onSelectClassDetail(null);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const filteredNotices = useMemo(() => {
    const sorted = [...notices].sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
    if (noticeFilter === 'ALL') return sorted;
    return sorted.filter((n) => n.type === noticeFilter);
  }, [notices, noticeFilter]);

  const activeExam = useMemo(
    () => exams.find((e) => e.id === rankingExamId) ?? exams[0] ?? null,
    [exams, rankingExamId]
  );

  const examRankings = useMemo(() => {
    if (!activeExam) return [];
    return results
      .filter((r) => r.examId === activeExam.id && r.isPublished)
      .sort((a, b) => a.classRank - b.classRank);
  }, [results, activeExam]);

  const detailClass = useMemo(
    () => classes.find((c) => c.id === selectedClassDetail) ?? null,
    [classes, selectedClassDetail]
  );

  const scrollToSection = (id: 'top' | 'classes' | 'notices' | 'results') => {
    setMobileSection(id);
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.phone.trim() || !contactForm.message.trim()) {
      setContactStatus({ type: 'err', msg: 'অনুগ্রহ করে নাম, মোবাইল নম্বর এবং বার্তা পূরণ করুন।' });
      return;
    }
    if (!isOnline) {
      enqueuePendingItem({
        endpoint: '/api/public/contact',
        method: 'POST',
        payload: contactForm,
        label: `যোগাযোগ বার্তা (${contactForm.name})`,
      });
      setContactStatus({
        type: 'ok',
        msg: 'আপনি এখন অফলাইনে আছেন। বার্তাটি অপেক্ষমাণ তালিকায় সংরক্ষিত হয়েছে এবং ইন্টারনেট ফিরলে স্বয়ংক্রিয়ভাবে পাঠানো হবে।',
      });
      setContactForm({ name: '', phone: '', message: '' });
      return;
    }
    setContactSubmitting(true);
    setContactStatus(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/public/contact', {
        method: 'POST',
        body: JSON.stringify(contactForm),
      });
      setContactStatus({ type: 'ok', msg: res.message });
      setContactForm({ name: '', phone: '', message: '' });
    } catch (err) {
      setContactStatus({ type: 'err', msg: (err as Error).message });
    } finally {
      setContactSubmitting(false);
    }
  };

  // Dedicated Class Details View when user clicks a class card
  if (detailClass) {
    const classBatches = batches.filter((b) => b.classId === detailClass.id);
    const classSubjects = subjects.filter((s) => s.classId === detailClass.id);
    const classTeachers = teachers.filter((t) => t.assignedClassIds.includes(detailClass.id));

    return (
      <div className="min-h-screen bg-white text-slate-800 pb-20 lg:pb-0">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onSelectClassDetail(null)}
              className="min-h-[40px] px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-[#0F2942] border border-slate-200 rounded-xl whitespace-nowrap"
            >
              ← হোমপেজে ফিরুন
            </button>
            <button
              type="button"
              onClick={() => onNavigateAdmission(detailClass.id)}
              className="min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0F2942] rounded-xl hover:bg-[#173a5e] whitespace-nowrap"
            >
              ভর্তি আবেদন
            </button>
          </div>
          <div className="border-b border-slate-200 pb-6 sm:pb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2.5 max-w-3xl">
              <p className="text-xs font-semibold text-[#C59B38]">
                {detailClass.nameEn} · {detailClass.targetGroup}
              </p>
              <h1 className="text-2xl sm:text-4xl font-bold text-[#0F2942]">
                {detailClass.nameBn} — একাডেমিক প্রোগ্রাম
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{detailClass.description}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 min-w-[240px]">
              <span className="block text-xs text-slate-500">মাসিক টিউশন ফি</span>
              <span className="block text-2xl font-bold text-[#0F2942] tabular-nums mt-1">
                {formatTaka(detailClass.monthlyFee)} <span className="text-xs font-normal text-slate-500">/ মাস</span>
              </span>
              <p className="text-xs text-slate-600 mt-2">{detailClass.scheduleSummary}</p>
            </div>
          </div>

          {detailClass.isExamBatch && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 sm:p-5 text-sm text-amber-950">
              <strong>দশম শ্রেণির শিক্ষার্থীদের জন্য বিশেষ নির্দেশনা:</strong> SSC ব্যাচটি দশম শ্রেণির শিক্ষার্থীদের পরীক্ষাভিত্তিক চূড়ান্ত প্রস্তুতি ব্যাচ। বিদ্যমান দশম শ্রেণির শিক্ষার্থীরা নতুন অ্যাকাউন্ট তৈরি না করেই একই স্টুডেন্ট আইডিতে এই ব্যাচে যুক্ত হতে পারবেন।
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <section className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6">
              <h2 className="text-lg font-bold text-[#0F2942] mb-4">পাঠ্য বিষয়সমূহ</h2>
              <ul className="space-y-2.5">
                {detailClass.subjects.map((sub) => (
                  <li key={sub} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{sub}</span>
                  </li>
                ))}
              </ul>
              {classSubjects.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-200 text-xs text-slate-500">
                  মোট নিবন্ধিত বোর্ড বিষয় কোড: {classSubjects.map((s) => s.code).join(', ')}
                </div>
              )}
            </section>

            <section className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6">
              <h2 className="text-lg font-bold text-[#0F2942] mb-4">বিশেষ সুবিধাসমূহ</h2>
              <ul className="space-y-2.5">
                {detailClass.highlights.map((hl) => (
                  <li key={hl} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <Award className="w-4 h-4 text-[#C59B38] shrink-0" />
                    <span>{hl}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section>
            <h2 className="text-xl font-bold text-[#0F2942] mb-4">উপলব্ধ ব্যাচ ও সময়সূচি</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classBatches.map((b) => (
                <div key={b.id} className="border border-slate-200 rounded-2xl p-5 bg-white flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-[#0F2942]">{b.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">{b.timeSlot}</p>
                    <p className="text-xs text-slate-500 mt-1">{b.room} · আসন সংখ্যা {toBengaliDigits(b.capacity)} জন</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateAdmission(detailClass.id)}
                    className="min-h-[42px] px-4 py-2 text-xs font-semibold rounded-xl bg-[#1D4ED8] text-white hover:bg-blue-800 whitespace-nowrap"
                  >
                    আবেদন
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0F2942] mb-4">সংশ্লিষ্ট শিক্ষকমণ্ডলী</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              {classTeachers.map((t) => (
                <div key={t.id} className="border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 bg-white">
                  <img
                    src={t.avatarUrl}
                    alt={t.name}
                    className="w-14 h-14 rounded-full object-cover object-top border border-slate-200 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#0F2942] truncate">{t.name}</h3>
                    <p className="text-xs text-slate-500 truncate">{t.designation}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 pb-16 lg:pb-0">
      <main id="top">
        {/* ================================================================ */}
        {/* REFERENCE HERO SECTION (Pure Logo, Brand Name, Slogan & Graphics) */}
        {/* ================================================================ */}
        <HeroSection onLogoTap={handleMainLogoTap} heroBannerUrl={settings.heroBannerUrl} />

        {/* Feature Strip, Quick Command Bento & Stats Bar */}
        <section className="bg-white py-8 lg:py-10 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 lg:space-y-8">
            {/* 6-Item Feature Strip (Matches Reference Feature Row) */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm px-4 py-3.5"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-semibold text-[#0F2942]">
                <div className="flex items-center gap-2 py-1">
                  <BookOpen className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                  <span>স্মার্ট ক্লাস সিস্টেম</span>
                </div>
                <div className="flex items-center gap-2 py-1">
                  <Users className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                  <span>দক্ষ শিক্ষক মণ্ডলী</span>
                </div>
                <div className="flex items-center gap-2 py-1">
                  <MonitorPlay className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                  <span>আধুনিক পাঠদান পদ্ধতি</span>
                </div>
                <div className="flex items-center gap-2 py-1">
                  <FileText className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                  <span>অনলাইন রিসোর্স</span>
                </div>
                <div className="flex items-center gap-2 py-1">
                  <CheckCircle2 className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                  <span>নিয়মিত পরীক্ষা</span>
                </div>
                <div className="flex items-center gap-2 py-1">
                  <Trophy className="w-4 h-4 text-[#C59B38] shrink-0" />
                  <span>মেধা তালিকা</span>
                </div>
              </div>
            </motion.div>

            {/* ============================================================== */}
            {/* ABOVE-THE-FOLD 3-CARD COMMAND BENTO (Matches Reference 3-Panel) */}
            {/* ============================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Panel 1: আমাদের কোর্সসমূহ (4 Interactive Class Tiles) */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.42, ease: 'easeOut' }}
                className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 bg-[#0F2942] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold">
                    <GraduationCap className="w-4 h-4 text-[#C59B38]" />
                    <span>আমাদের কোর্সসমূহ</span>
                  </div>
                  <a href="#classes" className="text-xs font-semibold text-[#1D4ED8] hover:underline">
                    বিস্তারিত →
                  </a>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {classes.map((cls, idx) => {
                    const style = COURSE_TILE_STYLES[cls.id] ?? {
                      badge: cls.shortCode,
                      bg: 'bg-[#0F2942] text-white',
                    };
                    return (
                      <motion.button
                        key={cls.id}
                        type="button"
                        initial={{ opacity: 0, scale: 0.94 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onSelectClassDetail(cls.id)}
                        className={`${style.bg} rounded-2xl p-3.5 text-center flex flex-col items-center justify-between min-h-[112px] shadow-sm`}
                      >
                        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums">
                          {style.badge}
                        </span>
                        <span className="text-xs font-bold leading-snug mt-1">
                          {cls.nameBn}
                        </span>
                        <span className="mt-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Panel 2: সর্বশেষ নোটিশ */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.42, delay: 0.08, ease: 'easeOut' }}
                className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 bg-[#0F2942] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold">
                    <Megaphone className="w-4 h-4 text-[#C59B38]" />
                    <span>সর্বশেষ নোটিশ</span>
                  </div>
                  <a href="#notices" className="text-xs font-semibold text-[#0F2942] hover:underline">
                    সব দেখুন →
                  </a>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredNotices.slice(0, 4).map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setSelectedNotice(n)}
                      className="w-full py-2.5 text-left flex items-center justify-between gap-3 hover:bg-slate-50 rounded-lg px-1.5 transition-colors"
                    >
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        {n.title}
                      </span>
                      <span className="text-[11px] font-medium text-[#1D4ED8] tabular-nums shrink-0">
                        {toBengaliDigits(n.date)}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Panel 3: দ্রুত প্রবেশ করুন (STRICTLY ZERO ADMIN LINK) */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.42, delay: 0.14, ease: 'easeOut' }}
                className="lg:col-span-3 bg-[#0F2942] rounded-2xl p-4 sm:p-5 text-white shadow-sm flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-[#C59B38]" />
                  <span>দ্রুত প্রবেশ করুন</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <motion.button
                    type="button"
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onNavigateLogin('STUDENT')}
                    className="min-h-[76px] rounded-xl bg-[#1D4ED8] hover:bg-blue-700 p-3 flex flex-col items-center justify-center gap-1.5 text-center transition-colors"
                  >
                    <BookOpen className="w-5 h-5" />
                    <span className="text-[11px] font-bold leading-tight">স্টুডেন্ট লগইন</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onNavigateLogin('TEACHER')}
                    className="min-h-[76px] rounded-xl bg-[#047857] hover:bg-emerald-800 p-3 flex flex-col items-center justify-center gap-1.5 text-center transition-colors"
                  >
                    <UserCheck className="w-5 h-5" />
                    <span className="text-[11px] font-bold leading-tight">টিচার লগইন</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onNavigateAdmission()}
                    className="min-h-[76px] rounded-xl bg-[#B47E19] hover:bg-amber-700 p-3 flex flex-col items-center justify-center gap-1.5 text-center transition-colors"
                  >
                    <GraduationCap className="w-5 h-5" />
                    <span className="text-[11px] font-bold leading-tight">অনলাইন ভর্তি</span>
                  </motion.button>
                  <motion.a
                    href="#results"
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="min-h-[76px] rounded-xl bg-white/15 hover:bg-white/25 p-3 flex flex-col items-center justify-center gap-1.5 text-center transition-colors"
                  >
                    <Trophy className="w-5 h-5 text-[#C59B38]" />
                    <span className="text-[11px] font-bold leading-tight">মেধা তালিকা</span>
                  </motion.a>
                </div>
              </motion.div>
            </div>

            {/* Bottom Institutional Stats Banner (Matches Reference Stat Bar) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 grid grid-cols-2 lg:grid-cols-12 gap-4 items-center">
              <div className="lg:col-span-2 flex items-center gap-3">
                <Users className="w-6 h-6 text-[#0F2942] shrink-0" />
                <div>
                  <p className="text-xl sm:text-2xl font-extrabold text-[#0F2942] tabular-nums leading-none">
                    {settings.achievementStats?.totalStudents ?? '৫০০+'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">মোট শিক্ষার্থী</p>
                </div>
              </div>

              <div className="lg:col-span-2 flex items-center gap-3">
                <UserCheck className="w-6 h-6 text-[#1D4ED8] shrink-0" />
                <div>
                  <p className="text-xl sm:text-2xl font-extrabold text-[#0F2942] tabular-nums leading-none">
                    {settings.achievementStats?.experiencedTeachers ?? '১৮+'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">দক্ষ শিক্ষক</p>
                </div>
              </div>

              <div className="lg:col-span-2 flex items-center gap-3">
                <Trophy className="w-6 h-6 text-[#C59B38] shrink-0" />
                <div>
                  <p className="text-xl sm:text-2xl font-extrabold text-[#1D4ED8] tabular-nums leading-none">
                    {settings.achievementStats?.passRate ?? '৯৮.৫%'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">সফলতার হার</p>
                </div>
              </div>

              <div className="lg:col-span-2 flex items-center gap-3">
                <Award className="w-6 h-6 text-[#C59B38] shrink-0" />
                <div>
                  <p className="text-xl sm:text-2xl font-extrabold text-[#0F2942] tabular-nums leading-none">
                    {settings.achievementStats?.gpa5Count ?? '১২০+'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">জিপিএ-৫ অর্জন</p>
                </div>
              </div>

              <div className="col-span-2 lg:col-span-4 bg-[#0F2942] text-white rounded-xl px-4 py-3 flex items-center gap-3">
                <Trophy className="w-6 h-6 text-[#C59B38] shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold truncate">শিক্ষানীর কোচিং সেন্টার</p>
                  <p className="text-[11px] text-[#C59B38] truncate">সাফল্যের পথে, সবসময় সাথে...</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 1. ABOUT SHIKHANIR */}
        <section id="about" className="py-12 sm:py-16 bg-slate-50/70 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-6">
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
                <img
                  src="/src/assets/images/campus_classroom_scene_1795498507714.jpg"
                  alt="শিক্ষানীর কোচিং সেন্টারের আধুনিক শ্রেণিকক্ষ"
                  className="w-full h-full object-cover aspect-video"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <div className="lg:col-span-6 space-y-5">
              <p className="text-xs font-semibold text-[#C59B38]">আমাদের সম্পর্কে</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0F2942] [text-wrap:balance]">
                সুশৃঙ্খল পাঠদান ও ব্যক্তিগত যত্নে গড়া একটি আদর্শ শিক্ষাকেন্দ্র
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                শিক্ষানীর প্রতিটি শিক্ষার্থীর মেধা ও বোঝার ক্ষমতা অনুযায়ী পাঠদান নিশ্চিত করে। নিয়মিত সাপ্তাহিক পরীক্ষা, অধ্যায়ভিত্তিক লেকচার শিট, ডিজিটাল উপস্থিতি পর্যবেক্ষণ এবং অভিভাবকদের সাথে সরাসরি যোগাযোগের মাধ্যমে আমরা শিক্ষার্থীদের বোর্ড পরীক্ষার জন্য আত্মবিশ্বাসী করে গড়ে তুলি।
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-[#0F2942]">নিয়মিত সাপ্তাহিক ও মাসিক পরীক্ষা</h3>
                  <p className="text-xs text-slate-600 mt-1">প্রতিটি অধ্যায় শেষে মূল্যায়ন ও নির্ভুল GPA ফলাফল প্রকাশ।</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-[#0F2942]">অভিভাবক ও ডিজিটাল পোর্টাল</h3>
                  <p className="text-xs text-slate-600 mt-1">হাজিরা, বেতন রসিদ, হোমওয়ার্ক ও মার্কশিট সরাসরি অনলাইনে।</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. ACADEMIC CLASSES */}
        <section id="classes" className="py-12 sm:py-16 bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-8 sm:mb-10">
              <p className="text-xs font-semibold text-[#C59B38]">একাডেমিক বিভাগসমূহ</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0F2942] mt-1">
                চারটি সুবিন্যস্ত শ্রেণি ও পরীক্ষাভিত্তিক ব্যাচ
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                প্রতিটি শ্রেণির আলাদা সিলেবাস, লেকচার শিট ও ব্যাচ রুটিন রয়েছে। বিস্তারিত জানতে যেকোনো বিভাগে ক্লিক করুন।
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {classes.map((cls, idx) => (
                <motion.article
                  key={cls.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.12 }}
                  transition={{ duration: 0.36, delay: idx * 0.06, ease: 'easeOut' }}
                  whileHover={{ y: -4 }}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col justify-between hover:border-[#1D4ED8] hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#0F2942] text-white font-bold text-sm">
                        {cls.shortCode}
                      </span>
                      <span className="text-sm font-bold text-[#0F2942] tabular-nums">
                        {formatTaka(cls.monthlyFee)}/মাস
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[#0F2942]">{cls.nameBn}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{cls.scheduleSummary}</p>
                    <p className="text-sm text-slate-600 mt-3 leading-relaxed line-clamp-3">
                      {cls.description}
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectClassDetail(cls.id)}
                      className="min-h-[40px] text-sm font-semibold text-[#1D4ED8] hover:underline"
                    >
                      বিস্তারিত দেখুন
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateAdmission(cls.id)}
                      className="min-h-[40px] px-4 py-1.5 text-xs font-semibold rounded-xl bg-[#0F2942] text-white hover:bg-[#173a5e]"
                    >
                      ভর্তি
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* 3. TEACHER INTRODUCTION (Live synced with Admin Teacher Photo & Name CRUD) */}
        <section id="teachers" className="py-12 sm:py-16 bg-slate-50/70 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-8 sm:mb-10">
              <p className="text-xs font-semibold text-[#C59B38]">অভিজ্ঞ শিক্ষকমণ্ডলী</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0F2942] mt-1">
                শিক্ষানীরের নিবেদিতপ্রাণ শিক্ষকবৃন্দ
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {teachers.map((t, idx) => (
                <motion.article
                  key={t.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.12 }}
                  transition={{ duration: 0.38, delay: idx * 0.06, ease: 'easeOut' }}
                  whileHover={{ y: -4 }}
                  className="group bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[4/3] sm:aspect-square bg-slate-100 overflow-hidden">
                    <img
                      src={t.avatarUrl}
                      alt={t.name}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-5 sm:p-6 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-[#0F2942]">{t.name}</h3>
                      <p className="text-xs font-semibold text-[#1D4ED8] mt-0.5">{t.designation}</p>
                      <p className="text-xs text-slate-500 mt-1">{t.qualification}</p>
                      <p className="text-sm text-slate-600 mt-3 leading-relaxed">{t.bio}</p>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-100 text-xs text-slate-500">
                      অভিজ্ঞতা: {toBengaliDigits(t.experienceYears ?? 0)} বছর · বিষয়: {(t.subjects ?? []).join(', ')}
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* 4. LATEST NOTICES */}
        <section id="notices" className="py-12 sm:py-16 bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-semibold text-[#C59B38]">নোটিশ বোর্ড</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#0F2942] mt-1">সর্বশেষ নোটিশ ও ঘোষণা</h2>
              </div>
              <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl">
                {['ALL', 'ভর্তি বিজ্ঞপ্তি', 'পরীক্ষার নোটিশ', 'জরুরি নোটিশ', 'সাধারণ নোটিশ'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNoticeFilter(cat)}
                    className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      noticeFilter === cat
                        ? 'bg-white text-[#0F2942] shadow-sm'
                        : 'text-slate-600 hover:text-[#0F2942]'
                    }`}
                  >
                    {cat === 'ALL' ? 'সকল নোটিশ' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNotices.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelectedNotice(n)}
                  className="text-left bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl p-5 transition-colors flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1.5">
                      {n.isPinned && <Pin className="w-3.5 h-3.5 text-[#C59B38]" />}
                      <span className="font-semibold text-[#1D4ED8]">{n.type}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{toBengaliDigits(n.date)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{n.targetClassId === 'ALL' ? 'সকল শ্রেণি' : getClassNameBn(n.targetClassId)}</span>
                    </div>
                    <h3 className="text-base font-bold text-[#0F2942]">{n.title}</h3>
                    <p className="text-sm text-slate-600 mt-1.5 line-clamp-2">{n.description}</p>
                  </div>
                  <span className="text-xs font-semibold text-[#1D4ED8]">বিস্তারিত পড়ুন →</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 5. EXAMINATION RESULTS & 6. MERIT RANKING (Mobile Card View + Desktop Table) */}
        <section id="results" className="py-12 sm:py-16 bg-slate-50/70 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#C59B38]">ফলাফল ও মেধা তালিকা</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#0F2942] mt-1">
                  প্রকাশিত পরীক্ষার ফলাফল ও শীর্ষ মেধাক্রম
                </h2>
              </div>
              <div>
                <label htmlFor="public-exam-select" className="sr-only">পরীক্ষা নির্বাচন</label>
                <select
                  id="public-exam-select"
                  value={activeExam?.id ?? ''}
                  onChange={(e) => setRankingExamId(e.target.value)}
                  className="w-full md:w-auto min-h-[44px] px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 bg-white text-[#0F2942]"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title} ({getClassNameBn(ex.classId)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {examRankings.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                {examRankings.slice(0, 3).map((r, idx) => (
                  <div
                    key={r.id}
                    className={`rounded-2xl p-5 sm:p-6 border bg-white ${
                      idx === 0 ? 'border-[#C59B38] ring-1 ring-[#C59B38]/30' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                        idx === 0 ? 'text-[#C59B38]' : 'text-[#1D4ED8]'
                      }`}>
                        <Trophy className="w-4 h-4" />
                        {formatBengaliOrdinal(r.classRank)} স্থান
                      </span>
                      <span className="font-mono text-xs text-slate-500 tabular-nums">
                        রোল {toBengaliDigits(r.rollNumber)}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[#0F2942]">{r.studentName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {getClassNameBn(r.classId)} · {r.studentCode}
                    </p>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                      <span className="font-bold text-[#0F2942] tabular-nums">
                        মোট: {toBengaliDigits(r.totalObtained)} / {toBengaliDigits(r.totalFullMarks)}
                      </span>
                      <span className="font-bold text-emerald-700 tabular-nums">
                        GPA {toBengaliDigits(Number(r.gpa ?? 0).toFixed(2))} ({r.grade})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-[#0F2942]">পূর্ণাঙ্গ মেধা তালিকা</h3>
                <button
                  type="button"
                  onClick={() => onNavigateLogin('STUDENT')}
                  className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                >
                  ব্যক্তিগত মার্কশিট ডাউনলোড করতে লগইন করুন →
                </button>
              </div>

              {/* Mobile Card View (Zero horizontal crowding) */}
              <div className="md:hidden divide-y divide-slate-100">
                {examRankings.length === 0 ? (
                  <p className="p-6 text-center text-sm text-slate-500">
                    নির্বাচিত পরীক্ষার ফলাফল এখনও প্রকাশিত হয়নি।
                  </p>
                ) : (
                  examRankings.map((r) => (
                    <div key={r.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-[#0F2942]">{formatBengaliOrdinal(r.classRank)}</span>
                          <span className="text-slate-400">·</span>
                          <span className="font-mono text-slate-500">রোল {toBengaliDigits(r.rollNumber)}</span>
                        </div>
                        <p className="font-bold text-sm text-slate-900 truncate mt-0.5">{r.studentName}</p>
                        <p className="text-xs text-slate-500">{getClassNameBn(r.classId)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-[#1D4ED8] tabular-nums">
                          GPA {toBengaliDigits(Number(r.gpa ?? 0).toFixed(2))} ({r.grade})
                        </p>
                        <p className="text-xs font-semibold text-slate-600 tabular-nums mt-0.5">
                          {toBengaliDigits(r.totalObtained)} / {toBengaliDigits(r.totalFullMarks)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <tr>
                      <th className="py-3 px-4 font-semibold">মেধাক্রম</th>
                      <th className="py-3 px-4 font-semibold">রোল</th>
                      <th className="py-3 px-4 font-semibold">শিক্ষার্থীর নাম</th>
                      <th className="py-3 px-4 font-semibold">শ্রেণি</th>
                      <th className="py-3 px-4 font-semibold text-right">মোট নম্বর</th>
                      <th className="py-3 px-4 font-semibold text-right">GPA</th>
                      <th className="py-3 px-4 font-semibold text-center">গ্রেড</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {examRankings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          নির্বাচিত পরীক্ষার ফলাফল এখনও প্রকাশিত হয়নি।
                        </td>
                      </tr>
                    ) : (
                      examRankings.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-bold text-[#0F2942] tabular-nums">
                            {formatBengaliOrdinal(r.classRank)}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                            {toBengaliDigits(r.rollNumber)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{r.studentName}</td>
                          <td className="py-3 px-4 text-slate-600">{getClassNameBn(r.classId)}</td>
                          <td className="py-3 px-4 text-right font-semibold tabular-nums">
                            {toBengaliDigits(r.totalObtained)} / {toBengaliDigits(r.totalFullMarks)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-[#1D4ED8] tabular-nums">
                            {toBengaliDigits(Number(r.gpa ?? 0).toFixed(2))}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-700">{r.grade}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* 7. STUDENT ACHIEVEMENTS & 8. ADMISSION INFO */}
        <section className="py-12 sm:py-16 bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            <div className="lg:col-span-6 space-y-5">
              <p className="text-xs font-semibold text-[#C59B38]">শিক্ষার্থীদের সাফল্য</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0F2942]">
                বোর্ড পরীক্ষায় ধারাবাহিক সাফল্যের প্রমাণ
              </h2>
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    “দশম শ্রেণির শুরু থেকেই শিক্ষানীরের নিয়মিত সাপ্তাহিক পরীক্ষা ও স্যারদের ব্যক্তিগত গাইডলাইনে আমার গণিত ও পদার্থবিজ্ঞানের ভীতি পুরোপুরি দূর হয়। এসএসসি ২০২৫-এ আমি গোল্ডেন GPA 5.00 অর্জন করেছি।”
                  </p>
                  <p className="text-xs font-bold text-[#0F2942] mt-3">
                    — সাইফুল ইসলাম নাঈম · SSC ২০২৫ (জিপিএ ৫.০০), বর্তমানে নটর ডেম কলেজ
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    “অনলাইন পোর্টালে আমার সন্তানের প্রতিদিনের হাজিরা, মাসিক বেতন রসিদ ও পরীক্ষার ফলাফল সহজেই দেখতে পাই, যা অভিভাবক হিসেবে আমাকে অনেক নিশ্চিন্ত রাখে।”
                  </p>
                  <p className="text-xs font-bold text-[#0F2942] mt-3">
                    — মোঃ রফিকুল ইসলাম · অভিভাবক, দশম শ্রেণি
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-[#0F2942] text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
              <div className="space-y-4">
                <p className="text-xs font-semibold text-[#C59B38]">ভর্তি তথ্য</p>
                <h2 className="text-2xl sm:text-3xl font-bold">
                  নতুন শিক্ষাবর্ষে ভর্তি প্রক্রিয়া
                </h2>
                <p className="text-sm text-slate-200 leading-relaxed">
                  অষ্টম, নবম, দশম ও SSC মডেল টেস্ট ব্যাচে আসন সীমিত। অনলাইন ফর্ম পূরণের পর অফিস কর্তৃক তথ্য যাচাই ও অনুমোদনের মাধ্যমে স্টুডেন্ট আইডি, রোল নম্বর ও ডিজিটাল অ্যাকাউন্ট সক্রিয় করা হয়।
                </p>
                <ol className="space-y-2.5 text-sm text-slate-100 pt-2">
                  <li className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold shrink-0">১</span>
                    অনলাইন ভর্তি ফর্ম পূরণ ও Application ID সংগ্রহ
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold shrink-0">২</span>
                    অফিস যাচাই ও ব্যাচ/রোল নম্বর বরাদ্দ
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold shrink-0">৩</span>
                    স্টুডেন্ট অ্যাকাউন্ট সক্রিয়করণ ও ক্লাস শুরু
                  </li>
                </ol>
              </div>
              <div className="pt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigateAdmission()}
                  className="w-full sm:w-auto min-h-[46px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#C59B38] text-[#0F2942] font-bold text-sm hover:bg-amber-400 transition-colors"
                >
                  এখনই অনলাইন আবেদন করুন
                  <ArrowRight className="w-4 h-4" />
                </button>
                <PWAInstallButton compact />
              </div>
            </div>
          </div>
        </section>

        {/* 9. CONTACT INFORMATION */}
        <section id="contact" className="py-12 sm:py-16 bg-slate-50/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            <div className="lg:col-span-5 space-y-5">
              <p className="text-xs font-semibold text-[#C59B38]">যোগাযোগ</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0F2942]">আমাদের সাথে যোগাযোগ করুন</h2>
              <div className="space-y-4 text-sm text-slate-700 pt-2">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#1D4ED8] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#0F2942]">ক্যাম্পাস ঠিকানা</p>
                    <p>{settings.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[#1D4ED8] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#0F2942]">হেল্পলাইন</p>
                    <p className="tabular-nums">{settings.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#1D4ED8] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#0F2942]">ইমেইল</p>
                    <p>{settings.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#1D4ED8] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#0F2942]">অফিস সময়</p>
                    <p>{settings.officeHours}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 sm:p-8">
              <h3 className="text-lg font-bold text-[#0F2942] mb-4">সরাসরি জিজ্ঞাসা পাঠান</h3>
              <form onSubmit={(e) => void handleContactSubmit(e)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      আপনার নাম
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="শিক্ষার্থী বা অভিভাবকের নাম"
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      মোবাইল নম্বর
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      placeholder="017XXXXXXXX"
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="contact-msg" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    বার্তা / প্রশ্ন
                  </label>
                  <textarea
                    id="contact-msg"
                    rows={3}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="ভর্তি, ব্যাচের সময় বা ফি সম্পর্কে আপনার প্রশ্ন লিখুন..."
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
                {contactStatus && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium border ${
                      contactStatus.type === 'ok'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    {contactStatus.msg}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-[#0F2942] text-white text-sm font-semibold hover:bg-[#173a5e] disabled:opacity-60 transition-colors"
                >
                  {contactSubmitting ? 'পাঠানো হচ্ছে...' : 'বার্তা পাঠান'}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* 10. FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <BrandLogo size="lg" subtitle={settings.tagline} />
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#classes" className="hover:text-[#0F2942]">কোর্সসমূহ</a>
            <a href="#notices" className="hover:text-[#0F2942]">নোটিশ</a>
            <a href="#results" className="hover:text-[#0F2942]">মেধা তালিকা</a>
            <button type="button" onClick={() => onNavigateAdmission()} className="hover:text-[#0F2942]">অনলাইন ভর্তি</button>
            <button type="button" onClick={() => onNavigateLogin()} className="hover:text-[#0F2942]">পোর্টাল লগইন</button>
          </div>
          <p className="text-xs text-slate-500 text-center">
            © {toBengaliDigits(settings.academicYear)} শিক্ষানীর (SHIKKHANIR) · সর্বস্বত্ব সংরক্ষিত
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Thumb-Zone Navigation Bar (<= 56px high, aggregate sticky <= 15% of viewport) */}
      <nav
        aria-label="মোবাইল দ্রুত নেভিগেশন"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 h-14 shadow-sm"
      >
        <button
          type="button"
          onClick={() => scrollToSection('top')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
            mobileSection === 'top' ? 'text-[#0F2942]' : 'text-slate-500'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>হোম</span>
        </button>
        <button
          type="button"
          onClick={() => scrollToSection('classes')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
            mobileSection === 'classes' ? 'text-[#0F2942]' : 'text-slate-500'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>কোর্স</span>
        </button>
        <button
          type="button"
          onClick={() => scrollToSection('notices')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
            mobileSection === 'notices' ? 'text-[#0F2942]' : 'text-slate-500'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>নোটিশ</span>
        </button>
        <button
          type="button"
          onClick={() => scrollToSection('results')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
            mobileSection === 'results' ? 'text-[#0F2942]' : 'text-slate-500'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>ফলাফল</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateLogin()}
          className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold text-[#1D4ED8]"
        >
          <LogIn className="w-4 h-4" />
          <span>লগইন</span>
        </button>
      </nav>

      {/* Notice Detail Modal */}
      <AnimatePresence>
      {selectedNotice && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="text-xs font-semibold text-[#1D4ED8]">
                  {selectedNotice.type} · {toBengaliDigits(selectedNotice.date)}
                </p>
                <h3 className="text-lg font-bold text-[#0F2942] mt-1">{selectedNotice.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                aria-label="বন্ধ করুন"
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {selectedNotice.description}
            </p>
            <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>প্রকাশক: {selectedNotice.publishedBy}</span>
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[#0F2942] text-white font-semibold"
              >
                বন্ধ করুন
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

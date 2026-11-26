import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  GraduationCap,
  Home,
  LogIn,
  LogOut,
  Megaphone,
  Phone,
  Trophy,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import type { AuthUser, Notice } from '../types';
import { toBengaliDigits } from '../utils/academicLogic';
import { ORIGINAL_LOGO_SRC } from './BrandLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface TopHeaderBarProps {
  user: AuthUser | null;
  notices: Notice[];
  onLogoTap: (e: React.MouseEvent) => void;
  onNavigateHomeSection: (sectionId?: string) => void;
  onNavigateAdmission: () => void;
  onNavigateLogin: (hint?: 'TEACHER' | 'STUDENT') => void;
  onLogout?: () => void;
  onSelectNotice?: (notice: Notice) => void;
}

export const TopHeaderBar: React.FC<TopHeaderBarProps> = ({
  user,
  notices,
  onLogoTap,
  onNavigateHomeSection,
  onNavigateAdmission,
  onNavigateLogin,
  onLogout,
  onSelectNotice,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [previewNotice, setPreviewNotice] = useState<Notice | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (evt: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(evt.target as Node)) {
        setMenuOpen(false);
        setBellOpen(false);
      }
    };
    const handleKey = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') {
        setMenuOpen(false);
        setBellOpen(false);
        setPreviewNotice(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const latestNotices = [...notices]
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned))
    .slice(0, 5);

  const handleSectionLink = (sectionId?: string) => {
    setMenuOpen(false);
    setBellOpen(false);
    onNavigateHomeSection(sectionId);
  };

  return (
    <header ref={wrapRef} className="shk-topbar-header no-print">
      <div className="shk-topbar-container">
        <div className="shk-topbar-pill">
          {/* Left & Right Curved Glossy Blue Edge Swooshes matching reference */}
          <svg
            className="shk-topbar-wave-left"
            viewBox="0 0 140 90"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="shkTopWaveL1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0047ff" stopOpacity="0.92" />
                <stop offset="60%" stopColor="#2563eb" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#93c5fd" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="shkTopWaveL2" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,0 L92,0 C42,22 28,60 72,90 L0,90 Z" fill="url(#shkTopWaveL1)" />
            <path d="M0,18 C48,8 92,38 122,90 L0,90 Z" fill="url(#shkTopWaveL2)" />
          </svg>

          <svg
            className="shk-topbar-wave-right"
            viewBox="0 0 140 90"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="shkTopWaveR1" x1="1" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#0047ff" stopOpacity="0.92" />
                <stop offset="60%" stopColor="#2563eb" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#93c5fd" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="shkTopWaveR2" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M140,90 L48,90 C98,68 112,30 68,0 L140,0 Z" fill="url(#shkTopWaveR1)" />
            <path d="M140,72 C92,82 48,52 18,0 L140,0 Z" fill="url(#shkTopWaveR2)" />
          </svg>

          {/* 1. Left Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => {
              setMenuOpen((prev) => !prev);
              setBellOpen(false);
            }}
            aria-label="প্রধান মেনু"
            aria-expanded={menuOpen}
            className="shk-topbar-icon-btn"
          >
            <svg viewBox="0 0 36 28" className="shk-topbar-hamburger-svg" aria-hidden="true">
              <rect x="3" y="2" width="30" height="5" rx="2.5" fill="#04245c" />
              <rect x="3" y="11.5" width="30" height="5" rx="2.5" fill="#04245c" />
              <rect x="3" y="21" width="30" height="5" rx="2.5" fill="#04245c" />
            </svg>
          </button>

          <span className="shk-topbar-divider" aria-hidden="true" />

          {/* 2. Unaltered Brand Logo Medallion (Supports 5-Tap Admin Trigger) */}
          <button
            type="button"
            onClick={(e) => {
              setMenuOpen(false);
              setBellOpen(false);
              onLogoTap(e);
            }}
            aria-label="শিক্ষানীর অফিসিয়াল লোগো"
            className="shk-topbar-logo-btn"
          >
            <span className="shk-topbar-logo-ring">
              <img
                src={ORIGINAL_LOGO_SRC}
                alt="শিক্ষানীর (SHIKKHANIR) আসল লোগো"
                referrerPolicy="no-referrer"
              />
            </span>
          </button>

          <span className="shk-topbar-divider" aria-hidden="true" />

          {/* 3. Center Title + Golden Swoosh + Subtitle */}
          <button
            type="button"
            onClick={() => handleSectionLink('top')}
            aria-label="শিক্ষানীর কোচিং সেন্টার — হোম"
            className="shk-topbar-brand-btn"
          >
            <span className="shk-topbar-brand-title">শিক্ষানীর</span>
            <svg
              className="shk-topbar-swoosh"
              viewBox="0 0 320 18"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="shkTopBarGold" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#d97706" stopOpacity="0.15" />
                  <stop offset="28%" stopColor="#f59e0b" />
                  <stop offset="68%" stopColor="#fcd34d" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              <path
                d="M4,16 C82,2 210,12 316,2 C218,17 94,8 4,16 Z"
                fill="url(#shkTopBarGold)"
              />
            </svg>
            <span className="shk-topbar-brand-sub">— কোচিং সেন্টার —</span>
          </button>

          <span className="shk-topbar-divider" aria-hidden="true" />

          {/* 4. Right Notification Bell Button */}
          <button
            type="button"
            onClick={() => {
              setBellOpen((prev) => !prev);
              setMenuOpen(false);
            }}
            aria-label="নোটিশ ও বিজ্ঞপ্তি"
            aria-expanded={bellOpen}
            className="shk-topbar-icon-btn"
          >
            <svg viewBox="0 0 40 38" className="shk-topbar-bell-svg" aria-hidden="true">
              {/* Three golden notification rays top-right */}
              <rect x="26.5" y="3" width="3.2" height="7.5" rx="1.6" transform="rotate(14 28 6.5)" fill="#f59e0b" />
              <rect x="30.5" y="7" width="3.2" height="7.5" rx="1.6" transform="rotate(42 32 10.5)" fill="#fbbf24" />
              <rect x="32.2" y="12.5" width="3.2" height="7.2" rx="1.6" transform="rotate(68 33.8 16)" fill="#f59e0b" />
              {/* Deep Navy Bell Body */}
              <path
                d="M17.5 6.5 C17.5 5.4 18.4 4.5 19.5 4.5 C20.6 4.5 21.5 5.4 21.5 6.5 L21.5 7.4 C25.8 8.3 28.5 11.9 28.5 16.5 L28.5 22.8 L31.2 26.2 C31.7 26.9 31.2 28 30.3 28 L8.7 28 C7.8 28 7.3 26.9 7.8 26.2 L10.5 22.8 L10.5 16.5 C10.5 11.9 13.2 8.3 17.5 7.4 Z"
                fill="#04245c"
              />
              {/* Clapper */}
              <path d="M15.8 29.5 C16.2 31.8 17.7 33.2 19.5 33.2 C21.3 33.2 22.8 31.8 23.2 29.5 Z" fill="#04245c" />
            </svg>
          </button>
        </div>

        {/* Slide-down Navigation Drawer (Triggered by Hamburger Icon) */}
        {menuOpen && (
          <div className="mt-2 rounded-2xl bg-white border border-blue-200 shadow-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-[#04245C]">
                {user ? `${user.name} (${user.userCode})` : 'শিক্ষানীর — দ্রুত নেভিগেশন'}
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="মেনু বন্ধ করুন"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {user ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-600">
                  আপনি বর্তমানে <strong>{user.role === 'ADMIN' ? 'অ্যাডমিন' : user.role === 'TEACHER' ? 'শিক্ষক' : 'শিক্ষার্থী'}</strong> প্যানেলে লগইন অবস্থায় আছেন।
                </p>
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold hover:bg-red-100"
                  >
                    <LogOut className="w-3.5 h-3.5" /> লগআউট করুন
                  </button>
                )}
              </div>
            ) : (
              <>
                <nav className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm font-semibold text-slate-700">
                  <button
                    type="button"
                    onClick={() => handleSectionLink('top')}
                    className="min-h-[42px] flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-[#04245C] text-left"
                  >
                    <Home className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                    <span>হোমপেজ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSectionLink('about')}
                    className="min-h-[42px] flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-[#04245C] text-left"
                  >
                    <BookOpen className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                    <span>আমাদের সম্পর্কে</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSectionLink('classes')}
                    className="min-h-[42px] flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-[#04245C] text-left"
                  >
                    <GraduationCap className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                    <span>কোর্সসমূহ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSectionLink('teachers')}
                    className="min-h-[42px] flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-[#04245C] text-left"
                  >
                    <Users className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                    <span>শিক্ষকবৃন্দ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSectionLink('notices')}
                    className="min-h-[42px] flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-[#04245C] text-left"
                  >
                    <Calendar className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                    <span>নোটিশ বোর্ড</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSectionLink('results')}
                    className="min-h-[42px] flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-[#04245C] text-left"
                  >
                    <Trophy className="w-4 h-4 text-[#C59B38] shrink-0" />
                    <span>ফলাফল ও মেধা</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSectionLink('contact')}
                    className="min-h-[42px] flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-[#04245C] text-left col-span-2 sm:col-span-1"
                  >
                    <Phone className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                    <span>যোগাযোগ</span>
                  </button>
                </nav>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onNavigateAdmission();
                    }}
                    className="flex-1 min-w-[140px] min-h-[42px] px-4 py-2 rounded-xl bg-[#B47E19] hover:bg-amber-700 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5"
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>অনলাইন ভর্তি</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onNavigateLogin('STUDENT');
                    }}
                    className="flex-1 min-w-[130px] min-h-[42px] px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>স্টুডেন্ট লগইন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onNavigateLogin('TEACHER');
                    }}
                    className="flex-1 min-w-[130px] min-h-[42px] px-4 py-2 rounded-xl bg-[#047857] hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>টিচার লগইন</span>
                  </button>
                  <PWAInstallButton compact />
                </div>
              </>
            )}
          </div>
        )}

        {/* Latest Notices Popover (Triggered by Bell Icon) */}
        {bellOpen && (
          <div className="mt-2 ml-auto max-w-md rounded-2xl bg-white border border-blue-200 shadow-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#04245C]">
                <Megaphone className="w-4 h-4 text-[#f59e0b]" />
                <span>সর্বশেষ নোটিশ ও ঘোষণা</span>
              </div>
              <button
                type="button"
                onClick={() => setBellOpen(false)}
                aria-label="নোটিশ বন্ধ করুন"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {latestNotices.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">কোনো সাম্প্রতিক নোটিশ নেই।</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {latestNotices.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      setBellOpen(false);
                      if (onSelectNotice) {
                        onSelectNotice(n);
                      } else {
                        setPreviewNotice(n);
                      }
                    }}
                    className="w-full py-2.5 text-left hover:bg-slate-50 rounded-lg px-2 transition-colors"
                  >
                    <p className="text-xs font-bold text-[#0F2942] truncate">{n.title}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                      <span className="text-[#1D4ED8] font-medium">{n.type}</span>
                      <span className="tabular-nums">{toBengaliDigits(n.date)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {!user && (
              <button
                type="button"
                onClick={() => handleSectionLink('notices')}
                className="w-full py-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-xs font-bold text-[#1D4ED8] inline-flex items-center justify-center gap-1"
              >
                <span>সব নোটিশ দেখুন</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Universal Notice Detail Modal */}
      {previewNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="text-xs font-semibold text-[#1D4ED8]">
                  {previewNotice.type} · {toBengaliDigits(previewNotice.date)}
                </p>
                <h3 className="text-lg font-bold text-[#0F2942] mt-1">{previewNotice.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewNotice(null)}
                aria-label="বন্ধ করুন"
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {previewNotice.description}
            </p>
            <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>প্রকাশক: {previewNotice.publishedBy}</span>
              <button
                type="button"
                onClick={() => setPreviewNotice(null)}
                className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[#0F2942] text-white font-semibold"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

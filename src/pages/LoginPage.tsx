import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../services/api';

interface LoginPageProps {
  supabaseConfigured: boolean;
  initialPortalHint?: 'TEACHER' | 'STUDENT';
  onBack: () => void;
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  supabaseConfigured,
  initialPortalHint,
  onBack,
  onSuccess,
}) => {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [demoHintCode, setDemoHintCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!identifier.trim() || !password) {
      setError('অনুগ্রহ করে ইউজার আইডি/ইমেইল/ফোন এবং পাসওয়ার্ড দিন।');
      return;
    }
    setLoading(true);
    try {
      await login(identifier.trim(), password);
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!identifier.trim()) {
      setError('ইউজার আইডি, ইমেইল অথবা মোবাইল নম্বর দিন।');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string; demoResetCode?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      setInfo(res.message);
      if (res.demoResetCode) {
        setDemoHintCode(res.demoResetCode);
      }
      setMode('reset');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          identifier: identifier.trim(),
          code: resetCode.trim(),
          newPassword,
        }),
      });
      setInfo(res.message);
      setDemoHintCode(null);
      setPassword('');
      setMode('login');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (id: string, pass: string) => {
    setMode('login');
    setIdentifier(id);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#0F2942]"
          >
            <ArrowLeft className="w-4 h-4" />
            হোমপেজ
          </button>
          <span className="text-xs font-medium text-slate-500">
            {supabaseConfigured ? 'Supabase Auth সক্রিয়' : 'লোকাল সার্ভার সেশন (Demo Seed)'}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <BrandLogo size="lg" showText={false} />
            <h1 className="text-xl font-bold text-[#0F2942]">
              {mode === 'login'
                ? initialPortalHint === 'TEACHER'
                  ? 'টিচার পোর্টালে লগইন'
                  : initialPortalHint === 'STUDENT'
                    ? 'স্টুডেন্ট পোর্টালে লগইন'
                    : 'শিক্ষানীর পোর্টালে লগইন'
                : mode === 'forgot'
                  ? 'পাসওয়ার্ড পুনরুদ্ধার'
                  : 'নতুন পাসওয়ার্ড সেট করুন'}
            </h1>
            <p className="text-xs text-slate-500">
              Teacher এবং অনুমোদিত Student একই পোর্টাল থেকে প্রবেশ করবেন
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}
          {info && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              {info}
            </div>
          )}
          {demoHintCode && mode === 'reset' && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              ডেমো ভেরিফিকেশন কোড (SMS/Email অনুপস্থিত থাকায় প্রদর্শিত): <strong className="font-mono">{demoHintCode}</strong>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={(e) => void handleLogin(e)} className="space-y-4">
              <div>
                <label htmlFor="login-id" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ইউজার আইডি / ইমেইল / মোবাইল নম্বর
                </label>
                <input
                  id="login-id"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="যেমন: TCH-01 বা SHK-2026-101"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>

              <div>
                <label htmlFor="login-pass" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  পাসওয়ার্ড
                </label>
                <div className="relative">
                  <input
                    id="login-pass"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="আপনার পাসওয়ার্ড লিখুন"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  সুরক্ষিত সেশন
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setInfo(null);
                    setMode('forgot');
                  }}
                  className="font-semibold text-[#1D4ED8] hover:underline"
                >
                  পাসওয়ার্ড ভুলে গেছেন?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#0F2942] text-white text-sm font-semibold hover:bg-[#173a5e] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {loading ? 'যাচাই করা হচ্ছে...' : 'লগইন করুন'}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={(e) => void handleForgot(e)} className="space-y-4">
              <div>
                <label htmlFor="forgot-id" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  আপনার ইউজার আইডি, ইমেইল বা ফোন নম্বর
                </label>
                <input
                  id="forgot-id"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="SHK-2026-101 অথবা মোবাইল নম্বর"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#0F2942] text-white text-sm font-semibold hover:bg-[#173a5e]"
              >
                রিসেট কোড পাঠান
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full py-2 text-xs font-semibold text-slate-600 hover:underline"
              >
                লগইনে ফিরে যান
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={(e) => void handleReset(e)} className="space-y-4">
              <div>
                <label htmlFor="reset-code" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ৬ ডিজিটের রিসেট কোড
                </label>
                <input
                  id="reset-code"
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="৬ ডিজিটের কোড লিখুন"
                  className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>
              <div>
                <label htmlFor="reset-pass" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)
                </label>
                <input
                  id="reset-pass"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="নতুন পাসওয়ার্ড"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#0F2942] text-white text-sm font-semibold hover:bg-[#173a5e]"
              >
                <KeyRound className="w-4 h-4 inline mr-1.5" />
                পাসওয়ার্ড পরিবর্তন করুন
              </button>
            </form>
          )}

          {/* Clearly marked Demo Credentials for Teacher & Student testing */}
          {!supabaseConfigured && (
            <div className="pt-4 border-t border-slate-200 space-y-2.5">
              <p className="text-[11px] font-semibold text-slate-500">
                ডেমো পরীক্ষামূলক প্রবেশ (Teacher / Student):
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => fillDemo('TCH-01', 'Teacher@2026')}
                  className="min-h-[44px] px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#1D4ED8] transition-colors"
                >
                  Teacher ডেমো
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('SHK-2026-101', 'Student@2026')}
                  className="min-h-[44px] px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-emerald-700 transition-colors"
                >
                  Student ডেমো
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

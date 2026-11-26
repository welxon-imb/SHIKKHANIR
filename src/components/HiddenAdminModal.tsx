import React, { useEffect, useState } from 'react';
import { AlertTriangle, Eye, EyeOff, Lock, ShieldCheck, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/api';
import { toBengaliDigits } from '../utils/academicLogic';

interface HiddenAdminModalProps {
  onClose: () => void;
  onAuthenticated: () => void;
}

export const HiddenAdminModal: React.FC<HiddenAdminModalProps> = ({
  onClose,
  onAuthenticated,
}) => {
  const { loginHiddenAdmin } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockSeconds, setLockSeconds] = useState<number>(0);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setLockSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockSeconds > 0 || loading) return;
    if (!password.trim()) {
      setErrorMsg('অনুগ্রহ করে অ্যাডমিন পাসওয়ার্ড লিখুন।');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await loginHiddenAdmin(password);
      setPassword('');
      onAuthenticated();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
        if (typeof err.data.remainingAttempts === 'number') {
          setRemainingAttempts(err.data.remainingAttempts);
        }
        if (err.status === 429 && typeof err.data.retryAfterSeconds === 'number') {
          setLockSeconds(err.data.retryAfterSeconds);
          setRemainingAttempts(0);
        }
      } else {
        setErrorMsg('Access Denied: যাচাইকরণ ব্যর্থ হয়েছে।');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hidden-admin-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F2942]/65 backdrop-blur-sm p-4"
    >
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="bg-[#0F2942] px-6 py-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#C59B38] shrink-0" />
            <div>
              <h2 id="hidden-admin-title" className="text-base font-bold leading-tight">
                অ্যাডমিন প্যানেল লগইন
              </h2>
              <p className="text-[11px] text-slate-300">
                অনুমোদিত প্রশাসনিক যাচাইকরণ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex justify-center">
            <BrandLogo size="lg" showText={false} />
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1"
            >
              <div className="flex items-start gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              {remainingAttempts !== null && remainingAttempts > 0 && lockSeconds === 0 && (
                <p className="text-[11px] text-red-700 pl-6">
                  অবশিষ্ট চেষ্টা: {toBengaliDigits(remainingAttempts)} বার
                </p>
              )}
              {lockSeconds > 0 && (
                <p className="text-[11px] font-mono font-semibold text-red-700 pl-6 tabular-nums">
                  অপেক্ষা করুন: {toBengaliDigits(lockSeconds)} সেকেন্ড
                </p>
              )}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label
                htmlFor="hidden-admin-password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                অ্যাডমিন পাসওয়ার্ড
              </label>
              <div className="relative">
                <input
                  id="hidden-admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  autoComplete="current-password"
                  disabled={lockSeconds > 0 || loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="পাসওয়ার্ড লিখুন"
                  className="w-full min-h-[44px] pl-3.5 pr-11 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-[#1D4ED8] disabled:bg-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                ফিরে যান
              </button>
              <button
                type="submit"
                disabled={lockSeconds > 0 || loading}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0F2942] text-white text-xs font-semibold hover:bg-[#173a5e] disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {loading
                  ? 'যাচাই চলছে...'
                  : lockSeconds > 0
                    ? `সীমিত (${toBengaliDigits(lockSeconds)} সে.)`
                    : 'প্রবেশ করুন'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

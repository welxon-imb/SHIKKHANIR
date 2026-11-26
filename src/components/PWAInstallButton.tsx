import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white text-[#0F2942] hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 ${
          compact ? 'px-3 py-1.5 text-xs font-semibold' : 'px-4 py-2 text-sm font-semibold'
        }`}
      >
        <Download className="w-4 h-4 text-[#1D4ED8]" />
        অ্যাপ ইনস্টল করুন
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#0F2942] hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#1D4ED8]" />
          হোম স্ক্রিনে যুক্ত করুন
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 border border-slate-200 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-[#0F2942]">আইফোন / আইপ্যাডে ইনস্টল</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="বন্ধ করুন"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="space-y-2 text-sm text-slate-600 list-decimal pl-5">
                <li>Safari ব্রাউজারের নিচের <strong>Share</strong> আইকনে ট্যাপ করুন।</li>
                <li>নিচে স্ক্রল করে <strong>Add to Home Screen</strong> নির্বাচন করুন।</li>
                <li>উপরের ডানদিকে <strong>Add</strong> চাপুন।</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-[#0F2942] py-2.5 text-sm font-semibold text-white hover:bg-[#173a5e] transition-colors"
              >
                বুঝেছি
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

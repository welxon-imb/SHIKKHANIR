import React from 'react';
import { clearOfflinePublicCache } from '../utils/offlineQueue';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Shikkhanir UI ErrorBoundary caught:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAndReload = async () => {
    clearOfflinePublicCache();
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // Ignore cleanup failures and proceed with reload
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-800">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-4">
            <img
              src="/assets/aistudio/58308189f4f51a82ecf9cadd15c397c1_5dfd1b78.jpg"
              alt="শিক্ষানীর লোগো"
              className="w-16 h-16 rounded-full mx-auto border border-slate-200 object-contain"
            />
            <h1 className="text-lg font-bold text-[#0F2942]">
              পেজ লোড করতে সাময়িক সমস্যা হয়েছে
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              ব্রাউজারের পুরোনো ক্যাশ বা সংযোগের কারণে স্ক্রিন প্রদর্শন ব্যাহত হয়েছে। নিচের বাটনে চাপ দিয়ে পেজটি পুনরায় চালু করুন।
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 min-h-[42px] px-4 py-2 rounded-xl bg-[#0F2942] text-white text-xs sm:text-sm font-semibold hover:bg-[#173a5e]"
              >
                পুনরায় লোড করুন
              </button>
              <button
                type="button"
                onClick={() => void this.handleResetAndReload()}
                className="flex-1 min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50"
              >
                ক্যাশ পরিষ্কার করে ঠিক করুন
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

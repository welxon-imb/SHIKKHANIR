import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC<{ pendingCount?: number; syncing?: boolean }> = ({
  pendingCount = 0,
  syncing = false,
}) => {
  const isOnline = useOnlineStatus();

  if (isOnline && pendingCount === 0 && !syncing) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-md border ${
        !isOnline
          ? 'bg-amber-50 border-amber-300 text-amber-900'
          : 'bg-blue-50 border-blue-200 text-blue-900'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
          <span>অফলাইন মোড — সংরক্ষিত তথ্য দেখানো হচ্ছে</span>
        </>
      ) : (
        <>
          <RefreshCw className={`w-4 h-4 text-blue-700 shrink-0 ${syncing ? 'animate-spin' : ''}`} />
          <span>অপেক্ষমাণ তথ্য সিঙ্ক হচ্ছে ({pendingCount})</span>
        </>
      )}
    </div>
  );
};

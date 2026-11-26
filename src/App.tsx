import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { HiddenAdminModal } from './components/HiddenAdminModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { TopHeaderBar } from './components/TopHeaderBar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminDashboard } from './dashboards/AdminDashboard';
import { StudentDashboard } from './dashboards/StudentDashboard';
import { TeacherDashboard } from './dashboards/TeacherDashboard';
import { DEFAULT_PUBLIC_BOOTSTRAP } from './data/defaultPublicBootstrap';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useSecretLogoTap } from './hooks/useSecretLogoTap';
import { AdmissionPage } from './pages/AdmissionPage';
import { LoginPage } from './pages/LoginPage';
import { PublicHomePage, type PublicBootstrapData } from './pages/PublicHomePage';
import { apiFetch } from './services/api';
import type { AcademicClassId } from './types';
import {
  getPendingQueue,
  loadOfflinePublicCache,
  removePendingItem,
  saveOfflinePublicCache,
} from './utils/offlineQueue';

type PublicView = 'home' | 'admission' | 'login';

const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const isOnline = useOnlineStatus();
  const [publicData, setPublicData] = useState<PublicBootstrapData | null>(null);
  const [view, setView] = useState<PublicView>('home');
  const [loginPortalHint, setLoginPortalHint] = useState<'TEACHER' | 'STUDENT' | undefined>(undefined);
  const [showHiddenAdminModal, setShowHiddenAdminModal] = useState(false);
  const [admissionClassId, setAdmissionClassId] = useState<AcademicClassId | undefined>(undefined);
  const [selectedClassDetail, setSelectedClassDetail] = useState<AcademicClassId | null>(null);
  const [pendingCount, setPendingCount] = useState(() => getPendingQueue().length);
  const [syncing, setSyncing] = useState(false);

  const { registerTap: registerTopBarTap } = useSecretLogoTap(() => {
    if (!user) {
      setShowHiddenAdminModal(true);
    }
  });

  const loadBootstrap = useCallback(async () => {
    try {
      const data = await apiFetch<PublicBootstrapData>('/api/public/bootstrap');
      setPublicData(data);
      saveOfflinePublicCache(data);
    } catch {
      const cached = loadOfflinePublicCache<PublicBootstrapData>();
      if (cached) {
        setPublicData(cached.data);
      } else {
        setPublicData(DEFAULT_PUBLIC_BOOTSTRAP);
      }
    }
  }, []);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    if (!isOnline) {
      setPendingCount(getPendingQueue().length);
      return;
    }
    const syncQueue = async () => {
      const items = getPendingQueue();
      if (items.length === 0) {
        setPendingCount(0);
        return;
      }
      setSyncing(true);
      for (const item of items) {
        try {
          await apiFetch(item.endpoint, {
            method: item.method,
            body: JSON.stringify(item.payload),
          });
          removePendingItem(item.id);
        } catch {
          // leave in queue if transient failure
        }
      }
      setPendingCount(getPendingQueue().length);
      setSyncing(false);
    };
    void syncQueue();
  }, [isOnline]);

  const handleNavigateHomeSection = useCallback((sectionId?: string) => {
    setSelectedClassDetail(null);
    setView('home');
    window.setTimeout(() => {
      if (!sectionId || sectionId === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  }, []);

  const handleTopLogoTap = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      const unlocked = registerTopBarTap();
      if (unlocked) return;
    }
    handleNavigateHomeSection('top');
  };

  if (!publicData) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <TopHeaderBar
          user={user}
          notices={[]}
          onLogoTap={handleTopLogoTap}
          onNavigateHomeSection={handleNavigateHomeSection}
          onNavigateAdmission={() => {
            setView('admission');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onNavigateLogin={(hint) => {
            setLoginPortalHint(hint);
            setView('login');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onLogout={logout}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-16 h-16 rounded-full border border-slate-200 overflow-hidden animate-pulse">
            <img
              src="/assets/aistudio/58308189f4f51a82ecf9cadd15c397c1_5dfd1b78.jpg"
              alt="শিক্ষানীর লোগো"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-sm font-semibold text-[#0F2942]">শিক্ষানীর পোর্টাল লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopHeaderBar
        user={user}
        notices={publicData.notices}
        onLogoTap={handleTopLogoTap}
        onNavigateHomeSection={handleNavigateHomeSection}
        onNavigateAdmission={() => {
          setAdmissionClassId(undefined);
          setView('admission');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateLogin={(hint) => {
          setLoginPortalHint(hint);
          setView('login');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onLogout={logout}
      />

      {user ? (
        <motion.div
          key={user.role}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          {user.role === 'ADMIN' && (
            <AdminDashboard onSettingsUpdated={() => void loadBootstrap()} />
          )}
          {user.role === 'TEACHER' && <TeacherDashboard />}
          {user.role === 'STUDENT' && <StudentDashboard settings={publicData.settings} />}
        </motion.div>
      ) : (
        <>
          <AnimatePresence mode="wait">
            {view === 'home' && (
              <motion.div
                key="public-home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                <PublicHomePage
                  data={publicData}
                  selectedClassDetail={selectedClassDetail}
                  onSelectClassDetail={setSelectedClassDetail}
                  onLogoSecretTrigger={() => setShowHiddenAdminModal(true)}
                  onNavigateAdmission={(cid) => {
                    setAdmissionClassId(cid);
                    setView('admission');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onNavigateLogin={(hint) => {
                    setLoginPortalHint(hint);
                    setView('login');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </motion.div>
            )}

            {view === 'admission' && (
              <motion.div
                key="public-admission"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
              >
                <AdmissionPage
                  classes={publicData.classes}
                  batches={publicData.batches}
                  initialClassId={admissionClassId}
                  onBack={() => setView('home')}
                  onGoLogin={() => {
                    setLoginPortalHint(undefined);
                    setView('login');
                  }}
                />
              </motion.div>
            )}

            {view === 'login' && (
              <motion.div
                key="public-login"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
              >
                <LoginPage
                  supabaseConfigured={publicData.supabaseConfigured}
                  initialPortalHint={loginPortalHint}
                  onBack={() => setView('home')}
                  onSuccess={() => setView('home')}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {showHiddenAdminModal && (
            <HiddenAdminModal
              onClose={() => setShowHiddenAdminModal(false)}
              onAuthenticated={() => {
                setShowHiddenAdminModal(false);
                setView('home');
              }}
            />
          )}
        </>
      )}

      <OfflineIndicator pendingCount={pendingCount} syncing={syncing} />
    </>
  );
};

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </MotionConfig>
  );
}

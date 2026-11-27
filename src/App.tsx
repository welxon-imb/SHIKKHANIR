import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HiddenAdminModal } from './components/HiddenAdminModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { TopHeaderBar } from './components/TopHeaderBar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminDashboard } from './dashboards/AdminDashboard';
import { StudentDashboard } from './dashboards/StudentDashboard';
import { TeacherDashboard } from './dashboards/TeacherDashboard';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useSecretLogoTap } from './hooks/useSecretLogoTap';
import { initFirebaseAnalytics, testFirestoreConnection } from './lib/firebase';
import { isSupabaseConfigured } from './lib/supabase';
import { AdmissionPage } from './pages/AdmissionPage';
import { LoginPage } from './pages/LoginPage';
import { PublicHomePage, type PublicBootstrapData } from './pages/PublicHomePage';
import { apiFetch } from './services/api';
import {
  fetchPublicBootstrapFromFirestore,
  subscribePublicBootstrap,
} from './services/firestoreSync';
import type { AcademicClassId } from './types';
import { isValidBootstrapPayload, normalizePublicBootstrapData } from './utils/bootstrapNormalizer';
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
  const [publicData, setPublicData] = useState<PublicBootstrapData>(() => {
    const cached = loadOfflinePublicCache<unknown>();
    return normalizePublicBootstrapData(cached?.data, isSupabaseConfigured);
  });
  const [view, setView] = useState<PublicView>('home');
  const [loginPortalHint, setLoginPortalHint] = useState<'TEACHER' | 'STUDENT' | undefined>(undefined);
  const [showHiddenAdminModal, setShowHiddenAdminModal] = useState(false);
  const [admissionClassId, setAdmissionClassId] = useState<AcademicClassId | undefined>(undefined);
  const [selectedClassDetail, setSelectedClassDetail] = useState<AcademicClassId | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState(() => getPendingQueue().length);
  const [syncing, setSyncing] = useState(false);

  const { registerTap: registerTopBarTap } = useSecretLogoTap(() => {
    if (!user) {
      setShowHiddenAdminModal(true);
    }
  });

  const loadBootstrap = useCallback(async () => {
    try {
      const data = await apiFetch<unknown>('/api/public/bootstrap');
      if (!isValidBootstrapPayload(data)) {
        throw new Error('Invalid bootstrap payload');
      }
      const normalized = normalizePublicBootstrapData(data, isSupabaseConfigured);
      setPublicData(normalized);
      saveOfflinePublicCache(normalized);
      setBackendConnected(true);
    } catch {
      setBackendConnected(false);
      try {
        const cloudData = await fetchPublicBootstrapFromFirestore();
        if (cloudData && isValidBootstrapPayload(cloudData)) {
          const normalized = normalizePublicBootstrapData(cloudData, isSupabaseConfigured);
          setPublicData(normalized);
          saveOfflinePublicCache(normalized);
          return;
        }
      } catch {
        // Fall back safely to cached/default public bootstrap
      }
      const cached = loadOfflinePublicCache<unknown>();
      setPublicData(normalizePublicBootstrapData(cached?.data, isSupabaseConfigured));
    }
  }, []);

  useEffect(() => {
    void testFirestoreConnection();
    void initFirebaseAnalytics();
    void loadBootstrap();

    const unsubscribe = subscribePublicBootstrap((cloudData) => {
      if (isValidBootstrapPayload(cloudData)) {
        const normalized = normalizePublicBootstrapData(cloudData, isSupabaseConfigured);
        setPublicData(normalized);
        saveOfflinePublicCache(normalized);
      }
    });

    return () => {
      unsubscribe();
    };
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
                  backendConnected={backendConnected}
                  initialPortalHint={loginPortalHint}
                  onBack={() => setView('home')}
                  onSuccess={() => setView('home')}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {showHiddenAdminModal && (
            <HiddenAdminModal
              backendConnected={backendConnected}
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
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}

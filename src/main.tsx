import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', () => {
    try {
      const key = 'shk_chunk_reload_once';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
      }
    } catch {
      // Ignore storage errors
    }
  });

  if ('serviceWorker' in navigator) {
    try {
      registerSW({
        immediate: true,
        onOfflineReady() {
          // Offline cache ready
        },
      });
    } catch {
      // Ignore service worker registration errors in unsupported contexts
    }
  }
}

createRoot(document.getElementById('root')!).render(<App />);


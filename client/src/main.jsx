import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/geist/index.css';
import '@fontsource-variable/geist-mono/index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import './components/common/Modal/Modal.css';
import './components/common/SearchBar/SearchBar.css';
import './components/common/Card/Card.css';
import './components/common/Badge/Badge.css';
import App from './App';

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();

  const reloadKey = 'memoris:last-preload-error-reload';
  const lastReloadAt = Number(sessionStorage.getItem(reloadKey) || 0);
  const now = Date.now();

  if (now - lastReloadAt > 10000) {
    sessionStorage.setItem(reloadKey, String(now));
    window.location.reload();
  }
});

// Register PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    import('virtual:pwa-register').then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          updateSW(true);
        },
        onOfflineReady() {
          console.log('App ready to work offline');
        },
      });
    }).catch(() => {
      // PWA plugin not configured yet, skip registration
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

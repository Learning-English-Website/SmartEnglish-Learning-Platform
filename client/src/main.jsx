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

// Register PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    import('virtual:pwa-register').then(({ registerSW }) => {
      registerSW({
        immediate: true,
        onNeedRefresh() {
          if (confirm('New content available. Reload?')) {
            window.location.reload();
          }
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

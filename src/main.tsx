import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';

// Service worker: precaches the whole app so it runs offline, and updates
// itself quietly when a new version has been deployed.
registerSW({ immediate: true });

// Ask the browser to keep our IndexedDB data even under storage pressure.
void navigator.storage?.persist?.();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

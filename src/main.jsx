import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.jsx';
import { supabaseConfigured } from './lib/supabase.js';
import { t } from './copy/index.js';

// Phase 03 · 2.1.6.4.6: precache the app so hotlines and the directory show with no network.
registerSW({ immediate: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {supabaseConfigured ? <App /> : <p style={{ padding: 24 }}>{t('dev.missingConfig')}</p>}
  </StrictMode>,
);

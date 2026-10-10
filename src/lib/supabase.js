// The single Supabase client (00 Section 4). Never create another client in src/.
// Phase 03 change: this module no longer throws when the env values are missing. A throw at import
// time let the bundler drop the whole app from builds made without .env.local. main.jsx now shows a
// configuration message instead.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** False when .env.local (or the hosting environment) does not provide both values. */
export const supabaseConfigured = Boolean(url && key);

export const supabase = createClient(
  url || 'http://127.0.0.1:54321',
  key || 'missing-publishable-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // reads the session from email confirmation, reset, and invite links
    },
  },
);

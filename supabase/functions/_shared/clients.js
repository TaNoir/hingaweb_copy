// Supabase clients for Edge Functions (00 Section 5.2). Imported ONLY by the index.js files,
// never by handler.js (handlers receive these functions as arguments, so Vitest can test them).
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';

const NO_SESSION = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

/**
 * A client that acts AS THE CALLER: every read goes through row-level security with the
 * caller's own JWT. All reads in every function use this client (2.2.6).
 * @param {string} authorization  the caller's "Bearer <jwt>" header
 */
export function makeUserClient(authorization) {
  return createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: NO_SESSION,
  });
}

/**
 * A client that bypasses row-level security. Use it ONLY for the writes a phase file names.
 * Never use it to read student data.
 */
export function makeServiceClient() {
  return createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: NO_SESSION,
  });
}

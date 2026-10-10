// Deno entry point for notify-crisis (supabase/config.toml: verify_jwt = false; the webhook
// secret header is checked instead).
import { z } from 'npm:zod@4.6.5';
import { makeNotifyCrisis } from './handler.js';

Deno.serve(makeNotifyCrisis({ z, env: Deno.env, fetchImpl: fetch }));

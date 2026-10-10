// Deno entry point for evaluate-checkin (supabase/config.toml: verify_jwt = true).
import { z } from 'npm:zod@4.6.5';
import * as config from '../_shared/scoring-config.js';
import { makeUserClient } from '../_shared/clients.js';
import { makeEvaluateCheckin } from './handler.js';

Deno.serve(
  makeEvaluateCheckin({
    z,
    makeUserClient,
    config,
    allowedOrigin: Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  }),
);

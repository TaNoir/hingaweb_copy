// Deno entry point for submit-support-request (supabase/config.toml: verify_jwt = true).
import { z } from 'npm:zod@4.6.5';
import * as config from '../_shared/scoring-config.js';
import { makeServiceClient, makeUserClient } from '../_shared/clients.js';
import { makeSubmitSupportRequest } from './handler.js';

Deno.serve(
  makeSubmitSupportRequest({
    z,
    makeUserClient,
    makeServiceClient,
    config,
    allowedOrigin: Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  }),
);

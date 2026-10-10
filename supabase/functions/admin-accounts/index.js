// Deno entry point for admin-accounts (supabase/config.toml: verify_jwt = true).
import { z } from 'npm:zod@4.6.5';
import { makeServiceClient, makeUserClient } from '../_shared/clients.js';
import { makeAdminAccounts } from './handler.js';

Deno.serve(
  makeAdminAccounts({
    z,
    makeUserClient,
    makeServiceClient,
    siteUrl: Deno.env.get('SITE_URL') ?? 'http://localhost:5173',
    allowedOrigin: Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  }),
);

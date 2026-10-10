// Deno entry point for rank-resources (supabase/config.toml: verify_jwt = true).
import { z } from 'npm:zod@4.6.5';
import { makeUserClient } from '../_shared/clients.js';
import { makeRankResources } from './handler.js';

Deno.serve(
  makeRankResources({ z, makeUserClient, allowedOrigin: Deno.env.get('ALLOWED_ORIGIN') ?? '*' }),
);

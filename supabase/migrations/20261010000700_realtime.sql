-- Phase 01 · Realtime: only crisis_events is published, so the crisis channel updates immediately
-- (2.1.3.8). Realtime delivers a row only to subscribers whose RLS allows it (guidance).
-- support_requests is deliberately NOT published (the queue refetches instead; Phase 08).
alter publication supabase_realtime add table public.crisis_events;

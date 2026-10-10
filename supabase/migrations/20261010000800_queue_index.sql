-- Phase 10 · 2.1.6.1.3: the guidance request list must return within 1 second at pilot scale.
-- support_queue checks, for every request, whether the same student has another open request.
-- Without this index, and before the planner's statistics catch up with new rows, that check can
-- scan every open request once per row (measured 0.25 to 2.6 s at 2,000 requests); with it, the
-- check is one index lookup (about 20 ms). supabase/tests/08_queue_load.test.sql measures it.
create index support_requests_student_status_idx
  on public.support_requests (student_id, status);

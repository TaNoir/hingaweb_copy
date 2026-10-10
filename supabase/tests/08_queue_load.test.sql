-- Phase 10 · 2.1.6.1.3: the guidance request-list query returns within 1 second at pilot scale
-- (2,000 student accounts and 2,000 support requests), measured server-side.
-- Fictional rows only; the transaction rolls back, so nothing is kept.
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

-- 2,000 fictional students (the on_auth_user_created trigger creates their students rows)
insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
                        created_at, updated_at, confirmation_token, email_change,
                        email_change_token_new, recovery_token)
select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'load.' || g || '@example.test', '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('account_type', 'student', 'full_name', 'Load Student ' || g,
                          'grade_level', 11 + g % 2, 'section', 'LOAD-' || (g % 40),
                          'class_adviser', 'Adviser ' || (g % 40)),
       now(), now(), '', '', '', ''
from generate_series(1, 2000) g;

-- 2,000 support requests over the last 120 days, in every status, one per load student
insert into public.support_requests (student_id, disclosed, status, concern_type, follow_up_at, created_at)
select s.id,
       jsonb_build_object('full_name', s.full_name, 'grade_level', s.grade_level,
                          'section', s.section, 'class_adviser', s.class_adviser,
                          'c1', 3, 'c2', 3, 'c3', 3, 'c4', 3),
       (array['pending', 'reviewed', 'referred', 'resolved'])[1 + (row_number() over () % 4)::int],
       (array['academic', 'peer', 'family', 'wellness'])[1 + (row_number() over () % 4)::int],
       case when row_number() over () % 5 = 0 then now() - interval '1 day' end,
       now() - (row_number() over () % 120) * interval '1 day'
from public.students s
where s.full_name like 'Load Student %';

insert into public.triage_decisions (request_id, score, band)
select x.id, case when x.band = 'FR' then null else 2.5 end, x.band
from (
  select r.id, (array['P1', 'P2', 'P3', 'FR'])[1 + (row_number() over () % 4)::int] as band
  from public.support_requests r
  join public.students s on s.id = r.student_id
  where s.full_name like 'Load Student %'
) x;

-- Two audit rows per request (an opening and a status change), as the dashboard leaves them
insert into public.staff_access_audit (actor_id, request_id, action, created_at)
select '55555555-5555-4555-8555-555555555555', r.id, a.action, r.created_at + interval '1 hour'
from public.support_requests r
join public.students s on s.id = r.student_id
cross join (values ('view_request'), ('state_change')) a(action)
where s.full_name like 'Load Student %';

analyze public.students, public.support_requests, public.triage_decisions, public.staff_access_audit;

-- The query the queue screen runs (useSupportQueue QUEUE_COLUMNS), as guidance at aal2
set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","aal":"aal2"}';
set local role authenticated;

select is((select count(*)::int from public.support_queue where full_name like 'Load Student %'),
          2000, 'guidance sees all 2,000 load requests');

do $$
declare
  t0 timestamptz := clock_timestamp();
  n bigint;
begin
  -- sum over the whole row so that every column, including the subqueries, is computed
  select sum(length(row(q.*)::text)) into n
  from (
    select id, created_at, status, concern_type, follow_up_at, full_name, grade_level, section,
           class_adviser, band, has_other_open_request, first_contact_at, is_overdue
    from public.support_queue
  ) q;
  perform set_config('hw.queue_ms',
                     round(extract(epoch from clock_timestamp() - t0) * 1000)::text, true);
end $$;

select diag('support_queue at pilot scale: ' || current_setting('hw.queue_ms') || ' ms');
select cmp_ok(current_setting('hw.queue_ms')::int, '<', 1000,
              'request list returns within 1 second at pilot scale (2.1.6.1.3)');
reset role;

select * from finish();
rollback;

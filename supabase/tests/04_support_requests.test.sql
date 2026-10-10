-- Phase 01 · Support requests, triage decisions, and the audit they produce (Tables 9, 10, 17)
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- A check-in for Ana so the request can copy c1..c4
insert into public.checkins (id, student_id, c1, c2, c3, c4, mood, stress, note)
values ('ccccccc1-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 4, 3, 2, 3, 2, 4, 'private');

-- Students cannot create requests directly, nor call the creation RPC
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select throws_ok($$ insert into public.support_requests (student_id, disclosed, concern_type)
                    values ('11111111-1111-4111-8111-111111111111', '{}', 'academic') $$,
  '42501', null, 'students cannot insert support requests directly');
select throws_ok($$ select public.create_support_request('11111111-1111-4111-8111-111111111111',
                    'ccccccc1-0000-4000-8000-000000000001', null, 'academic', 3.0, 'P2', '{}') $$,
  '42501', null, 'students cannot call create_support_request');
reset role;

-- The Edge Function (service role) creates request + triage atomically
set local role service_role;
select lives_ok($$ select public.create_support_request('11111111-1111-4111-8111-111111111111',
                   'ccccccc1-0000-4000-8000-000000000001', 'please call me', 'academic', 3.1300, 'P2',
                   '{"fired":[]}') $$, 'service role creates a request');
select throws_ok($$ select public.create_support_request('11111111-1111-4111-8111-111111111111',
                    null, null, 'academic', null, 'FR', '{}') $$,
  '40001', null, 'a stale (not latest) check-in id is refused');
select throws_ok($$ select public.create_support_request('33333333-3333-4333-8333-333333333333',
                    null, null, 'family', null, 'FR', '{}') $$,
  '42501', null, 'a student without Tier 2 cannot send a request');
select throws_ok($$ select public.create_support_request('11111111-1111-4111-8111-111111111111',
                    'ccccccc1-0000-4000-8000-000000000001', null, 'future', 3.0, 'P2', '{}') $$,
  '23514', null, 'concern_type must be one of the four Table 9 values');
select throws_ok($$ insert into public.triage_decisions (request_id, score, band)
                    select id, 1, 'yellow' from public.support_requests limit 1 $$,
  '23514', null, 'band cannot carry a colour (2.1.6.2.6)');
reset role;

select results_eq(
  $$ select disclosed from public.support_requests $$,
  $$ values ('{"full_name":"Ana Reyes","grade_level":12,"section":"HUMSS-A","class_adviser":"Mr. Ramon Cruz","c1":4,"c2":3,"c3":2,"c4":3}'::jsonb) $$,
  'disclosed holds name, grade, section, adviser, c1-c4 and nothing else (no mood, stress, or check-in note)');

-- Guidance reads the list columns but never the note directly
set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select results_eq($$ select status from public.support_requests $$, $$ values ('pending') $$, 'guidance reads the request');
select throws_ok($$ select note from public.support_requests $$, '42501', null, 'the note is not directly selectable');
select results_eq($$ select (public.open_support_request(id) ->> 'note') from public.support_requests $$,
  $$ values ('please call me') $$, 'open_support_request returns the note');
select results_eq($$ select action from public.staff_access_audit $$, $$ values ('view_request') $$,
  'opening a request writes view_request to the audit trail');

-- Status and follow-up changes are audited by the database
select lives_ok($$ update public.support_requests set status = 'reviewed' $$, 'guidance changes status');
select lives_ok($$ update public.support_requests set status = 'referred' $$, 'guidance marks as referred');
select lives_ok($$ update public.support_requests set follow_up_at = now() + interval '2 days' $$, 'guidance sets a follow-up date');
-- (inside one test transaction now() is constant, so compare as a sorted set)
select results_eq($$ select action from public.staff_access_audit order by action $$,
  $$ values ('follow_up'), ('referral'), ('state_change'), ('view_request') $$,
  'each change wrote exactly one audit row with the right action');
select throws_ok($$ update public.support_requests set concern_type = 'peer' $$, '42501', null, 'concern type cannot be edited');
select throws_ok($$ update public.support_requests set disclosed = '{}' $$, '42501', null, 'disclosed copy cannot be edited');
select throws_ok($$ delete from public.support_requests $$, '42501', null, 'requests cannot be deleted');
select throws_ok($$ update public.triage_decisions set band = 'P1' $$, '42501', null, 'triage decisions cannot be edited');
reset role;

-- The student cannot read requests (theirs or anyone's), and cannot open one
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select is_empty($$ select 1 from public.support_requests $$, 'students cannot read support requests');
select is_empty($$ select 1 from public.triage_decisions $$, 'students cannot read triage decisions');
select throws_ok($$ select public.open_support_request(gen_random_uuid()) $$, '42501', null, 'students cannot open requests');
reset role;

-- Administrator cannot read request contents
set local request.jwt.claims = '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select is_empty($$ select 1 from public.support_requests $$, 'admin cannot read support requests');
select throws_ok($$ select public.open_support_request(gen_random_uuid()) $$, '42501', null, 'admin cannot open requests');
select results_eq($$ select count(*)::int from public.staff_access_audit $$, $$ values (4) $$,
  'admin reads the audit trail rows');
reset role;

select * from finish();
rollback;

-- Phase 01 · Who can read identity and consent data (Tables 14, 18; 2.1.5.2.6; must-never 1)
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Student sees only their own students row
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select results_eq($$ select full_name from public.students $$, $$ values ('Ana Reyes') $$,
  'student reads only their own students row');
select results_eq($$ select count(*)::int from public.consent_records $$, $$ values (2) $$,
  'student reads only their own consent records');
reset role;

-- Guidance (aal2) reads NO student-side table
set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select is_empty($$ select 1 from public.students $$,        'guidance cannot read students');
select is_empty($$ select 1 from public.consent_records $$, 'guidance cannot read consent_records');
select is_empty($$ select 1 from public.checkins $$,        'guidance cannot read checkins');
select is_empty($$ select 1 from public.prompt_events $$,   'guidance cannot read prompt_events');
select is_empty($$ select 1 from public.resource_views $$,  'guidance cannot read resource_views');
reset role;

-- Administrator (aal2) reads students and consent, but no check-in side table
set local request.jwt.claims = '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select results_eq($$ select count(*)::int from public.students $$, $$ values (4) $$, 'admin reads all students');
select results_eq($$ select count(*)::int from public.consent_records $$, $$ values (5) $$, 'admin reads the consent register');
select is_empty($$ select 1 from public.checkins $$,       'admin cannot read checkins');
select is_empty($$ select 1 from public.prompt_events $$,  'admin cannot read prompt_events');
select is_empty($$ select 1 from public.resource_views $$, 'admin cannot read resource_views');
select is_empty($$ select 1 from public.support_requests $$, 'admin cannot read support_requests');
select is_empty($$ select 1 from public.crisis_events $$,  'admin cannot read crisis_events');
reset role;

-- Administrator at aal1 (no second factor yet) reads nothing beyond their own staff row
set local request.jwt.claims = '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select is_empty($$ select 1 from public.students $$, 'admin at aal1 cannot read students');
select results_eq($$ select role from public.staff_accounts $$, $$ values ('administrator') $$,
  'staff at aal1 sees only their own staff row');
reset role;

-- Anonymous visitors read no student data
set local role anon;
select throws_ok($$ select 1 from public.students $$, '42501', null, 'anon has no privilege on students');
select throws_ok($$ select 1 from public.checkins $$, '42501', null, 'anon has no privilege on checkins');
reset role;

-- Consent: a student may record only their own assent; only an administrator withdraws
set local request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select lives_ok($$ insert into public.consent_records (student_id, type, instrument_version)
                   values ('22222222-2222-4222-8222-222222222222', 'assent', 'assent-en-v1') $$,
  'student records their own assent');
select throws_ok($$ insert into public.consent_records (student_id, type, instrument_version)
                    values ('22222222-2222-4222-8222-222222222222', 'parental', 'parental-v1') $$,
  '42501', null, 'student cannot record parental consent');
select throws_ok($$ insert into public.consent_records (student_id, type, instrument_version)
                    values ('11111111-1111-4111-8111-111111111111', 'assent', 'assent-en-v1') $$,
  '42501', null, 'student cannot record consent for someone else');
select throws_ok($$ insert into public.consent_records (student_id, type, instrument_version, status)
                    values ('22222222-2222-4222-8222-222222222222', 'assent', 'v', 'withdrawn') $$,
  '42501', null, 'status column cannot be sent on insert');
reset role;

set local request.jwt.claims = '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select lives_ok($$ update public.consent_records set status = 'withdrawn'
                   where student_id = '11111111-1111-4111-8111-111111111111' and type = 'parental' $$,
  'admin records a withdrawal');
select results_eq($$ select withdrawn_at is not null from public.consent_records
                     where student_id = '11111111-1111-4111-8111-111111111111' and type = 'parental' $$,
  $$ values (true) $$, 'withdrawal time is stamped by the server');
select throws_ok($$ update public.consent_records set status = 'granted'
                    where student_id = '11111111-1111-4111-8111-111111111111' and type = 'parental' $$,
  '42501', null, 'a withdrawal cannot be undone by update');
select throws_ok($$ delete from public.consent_records $$, '42501', null, 'consent records cannot be deleted');
reset role;

select * from finish();
rollback;

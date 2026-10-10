-- Phase 01 · Private check-ins (Table 8; 2.1.3.5; 2.1.6.2.1; 2.1.6.2.3)
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select columns_are('public', 'checkins',
  array['id','student_id','c1','c2','c3','c4','mood','stress','note','created_at'],
  'checkins has exactly the Table 8 columns (no derived-score column)');

-- Tier 2 student can save a check-in; created_at is set by the server
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select lives_ok($$ insert into public.checkins (student_id, c1, c2, c3, c4, mood, stress, note)
                   values ('11111111-1111-4111-8111-111111111111', 4, 3, 2, 3, 3, 4, 'a private note') $$,
  'Tier 2 student saves a check-in');
select throws_ok($$ insert into public.checkins (student_id, c1, c2, c3, c4, created_at)
                    values ('11111111-1111-4111-8111-111111111111', 1, 1, 1, 1, '2020-01-01') $$,
  '42501', null, 'client cannot set created_at');
select throws_ok($$ insert into public.checkins (student_id, c1, c2, c3, c4)
                    values ('11111111-1111-4111-8111-111111111111', 6, 1, 1, 1) $$,
  '23514', null, 'ratings outside 1-5 are rejected');
select throws_ok($$ insert into public.checkins (student_id, c1, c2, c3, c4)
                    values ('33333333-3333-4333-8333-333333333333', 1, 1, 1, 1) $$,
  '42501', null, 'student cannot write a check-in for someone else');
select throws_ok($$ update public.checkins set c1 = 1 $$, '42501', null, 'check-ins cannot be edited');
select throws_ok($$ delete from public.checkins $$, '42501', null, 'check-ins cannot be deleted by the student');
reset role;

-- No Tier 2 -> no check-in
set local request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select throws_ok($$ insert into public.checkins (student_id, c1, c2, c3, c4)
                    values ('22222222-2222-4222-8222-222222222222', 1, 1, 1, 1) $$,
  '42501', null, 'student with no consent cannot save a check-in');
reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select throws_ok($$ insert into public.checkins (student_id, c1, c2, c3, c4)
                    values ('33333333-3333-4333-8333-333333333333', 1, 1, 1, 1) $$,
  '42501', null, 'student with assent but no parental consent cannot save a check-in');
reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select throws_ok($$ insert into public.checkins (student_id, c1, c2, c3, c4)
                    values ('44444444-4444-4444-8444-444444444444', 1, 1, 1, 1) $$,
  '42501', null, 'student whose parental consent was withdrawn cannot save a check-in');
select is_empty($$ select 1 from public.checkins $$, 'another student cannot read Ana''s check-in');
reset role;

-- Prompt events: owner only, and only against the owner's own check-in
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select lives_ok($$ insert into public.prompt_events (student_id, checkin_id, type, outcome)
                   select '11111111-1111-4111-8111-111111111111', id, 'max_sev', 'dismissed' from public.checkins limit 1 $$,
  'student records their own prompt answer');
reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select is_empty($$ select 1 from public.prompt_events $$, 'prompt events are invisible to other students');
reset role;
set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select is_empty($$ select 1 from public.prompt_events $$, 'prompt events are invisible to guidance');
select is_empty($$ select 1 from public.checkins $$, 'check-ins are invisible to guidance');
reset role;

-- Resource views: owner only; needs Tier 2
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select lives_ok($$ insert into public.resource_views (student_id, resource_id)
                   values ('11111111-1111-4111-8111-111111111111', 'bbbbbbb1-0000-4000-8000-000000000001') $$,
  'Tier 2 student records a resource view');
reset role;

select * from finish();
rollback;

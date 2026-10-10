-- Phase 01 · Crisis events: the sole automatic crossing (Table 11; 2.1.6.2.7; N-02)
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Student inserts an event with only student_id and trigger_item_id
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select lives_ok($$ insert into public.crisis_events (student_id, trigger_item_id)
                   values ('11111111-1111-4111-8111-111111111111', 'aaaaaaa1-0000-4000-8000-000000000001') $$,
  'student raises a crisis event by selecting an explicit item');
select throws_ok($$ insert into public.crisis_events (student_id, trigger_item_id, disclosed)
                    values ('11111111-1111-4111-8111-111111111111', 'aaaaaaa1-0000-4000-8000-000000000001', '{"full_name":"x"}') $$,
  '42501', null, 'student cannot supply the disclosed copy');
select throws_ok($$ insert into public.crisis_events (student_id, trigger_item_id)
                    values ('22222222-2222-4222-8222-222222222222', 'aaaaaaa1-0000-4000-8000-000000000001') $$,
  '42501', null, 'student cannot raise an event for someone else');
select throws_ok($$ insert into public.crisis_events (student_id) values ('11111111-1111-4111-8111-111111111111') $$,
  '23502', null, 'an event without an explicit item is impossible');
select is_empty($$ select 1 from public.crisis_events $$, 'the student cannot read crisis events back');
reset role;

-- A student with no consent can still raise a crisis event (safety is never gated)
set local request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select lives_ok($$ insert into public.crisis_events (student_id, trigger_item_id)
                   values ('22222222-2222-4222-8222-222222222222', 'aaaaaaa1-0000-4000-8000-000000000002') $$,
  'crisis selection is not gated by consent');
reset role;

-- Retired items cannot be selected
update public.crisis_items set is_active = false where id = 'aaaaaaa1-0000-4000-8000-000000000003';
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select throws_ok($$ insert into public.crisis_events (student_id, trigger_item_id)
                    values ('11111111-1111-4111-8111-111111111111', 'aaaaaaa1-0000-4000-8000-000000000003') $$,
  '23514', null, 'a retired item cannot raise an event');
select results_eq($$ select count(*)::int from public.crisis_items $$, $$ values (2) $$,
  'students see only active crisis items');
reset role;

-- The disclosed copy came from the database
select results_eq(
  $$ select disclosed from public.crisis_events where student_id = '11111111-1111-4111-8111-111111111111' $$,
  $$ values ('{"full_name":"Ana Reyes","grade_level":12,"section":"HUMSS-A","class_adviser":"Mr. Ramon Cruz"}'::jsonb) $$,
  'disclosed holds exactly name, grade, section, adviser');

-- Guidance at aal2 reads events; at aal1 does not; admin never
set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select results_eq($$ select count(*)::int from public.crisis_events $$, $$ values (2) $$, 'guidance reads crisis events');
select throws_ok($$ update public.crisis_events set protocol_ref = 'x' $$, '42501', null, 'events cannot be edited');
select throws_ok($$ delete from public.crisis_events $$, '42501', null, 'events cannot be deleted');
reset role;
set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select is_empty($$ select 1 from public.crisis_events $$, 'guidance without the second factor reads nothing');
reset role;

-- Even the service role cannot change an event
set local role service_role;
select throws_ok($$ delete from public.crisis_events $$, '42501', null, 'service role cannot delete events');
reset role;

select * from finish();
rollback;

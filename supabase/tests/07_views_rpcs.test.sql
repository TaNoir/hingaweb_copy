-- Phase 01 · Views and RPCs used by the UI (support_queue, crisis_channel, my_account)
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Two requests for Ana (so each shows "has another open request") and a crisis event
insert into public.checkins (id, student_id, c1, c2, c3, c4)
values ('ccccccc1-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 5, 5, 1, 1);
set local role service_role;
do $$ begin perform public.create_support_request('11111111-1111-4111-8111-111111111111',
  'ccccccc1-0000-4000-8000-000000000002', null, 'academic', 3.8588, 'P1', '{"fired":[]}'); end $$;
do $$ begin perform public.create_support_request('11111111-1111-4111-8111-111111111111',
  'ccccccc1-0000-4000-8000-000000000002', null, 'family', 3.8588, 'P1', '{"fired":[]}'); end $$;
reset role;
insert into public.crisis_events (id, student_id, trigger_item_id)
values ('ddddddd1-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'aaaaaaa1-0000-4000-8000-000000000001');

set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select results_eq($$ select count(*)::int from public.support_queue where has_other_open_request $$, $$ values (2) $$,
  'both of Ana''s open requests show the other-open-request marker');
select results_eq($$ select band, full_name, section, class_adviser from public.support_queue limit 1 $$,
  $$ values ('P1'::text, 'Ana Reyes'::text, 'HUMSS-A'::text, 'Mr. Ramon Cruz'::text) $$, 'queue shows band and disclosed identity');
select hasnt_column('public', 'support_queue', 'note', 'the queue view has no note column');

-- Overdue: follow-up date in the past with no later contact
update public.support_requests set follow_up_at = now() - interval '1 day'
  where id = (select id from public.support_queue where concern_type = 'academic');
reset role;
-- the audit row for follow_up has created_at = now() (transaction time); move it back so a later contact can follow it
-- (test-only manipulation as superuser, bypassing the append-only trigger)
alter table public.staff_access_audit disable trigger staff_access_audit_no_update;
update public.staff_access_audit set created_at = now() - interval '2 days' where action = 'follow_up';
alter table public.staff_access_audit enable trigger staff_access_audit_no_update;
set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select results_eq($$ select is_overdue from public.support_queue where concern_type = 'academic' $$, $$ values (true) $$,
  'a passed follow-up date with no contact since is overdue');
select lives_ok($$ update public.support_requests set status = 'reviewed'
                   where id = (select id from public.support_queue where concern_type = 'academic') $$,
  'guidance makes contact');
select results_eq($$ select is_overdue from public.support_queue where concern_type = 'academic' $$, $$ values (false) $$,
  'a state change after the follow-up was set clears overdue');
select results_eq($$ select first_contact_at is not null from public.support_queue where concern_type = 'academic' $$,
  $$ values (true) $$, 'first contact time is the first state change');

-- Crisis channel: acknowledge then resolve, both derived from the audit trail
select results_eq($$ select item_label, acknowledged_at is null from public.crisis_channel $$,
  $$ values ('[[GUIDANCE:crisis_item_1]]'::text, true) $$, 'channel shows the explicit item and no acknowledgement yet');
select throws_ok($$ select public.resolve_crisis_event('ddddddd1-0000-4000-8000-000000000001') $$,
  '23514', null, 'an event must be acknowledged before it is resolved');
select lives_ok($$ select public.acknowledge_crisis_event('ddddddd1-0000-4000-8000-000000000001') $$, 'guidance acknowledges');
select lives_ok($$ select public.acknowledge_crisis_event('ddddddd1-0000-4000-8000-000000000001') $$, 'acknowledging twice is harmless');
select lives_ok($$ select public.resolve_crisis_event('ddddddd1-0000-4000-8000-000000000001') $$, 'guidance resolves');
select results_eq($$ select acknowledged_by, resolved_by from public.crisis_channel $$,
  $$ values ('Guidance Associate (dev)'::text, 'Guidance Associate (dev)'::text) $$, 'channel shows who acknowledged and resolved');
select results_eq($$ select count(*)::int from public.staff_access_audit where crisis_event_id is not null $$,
  $$ values (2) $$, 'exactly one acknowledgement and one resolution were audited');
reset role;

-- Admin sees nothing in either view
set local request.jwt.claims = '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select is_empty($$ select 1 from public.support_queue $$, 'admin sees no queue');
select is_empty($$ select 1 from public.crisis_channel $$, 'admin sees no crisis channel');
reset role;

-- my_account
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select results_eq($$ select public.my_account() ->> 'kind', public.my_account() ->> 'tier2', public.my_account() ->> 'has_checkin' $$,
  $$ values ('student'::text, 'true'::text, 'true'::text) $$, 'student with consent: tier2 true');
reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select results_eq($$ select public.my_account() ->> 'parental', public.my_account() ->> 'tier2' $$,
  $$ values ('withdrawn'::text, 'false'::text) $$, 'withdrawn parental consent: tier2 false');
reset role;
set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select results_eq($$ select public.my_account() ->> 'kind' $$, $$ values ('guidance'::text) $$, 'guidance is recognised even at aal1');
reset role;
set local role anon;
select throws_ok($$ select public.my_account() $$, '42501', null, 'anon cannot call my_account');
reset role;

select * from finish();
rollback;

-- Phase 01 · Resources, crisis items, staff accounts (Tables 12, 15, 16)
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Tier 1: anyone reads published resources only
set local role anon;
select results_eq($$ select count(*)::int from public.resources $$, $$ values (4) $$, 'anon reads only published resources');
select throws_ok($$ insert into public.resources (title, url, attributes) values ('x', 'https://a.b', '{}') $$,
  '42501', null, 'anon cannot write resources');
reset role;

set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select throws_ok($$ insert into public.resources (title, url, attributes)
                    values ('Guide', 'https://example.org/g', '{"school_work":1,"home_family":0,"future":0,"managing":0}') $$,
  '42501', null, 'guidance cannot write resources');
reset role;

set local request.jwt.claims = '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select results_eq($$ select count(*)::int from public.resources $$, $$ values (5) $$, 'admin reads drafts too');
select lives_ok($$ insert into public.resources (title, url, attributes)
                   values ('New guide', 'https://example.org/new',
                           '{"school_work":2,"home_family":0,"future":3,"managing":0}') $$, 'admin adds a draft');
select results_eq($$ select verified_at is null from public.resources where title = 'New guide' $$,
  $$ values (true) $$, 'a new resource without a verifier is unpublished');
select lives_ok($$ update public.resources set verified_by = '55555555-5555-4555-8555-555555555555'
                   where title = 'New guide' $$, 'admin publishes it');
select results_eq($$ select verified_at is not null from public.resources where title = 'New guide' $$,
  $$ values (true) $$, 'publishing stamps verified_at');
select throws_ok($$ insert into public.resources (title, url, attributes)
                    values ('Bad', 'https://example.org/b', '{"school_work":7,"home_family":0,"future":0,"managing":0}') $$,
  '23514', null, 'attribute values must be 0-5');
select throws_ok($$ insert into public.resources (title, url, attributes)
                    values ('Bad', 'https://example.org/b', '{"school_work":0,"home_family":0,"future":0,"managing":0}') $$,
  '23514', null, 'an all-zero vector is rejected');
select throws_ok($$ insert into public.resources (title, url, attributes)
                    values ('Bad', 'https://example.org/b', '{"school_work":1,"home":1}') $$,
  '23514', null, 'only the four area keys are allowed');
select throws_ok($$ insert into public.resources (title, url, attributes)
                    values ('Bad', 'http://example.org/b', '{"school_work":1,"home_family":0,"future":0,"managing":0}') $$,
  '23514', null, 'links must be https');

-- Crisis items: admin publishes and retires, never edits or deletes
select lives_ok($$ insert into public.crisis_items (label, protocol_ref, set_version)
                   values ('[[GUIDANCE:crisis_item_4]]', '[[GUIDANCE:crisis_protocol_step_4]]', 'v0-placeholder') $$,
  'admin publishes a crisis item');
select lives_ok($$ update public.crisis_items set is_active = false where label = '[[GUIDANCE:crisis_item_4]]' $$,
  'admin retires a crisis item');
select throws_ok($$ update public.crisis_items set is_active = true where label = '[[GUIDANCE:crisis_item_4]]' $$,
  '42501', null, 'a retired item cannot be reactivated');
select throws_ok($$ update public.crisis_items set label = 'changed' $$, '42501', null, 'item labels cannot change');
select throws_ok($$ delete from public.crisis_items $$, '42501', null, 'items cannot be deleted');

-- Staff guard: an admin cannot deactivate or demote themselves
select throws_ok($$ update public.staff_accounts set is_active = false where id = '66666666-6666-4666-8666-666666666666' $$,
  '42501', null, 'admin cannot deactivate themselves');
select lives_ok($$ update public.staff_accounts set is_active = false where id = '55555555-5555-4555-8555-555555555555' $$,
  'admin deactivates a guidance account');
select throws_ok($$ insert into public.staff_accounts (id, role, display_name) values (gen_random_uuid(), 'guidance', 'X') $$,
  '42501', null, 'staff accounts are created only by the Edge Function (service role)');
reset role;

-- A deactivated guidance account loses access immediately
set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select ok(not public.is_guidance(), 'a deactivated guidance account is not guidance');
reset role;

-- Guidance cannot manage accounts
set local request.jwt.claims = '{}';
update public.staff_accounts set is_active = true where id = '55555555-5555-4555-8555-555555555555';
set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select results_eq($$ with u as (update public.staff_accounts set role = 'administrator'
                     where id = '55555555-5555-4555-8555-555555555555' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'guidance cannot change roles (update matches no rows)');
reset role;

select * from finish();
rollback;

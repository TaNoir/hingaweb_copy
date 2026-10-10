-- Phase 01 · Office tags are staff-only; the audit trail is append-only (Tables 13, 17; 2.1.6.2.6; 2.1.6.2.8)
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

set local role service_role;
do $$ begin perform public.create_support_request('11111111-1111-4111-8111-111111111111', null, null, 'wellness', null, 'FR', '{}'); end $$;
reset role;

-- Guidance assigns a tag; the database records who, when, and audits it
set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select lives_ok($$ insert into public.office_tags (request_id, tag) select id, 'yellow' from public.support_requests $$,
  'guidance assigns an office tag');
select throws_ok($$ insert into public.office_tags (request_id, tag, assigned_by)
                    select id, 'red', '66666666-6666-4666-8666-666666666666' from public.support_requests $$,
  '42501', null, 'assigned_by cannot be supplied by the client');
select throws_ok($$ insert into public.office_tags (request_id, tag) select id, 'P1' from public.support_requests $$,
  '23514', null, 'only the three office tags are allowed');
select results_eq($$ select assigned_by from public.office_tags $$,
  $$ values ('55555555-5555-4555-8555-555555555555'::uuid) $$, 'assigned_by is the signed-in staff member');
select results_eq($$ select action from public.staff_access_audit $$, $$ values ('tag') $$, 'the tag was audited');
select throws_ok($$ update public.office_tags set tag = 'red' $$, '42501', null, 'tags cannot be edited');
select throws_ok($$ delete from public.office_tags $$, '42501', null, 'tags cannot be deleted');

-- Audit rows: insert only for guidance's own actor id; never updated or deleted
select throws_ok($$ insert into public.staff_access_audit (actor_id, request_id, action)
                    select '66666666-6666-4666-8666-666666666666', id, 'view_request' from public.support_requests $$,
  '42501', null, 'guidance cannot write audit rows as someone else');
select throws_ok($$ insert into public.staff_access_audit (actor_id, request_id, action)
                    select '55555555-5555-4555-8555-555555555555', id, 'crisis_acknowledged' from public.support_requests $$,
  '23514', null, 'a crisis action must point at a crisis event');
select throws_ok($$ update public.staff_access_audit set action = 'tag' $$, '42501', null, 'guidance cannot edit audit rows');
select throws_ok($$ delete from public.staff_access_audit $$, '42501', null, 'guidance cannot delete audit rows');
reset role;

-- Administrator cannot tag and cannot edit or delete audit rows
set local request.jwt.claims = '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select throws_ok($$ insert into public.office_tags (request_id, tag) values (gen_random_uuid(), 'green') $$,
  '42501', null, 'admin cannot assign office tags');
select throws_ok($$ delete from public.staff_access_audit $$, '42501', null, 'admin cannot delete audit rows');
reset role;

-- Student cannot tag
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select throws_ok($$ insert into public.office_tags (request_id, tag) values (gen_random_uuid(), 'green') $$,
  '42501', null, 'students cannot assign office tags');
select is_empty($$ select 1 from public.office_tags $$, 'students cannot read office tags');
reset role;

-- Not even the service role can change the audit trail
set local role service_role;
select throws_ok($$ update public.staff_access_audit set action = 'tag' $$, '42501', null, 'service role cannot edit audit rows');
select throws_ok($$ delete from public.staff_access_audit $$, '42501', null, 'service role cannot delete audit rows');
select throws_ok($$ truncate public.staff_access_audit $$, '42501', null, 'audit trail cannot be truncated');
reset role;

select * from finish();
rollback;

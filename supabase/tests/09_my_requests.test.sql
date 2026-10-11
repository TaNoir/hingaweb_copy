-- User request 2026-10-11 · my_support_requests(): a student follows their own requests as
-- sent / seen / closed, and nothing else about them.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Two requests for Ana and one for Sam. created_at is stamped with now(), which is the same for every
-- row in this transaction, so the function's tiebreaker (id, descending) decides the order: ...02 first.
insert into public.support_requests (id, student_id, disclosed, note, concern_type)
values ('aaaaaaa1-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '{}', 'first note', 'academic'),
       ('aaaaaaa1-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', '{}', 'second note', 'family'),
       ('aaaaaaa1-0000-4000-8000-000000000003', '44444444-4444-4444-8444-444444444444', '{}', 'sam note', 'peer');

-- Before anyone opens them: both of Ana's are "sent", newest first, and only hers are listed
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select results_eq($$ select jsonb_array_length(public.my_support_requests()) $$, $$ values (2) $$,
  'a student sees only their own requests');
select results_eq($$ select e ->> 'stage' from jsonb_array_elements(public.my_support_requests()) e $$,
  $$ values ('sent'), ('sent') $$, 'unopened requests are "sent"');
select results_eq($$ select (public.my_support_requests() -> 0 ->> 'id') $$,
  $$ values ('aaaaaaa1-0000-4000-8000-000000000002') $$, 'newest first');
select results_eq(
  $$ select array_agg(k order by k) from jsonb_array_elements(public.my_support_requests()) e,
            jsonb_object_keys(e) k where e ->> 'id' = 'aaaaaaa1-0000-4000-8000-000000000002' $$,
  $$ values (array['closed_at', 'created_at', 'id', 'seen_at', 'stage']) $$,
  'only id, dates, and the stage are returned (no note, concern, status word, triage, or follow-up)');
select is_empty($$ select 1 from public.support_requests $$, 'the table itself stays unreadable to students');
reset role;

-- Guidance opens the newer one: it becomes "seen" with a date; the older one stays "sent"
set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select lives_ok($$ select public.open_support_request('aaaaaaa1-0000-4000-8000-000000000002') $$, 'guidance opens it');
reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select results_eq(
  $$ select e ->> 'stage', (e ->> 'seen_at') is not null from jsonb_array_elements(public.my_support_requests()) e $$,
  $$ values ('seen', true), ('sent', false) $$, 'opening a request shows it as "seen"');
reset role;

-- Referred still reads as "seen" (the word "referred" is never shown); resolved reads as "closed"
set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select lives_ok($$ update public.support_requests set status = 'referred'
                   where id = 'aaaaaaa1-0000-4000-8000-000000000002' $$, 'guidance marks it referred');
reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select results_eq($$ select (public.my_support_requests() -> 0 ->> 'stage') $$, $$ values ('seen') $$,
  'a referred request reads as "seen"');
select ok(public.my_support_requests()::text !~ 'referred|reviewed|resolved|pending',
  'no office status word is ever returned');
reset role;
set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select lives_ok($$ update public.support_requests set status = 'resolved'
                   where id = 'aaaaaaa1-0000-4000-8000-000000000002' $$, 'guidance resolves it');
reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select results_eq(
  $$ select (public.my_support_requests() -> 0 ->> 'stage'), (public.my_support_requests() -> 0 ->> 'closed_at') is not null $$,
  $$ values ('closed', true) $$, 'a resolved request reads as "closed" with a date');
reset role;

-- A status change without an "open" first (e.g. from the queue) also counts as seen
set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select lives_ok($$ update public.support_requests set status = 'reviewed'
                   where id = 'aaaaaaa1-0000-4000-8000-000000000003' $$, 'guidance reviews Sam''s request');
reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select results_eq($$ select (public.my_support_requests() -> 0 ->> 'stage') $$, $$ values ('seen') $$,
  'a reviewed request reads as "seen"');
reset role;

-- Staff, administrators, and anonymous callers cannot use it
set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select throws_ok($$ select public.my_support_requests() $$, '42501', null, 'guidance cannot call it');
reset role;
set local request.jwt.claims = '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated","aal":"aal2"}';
set local role authenticated;
select throws_ok($$ select public.my_support_requests() $$, '42501', null, 'admin cannot call it');
reset role;
set local role anon;
select throws_ok($$ select public.my_support_requests() $$, '42501', null, 'anonymous cannot call it');
reset role;

select * from finish();
rollback;

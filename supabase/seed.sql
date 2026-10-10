-- supabase/seed.sql — LOCAL DEVELOPMENT ONLY. Fictional people. Never run against a hosted project.
-- Password for every account: LocalOnly-Pass-2026

create or replace function pg_temp.seed_user(p_id uuid, p_email text, p_meta jsonb)
returns void language plpgsql as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token)
  values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt('LocalOnly-Pass-2026', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, p_meta, now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text,
          jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
end $$;

-- Students (the on_auth_user_created trigger creates their students rows from this metadata)
select pg_temp.seed_user('11111111-1111-4111-8111-111111111111', 'student.full@example.test',
  '{"account_type":"student","full_name":"Ana Reyes","grade_level":12,"section":"HUMSS-A","class_adviser":"Mr. Ramon Cruz"}');
select pg_temp.seed_user('22222222-2222-4222-8222-222222222222', 'student.noassent@example.test',
  '{"account_type":"student","full_name":"Miguel Tan","grade_level":11,"section":"ABM-B","class_adviser":"Ms. Liza Uy"}');
select pg_temp.seed_user('33333333-3333-4333-8333-333333333333', 'student.noparent@example.test',
  '{"account_type":"student","full_name":"Paolo Diaz","grade_level":11,"section":"HUMSS-C","class_adviser":"Ms. Joy Santos"}');
select pg_temp.seed_user('44444444-4444-4444-8444-444444444444', 'student.withdrawn@example.test',
  '{"account_type":"student","full_name":"Sam Villanueva","grade_level":12,"section":"TVL-A","class_adviser":"Mr. Ben Lim"}');

-- Staff (no students row: account_type is 'staff')
select pg_temp.seed_user('55555555-5555-4555-8555-555555555555', 'guidance.one@example.test',
  '{"account_type":"staff"}');
select pg_temp.seed_user('66666666-6666-4666-8666-666666666666', 'admin.one@example.test',
  '{"account_type":"staff"}');
insert into public.staff_accounts (id, role, display_name, is_active) values
  ('55555555-5555-4555-8555-555555555555', 'guidance', 'Guidance Associate (dev)', true),
  ('66666666-6666-4666-8666-666666666666', 'administrator', 'Administrator (dev)', true);

-- Consent register (the insert trigger always starts a record as granted)
insert into public.consent_records (student_id, type, instrument_version) values
  ('11111111-1111-4111-8111-111111111111', 'parental', 'parental-v1'),
  ('11111111-1111-4111-8111-111111111111', 'assent',   'assent-en-v1'),
  ('33333333-3333-4333-8333-333333333333', 'assent',   'assent-en-v1'),
  ('44444444-4444-4444-8444-444444444444', 'parental', 'parental-v1'),
  ('44444444-4444-4444-8444-444444444444', 'assent',   'assent-en-v1');
update public.consent_records set status = 'withdrawn'
  where student_id = '44444444-4444-4444-8444-444444444444' and type = 'parental';

-- Crisis item set: placeholders until the guidance office co-designs the items (00 Section 11)
insert into public.crisis_items (id, label, protocol_ref, set_version) values
  ('aaaaaaa1-0000-4000-8000-000000000001', '[[GUIDANCE:crisis_item_1]]', '[[GUIDANCE:crisis_protocol_step_1]]', 'v0-placeholder'),
  ('aaaaaaa1-0000-4000-8000-000000000002', '[[GUIDANCE:crisis_item_2]]', '[[GUIDANCE:crisis_protocol_step_2]]', 'v0-placeholder'),
  ('aaaaaaa1-0000-4000-8000-000000000003', '[[GUIDANCE:crisis_item_3]]', '[[GUIDANCE:crisis_protocol_step_3]]', 'v0-placeholder');

-- Resources (dev only; example.org is a reserved test domain). Last one is unpublished.
insert into public.resources (id, title, url, attributes, verified_by) values
  ('bbbbbbb1-0000-4000-8000-000000000001', 'Managing exam pressure',
   'https://example.org/hingaweb-dev/exam-pressure',
   '{"school_work":5,"home_family":1,"future":1,"managing":2}', '55555555-5555-4555-8555-555555555555'),
  ('bbbbbbb1-0000-4000-8000-000000000002', 'Talking to family about money worries',
   'https://example.org/hingaweb-dev/family-money',
   '{"school_work":0,"home_family":5,"future":1,"managing":1}', '55555555-5555-4555-8555-555555555555'),
  ('bbbbbbb1-0000-4000-8000-000000000003', 'When everything feels like too much',
   'https://example.org/hingaweb-dev/too-much',
   '{"school_work":1,"home_family":1,"future":0,"managing":5}', '55555555-5555-4555-8555-555555555555'),
  ('bbbbbbb1-0000-4000-8000-000000000004', 'Thinking about life after senior high',
   'https://example.org/hingaweb-dev/after-shs',
   '{"school_work":1,"home_family":1,"future":5,"managing":0}', '55555555-5555-4555-8555-555555555555'),
  ('bbbbbbb1-0000-4000-8000-000000000005', 'Sleep and routine',
   'https://example.org/hingaweb-dev/sleep',
   '{"school_work":1,"home_family":0,"future":0,"managing":4}', null);

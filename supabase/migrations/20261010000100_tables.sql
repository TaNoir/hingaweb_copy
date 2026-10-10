-- Phase 01 · Tables (manuscript Tables 8-20). No colour words in this file.

-- Validates a resource attribute vector (Table 16, Fig 32): exactly the four area keys,
-- each an integer from 0 to 5, at least one above 0 (a zero vector has no cosine).
create or replace function public.valid_resource_attributes(a jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(a) = 'object'
     and (select array_agg(k order by k) from jsonb_object_keys(a) as k)
         = array['future', 'home_family', 'managing', 'school_work']
     and (select bool_and(jsonb_typeof(v) = 'number'
                          and (v #>> '{}')::numeric = trunc((v #>> '{}')::numeric)
                          and (v #>> '{}')::numeric between 0 and 5)
          from jsonb_each(a) as e(k, v))
     and (select sum((v #>> '{}')::numeric) from jsonb_each(a) as e(k, v)) > 0;
$$;

-- Table 18 · students
create table public.students (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text     not null check (char_length(btrim(full_name)) between 2 and 120),
  grade_level   smallint not null check (grade_level in (11, 12)),
  section       text     not null check (char_length(btrim(section)) between 1 and 60),
  class_adviser text     not null check (char_length(btrim(class_adviser)) between 2 and 120)
);
comment on table public.students is
  'Table 18. Identity source is Supabase Auth. RLS: owner and administrator; no guidance role.';

-- Table 15 · staff_accounts
create table public.staff_accounts (
  id           uuid primary key references auth.users (id) on delete restrict,
  role         text    not null check (role in ('guidance', 'administrator')),
  display_name text    not null check (char_length(btrim(display_name)) between 2 and 120),
  is_active    boolean not null default true
);
comment on table public.staff_accounts is
  'Table 15. Authentication strength is configured in Supabase Auth (2.1.6.2.9).';

-- Table 14 · consent_records
create table public.consent_records (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references public.students (id) on delete cascade,
  type               text not null check (type in ('parental', 'assent')),
  instrument_version text not null check (char_length(btrim(instrument_version)) between 1 and 40),
  status             text not null check (status in ('granted', 'withdrawn')),
  signed_at          timestamptz not null default now(),
  withdrawn_at       timestamptz,
  constraint consent_withdrawn_matches_status
    check ((status = 'withdrawn') = (withdrawn_at is not null))
);
create index consent_records_student_type_idx on public.consent_records (student_id, type);
comment on table public.consent_records is 'Table 14. Gates Tier 2 access.';

-- Table 8 · checkins
create table public.checkins (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  c1         smallint not null check (c1 between 1 and 5),
  c2         smallint not null check (c2 between 1 and 5),
  c3         smallint not null check (c3 between 1 and 5),
  c4         smallint not null check (c4 between 1 and 5),
  mood       smallint check (mood between 1 and 5),
  stress     smallint check (stress between 1 and 5),
  note       text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now()
);
create index checkins_student_created_idx on public.checkins (student_id, created_at desc);
comment on table public.checkins is 'Table 8. Owner-only RLS. Never readable by staff. No derived-score column (2.1.6.2.1).';
comment on column public.checkins.note is 'Stored, never analyzed (2.1.6.2.7).';

-- Table 19 · prompt_events
create table public.prompt_events (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  checkin_id uuid references public.checkins (id) on delete set null,
  type       text not null check (type in ('max_sev', 'gray_zone')),
  outcome    text not null check (outcome in ('dismissed', 'request_sent')),
  created_at timestamptz not null default now()
);
create index prompt_events_student_idx on public.prompt_events (student_id);
comment on table public.prompt_events is 'Table 19. Owner-only RLS. Never surfaced to staff, in aggregate or anonymized form.';

-- Table 16 · resources
create table public.resources (
  id          uuid primary key default gen_random_uuid(),
  title       text  not null check (char_length(btrim(title)) between 2 and 160),
  url         text  check (url is null or url ~* '^https://'),
  attributes  jsonb not null check (public.valid_resource_attributes(attributes)),
  verified_by uuid  references public.staff_accounts (id) on delete restrict,
  verified_at timestamptz,
  constraint resources_verified_pair check ((verified_by is null) = (verified_at is null)),
  constraint resources_published_needs_url check (verified_at is null or url is not null)
);
comment on table public.resources is
  'Table 16. Published = verified_by and verified_at both set (D-07). Tier 1 public read. Admin write.';

-- Table 20 · resource_views
create table public.resource_views (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,
  viewed_at   timestamptz not null default now()
);
create index resource_views_student_idx on public.resource_views (student_id);
comment on table public.resource_views is 'Table 20. Owner-only RLS.';

-- Table 12 · crisis_items
create table public.crisis_items (
  id           uuid primary key default gen_random_uuid(),
  label        text    not null check (char_length(btrim(label)) between 2 and 200),
  protocol_ref text,
  set_version  text    not null check (char_length(btrim(set_version)) between 1 and 20),
  is_active    boolean not null default true
);
comment on table public.crisis_items is 'Table 12. Configuration entity, co-designed item set. Holds no student data.';

-- Table 11 · crisis_events
create table public.crisis_events (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid  not null references public.students (id) on delete restrict,
  disclosed       jsonb not null,
  trigger_item_id uuid  not null references public.crisis_items (id) on delete restrict,
  protocol_ref    text,
  created_at      timestamptz not null default now()
);
create index crisis_events_created_idx on public.crisis_events (created_at desc);
comment on table public.crisis_events is
  'Table 11. DUAL POLICY. Student INSERT: self only, explicit item only. Guidance READ: the sole automatic crossing.';

-- Table 9 · support_requests
create table public.support_requests (
  id           uuid  primary key default gen_random_uuid(),
  student_id   uuid  not null references public.students (id) on delete restrict,
  disclosed    jsonb not null,
  note         text  check (note is null or char_length(note) <= 2000),
  status       text  not null default 'pending'
                     check (status in ('pending', 'reviewed', 'referred', 'resolved')),
  concern_type text  not null check (concern_type in ('academic', 'peer', 'family', 'wellness')),
  follow_up_at timestamptz,
  created_at   timestamptz not null default now()
);
create index support_requests_status_created_idx on public.support_requests (status, created_at);
create index support_requests_student_idx on public.support_requests (student_id);
comment on table public.support_requests is 'Table 9. Voluntary disclosure. Identity reaches staff only on submission.';
comment on column public.support_requests.note is 'Stored, never analyzed (2.1.6.2.7).';

-- Table 10 · triage_decisions
create table public.triage_decisions (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null unique references public.support_requests (id) on delete restrict,
  score       numeric(7, 4),
  band        text not null check (band in ('P1', 'P2', 'P3', 'FR')),
  guardrails  jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  constraint triage_score_needed_unless_fr check (score is not null or band = 'FR')
);
comment on table public.triage_decisions is
  'Table 10. band carries no colour token; crisis is not a band (2.1.6.2.6). guardrails holds fired floors and the rule set used (N-06).';

-- Table 17 · staff_access_audit
create table public.staff_access_audit (
  id              uuid primary key default gen_random_uuid(),
  actor_id        uuid not null references public.staff_accounts (id) on delete restrict,
  request_id      uuid references public.support_requests (id) on delete restrict,
  crisis_event_id uuid references public.crisis_events (id) on delete restrict,
  action          text not null check (action in (
                    'view_request', 'state_change', 'referral', 'tag', 'follow_up',
                    'view_crisis', 'crisis_acknowledged', 'crisis_resolved')),
  created_at      timestamptz not null default now(),
  constraint staff_access_audit_target_required
    check (request_id is not null or crisis_event_id is not null),
  constraint staff_access_audit_target_matches_action check (
    (action in ('view_request', 'state_change', 'referral', 'tag', 'follow_up')
       and request_id is not null and crisis_event_id is null)
    or
    (action in ('view_crisis', 'crisis_acknowledged', 'crisis_resolved')
       and crisis_event_id is not null and request_id is null))
);
create index staff_access_audit_request_idx on public.staff_access_audit (request_id, action, created_at);
create index staff_access_audit_crisis_idx on public.staff_access_audit (crisis_event_id, action, created_at);
create index staff_access_audit_created_idx on public.staff_access_audit (created_at desc);
comment on table public.staff_access_audit is
  'Table 17. Append-only: INSERT and SELECT policies only, no UPDATE or DELETE for any role.';

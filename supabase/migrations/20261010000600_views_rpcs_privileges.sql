-- Phase 01 · Views and RPC functions the UI uses, then the final function privileges.

-- ===== View: the guidance queue (Fig 21, 2.1.3.7, 2.1.5.2.1, 2.1.5.2.2, 2.1.5.2.7) =====
-- security_invoker = true: the caller's RLS applies, so only guidance sees rows.
create view public.support_queue with (security_invoker = true) as
select
  r.id,
  r.created_at,
  r.status,
  r.concern_type,
  r.follow_up_at,
  r.disclosed ->> 'full_name'                  as full_name,
  (r.disclosed ->> 'grade_level')::smallint    as grade_level,
  r.disclosed ->> 'section'                    as section,
  r.disclosed ->> 'class_adviser'              as class_adviser,
  t.band,
  exists (
    select 1 from public.support_requests o
    where o.student_id = r.student_id and o.id <> r.id
      and o.status in ('pending', 'reviewed', 'referred')
  ) as has_other_open_request,
  (select min(a.created_at) from public.staff_access_audit a
    where a.request_id = r.id and a.action in ('state_change', 'referral')) as first_contact_at,
  (
    r.follow_up_at is not null
    and r.follow_up_at < now()
    and not exists (
      select 1 from public.staff_access_audit a
      where a.request_id = r.id
        and a.action in ('state_change', 'referral')
        and a.created_at > coalesce(
          (select max(f.created_at) from public.staff_access_audit f
            where f.request_id = r.id and f.action = 'follow_up'),
          r.created_at)
    )
  ) as is_overdue
from public.support_requests r
left join public.triage_decisions t on t.request_id = r.id;

comment on view public.support_queue is
  'Fig 21 list. No note column: the note is shown only after opening (2.1.3.7).';

-- ===== View: the crisis channel (Fig 24, 2.1.5.2.3; acknowledgement derived from audit, D-05) =====
create view public.crisis_channel with (security_invoker = true) as
select
  e.id,
  e.created_at,
  e.disclosed ->> 'full_name'               as full_name,
  (e.disclosed ->> 'grade_level')::smallint as grade_level,
  e.disclosed ->> 'section'                 as section,
  e.disclosed ->> 'class_adviser'           as class_adviser,
  e.protocol_ref,
  i.label       as item_label,
  i.set_version as item_set_version,
  ack.created_at    as acknowledged_at,
  ack_by.display_name as acknowledged_by,
  res.created_at    as resolved_at,
  res_by.display_name as resolved_by
from public.crisis_events e
join public.crisis_items i on i.id = e.trigger_item_id
left join lateral (
  select a.created_at, a.actor_id from public.staff_access_audit a
  where a.crisis_event_id = e.id and a.action = 'crisis_acknowledged'
  order by a.created_at limit 1) ack on true
left join public.staff_accounts ack_by on ack_by.id = ack.actor_id
left join lateral (
  select a.created_at, a.actor_id from public.staff_access_audit a
  where a.crisis_event_id = e.id and a.action = 'crisis_resolved'
  order by a.created_at limit 1) res on true
left join public.staff_accounts res_by on res_by.id = res.actor_id;

-- ===== RPC: who am I? (routing after sign-in; Phase 02 and 04) =====
create or replace function public.my_account()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  st public.staff_accounts;
  s  public.students;
  v_assent text;
  v_parental text;
begin
  if v_uid is null then
    return jsonb_build_object('kind', 'anonymous');
  end if;
  select * into st from public.staff_accounts where id = v_uid;
  if found then
    return jsonb_build_object('kind', st.role, 'is_active', st.is_active, 'display_name', st.display_name);
  end if;
  select * into s from public.students where id = v_uid;
  if found then
    select c.status into v_assent from public.consent_records c
      where c.student_id = v_uid and c.type = 'assent' order by c.signed_at desc limit 1;
    select c.status into v_parental from public.consent_records c
      where c.student_id = v_uid and c.type = 'parental' order by c.signed_at desc limit 1;
    return jsonb_build_object(
      'kind', 'student',
      'full_name', s.full_name, 'grade_level', s.grade_level,
      'section', s.section, 'class_adviser', s.class_adviser,
      'assent', coalesce(v_assent, 'none'),
      'parental', coalesce(v_parental, 'none'),
      'tier2', public.student_has_tier2(v_uid),
      'has_checkin', exists (select 1 from public.checkins c where c.student_id = v_uid));
  end if;
  return jsonb_build_object('kind', 'none');
end $$;

-- ===== RPC: create a support request and its triage decision in one transaction (Phase 07) =====
-- Called ONLY by the submit-support-request Edge Function with the service role.
-- The disclosed copy is built here from students + the student's latest check-in (N-02).
create or replace function public.create_support_request(
  p_student_id   uuid,
  p_checkin_id   uuid,
  p_note         text,
  p_concern_type text,
  p_score        numeric,
  p_band         text,
  p_guardrails   jsonb)
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  s public.students;
  c public.checkins;
  v_latest uuid;
  v_request_id uuid;
  v_created_at timestamptz;
begin
  select * into s from public.students where id = p_student_id;
  if not found then
    raise exception 'unknown_student' using errcode = 'P0002';
  end if;
  if not public.student_has_tier2(p_student_id) then
    raise exception 'consent_required' using errcode = '42501';
  end if;
  select k.id into v_latest from public.checkins k
    where k.student_id = p_student_id order by k.created_at desc limit 1;
  if v_latest is distinct from p_checkin_id then
    raise exception 'stale_checkin' using errcode = '40001';
  end if;
  if p_checkin_id is not null then
    select * into c from public.checkins where id = p_checkin_id;
  elsif p_band <> 'FR' or p_score is not null then
    raise exception 'no_checkin_requires_fr' using errcode = '23514';
  end if;

  insert into public.support_requests (student_id, disclosed, note, concern_type)
  values (
    p_student_id,
    jsonb_build_object(
      'full_name', s.full_name, 'grade_level', s.grade_level,
      'section', s.section, 'class_adviser', s.class_adviser,
      'c1', c.c1, 'c2', c.c2, 'c3', c.c3, 'c4', c.c4),
    nullif(p_note, ''),
    p_concern_type)
  returning id, created_at into v_request_id, v_created_at;

  insert into public.triage_decisions (request_id, score, band, guardrails)
  values (v_request_id, p_score, p_band, coalesce(p_guardrails, '{}'::jsonb));

  return jsonb_build_object('request_id', v_request_id, 'created_at', v_created_at);
end $$;

-- ===== RPC: open one support request (Fig 23). Writes the audit row, then returns the note. =====
create or replace function public.open_support_request(p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  r public.support_requests;
  t public.triage_decisions;
  v_viewed_at timestamptz;
  v_tag jsonb;
begin
  if not public.is_guidance() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into r from public.support_requests where id = p_request_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  insert into public.staff_access_audit (actor_id, request_id, action)
  values ((select auth.uid()), r.id, 'view_request')
  returning created_at into v_viewed_at;

  select * into t from public.triage_decisions where request_id = r.id;
  select jsonb_build_object('tag', o.tag, 'assigned_at', o.assigned_at, 'assigned_by', sa.display_name)
    into v_tag
    from public.office_tags o join public.staff_accounts sa on sa.id = o.assigned_by
    where o.request_id = r.id order by o.assigned_at desc limit 1;

  return jsonb_build_object(
    'id', r.id, 'created_at', r.created_at, 'status', r.status,
    'concern_type', r.concern_type, 'follow_up_at', r.follow_up_at,
    'note', r.note, 'disclosed', r.disclosed,
    'triage', case when t.id is null then null else jsonb_build_object(
      'score', t.score, 'band', t.band, 'guardrails', t.guardrails, 'computed_at', t.computed_at) end,
    'office_tag', v_tag,
    'has_other_open_request', exists (
      select 1 from public.support_requests o
      where o.student_id = r.student_id and o.id <> r.id
        and o.status in ('pending', 'reviewed', 'referred')),
    'viewed_at', v_viewed_at);
end $$;

-- ===== RPCs: crisis handling (Fig 24; D-05) =====
create or replace function public.log_crisis_view(p_event_id uuid)
returns timestamptz language plpgsql volatile security definer set search_path = ''
as $$
declare v_at timestamptz;
begin
  if not public.is_guidance() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if not exists (select 1 from public.crisis_events where id = p_event_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  insert into public.staff_access_audit (actor_id, crisis_event_id, action)
  values ((select auth.uid()), p_event_id, 'view_crisis') returning created_at into v_at;
  return v_at;
end $$;

create or replace function public.acknowledge_crisis_event(p_event_id uuid)
returns timestamptz language plpgsql volatile security definer set search_path = ''
as $$
declare v_at timestamptz;
begin
  if not public.is_guidance() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if not exists (select 1 from public.crisis_events where id = p_event_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  select created_at into v_at from public.staff_access_audit
    where crisis_event_id = p_event_id and action = 'crisis_acknowledged'
    order by created_at limit 1;
  if v_at is not null then return v_at; end if;   -- idempotent: first acknowledgement stands
  insert into public.staff_access_audit (actor_id, crisis_event_id, action)
  values ((select auth.uid()), p_event_id, 'crisis_acknowledged') returning created_at into v_at;
  return v_at;
end $$;

create or replace function public.resolve_crisis_event(p_event_id uuid)
returns timestamptz language plpgsql volatile security definer set search_path = ''
as $$
declare v_at timestamptz;
begin
  if not public.is_guidance() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if not exists (select 1 from public.staff_access_audit
                 where crisis_event_id = p_event_id and action = 'crisis_acknowledged') then
    raise exception 'acknowledge_first' using errcode = '23514';
  end if;
  select created_at into v_at from public.staff_access_audit
    where crisis_event_id = p_event_id and action = 'crisis_resolved'
    order by created_at limit 1;
  if v_at is not null then return v_at; end if;   -- idempotent
  insert into public.staff_access_audit (actor_id, crisis_event_id, action)
  values ((select auth.uid()), p_event_id, 'crisis_resolved') returning created_at into v_at;
  return v_at;
end $$;

-- ===== Final privileges (the one place function rights are set) =====
revoke execute on all functions in schema public from public, anon, authenticated;
revoke all on public.support_queue, public.crisis_channel from anon, authenticated;

grant execute on function
  public.valid_resource_attributes(jsonb),
  public.is_aal2(), public.is_active_staff_role(text),
  public.is_guidance(), public.is_admin(), public.is_staff(),
  public.is_student(), public.current_student_has_tier2(),
  public.my_account(),
  public.open_support_request(uuid),
  public.log_crisis_view(uuid), public.acknowledge_crisis_event(uuid), public.resolve_crisis_event(uuid)
  to authenticated;
grant execute on function public.valid_resource_attributes(jsonb) to anon;
grant execute on all functions in schema public to service_role;
grant select on public.support_queue, public.crisis_channel to authenticated, service_role;

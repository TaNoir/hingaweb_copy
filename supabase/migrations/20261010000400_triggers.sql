-- Phase 01 · Triggers. Server-side stamps, the disclosed copies (N-02), audit writes, and guards.

-- 1. Generic: overwrite a timestamp column with now() on INSERT, so clients cannot back-date rows.
create or replace function public.tg_stamp_now()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new := jsonb_populate_record(new, jsonb_build_object(tg_argv[0], now()));
  return new;
end $$;

create trigger checkins_stamp          before insert on public.checkins
  for each row execute function public.tg_stamp_now('created_at');
create trigger prompt_events_stamp     before insert on public.prompt_events
  for each row execute function public.tg_stamp_now('created_at');
create trigger resource_views_stamp    before insert on public.resource_views
  for each row execute function public.tg_stamp_now('viewed_at');
create trigger crisis_events_stamp     before insert on public.crisis_events
  for each row execute function public.tg_stamp_now('created_at');
create trigger support_requests_stamp  before insert on public.support_requests
  for each row execute function public.tg_stamp_now('created_at');
create trigger triage_decisions_stamp  before insert on public.triage_decisions
  for each row execute function public.tg_stamp_now('computed_at');
create trigger office_tags_stamp       before insert on public.office_tags
  for each row execute function public.tg_stamp_now('assigned_at');
create trigger staff_access_audit_stamp before insert on public.staff_access_audit
  for each row execute function public.tg_stamp_now('created_at');

-- 2. New auth user -> students row (self-registration, 2.1.5.1.1, D-01).
--    Only when the sign-up metadata says account_type = 'student'. Staff rows are created
--    by the admin-accounts Edge Function (Phase 09), never here.
create or replace function public.tg_handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if m ->> 'account_type' = 'student' then
    insert into public.students (id, full_name, grade_level, section, class_adviser)
    values (new.id,
            btrim(m ->> 'full_name'),
            (m ->> 'grade_level')::smallint,
            btrim(m ->> 'section'),
            btrim(m ->> 'class_adviser'));
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_handle_new_user();

-- 3. Consent records: insert always starts as granted; the only allowed update is a withdrawal.
create or replace function public.tg_consent_records_insert()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.status := 'granted';
  new.withdrawn_at := null;
  new.signed_at := now();
  return new;
end $$;
create trigger consent_records_insert before insert on public.consent_records
  for each row execute function public.tg_consent_records_insert();

create or replace function public.tg_consent_records_guard()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if old.status <> 'granted' or new.status <> 'withdrawn'
     or new.id <> old.id or new.student_id <> old.student_id or new.type <> old.type
     or new.instrument_version <> old.instrument_version or new.signed_at <> old.signed_at then
    raise exception 'consent_records: only a withdrawal of a granted record is allowed'
      using errcode = '42501';
  end if;
  new.withdrawn_at := now();
  return new;
end $$;
create trigger consent_records_guard before update on public.consent_records
  for each row execute function public.tg_consent_records_guard();

-- 4. Crisis events: fill the disclosed copy and protocol step from the database (N-02).
--    The browser sends only student_id and trigger_item_id.
create or replace function public.tg_crisis_events_fill()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  s public.students;
  i public.crisis_items;
begin
  if new.trigger_item_id is null then
    raise exception 'crisis_events: an explicit crisis item is required' using errcode = '23502';
  end if;
  select * into s from public.students where id = new.student_id;
  if not found then
    raise exception 'crisis_events: unknown student' using errcode = '23503';
  end if;
  select * into i from public.crisis_items where id = new.trigger_item_id;
  if not found or not i.is_active then
    raise exception 'crisis_events: item is not an active crisis item' using errcode = '23514';
  end if;
  new.disclosed := jsonb_build_object(
    'full_name', s.full_name, 'grade_level', s.grade_level,
    'section', s.section, 'class_adviser', s.class_adviser);
  new.protocol_ref := i.protocol_ref;
  return new;
end $$;
create trigger crisis_events_fill before insert on public.crisis_events
  for each row execute function public.tg_crisis_events_fill();

-- 5. Support requests: after creation only status and follow_up_at may change,
--    and every change is written to the audit trail by the database itself.
create or replace function public.tg_support_requests_guard()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.id <> old.id or new.student_id <> old.student_id or new.disclosed <> old.disclosed
     or new.note is distinct from old.note or new.concern_type <> old.concern_type
     or new.created_at <> old.created_at then
    raise exception 'support_requests: only status and follow_up_at can change' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger support_requests_guard before update on public.support_requests
  for each row execute function public.tg_support_requests_guard();

create or replace function public.tg_support_requests_audit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null then
    raise exception 'support_requests: updates need a signed-in staff member' using errcode = '42501';
  end if;
  if new.status is distinct from old.status then
    insert into public.staff_access_audit (actor_id, request_id, action)
    values (v_actor, new.id, case when new.status = 'referred' then 'referral' else 'state_change' end);
  end if;
  if new.follow_up_at is distinct from old.follow_up_at then
    insert into public.staff_access_audit (actor_id, request_id, action)
    values (v_actor, new.id, 'follow_up');
  end if;
  return null;
end $$;
create trigger support_requests_audit after update on public.support_requests
  for each row execute function public.tg_support_requests_audit();

-- 6. Office tags: the signed-in staff member is always the assigner; the assignment is audited.
create or replace function public.tg_office_tags_fill()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.assigned_by := (select auth.uid());
  return new;
end $$;
create trigger office_tags_fill before insert on public.office_tags
  for each row execute function public.tg_office_tags_fill();

create or replace function public.tg_office_tags_audit()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.staff_access_audit (actor_id, request_id, action)
  values (new.assigned_by, new.request_id, 'tag');
  return null;
end $$;
create trigger office_tags_audit after insert on public.office_tags
  for each row execute function public.tg_office_tags_audit();

-- 7. Audit trail is append-only for every role, including service_role (2.1.6.2.8).
create or replace function public.tg_block_change()
returns trigger language plpgsql set search_path = ''
as $$
begin
  raise exception '%: rows cannot be changed or deleted', tg_table_name using errcode = '42501';
end $$;
create trigger staff_access_audit_no_update before update or delete on public.staff_access_audit
  for each row execute function public.tg_block_change();
create trigger staff_access_audit_no_truncate before truncate on public.staff_access_audit
  for each statement execute function public.tg_block_change();
create trigger triage_decisions_no_update before update or delete on public.triage_decisions
  for each row execute function public.tg_block_change();
create trigger crisis_events_no_update before update or delete on public.crisis_events
  for each row execute function public.tg_block_change();
create trigger office_tags_no_update before update or delete on public.office_tags
  for each row execute function public.tg_block_change();

-- 8. Crisis items: label, protocol step, and version never change; an item can only be retired.
create or replace function public.tg_crisis_items_guard()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.id <> old.id or new.label <> old.label or new.protocol_ref is distinct from old.protocol_ref
     or new.set_version <> old.set_version or not (old.is_active and not new.is_active) then
    raise exception 'crisis_items: items can only be retired' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger crisis_items_guard before update on public.crisis_items
  for each row execute function public.tg_crisis_items_guard();
create trigger crisis_items_no_delete before delete on public.crisis_items
  for each row execute function public.tg_block_change();

-- 9. Resources: verified_at is set by the server when a verifier is set (publish),
--    and cleared when the verifier is cleared (unpublish).
create or replace function public.tg_resources_verify()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.verified_by is null then
    new.verified_at := null;
  elsif tg_op = 'INSERT' or old.verified_by is distinct from new.verified_by then
    new.verified_at := now();
  else
    new.verified_at := old.verified_at;
  end if;
  return new;
end $$;
create trigger resources_verify before insert or update on public.resources
  for each row execute function public.tg_resources_verify();

-- 10. Staff accounts: an administrator cannot demote or deactivate themselves,
--     and there must always be at least one active administrator.
create or replace function public.tg_staff_accounts_guard()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'staff_accounts: id cannot change' using errcode = '42501';
  end if;
  if old.id = (select auth.uid()) and (new.role <> old.role or new.is_active <> old.is_active) then
    raise exception 'staff_accounts: you cannot change your own role or status' using errcode = '42501';
  end if;
  if old.role = 'administrator' and old.is_active
     and (new.role <> 'administrator' or not new.is_active)
     and (select count(*) from public.staff_accounts
          where role = 'administrator' and is_active and id <> old.id) = 0 then
    raise exception 'staff_accounts: at least one active administrator is required' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger staff_accounts_guard before update on public.staff_accounts
  for each row execute function public.tg_staff_accounts_guard();

-- Execute rights are set in 20261010000600_views_rpcs_privileges.sql.

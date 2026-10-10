-- Phase 01 · Row-level security: the single enforcement point for every privacy rule (2.2.6).
-- Start from zero privileges, then grant exactly what each policy class needs.

revoke all on all tables in schema public from anon, authenticated;
-- Edge Functions use service_role; grant it explicitly in case the project does not auto-expose tables.
grant all on all tables in schema public to service_role;

alter table public.students           enable row level security;
alter table public.staff_accounts     enable row level security;
alter table public.consent_records    enable row level security;
alter table public.checkins           enable row level security;
alter table public.prompt_events      enable row level security;
alter table public.resource_views     enable row level security;
alter table public.resources          enable row level security;
alter table public.crisis_items       enable row level security;
alter table public.crisis_events      enable row level security;
alter table public.support_requests   enable row level security;
alter table public.triage_decisions   enable row level security;
alter table public.office_tags        enable row level security;
alter table public.staff_access_audit enable row level security;

-- ===== Table privileges (column lists limit what a client can ever send) =====
grant select on public.students to authenticated;

grant select on public.staff_accounts to authenticated;
grant update (role, is_active, display_name) on public.staff_accounts to authenticated;

grant select on public.consent_records to authenticated;
grant insert (student_id, type, instrument_version) on public.consent_records to authenticated;
grant update (status) on public.consent_records to authenticated;

grant select on public.checkins to authenticated;
grant insert (student_id, c1, c2, c3, c4, mood, stress, note) on public.checkins to authenticated;

grant select on public.prompt_events to authenticated;
grant insert (student_id, checkin_id, type, outcome) on public.prompt_events to authenticated;

grant select on public.resource_views to authenticated;
grant insert (student_id, resource_id) on public.resource_views to authenticated;

grant select on public.resources to anon, authenticated;
grant insert (title, url, attributes, verified_by) on public.resources to authenticated;
grant update (title, url, attributes, verified_by) on public.resources to authenticated;
grant delete on public.resources to authenticated;

grant select on public.crisis_items to authenticated;
grant insert (label, protocol_ref, set_version) on public.crisis_items to authenticated;
grant update (is_active) on public.crisis_items to authenticated;

grant select on public.crisis_events to authenticated;
grant insert (student_id, trigger_item_id) on public.crisis_events to authenticated;

-- The request note is NOT selectable directly; it is returned only by open_support_request(),
-- which writes the audit row first (2.1.3.6, 2.1.3.7).
grant select (id, student_id, disclosed, status, concern_type, follow_up_at, created_at)
  on public.support_requests to authenticated;
grant update (status, follow_up_at) on public.support_requests to authenticated;

grant select on public.triage_decisions to authenticated;

grant select on public.office_tags to authenticated;
grant insert (request_id, tag) on public.office_tags to authenticated;

grant select on public.staff_access_audit to authenticated;
grant insert (actor_id, request_id, crisis_event_id, action) on public.staff_access_audit to authenticated;

-- ===== Policies =====
-- students: owner and administrator; no guidance role (Table 18)
create policy students_select_own on public.students
  for select to authenticated using (id = (select auth.uid()));
create policy students_select_admin on public.students
  for select to authenticated using ((select public.is_admin()));

-- staff_accounts: a staff member always sees their own row (needed before the second factor);
-- active staff at aal2 see all staff names; only an administrator updates.
create policy staff_select_own on public.staff_accounts
  for select to authenticated using (id = (select auth.uid()));
create policy staff_select_staff on public.staff_accounts
  for select to authenticated using ((select public.is_staff()));
create policy staff_update_admin on public.staff_accounts
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- consent_records: owner and administrator; no guidance role (Table 14)
create policy consent_select_own on public.consent_records
  for select to authenticated using (student_id = (select auth.uid()));
create policy consent_select_admin on public.consent_records
  for select to authenticated using ((select public.is_admin()));
create policy consent_insert_own_assent on public.consent_records
  for insert to authenticated
  with check (student_id = (select auth.uid()) and (select public.is_student()) and type = 'assent');
create policy consent_insert_admin on public.consent_records
  for insert to authenticated with check ((select public.is_admin()));
create policy consent_update_admin on public.consent_records
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- checkins: owner-only; writing needs Tier 2 (Table 8, 2.1.6.2.1, 2.1.6.2.3)
create policy checkins_select_own on public.checkins
  for select to authenticated using (student_id = (select auth.uid()));
create policy checkins_insert_own on public.checkins
  for insert to authenticated
  with check (student_id = (select auth.uid()) and (select public.current_student_has_tier2()));

-- prompt_events: owner-only; never surfaced to staff (Table 19)
create policy prompt_events_select_own on public.prompt_events
  for select to authenticated using (student_id = (select auth.uid()));
create policy prompt_events_insert_own on public.prompt_events
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and (checkin_id is null or exists (
      select 1 from public.checkins c where c.id = checkin_id and c.student_id = (select auth.uid()))));

-- resource_views: owner-only (Table 20)
create policy resource_views_select_own on public.resource_views
  for select to authenticated using (student_id = (select auth.uid()));
create policy resource_views_insert_own on public.resource_views
  for insert to authenticated
  with check (student_id = (select auth.uid()) and (select public.current_student_has_tier2()));

-- resources: Tier 1 public read of published rows; administrator manages (Table 16)
create policy resources_select_published on public.resources
  for select to anon, authenticated using (verified_at is not null);
create policy resources_select_admin on public.resources
  for select to authenticated using ((select public.is_admin()));
create policy resources_insert_admin on public.resources
  for insert to authenticated with check ((select public.is_admin()));
create policy resources_update_admin on public.resources
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy resources_delete_admin on public.resources
  for delete to authenticated using ((select public.is_admin()));

-- crisis_items: students read active items; staff read all (incl. retired); administrator publishes
create policy crisis_items_select_student on public.crisis_items
  for select to authenticated using (is_active and (select public.is_student()));
create policy crisis_items_select_staff on public.crisis_items
  for select to authenticated using ((select public.is_staff()));
create policy crisis_items_insert_admin on public.crisis_items
  for insert to authenticated with check ((select public.is_admin()));
create policy crisis_items_update_admin on public.crisis_items
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- crisis_events: DUAL POLICY, the sole automatic crossing (Table 11)
create policy crisis_events_insert_own on public.crisis_events
  for insert to authenticated
  with check (student_id = (select auth.uid()) and (select public.is_student()));
create policy crisis_events_select_guidance on public.crisis_events
  for select to authenticated using ((select public.is_guidance()));

-- support_requests: guidance only; created only through create_support_request() (Phase 07)
create policy support_requests_select_guidance on public.support_requests
  for select to authenticated using ((select public.is_guidance()));
create policy support_requests_update_guidance on public.support_requests
  for update to authenticated
  using ((select public.is_guidance())) with check ((select public.is_guidance()));

-- triage_decisions: guidance only; written only through create_support_request()
create policy triage_decisions_select_guidance on public.triage_decisions
  for select to authenticated using ((select public.is_guidance()));

-- office_tags: guidance only; staff-write only (Table 13)
create policy office_tags_select_guidance on public.office_tags
  for select to authenticated using ((select public.is_guidance()));
create policy office_tags_insert_guidance on public.office_tags
  for insert to authenticated with check ((select public.is_guidance()));

-- staff_access_audit: INSERT and SELECT only (Table 17)
create policy staff_access_audit_select_staff on public.staff_access_audit
  for select to authenticated using ((select public.is_staff()));
create policy staff_access_audit_insert_guidance on public.staff_access_audit
  for insert to authenticated
  with check (actor_id = (select auth.uid()) and (select public.is_guidance()));

-- Phase 01 · Table 13 · office_tags
-- The ONLY migration allowed to contain the office's colour words (00 Section 10.4).
create table public.office_tags (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.support_requests (id) on delete restrict,
  tag         text not null check (tag in ('green', 'yellow', 'red')),
  assigned_by uuid not null references public.staff_accounts (id) on delete restrict,
  assigned_at timestamptz not null default now()
);
create index office_tags_request_idx on public.office_tags (request_id, assigned_at desc);
comment on table public.office_tags is
  'Table 13. The office''s own status tag. Staff-write only, never computed, suggested, or read by any algorithm.';

-- User request 2026-10-11 (docs/questions.md, "My requests"): a student can follow their own support
-- requests. They see when each was sent and one of three plain steps:
--   sent    the guidance office has not opened it yet
--   seen    a guidance staff member opened it or acted on it (any audit row for it), or its status
--           moved past pending (reviewed and referred both show as seen)
--   closed  the request is resolved
-- The office's own status words, the note, the concern, triage, office tags, and the follow-up date
-- never leave the database this way. The table itself stays unreadable to students (RLS unchanged).
create or replace function public.my_support_requests()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not public.is_student() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id,
             'created_at', r.created_at,
             'stage', case
               when r.status = 'resolved' then 'closed'
               when r.status <> 'pending' or a.first_at is not null then 'seen'
               else 'sent' end,
             'seen_at', a.first_at,
             'closed_at', case when r.status = 'resolved' then a.last_change_at end)
           order by r.created_at desc, r.id desc)
    from (select s.id, s.status, s.created_at from public.support_requests s
          where s.student_id = v_uid order by s.created_at desc, s.id desc limit 5) r
    left join lateral (
      select min(x.created_at) as first_at,
             max(x.created_at) filter (where x.action in ('state_change', 'referral')) as last_change_at
      from public.staff_access_audit x where x.request_id = r.id) a on true
  ), '[]'::jsonb);
end $$;

revoke execute on function public.my_support_requests() from public, anon;
grant execute on function public.my_support_requests() to authenticated, service_role;

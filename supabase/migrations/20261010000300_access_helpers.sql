-- Phase 01 · Access helper functions used by RLS policies.
-- SECURITY DEFINER so they can read staff_accounts / consent_records without recursive RLS.
-- Every function pins search_path = '' and fully qualifies names.

create or replace function public.is_aal2()
returns boolean language sql stable set search_path = ''
as $$ select coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2' $$;

create or replace function public.is_active_staff_role(p_role text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.staff_accounts s
    where s.id = (select auth.uid()) and s.role = p_role and s.is_active
  )
$$;

-- Guidance personnel with a verified second factor (2.1.6.2.9).
create or replace function public.is_guidance()
returns boolean language sql stable set search_path = ''
as $$ select public.is_active_staff_role('guidance') and public.is_aal2() $$;

-- Administrator with a verified second factor (2.1.6.2.9).
create or replace function public.is_admin()
returns boolean language sql stable set search_path = ''
as $$ select public.is_active_staff_role('administrator') and public.is_aal2() $$;

-- Any active staff account with a verified second factor.
create or replace function public.is_staff()
returns boolean language sql stable set search_path = ''
as $$ select public.is_guidance() or public.is_admin() $$;

create or replace function public.is_student()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.students s where s.id = (select auth.uid())) $$;

-- Tier 2 = a granted, not-withdrawn parental consent AND a granted, not-withdrawn assent (D-27).
create or replace function public.student_has_tier2(p_student_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.consent_records c
                 where c.student_id = p_student_id and c.type = 'parental' and c.status = 'granted')
     and exists (select 1 from public.consent_records c
                 where c.student_id = p_student_id and c.type = 'assent' and c.status = 'granted')
$$;

create or replace function public.current_student_has_tier2()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.is_student() and public.student_has_tier2((select auth.uid())) $$;

-- Execute rights for these functions are set in 20261010000600_views_rpcs_privileges.sql.

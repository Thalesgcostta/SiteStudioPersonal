-- Consulta pública estritamente limitada aos dias e valores dos planos mensais.
-- Execute após as migrações anteriores. Não concede acesso público aos dados administrativos.
begin;
create or replace function public.get_public_studio_plans()
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('days',days,'monthlyPrice',monthly_price) order by days),'[]'::jsonb)
  from public.plans;
$$;
revoke all on function public.get_public_studio_plans() from public,anon,authenticated;
grant execute on function public.get_public_studio_plans() to anon,authenticated;
commit;

-- Atualiza a consulta do portfólio para os planos de 2 a 5 dias por semana.
-- Pode ser executada após a migração 004, com ou sem a 005 já aplicada.
-- Preserva os preços, cadastros e históricos do administrativo.
begin;

create or replace function public.get_public_studio_plans()
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object('days', days, 'monthlyPrice', monthly_price)
      order by days
    ),
    '[]'::jsonb
  )
  from public.plans
  where days between 2 and 5;
$$;

revoke all on function public.get_public_studio_plans() from public, anon, authenticated;
grant execute on function public.get_public_studio_plans() to anon, authenticated;

commit;

-- Execute após a migração 007. Não exclui dados durante a instalação.
begin;
do $$ begin
  if to_regprocedure('public._get_studio_state_v7()') is null then
    if to_regclass('public.registration_access') is null then
      raise exception 'Execute a migração 007 antes da 008.';
    end if;
    alter function public.get_studio_state() rename to _get_studio_state_v7;
    alter function public.apply_studio_action(text,jsonb,uuid) rename to _apply_studio_action_v7;
  end if;
end $$;
revoke all on function public._get_studio_state_v7(),public._apply_studio_action_v7(text,jsonb,uuid) from public,anon,authenticated;

create or replace function public.get_studio_state() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_studio_admin() then
    raise exception 'Acesso restrito à administração do studio.' using errcode='42501';
  end if;
  return public._get_studio_state_v7() || jsonb_build_object('schemaVersion',8);
end $$;
revoke all on function public.get_studio_state() from public,anon;
grant execute on function public.get_studio_state() to authenticated;

create or replace function public.apply_studio_action(p_type text,p_payload jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare previous public.mutation_requests%rowtype; target public.students%rowtype; target_id uuid;
begin
  if not public.is_studio_admin() then
    raise exception 'Acesso restrito à administração do studio.' using errcode='42501';
  end if;
  if p_type is distinct from 'delete_student' then
    return public._apply_studio_action_v7(p_type,p_payload,p_request_id);
  end if;
  if p_request_id is null or p_payload is null then
    raise exception 'Solicitação inválida.' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select * into previous from public.mutation_requests where id=p_request_id;
  if found then
    if previous.actor<>auth.uid() or previous.kind<>p_type or previous.payload_hash<>md5(p_payload::text) then
      raise exception 'Identificador de solicitação já utilizado.' using errcode='22023';
    end if;
    return public.get_studio_state();
  end if;
  perform pg_advisory_xact_lock(784201);
  target_id:=(p_payload->>'id')::uuid;
  select * into target from public.students where id=target_id for update;
  if not found or target.name is distinct from p_payload->>'expectedName' then
    raise exception 'O cadastro mudou. Atualize antes de excluir.' using errcode='22023';
  end if;
  insert into public.mutation_requests(id,actor,kind,payload_hash)
    values(p_request_id,auth.uid(),p_type,md5(p_payload::text));
  delete from public.receipts where bill_id in (select id from public.bills where student_id=target_id);
  delete from public.bills where student_id=target_id;
  delete from public.evaluation_payments where evaluation_id in (select id from public.evaluations where student_id=target_id);
  delete from public.evaluations where student_id=target_id;
  delete from public.appointments where student_id=target_id;
  delete from public.sale_items where sale_id in (select id from public.sales where student_id=target_id);
  delete from public.sales where student_id=target_id;
  delete from public.students where id=target_id;
  return public.get_studio_state();
end $$;
revoke all on function public.apply_studio_action(text,jsonb,uuid) from public,anon;
grant execute on function public.apply_studio_action(text,jsonb,uuid) to authenticated;
commit;

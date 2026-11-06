-- Execute após a migração 008, antes de publicar o formulário atualizado.
-- Cadastros antigos ficam sem autorização registrada. Preserva os preços existentes.
begin;
alter table public.plans drop constraint if exists plans_days_check;
alter table public.plans add constraint plans_days_check check(days between 1 and 6);
insert into public.plans(days,monthly_price) values(6,600) on conflict(days) do nothing;
alter table public.students add column if not exists image_consent boolean;
alter table public.students add column if not exists image_consent_at timestamptz;
alter table public.students add column if not exists image_consent_version text;
do $$ begin
  if to_regprocedure('public._get_studio_state_v8()') is null then
    alter function public.get_studio_state() rename to _get_studio_state_v8;
  end if;
end $$;
revoke all on function public._get_studio_state_v8() from public,anon,authenticated;
create or replace function public.get_studio_state() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not public.is_studio_admin() then raise exception 'Acesso restrito à administração do studio.' using errcode='42501'; end if;
  result:=public._get_studio_state_v8();
  return jsonb_set(result,'{students}',coalesce((select jsonb_agg(e.value||jsonb_build_object(
    'imageConsent',s.image_consent,'imageConsentAt',s.image_consent_at,'imageConsentVersion',s.image_consent_version) order by e.ordinality)
    from jsonb_array_elements(result->'students') with ordinality e(value,ordinality)
    join public.students s on s.id=(e.value->>'id')::uuid),'[]'::jsonb)) || jsonb_build_object('schemaVersion',9);
end $$;
revoke all on function public.get_studio_state() from public,anon;
grant execute on function public.get_studio_state() to authenticated;

create or replace function public.submit_student_registration(p_token uuid,p_student jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare config public.studio_settings%rowtype; d jsonb; student_id_value uuid; n integer;
  current_day date:=(now() at time zone 'America/Sao_Paulo')::date; old_hash text;
begin
  perform pg_advisory_xact_lock(784202);
  if not exists(select 1 from public.registration_access where singleton and enabled and token=p_token) then
    raise exception 'Link de cadastro indisponível. Solicite um novo link ao studio.' using errcode='22023';
  end if;
  if p_request_id is null or p_student is null or jsonb_typeof(p_student)<>'object' or octet_length(p_student::text)>10000 then
    raise exception 'Cadastro inválido.' using errcode='22023';
  end if;
  select payload_hash into old_hash from public.registration_submissions where request_id=p_request_id;
  if found then
    if old_hash<>md5(p_student::text) then raise exception 'Envio inválido. Recarregue o formulário.' using errcode='22023'; end if;
    return jsonb_build_object('received',true);
  end if;
  if (select count(*) from public.registration_submissions where created_at>now()-interval '10 minutes')>=300 then
    raise exception 'Muitos cadastros neste momento. Tente novamente em alguns minutos.' using errcode='22023';
  end if;
  if (p_student-array['name','birth','cpf','phone','email','addressFields','emergency','plan','days','times','consent','imageConsent'])<>'{}'::jsonb
    or exists(select 1 from jsonb_each(p_student) e where e.key=any(array['name','birth','cpf','phone','email','emergency']) and jsonb_typeof(e.value)<>'string')
    or (p_student ? 'imageConsent' and jsonb_typeof(p_student->'imageConsent') is distinct from 'boolean')
    or jsonb_typeof(p_student->'consent') is distinct from 'boolean'
    or p_student->>'consent' is distinct from 'true'
    or length(trim(coalesce(p_student->>'name',''))) not between 3 and 150
    or coalesce(p_student->>'cpf','') !~ '^[0-9]{11}$'
    or length(regexp_replace(coalesce(p_student->>'phone',''),'[^0-9]','','g')) not between 10 and 13
    or length(coalesce(p_student->>'phone',''))>30 or length(coalesce(p_student->>'email',''))>200
    or length(coalesce(p_student->>'emergency',''))>300
    or (p_student->>'birth')::date is null or (p_student->>'birth')::date>current_day or (p_student->>'birth')::date<'1900-01-01'::date then
    raise exception 'Confira nome, nascimento, CPF, telefone e autorização de cadastro.' using errcode='22023';
  end if;
  if not public.valid_student_address(p_student->'addressFields')
    or length(trim(coalesce(p_student->'addressFields'->>'street','')))<2
    or trim(coalesce(p_student->'addressFields'->>'number',''))=''
    or length(trim(coalesce(p_student->'addressFields'->>'neighborhood','')))<2
    or length(trim(coalesce(p_student->'addressFields'->>'city','')))<2
    or coalesce(p_student->'addressFields'->>'state','')='' then
    raise exception 'Complete rua, número, bairro, cidade e estado. O CEP é opcional.' using errcode='22023';
  end if;
  if jsonb_typeof(p_student->'days') is distinct from 'array' or jsonb_typeof(p_student->'times') is distinct from 'object' or jsonb_typeof(p_student->'plan') is distinct from 'number'
    or coalesce(p_student->>'plan','') !~ '^[2-6]$' then raise exception 'Confira o plano e os horários de preferência.' using errcode='22023'; end if;
  n:=(p_student->>'plan')::integer;
  if jsonb_array_length(p_student->'days')<>n or (select count(distinct value) from jsonb_array_elements(p_student->'days'))<>n then
    raise exception 'Escolha os dias correspondentes ao plano.' using errcode='22023';
  end if;
  select * into config from public.studio_settings where singleton;
  for d in select value from jsonb_array_elements(p_student->'days') loop
    if d::text !~ '^[0-5]$' or coalesce(p_student->'times'->>(d#>>'{}'),'') !~ '^[0-2][0-9]:[0-5][0-9]$' then
      raise exception 'Informe dias e horários válidos.' using errcode='22023';
    end if;
    if (p_student->'times'->>(d#>>'{}'))::time not between config.opens_at and config.closes_at then
      raise exception 'Escolha horários dentro do funcionamento do studio.' using errcode='22023';
    end if;
  end loop;
  insert into public.registration_submissions(request_id,payload_hash) values(p_request_id,md5(p_student::text));
  insert into public.students(name,birth,cpf,phone,email,address,address_fields,emergency,start_date,active,plan_days,due_day,registration_pending,image_consent,image_consent_at,image_consent_version)
  values(trim(p_student->>'name'),(p_student->>'birth')::date,p_student->>'cpf',p_student->>'phone',coalesce(p_student->>'email',''),
    public.format_student_address(p_student->'addressFields'),p_student->'addressFields',coalesce(p_student->>'emergency',''),
    current_day,false,n,10,true,coalesce((p_student->>'imageConsent')::boolean,false),now(),'2026-11-06-v1')
  on conflict(cpf) do nothing returning id into student_id_value;
  if student_id_value is not null then
    for d in select value from jsonb_array_elements(p_student->'days') loop
      insert into public.student_schedule values(student_id_value,(d#>>'{}')::smallint,(p_student->'times'->>(d#>>'{}'))::time);
    end loop;
  end if;
  -- A mesma confirmação é usada para CPF já cadastrado; nunca expõe nem altera dados existentes.
  return jsonb_build_object('received',true);
end $$;
revoke all on function public.submit_student_registration(uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.submit_student_registration(uuid,jsonb,uuid) to anon,authenticated;
create or replace function public._apply_studio_action_v4(p_type text,p_payload jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v jsonb; item jsonb; day_value jsonb; bill public.bills%rowtype; product public.products%rowtype;
  current_day date := (now() at time zone 'America/Sao_Paulo')::date;
  month_value date; amount_value numeric(12,2); paid_value numeric(12,2); total_value numeric(12,2):=0;
  student_id_value uuid; sale_id_value uuid; count_value integer; existed boolean;
  settings public.studio_settings%rowtype; existing_request public.mutation_requests%rowtype;
  previous_slots jsonb; previous_active boolean; capacity_count integer; payment jsonb; eval public.evaluations%rowtype;
begin
  if not public.is_studio_admin() then raise exception 'Acesso restrito à administração do studio.' using errcode='42501'; end if;
  if p_request_id is null or p_payload is null then raise exception 'Solicitação inválida.' using errcode='22023'; end if;
  insert into public.mutation_requests(id,actor,kind,payload_hash)
    values(p_request_id,auth.uid(),p_type,md5(p_payload::text)) on conflict do nothing;
  get diagnostics count_value=row_count;
  if count_value=0 then
    select * into existing_request from public.mutation_requests where id=p_request_id;
    if existing_request.actor<>auth.uid() or existing_request.kind<>p_type or existing_request.payload_hash<>md5(p_payload::text) then
      raise exception 'Identificador de solicitação já utilizado.' using errcode='22023';
    end if;
    return public.get_studio_state();
  end if;
  if p_type in ('save_student','set_student_active','save_settings','record_evaluation') then
    perform pg_advisory_xact_lock(784201);
  end if;
  select * into settings from public.studio_settings where singleton;

  case p_type
  when 'save_student' then
    v:=p_payload->'student'; student_id_value:=(v->>'id')::uuid;
    if jsonb_typeof(v->'days') is distinct from 'array' then
      raise exception 'Informe os dias do plano.' using errcode='22023';
    end if;
    if jsonb_array_length(v->'days')<>(v->>'plan')::integer then
      raise exception 'Escolha a quantidade de dias correspondente ao plano.' using errcode='22023';
    end if;
    if (v->>'birth')::date>current_day then raise exception 'Data de nascimento inválida.' using errcode='22023'; end if;
    select exists(select 1 from public.students where id=student_id_value) into existed;
    select active into previous_active from public.students where id=student_id_value;
    select coalesce(jsonb_agg(jsonb_build_object('day',weekday,'time',to_char(preference_time,'HH24:MI'))),'[]'::jsonb) into previous_slots from public.student_schedule where student_id=student_id_value;
    insert into public.students(id,name,birth,cpf,phone,email,address,emergency,start_date,active,plan_days,due_day,notes)
    values(student_id_value,trim(v->>'name'),(v->>'birth')::date,regexp_replace(v->>'cpf','[^0-9]','','g'),v->>'phone',
      coalesce(v->>'email',''),coalesce(v->>'address',''),coalesce(v->>'emergency',''),(v->>'start')::date,
      (v->>'active')::boolean,(v->>'plan')::smallint,(v->>'due')::smallint,coalesce(v->>'notes',''))
    on conflict(id) do update set name=excluded.name,birth=excluded.birth,cpf=excluded.cpf,phone=excluded.phone,
      email=excluded.email,address=excluded.address,emergency=excluded.emergency,start_date=excluded.start_date,
      active=excluded.active,plan_days=excluded.plan_days,due_day=excluded.due_day,notes=excluded.notes;
    delete from public.student_schedule where student_id=student_id_value;
    for day_value in select value from jsonb_array_elements(v->'days') loop
      if (v->'times'->>(day_value#>>'{}'))::time is null or
        (v->'times'->>(day_value#>>'{}'))::time not between settings.opens_at and settings.closes_at then
        raise exception 'Horário fora do funcionamento do studio.' using errcode='22023';
      end if;
      if (v->>'active')::boolean and not (coalesce(previous_active,false) and previous_slots @> jsonb_build_array(jsonb_build_object('day',(day_value#>>'{}')::integer,'time',to_char((v->'times'->>(day_value#>>'{}'))::time,'HH24:MI')))) then
        select count(*) into capacity_count from public.student_schedule ss join public.students st on st.id=ss.student_id
        where st.active and st.id<>student_id_value and ss.weekday=(day_value#>>'{}')::smallint and ss.preference_time=(v->'times'->>(day_value#>>'{}'))::time;
        if capacity_count>=settings.max_per_slot then raise exception 'Horário % sem vagas. Escolha outro horário.',v->'times'->>(day_value#>>'{}') using errcode='22023'; end if;
      end if;
      insert into public.student_schedule values(student_id_value,(day_value#>>'{}')::smallint,(v->'times'->>(day_value#>>'{}'))::time);
    end loop;
    if not existed and (v->>'active')::boolean and (v->>'start')::date <= (date_trunc('month',current_day)+interval '1 month - 1 day')::date then
      month_value:=date_trunc('month',current_day)::date;
      insert into public.bills(student_id,month,amount,due_date)
      select student_id_value,month_value,monthly_price,month_value+((v->>'due')::integer-1)
      from public.plans where days=(v->>'plan')::smallint on conflict(student_id,month) do nothing;
    end if;
  when 'set_student_active' then
    if (p_payload->>'active')::boolean and exists(select 1 from public.students where id=(p_payload->>'id')::uuid and not active) then
      if exists(select 1 from public.student_schedule target where target.student_id=(p_payload->>'id')::uuid and (select count(*) from public.student_schedule ss join public.students st on st.id=ss.student_id where st.active and ss.weekday=target.weekday and ss.preference_time=target.preference_time)>=settings.max_per_slot) then raise exception 'Um horário do aluno está sem vagas. Ajuste os horários antes de ativar.' using errcode='22023'; end if;
    end if;
    update public.students set active=(p_payload->>'active')::boolean where id=(p_payload->>'id')::uuid;
    if not found then raise exception 'Aluno não encontrado.' using errcode='22023'; end if;
  when 'generate_bills' then
    if coalesce(p_payload->>'month','') !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Competência inválida.' using errcode='22023'; end if;
    month_value:=((p_payload->>'month')||'-01')::date;
    insert into public.bills(student_id,month,amount,due_date)
    select s.id,month_value,p.monthly_price,month_value+s.due_day-1 from public.students s
    join public.plans p on p.days=s.plan_days where s.active and s.start_date<=(month_value+interval '1 month - 1 day')::date
    on conflict(student_id,month) do nothing;
  when 'record_payment' then
    v:=p_payload->'receipt';
    select * into bill from public.bills where id=(p_payload->>'billId')::uuid for update;
    if not found then raise exception 'Mensalidade não encontrada.' using errcode='22023'; end if;
    select coalesce(sum(amount),0) into paid_value from public.receipts where bill_id=bill.id;
    amount_value:=(v->>'amount')::numeric(12,2);
    if amount_value is null or amount_value<=0 or amount_value>bill.amount-paid_value then
      raise exception 'Valor recebido maior que o saldo ou inválido. Atualize os dados.' using errcode='22023';
    end if;
    if (v->>'date')::date>current_day then raise exception 'Pagamento não pode ter data futura.' using errcode='22023'; end if;
    if not (v->>'method'=any(settings.payment_methods)) then raise exception 'Forma de pagamento não habilitada.' using errcode='22023'; end if;
    if nullif(v->>'attachmentPath','') is not null and not starts_with(v->>'attachmentPath','receipts/'||auth.uid()::text||'/'||bill.id::text||'/') then
      raise exception 'Caminho de comprovante inválido.' using errcode='22023';
    end if;
    insert into public.receipts(id,bill_id,amount,paid_on,method,note,attachment_name,attachment_path,created_by)
    values((v->>'id')::uuid,bill.id,amount_value,(v->>'date')::date,v->>'method',coalesce(v->>'note',''),
      coalesce(v->>'attachment',''),nullif(v->>'attachmentPath',''),auth.uid());
  when 'record_evaluation' then
    v:=p_payload->'evaluation';
    if (v->>'date')::date>current_day then raise exception 'Avaliação não pode ter data futura.' using errcode='22023'; end if;
    if v ? 'charge' and (v->>'charge')::numeric<>settings.evaluation_price then raise exception 'O preço do exame mudou. Atualize os dados.' using errcode='22023'; end if;
    insert into public.evaluations(id,student_id,evaluated_on,weight,height,fat,muscle,visceral,water,notes,charge)
    values((v->>'id')::uuid,(v->>'studentId')::uuid,(v->>'date')::date,(v->>'weight')::numeric,
      (v->>'height')::numeric,(v->>'fat')::numeric,(v->>'muscle')::numeric,(v->>'visceral')::numeric,
      (v->>'water')::numeric,coalesce(v->>'notes',''),settings.evaluation_price);
    if p_payload->'payment' is not null and p_payload->'payment'<>'null'::jsonb then
      payment:=p_payload->'payment';
      if (payment->>'amount')::numeric is null or (payment->>'amount')::numeric<=0 or (payment->>'amount')::numeric>settings.evaluation_price then raise exception 'Pagamento maior que o saldo do exame.' using errcode='22023'; end if;
      if (payment->>'date')::date>current_day or not (payment->>'method'=any(settings.payment_methods)) then raise exception 'Data ou forma de pagamento inválida.' using errcode='22023'; end if;
      insert into public.evaluation_payments(id,evaluation_id,amount,paid_on,method,note,created_by) values((payment->>'id')::uuid,(v->>'id')::uuid,(payment->>'amount')::numeric,(payment->>'date')::date,payment->>'method',coalesce(payment->>'note',''),auth.uid());
    end if;
    delete from public.appointments where student_id=(v->>'studentId')::uuid and scheduled_on=(v->>'date')::date;
  when 'record_evaluation_payment' then
    payment:=p_payload->'payment';
    select * into eval from public.evaluations where id=(p_payload->>'evaluationId')::uuid for update;
    if not found then raise exception 'Avaliação não encontrada.' using errcode='22023'; end if;
    select coalesce(sum(amount),0) into paid_value from public.evaluation_payments where evaluation_id=eval.id;
    amount_value:=(payment->>'amount')::numeric(12,2);
    if amount_value is null or amount_value<=0 or amount_value>eval.charge-paid_value then raise exception 'Pagamento maior que o saldo do exame. Atualize os dados.' using errcode='22023'; end if;
    if (payment->>'date')::date>current_day or not (payment->>'method'=any(settings.payment_methods)) then raise exception 'Data ou forma de pagamento inválida.' using errcode='22023'; end if;
    insert into public.evaluation_payments(id,evaluation_id,amount,paid_on,method,note,created_by) values((payment->>'id')::uuid,eval.id,amount_value,(payment->>'date')::date,payment->>'method',coalesce(payment->>'note',''),auth.uid());
  when 'delete_evaluation' then
    perform 1 from public.evaluations where id=(p_payload->>'id')::uuid for update;
    if exists(select 1 from public.evaluation_payments where evaluation_id=(p_payload->>'id')::uuid) then raise exception 'Avaliação com recebimentos não pode ser excluída.' using errcode='22023'; end if;
    delete from public.evaluations where id=(p_payload->>'id')::uuid;
    if not found then raise exception 'Avaliação não encontrada.' using errcode='22023'; end if;
  when 'save_appointment' then
    v:=p_payload->'appointment';
    if (v->>'date')::date<current_day or (v->>'time')::time not between settings.opens_at and settings.closes_at then
      raise exception 'Data ou horário de agendamento inválido.' using errcode='22023';
    end if;
    if not exists(select 1 from public.students where id=(v->>'studentId')::uuid and active) then
      raise exception 'Escolha um aluno ativo.' using errcode='22023';
    end if;
    insert into public.appointments(id,student_id,scheduled_on,scheduled_at)
    values((v->>'id')::uuid,(v->>'studentId')::uuid,(v->>'date')::date,(v->>'time')::time);
  when 'delete_appointment' then
    delete from public.appointments where id=(p_payload->>'id')::uuid;
    if not found then raise exception 'Agendamento não encontrado.' using errcode='22023'; end if;
  when 'save_product' then
    v:=p_payload->'product';
    select * into product from public.products where id=(v->>'id')::uuid for update;
    if product.deleted_at is not null then raise exception 'Este produto já foi excluído. Atualize o catálogo.' using errcode='22023'; end if;
    if found and coalesce((v->>'version')::bigint,-1)<>product.version then
      raise exception 'O produto foi alterado em outra sessão. Atualize o catálogo antes de editar.' using errcode='22023';
    end if;
    if v ? 'photoPath' and nullif(v->>'photoPath','') is not null and (v->>'photoPath') is distinct from product.photo_path and not starts_with(v->>'photoPath','products/'||auth.uid()::text||'/'||(v->>'id')||'/') then raise exception 'Caminho da foto inválido.' using errcode='22023'; end if;
    insert into public.products(id,name,category,price,stock,variant,color,photo_path,illustration)
    values((v->>'id')::uuid,trim(v->>'name'),v->>'category',(v->>'price')::numeric,(v->>'stock')::integer,coalesce(v->>'variant',''),v->>'color',case when v ? 'photoPath' then nullif(v->>'photoPath','') else product.photo_path end,case when v ? 'illustration' then v->>'illustration' else coalesce(product.illustration,'category') end)
    on conflict(id) do update set name=excluded.name,category=excluded.category,price=excluded.price,
      stock=excluded.stock,variant=excluded.variant,color=excluded.color,photo_path=excluded.photo_path,illustration=excluded.illustration,version=public.products.version+1;
  when 'delete_product' then
    select * into product from public.products where id=(p_payload->>'id')::uuid for update;
    if not found or product.deleted_at is not null then raise exception 'Produto não encontrado ou já excluído.' using errcode='22023'; end if;
    if coalesce((p_payload->>'version')::bigint,-1)<>product.version then
      raise exception 'O produto foi alterado em outra sessão. Atualize o estoque antes de excluir.' using errcode='22023';
    end if;
    -- Retém o registro para que itens, nomes e valores das vendas anteriores sejam preservados.
    update public.products set deleted_at=now(),version=version+1 where id=product.id;
  when 'record_sale' then
    v:=p_payload->'sale'; sale_id_value:=(v->>'id')::uuid;
    if jsonb_typeof(v->'items') is distinct from 'array' then raise exception 'Carrinho inválido.' using errcode='22023'; end if;
    if jsonb_array_length(v->'items')=0 then raise exception 'Carrinho vazio.' using errcode='22023'; end if;
    if (v->>'date')::date>current_day then raise exception 'Venda não pode ter data futura.' using errcode='22023'; end if;
    if not (v->>'method'=any(settings.payment_methods)) then raise exception 'Forma de pagamento não habilitada.' using errcode='22023'; end if;
    -- Ordenação consistente dos bloqueios evita deadlocks entre carrinhos.
    for item in select value from jsonb_array_elements(v->'items') order by value->>'productId' loop
      select * into product from public.products where id=(item->>'productId')::uuid for update;
      if not found or product.deleted_at is not null then raise exception 'Produto não encontrado ou excluído. Atualize o catálogo.' using errcode='22023'; end if;
      if (item->>'quantity')::integer is null or (item->>'quantity')::integer<=0 or (item->>'quantity')::integer>product.stock then
        raise exception 'Estoque insuficiente. Atualize o catálogo.' using errcode='22023';
      end if;
      if (item->>'price')::numeric is null or (item->>'price')::numeric<>product.price then
        raise exception 'O preço do produto mudou. Atualize o catálogo.' using errcode='22023';
      end if;
      total_value:=total_value+product.price*(item->>'quantity')::integer;
    end loop;
    amount_value:=(v->>'discount')::numeric(12,2);
    if amount_value is null or amount_value<0 or amount_value>total_value then raise exception 'Desconto inválido.' using errcode='22023'; end if;
    insert into public.sales(id,sold_on,student_id,discount,subtotal,method,created_by)
    values(sale_id_value,(v->>'date')::date,nullif(v->>'studentId','')::uuid,amount_value,total_value,v->>'method',auth.uid());
    for item in select value from jsonb_array_elements(v->'items') order by value->>'productId' loop
      insert into public.sale_items(sale_id,product_id,quantity,price)
      select sale_id_value,id,(item->>'quantity')::integer,price from public.products where id=(item->>'productId')::uuid;
      update public.products set stock=stock-(item->>'quantity')::integer,version=version+1 where id=(item->>'productId')::uuid;
    end loop;
  when 'record_movement' then
    v:=p_payload->'movement';
    if (v->>'date')::date>current_day then raise exception 'Movimentação não pode ter data futura.' using errcode='22023'; end if;
    insert into public.movements(id,occurred_on,description,category,kind,amount,created_by)
    values((v->>'id')::uuid,(v->>'date')::date,trim(v->>'description'),v->>'category',v->>'kind',(v->>'amount')::numeric,auth.uid());
  when 'delete_movement' then
    delete from public.movements where id=(p_payload->>'id')::uuid;
    if not found then raise exception 'Movimentação não encontrada.' using errcode='22023'; end if;
  when 'save_dashboard' then
    if not public.valid_dashboard_layout(p_payload->'widgets') then raise exception 'Organização do Dashboard inválida.' using errcode='22023'; end if;
    insert into public.dashboard_preferences(user_id,layout) values(auth.uid(),p_payload->'widgets') on conflict(user_id) do update set layout=excluded.layout;
  when 'save_settings' then
    v:=p_payload->'settings';
    if jsonb_typeof(v->'planPrices') is distinct from 'array' or jsonb_array_length(v->'planPrices') not in (5,6) then raise exception 'Informe os valores dos planos.' using errcode='22023'; end if;
    if v ? 'productCategories' then
      if jsonb_typeof(v->'productCategories') is distinct from 'array' or jsonb_array_length(v->'productCategories') not between 1 and 30 then raise exception 'Informe de 1 a 30 categorias.' using errcode='22023'; end if;
      if (select count(distinct lower(trim(value))) from jsonb_array_elements_text(v->'productCategories'))<>jsonb_array_length(v->'productCategories') then raise exception 'Categorias repetidas.' using errcode='22023'; end if;
      insert into public.product_categories(name) select trim(value) from jsonb_array_elements_text(v->'productCategories') on conflict(name) do nothing;
      if exists(select 1 from public.products where category not in (select trim(value) from jsonb_array_elements_text(v->'productCategories'))) then raise exception 'Uma categoria em uso não pode ser removida.' using errcode='22023'; end if;
      delete from public.product_categories where name not in (select trim(value) from jsonb_array_elements_text(v->'productCategories'));
    end if;
    if v ? 'dashboardWidgets' and not public.valid_dashboard_layout(v->'dashboardWidgets') then raise exception 'Organização do Dashboard inválida.' using errcode='22023'; end if;
    update public.studio_settings set max_per_slot=coalesce((v->>'maxPerSlot')::integer,max_per_slot),evaluation_price=coalesce((v->>'evaluationPrice')::numeric,evaluation_price),name=trim(v->>'name'),professional=v->>'professional',phone=v->>'phone',
      email=v->>'email',address=v->>'address',opens_at=(v->>'open')::time,closes_at=(v->>'close')::time,
      payment_methods=array(select jsonb_array_elements_text(v->'methods')),logo=v->>'logo',orange=v->>'orange',blue=v->>'blue'
    where singleton;
    for count_value in 1..jsonb_array_length(v->'planPrices') loop
      update public.plans set monthly_price=(v->'planPrices'->>(count_value-1))::numeric where days=count_value;
    end loop;
  else raise exception 'Operação não permitida.' using errcode='22023';
  end case;
  return public.get_studio_state();
end $$;

revoke all on function public._apply_studio_action_v4(text,jsonb,uuid) from public,anon,authenticated;
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
  where days between 2 and 6;
$$;

revoke all on function public.get_public_studio_plans() from public, anon, authenticated;
grant execute on function public.get_public_studio_plans() to anon, authenticated;

create or replace function public.get_public_registration_config(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not exists(select 1 from public.registration_access where singleton and enabled and token=p_token) then
    raise exception 'Link de cadastro indisponível. Solicite um novo link ao studio.' using errcode='22023';
  end if;
  return (select jsonb_build_object('imageConsentVersion','2026-11-06-v1','name',name,'open',to_char(opens_at,'HH24:MI'),'close',to_char(closes_at,'HH24:MI'),
    'plans',(select jsonb_agg(jsonb_build_object('days',days,'monthlyPrice',monthly_price) order by days) from public.plans where days between 2 and 6))
    from public.studio_settings where singleton);
end $$;

commit;

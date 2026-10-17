-- Execute após 001 a 004. Não depende das migrações do portfólio (005/006).
-- Preserva dados e regras anteriores; o cadastro público só aceita novos cadastros pendentes.
begin;
do $$ begin
  if to_regprocedure('public._get_studio_state_v4()') is null and
    coalesce(regexp_replace(pg_get_functiondef(to_regprocedure('public.get_studio_state()')),'\s+','','g'),'') not like '%''schemaVersion'',4%' then
    raise exception 'Aplique as migrações 001 a 004, nessa ordem, antes da atualização 007.';
  end if;
end $$;
alter table public.students add column if not exists address_fields jsonb;
alter table public.students add column if not exists registration_pending boolean not null default false;

create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null check (length(trim(description)) between 3 and 200),
  category text not null check (category in ('Aluguel','Funcionários','Energia','Água','Manutenção','Mercadorias','Outras despesas')),
  amount numeric(12,2) not null check (amount>0),
  due_day smallint not null check (due_day between 1 and 31),
  start_month date not null check (extract(day from start_month)=1),
  end_month date check (extract(day from end_month)=1 and end_month>=start_month),
  version bigint not null default 1, created_at timestamptz not null default now()
);
alter table public.movements drop constraint if exists movements_category_check;
alter table public.movements add constraint movements_category_check
  check (category in ('Aluguel','Funcionários','Energia','Água','Manutenção','Mercadorias','Outras despesas','Outras receitas'));
alter table public.movements add column if not exists recurring_expense_id uuid references public.recurring_expenses(id);
alter table public.movements add column if not exists recurring_month date;
create unique index if not exists movements_recurring_month_unique
  on public.movements(recurring_expense_id,recurring_month) where recurring_expense_id is not null;

create table if not exists public.registration_access (
  singleton boolean primary key default true check (singleton),
  token uuid not null default gen_random_uuid(), enabled boolean not null default true
);
insert into public.registration_access(singleton) values(true) on conflict do nothing;
create table if not exists public.registration_submissions (
  request_id uuid primary key, payload_hash text not null, created_at timestamptz not null default now()
);
create index if not exists registration_submissions_date on public.registration_submissions(created_at);

do $$ declare t text; begin
  foreach t in array array['recurring_expenses','registration_access','registration_submissions'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
  end loop;
end $$;

create or replace function public.valid_student_address(v jsonb) returns boolean
language sql immutable set search_path='' as $$
  select coalesce(jsonb_typeof(v)='object'
    and (v-array['cep','street','number','complement','neighborhood','city','state'])='{}'::jsonb
    and not exists(select 1 from jsonb_each(v) e where jsonb_typeof(e.value)<>'string' or length(e.value#>>'{}')>200)
    and (coalesce(v->>'cep','')='' or regexp_replace(v->>'cep','[^0-9]','','g') ~ '^[0-9]{8}$')
    and length(coalesce(v->>'number',''))<=20
    and (coalesce(v->>'state','')='' or v->>'state'=any(array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'])),false);
$$;
create or replace function public.format_student_address(v jsonb) returns text
language sql immutable set search_path='' as $$
  select concat_ws(' · ',
    nullif(concat_ws(', ',nullif(trim(v->>'street'),''),nullif(trim(v->>'number'),'')),''),
    nullif(trim(v->>'complement'),''),nullif(trim(v->>'neighborhood'),''),
    nullif(concat_ws('/',nullif(trim(v->>'city'),''),nullif(trim(v->>'state'),'')),''),
    case when coalesce(v->>'cep','')<>'' then 'CEP '||(v->>'cep') end);
$$;
revoke all on function public.valid_student_address(jsonb),public.format_student_address(jsonb) from public,anon,authenticated;

-- Guardamos a implementação 004 para manter suas validações de capacidade, vendas e cobranças.
do $$ begin
  if to_regprocedure('public._get_studio_state_v4()') is null then
    alter function public.get_studio_state() rename to _get_studio_state_v4;
  end if;
  if to_regprocedure('public._apply_studio_action_v4(text,jsonb,uuid)') is null then
    alter function public.apply_studio_action(text,jsonb,uuid) rename to _apply_studio_action_v4;
  end if;
end $$;
revoke all on function public._get_studio_state_v4(),public._apply_studio_action_v4(text,jsonb,uuid) from public,anon,authenticated;

create or replace function public.get_studio_state() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not public.is_studio_admin() then raise exception 'Acesso restrito à administração do studio.' using errcode='42501'; end if;
  result:=public._get_studio_state_v4();
  result:=jsonb_set(result,'{students}',coalesce((select jsonb_agg(e.value||jsonb_build_object(
    'addressFields',s.address_fields,'registrationPending',s.registration_pending) order by e.ordinality)
    from jsonb_array_elements(result->'students') with ordinality e(value,ordinality)
    join public.students s on s.id=(e.value->>'id')::uuid),'[]'::jsonb));
  result:=jsonb_set(result,'{movements}',coalesce((select jsonb_agg(e.value||jsonb_build_object(
    'recurringExpenseId',m.recurring_expense_id,'recurringMonth',to_char(m.recurring_month,'YYYY-MM')) order by e.ordinality)
    from jsonb_array_elements(result->'movements') with ordinality e(value,ordinality)
    join public.movements m on m.id=(e.value->>'id')::uuid),'[]'::jsonb));
  return result||jsonb_build_object('schemaVersion',7,
    'recurringExpenses',coalesce((select jsonb_agg(jsonb_build_object(
      'id',id,'description',description,'category',category,'amount',amount,'dueDay',due_day,
      'startMonth',to_char(start_month,'YYYY-MM'),'endMonth',coalesce(to_char(end_month,'YYYY-MM'),''),'version',version)
      order by created_at,id) from public.recurring_expenses),'[]'::jsonb),
    'registrationAccess',(select jsonb_build_object('token',token,'enabled',enabled) from public.registration_access where singleton));
end $$;
revoke all on function public.get_studio_state() from public,anon;
grant execute on function public.get_studio_state() to authenticated;

create or replace function public.apply_studio_action(p_type text,p_payload jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb; result jsonb; previous public.mutation_requests%rowtype; expense public.recurring_expenses%rowtype;
  month_value date; current_day date:=(now() at time zone 'America/Sao_Paulo')::date;
  student_id_value uuid; pending_student boolean; old_address text;
begin
  if not public.is_studio_admin() then raise exception 'Acesso restrito à administração do studio.' using errcode='42501'; end if;
  if p_request_id is null or p_payload is null then raise exception 'Solicitação inválida.' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select * into previous from public.mutation_requests where id=p_request_id;
  if found then
    if previous.actor<>auth.uid() or previous.kind<>p_type or previous.payload_hash<>md5(p_payload::text) then
      raise exception 'Identificador de solicitação já utilizado.' using errcode='22023';
    end if;
    return public.get_studio_state();
  end if;
  if p_type in ('save_recurring_expense','pay_recurring_expense','set_registration_access') then
    insert into public.mutation_requests(id,actor,kind,payload_hash) values(p_request_id,auth.uid(),p_type,md5(p_payload::text));
    case p_type
    when 'save_recurring_expense' then
      v:=p_payload->'expense';
      if coalesce(v->>'startMonth','') !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' or
        (coalesce(v->>'endMonth','')<>'' and v->>'endMonth' !~ '^[0-9]{4}-(0[1-9]|1[0-2])$') then
        raise exception 'Competência inválida.' using errcode='22023';
      end if;
      select * into expense from public.recurring_expenses where id=(v->>'id')::uuid for update;
      if found and coalesce((v->>'version')::bigint,-1)<>expense.version then
        raise exception 'A despesa foi alterada em outra sessão. Atualize antes de editar.' using errcode='22023';
      end if;
      insert into public.recurring_expenses(id,description,category,amount,due_day,start_month,end_month)
      values((v->>'id')::uuid,trim(v->>'description'),v->>'category',(v->>'amount')::numeric,(v->>'dueDay')::smallint,
        ((v->>'startMonth')||'-01')::date,case when coalesce(v->>'endMonth','')<>'' then ((v->>'endMonth')||'-01')::date end)
      on conflict(id) do update set description=excluded.description,category=excluded.category,amount=excluded.amount,
        due_day=excluded.due_day,start_month=excluded.start_month,end_month=excluded.end_month,version=public.recurring_expenses.version+1;
    when 'pay_recurring_expense' then
      if coalesce(p_payload->>'month','') !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Competência inválida.' using errcode='22023'; end if;
      month_value:=((p_payload->>'month')||'-01')::date;
      select * into expense from public.recurring_expenses where id=(p_payload->>'id')::uuid for update;
      if not found or month_value<expense.start_month or month_value>expense.end_month then
        raise exception 'Despesa fixa não prevista nesta competência.' using errcode='22023';
      end if;
      if (p_payload->>'date')::date is null or (p_payload->>'date')::date>current_day then
        raise exception 'Informe a data em que o pagamento foi realizado.' using errcode='22023';
      end if;
      if exists(select 1 from public.movements where recurring_expense_id=expense.id and recurring_month=month_value) then
        raise exception 'Esta despesa já foi paga nesta competência.' using errcode='22023';
      end if;
      insert into public.movements(occurred_on,description,category,kind,amount,created_by,recurring_expense_id,recurring_month)
      values((p_payload->>'date')::date,expense.description,expense.category,'expense',(p_payload->>'amount')::numeric,auth.uid(),expense.id,month_value);
    when 'set_registration_access' then
      update public.registration_access set enabled=coalesce((p_payload->>'enabled')::boolean,enabled),
        token=case when coalesce((p_payload->>'rotate')::boolean,false) then gen_random_uuid() else token end where singleton;
    end case;
  else
    if p_type in ('save_student','set_student_active') then
      perform pg_advisory_xact_lock(784201);
      student_id_value:=case when p_type='save_student' then (p_payload->'student'->>'id')::uuid else (p_payload->>'id')::uuid end;
      select registration_pending,address into pending_student,old_address from public.students where id=student_id_value;
    end if;
    result:=public._apply_studio_action_v4(p_type,p_payload,p_request_id);
    if p_type not in ('save_student','set_student_active') then return result; end if;
    if p_type='save_student' then
      v:=p_payload->'student';
      if v ? 'addressFields' and v->'addressFields'<>'null'::jsonb then
        if not public.valid_student_address(v->'addressFields') then raise exception 'Revise os campos do endereço.' using errcode='22023'; end if;
        update public.students set address_fields=v->'addressFields',address=public.format_student_address(v->'addressFields') where id=student_id_value;
      elsif old_address is distinct from v->>'address' then
        update public.students set address_fields=null where id=student_id_value;
      end if;
    end if;
    if p_type in ('save_student','set_student_active') and coalesce(pending_student,false)
      and exists(select 1 from public.students where id=student_id_value and active) then
      update public.students set registration_pending=false where id=student_id_value;
      month_value:=date_trunc('month',current_day)::date;
      insert into public.bills(student_id,month,amount,due_date)
      select s.id,month_value,p.monthly_price,month_value+s.due_day-1 from public.students s
        join public.plans p on p.days=s.plan_days where s.id=student_id_value and s.start_date<=(month_value+interval '1 month - 1 day')::date
      on conflict(student_id,month) do nothing;
    end if;
  end if;
  return public.get_studio_state();
end $$;
revoke all on function public.apply_studio_action(text,jsonb,uuid) from public,anon;
grant execute on function public.apply_studio_action(text,jsonb,uuid) to authenticated;

create or replace function public.get_public_registration_config(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not exists(select 1 from public.registration_access where singleton and enabled and token=p_token) then
    raise exception 'Link de cadastro indisponível. Solicite um novo link ao studio.' using errcode='22023';
  end if;
  return (select jsonb_build_object('name',name,'open',to_char(opens_at,'HH24:MI'),'close',to_char(closes_at,'HH24:MI'),
    'plans',(select jsonb_agg(jsonb_build_object('days',days,'monthlyPrice',monthly_price) order by days) from public.plans where days between 2 and 5))
    from public.studio_settings where singleton);
end $$;

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
  if (p_student-array['name','birth','cpf','phone','email','addressFields','emergency','plan','days','times','consent'])<>'{}'::jsonb
    or exists(select 1 from jsonb_each(p_student) e where e.key=any(array['name','birth','cpf','phone','email','emergency']) and jsonb_typeof(e.value)<>'string')
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
    or coalesce(p_student->>'plan','') !~ '^[2-5]$' then raise exception 'Confira o plano e os horários de preferência.' using errcode='22023'; end if;
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
  insert into public.students(name,birth,cpf,phone,email,address,address_fields,emergency,start_date,active,plan_days,due_day,registration_pending)
  values(trim(p_student->>'name'),(p_student->>'birth')::date,p_student->>'cpf',p_student->>'phone',coalesce(p_student->>'email',''),
    public.format_student_address(p_student->'addressFields'),p_student->'addressFields',coalesce(p_student->>'emergency',''),
    current_day,false,n,10,true)
  on conflict(cpf) do nothing returning id into student_id_value;
  if student_id_value is not null then
    for d in select value from jsonb_array_elements(p_student->'days') loop
      insert into public.student_schedule values(student_id_value,(d#>>'{}')::smallint,(p_student->'times'->>(d#>>'{}'))::time);
    end loop;
  end if;
  -- A mesma confirmação é usada para CPF já cadastrado; nunca expõe nem altera dados existentes.
  return jsonb_build_object('received',true);
end $$;
revoke all on function public.get_public_registration_config(uuid),public.submit_student_registration(uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.get_public_registration_config(uuid),public.submit_student_registration(uuid,jsonb,uuid) to anon,authenticated;
commit;

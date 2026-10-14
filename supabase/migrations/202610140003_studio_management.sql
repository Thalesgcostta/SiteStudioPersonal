-- Atualização de gestão. Execute depois de 001 e 002, com cadastros públicos de Auth desabilitados.
-- Preserva históricos; exames existentes ficam sem cobrança retroativa.
begin;
alter table public.studio_settings add column if not exists max_per_slot integer not null default 4 check(max_per_slot between 1 and 50);
alter table public.studio_settings add column if not exists evaluation_price numeric(12,2) not null default 0 check(evaluation_price>=0);
alter table public.studio_settings add column if not exists dashboard_widgets jsonb not null default '[{"id":"students","visible":true,"size":"small"},{"id":"fees","visible":true,"size":"small"},{"id":"pending","visible":true,"size":"small"},{"id":"products","visible":true,"size":"small"},{"id":"bioimpedance","visible":true,"size":"small"},{"id":"result","visible":true,"size":"small"},{"id":"financialChart","visible":true,"size":"half"},{"id":"billStatus","visible":true,"size":"half"},{"id":"quickActions","visible":true,"size":"full"},{"id":"schedule","visible":true,"size":"half"},{"id":"attention","visible":true,"size":"half"},{"id":"institutional","visible":true,"size":"full"}]'::jsonb;
alter table public.evaluations add column if not exists charge numeric(12,2) not null default 0 check(charge>=0);
alter table public.products add column if not exists photo_path text;
create table if not exists public.product_categories(name text primary key check(length(trim(name)) between 2 and 40),created_at timestamptz not null default now());
insert into public.product_categories(name) select name from (values('Suplementos'),('Alimentos'),('Acessórios')) defaults(name) where not exists(select 1 from public.product_categories) on conflict do nothing;
insert into public.product_categories(name) select distinct category from public.products on conflict do nothing;
create unique index if not exists product_categories_normalized on public.product_categories(lower(trim(name)));
alter table public.products drop constraint if exists products_category_check;
do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.products'::regclass and conname='products_category_fkey') then alter table public.products add constraint products_category_fkey foreign key(category) references public.product_categories(name);end if;end $$;
create table if not exists public.evaluation_payments(
 id uuid primary key,evaluation_id uuid not null references public.evaluations(id),amount numeric(12,2) not null check(amount>0),paid_on date not null,
 method text not null check(method in('Pix','Dinheiro','Cartão de débito','Cartão de crédito')),note text not null default '',created_by uuid not null references auth.users(id),created_at timestamptz not null default now());
create index if not exists evaluation_payments_eval_idx on public.evaluation_payments(evaluation_id);
alter table public.product_categories enable row level security;
alter table public.evaluation_payments enable row level security;
revoke all on public.product_categories,public.evaluation_payments from anon,authenticated;
grant select on public.product_categories,public.evaluation_payments to authenticated;
drop policy if exists studio_admin_read on public.product_categories;
drop policy if exists studio_admin_read on public.evaluation_payments;
create policy studio_admin_read on public.product_categories for select to authenticated using((select public.is_studio_admin()));
create policy studio_admin_read on public.evaluation_payments for select to authenticated using((select public.is_studio_admin()));
create or replace function public.valid_dashboard_layout(layout jsonb) returns boolean language plpgsql immutable set search_path='' as $$
begin
 if jsonb_typeof(layout) is distinct from 'array' then return false;end if;
 if jsonb_array_length(layout)<>12 then return false;end if;
 return (select count(distinct item->>'id')=12 and bool_and(coalesce(
   item->>'id'=any(array['students','fees','pending','products','bioimpedance','result','financialChart','billStatus','quickActions','schedule','attention','institutional'])
   and jsonb_typeof(item->'visible')='boolean' and item->>'size'=any(array['small','half','full'])
   and ((item->>'size')<>'small' or item->>'id'=any(array['students','fees','pending','products','bioimpedance','result'])),false))
   from jsonb_array_elements(layout) item);
end $$;
revoke all on function public.valid_dashboard_layout(jsonb) from public,anon,authenticated;
create table if not exists public.dashboard_preferences(user_id uuid primary key references auth.users(id) on delete cascade,layout jsonb not null check(public.valid_dashboard_layout(layout)));
alter table public.dashboard_preferences enable row level security;
revoke all on public.dashboard_preferences from anon,authenticated;
grant select on public.dashboard_preferences to authenticated;
drop policy if exists own_dashboard_read on public.dashboard_preferences;
create policy own_dashboard_read on public.dashboard_preferences for select to authenticated using(user_id=(select auth.uid()) and (select public.is_studio_admin()));
-- Todos os usuários de Authentication são administradores, conforme o modelo atual.
-- Mantenha Allow new users to sign up DESABILITADO; contas são criadas no painel.
create or replace function public.grant_new_studio_admin() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.studio_admins(user_id) values(new.id) on conflict do nothing;return new;end $$;
revoke all on function public.grant_new_studio_admin() from public,anon,authenticated;
drop trigger if exists studio_user_is_admin on auth.users;
create trigger studio_user_is_admin after insert on auth.users for each row execute function public.grant_new_studio_admin();
insert into public.studio_admins(user_id) select id from auth.users on conflict do nothing;
create or replace function public.get_studio_state() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_studio_admin() then raise exception 'Acesso restrito à administração do studio.' using errcode='42501'; end if;
  return jsonb_build_object(
    'schemaVersion',3,'students',coalesce((select jsonb_agg(jsonb_build_object(
      'id',s.id,'name',s.name,'birth',s.birth,'cpf',s.cpf,'phone',s.phone,'email',s.email,
      'address',s.address,'emergency',s.emergency,'start',s.start_date,'active',s.active,
      'plan',s.plan_days,'due',s.due_day,'notes',s.notes,
      'days',coalesce((select jsonb_agg(weekday order by weekday) from public.student_schedule where student_id=s.id),'[]'::jsonb),
      'times',coalesce((select jsonb_object_agg(weekday::text,to_char(preference_time,'HH24:MI')) from public.student_schedule where student_id=s.id),'{}'::jsonb)
    ) order by s.created_at,s.id) from public.students s),'[]'::jsonb),
    'bills',coalesce((select jsonb_agg(jsonb_build_object(
      'id',b.id,'studentId',b.student_id,'month',to_char(b.month,'YYYY-MM'),'amount',b.amount,'due',b.due_date,
      'receipts',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'studentId',b.student_id,
        'month',to_char(b.month,'YYYY-MM'),'amount',r.amount,'date',r.paid_on,'method',r.method,
        'note',r.note,'attachment',r.attachment_name,'attachmentPath',r.attachment_path) order by r.created_at,r.id)
        from public.receipts r where r.bill_id=b.id),'[]'::jsonb)
    ) order by b.month desc,b.student_id) from public.bills b),'[]'::jsonb),
    'evaluations',coalesce((select jsonb_agg(jsonb_build_object('id',id,'studentId',student_id,
      'date',evaluated_on,'weight',weight,'height',height,'fat',fat,'muscle',muscle,
      'visceral',visceral,'water',water,'notes',notes,'charge',charge,
      'payments',coalesce((select jsonb_agg(jsonb_build_object('id',ep.id,'amount',ep.amount,'date',ep.paid_on,'method',ep.method,'note',ep.note) order by ep.created_at,ep.id) from public.evaluation_payments ep where ep.evaluation_id=public.evaluations.id),'[]'::jsonb)) order by evaluated_on,id) from public.evaluations),'[]'::jsonb),
    'appointments',coalesce((select jsonb_agg(jsonb_build_object('id',id,'studentId',student_id,
      'date',scheduled_on,'time',to_char(scheduled_at,'HH24:MI')) order by scheduled_on,scheduled_at) from public.appointments),'[]'::jsonb),
    'products',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'category',category,
      'price',price,'stock',stock,'variant',variant,'color',color,'version',version,'photoPath',photo_path) order by created_at,id) from public.products),'[]'::jsonb),
    'sales',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'date',s.sold_on,
      'studentId',coalesce(s.student_id::text,''),'discount',s.discount,'method',s.method,
      'items',coalesce((select jsonb_agg(jsonb_build_object('productId',product_id,'quantity',quantity,'price',price) order by product_id)
        from public.sale_items where sale_id=s.id),'[]'::jsonb)) order by s.sold_on,s.id) from public.sales s),'[]'::jsonb),
    'movements',coalesce((select jsonb_agg(jsonb_build_object('id',id,'date',occurred_on,
      'description',description,'category',category,'kind',kind,'amount',amount) order by occurred_on,id) from public.movements),'[]'::jsonb),
    'settings',(select jsonb_build_object('name',name,'professional',professional,'phone',phone,
      'email',email,'address',address,'open',to_char(opens_at,'HH24:MI'),'close',to_char(closes_at,'HH24:MI'),
      'methods',payment_methods,'logo',logo,'orange',orange,'blue',blue,
      'maxPerSlot',max_per_slot,'evaluationPrice',evaluation_price,
      'productCategories',(select jsonb_agg(name order by created_at,name) from public.product_categories),
      'dashboardWidgets',coalesce((select layout from public.dashboard_preferences where user_id=auth.uid()),dashboard_widgets),
      'planPrices',(select jsonb_agg(monthly_price order by days) from public.plans)) from public.studio_settings where singleton)
  );
end $$;
revoke all on function public.get_studio_state() from public,anon;
grant execute on function public.get_studio_state() to authenticated;

create or replace function public.apply_studio_action(p_type text,p_payload jsonb,p_request_id uuid)
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
    if found and coalesce((v->>'version')::bigint,-1)<>product.version then
      raise exception 'O produto foi alterado em outra sessão. Atualize o catálogo antes de editar.' using errcode='22023';
    end if;
    if v ? 'photoPath' and nullif(v->>'photoPath','') is not null and (v->>'photoPath') is distinct from product.photo_path and not starts_with(v->>'photoPath','products/'||auth.uid()::text||'/'||(v->>'id')||'/') then raise exception 'Caminho da foto inválido.' using errcode='22023'; end if;
    insert into public.products(id,name,category,price,stock,variant,color,photo_path)
    values((v->>'id')::uuid,trim(v->>'name'),v->>'category',(v->>'price')::numeric,(v->>'stock')::integer,coalesce(v->>'variant',''),v->>'color',case when v ? 'photoPath' then nullif(v->>'photoPath','') else product.photo_path end)
    on conflict(id) do update set name=excluded.name,category=excluded.category,price=excluded.price,
      stock=excluded.stock,variant=excluded.variant,color=excluded.color,photo_path=excluded.photo_path,version=public.products.version+1;
  when 'record_sale' then
    v:=p_payload->'sale'; sale_id_value:=(v->>'id')::uuid;
    if jsonb_typeof(v->'items') is distinct from 'array' then raise exception 'Carrinho inválido.' using errcode='22023'; end if;
    if jsonb_array_length(v->'items')=0 then raise exception 'Carrinho vazio.' using errcode='22023'; end if;
    if (v->>'date')::date>current_day then raise exception 'Venda não pode ter data futura.' using errcode='22023'; end if;
    if not (v->>'method'=any(settings.payment_methods)) then raise exception 'Forma de pagamento não habilitada.' using errcode='22023'; end if;
    -- Ordenação consistente dos bloqueios evita deadlocks entre carrinhos.
    for item in select value from jsonb_array_elements(v->'items') order by value->>'productId' loop
      select * into product from public.products where id=(item->>'productId')::uuid for update;
      if not found then raise exception 'Produto não encontrado.' using errcode='22023'; end if;
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
    if jsonb_array_length(v->'planPrices')<>5 then raise exception 'Informe os cinco planos.' using errcode='22023'; end if;
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
    for count_value in 1..5 loop
      update public.plans set monthly_price=(v->'planPrices'->>(count_value-1))::numeric where days=count_value;
    end loop;
  else raise exception 'Operação não permitida.' using errcode='22023';
  end case;
  return public.get_studio_state();
end $$;
revoke all on function public.apply_studio_action(text,jsonb,uuid) from public,anon;
grant execute on function public.apply_studio_action(text,jsonb,uuid) to authenticated;


insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('product-images','product-images',false,2097152,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists studio_product_images_read on storage.objects;
drop policy if exists studio_product_images_insert on storage.objects;
create policy studio_product_images_read on storage.objects for select to authenticated using(bucket_id='product-images' and (select public.is_studio_admin()));
create policy studio_product_images_insert on storage.objects for insert to authenticated with check(bucket_id='product-images' and (select public.is_studio_admin()) and (storage.foldername(name))[1]='products' and (storage.foldername(name))[2]=(select auth.uid())::text);
commit;

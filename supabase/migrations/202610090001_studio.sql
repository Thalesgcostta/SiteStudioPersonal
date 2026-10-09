-- Execute no SQL Editor do Supabase. Não contém usuários ou dados fictícios.
begin;

create table if not exists public.studio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.plans (
  days smallint primary key check (days between 1 and 5),
  monthly_price numeric(12,2) not null check (monthly_price > 0)
);
insert into public.plans values (1,160),(2,220),(3,280),(4,360),(5,420)
on conflict (days) do nothing;
create table if not exists public.studio_settings (
  singleton boolean primary key default true check (singleton),
  name text not null check (length(trim(name)) >= 3),
  professional text not null,
  phone text not null default '', email text not null default '',
  address text not null default '',
  opens_at time not null default '06:00', closes_at time not null default '20:00',
  payment_methods text[] not null default array['Pix','Dinheiro','Cartão de débito','Cartão de crédito'],
  logo text not null default '/logo.svg' check (octet_length(logo) <= 2000000),
  orange text not null default '#ff6800' check (orange ~ '^#[0-9a-fA-F]{6}$'),
  blue text not null default '#579aba' check (blue ~ '^#[0-9a-fA-F]{6}$'),
  check (opens_at < closes_at), check (cardinality(payment_methods) > 0),
  check (payment_methods <@ array['Pix','Dinheiro','Cartão de débito','Cartão de crédito'])
);
insert into public.studio_settings (name,professional)
values ('Katielle Faleiros','Profissional de Educação Física') on conflict do nothing;
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 3),
  birth date not null, cpf text not null unique check (cpf ~ '^[0-9]{11}$'),
  phone text not null check (length(regexp_replace(phone,'[^0-9]','','g')) between 10 and 13),
  email text not null default '', address text not null default '',
  emergency text not null default '', start_date date not null,
  active boolean not null default true, plan_days smallint not null references public.plans(days),
  due_day smallint not null check (due_day between 1 and 28), notes text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.student_schedule (
  student_id uuid not null references public.students(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 5), preference_time time not null,
  primary key (student_id,weekday)
);
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  month date not null check (extract(day from month)=1),
  amount numeric(12,2) not null check (amount>0), due_date date not null,
  unique (student_id,month), check (date_trunc('month',due_date)::date=month),
  created_at timestamptz not null default now()
);
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(), bill_id uuid not null references public.bills(id),
  amount numeric(12,2) not null check (amount>0), paid_on date not null,
  method text not null check (method in ('Pix','Dinheiro','Cartão de débito','Cartão de crédito')),
  note text not null default '', attachment_name text not null default '', attachment_path text,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create index if not exists receipts_bill_idx on public.receipts(bill_id);
create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id),
  evaluated_on date not null, weight numeric(6,2) not null check (weight between 1 and 400),
  height numeric(4,2) not null check (height between 0.5 and 2.5),
  fat numeric(5,2) not null check (fat between 0 and 75),
  muscle numeric(6,2) not null check (muscle between 0 and 200 and muscle<=weight),
  visceral numeric(4,1) not null check (visceral between 1 and 60),
  water numeric(5,2) not null check (water between 0 and 100), notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists evaluations_student_idx on public.evaluations(student_id,evaluated_on);
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id),
  scheduled_on date not null, scheduled_at time not null,
  unique (scheduled_on,scheduled_at), created_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(), name text not null check (length(trim(name))>=3),
  category text not null check (category in ('Suplementos','Alimentos','Acessórios')),
  price numeric(12,2) not null check (price>0), stock integer not null check (stock>=0),
  variant text not null default '', color text not null default '#579aba' check (color ~ '^#[0-9a-fA-F]{6}$'),
  version bigint not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(), sold_on date not null,
  student_id uuid references public.students(id), discount numeric(12,2) not null check (discount>=0),
  subtotal numeric(12,2) not null check (subtotal>=discount),
  total numeric(12,2) generated always as (subtotal-discount) stored,
  method text not null check (method in ('Pix','Dinheiro','Cartão de débito','Cartão de crédito')),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.sale_items (
  sale_id uuid not null references public.sales(id), product_id uuid not null references public.products(id),
  quantity integer not null check (quantity>0), price numeric(12,2) not null check (price>0),
  primary key (sale_id,product_id)
);
create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(), occurred_on date not null,
  description text not null check (length(trim(description))>=3), category text not null,
  kind text not null check (kind in ('income','expense')), amount numeric(12,2) not null check (amount>0),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  check (category in ('Aluguel','Energia','Água','Manutenção','Mercadorias','Outras despesas','Outras receitas')),
  check ((kind='income' and category='Outras receitas') or (kind='expense' and category<>'Outras receitas'))
);
create table if not exists public.mutation_requests (
  id uuid primary key, actor uuid not null references auth.users(id), kind text not null,
  payload_hash text not null, created_at timestamptz not null default now()
);

create or replace function public.is_studio_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.studio_admins where user_id=auth.uid());
$$;
revoke all on function public.is_studio_admin() from public,anon;
grant execute on function public.is_studio_admin() to authenticated;

-- O navegador só lê as tabelas autorizadas. Escritas passam por RPCs transacionais.
do $$ declare t text; begin
  foreach t in array array['studio_admins','plans','studio_settings','students','student_schedule','bills','receipts','evaluations','appointments','products','sales','sale_items','movements','mutation_requests'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on table public.%I from anon,authenticated',t);
    execute format('drop policy if exists studio_admin_read on public.%I',t);
    if t not in ('studio_admins','mutation_requests') then
      execute format('grant select on table public.%I to authenticated',t);
      execute format('create policy studio_admin_read on public.%I for select to authenticated using ((select public.is_studio_admin()))',t);
    end if;
  end loop;
end $$;

create or replace function public.get_studio_state() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_studio_admin() then raise exception 'Acesso restrito à administração do studio.' using errcode='42501'; end if;
  return jsonb_build_object(
    'students',coalesce((select jsonb_agg(jsonb_build_object(
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
      'visceral',visceral,'water',water,'notes',notes) order by evaluated_on,id) from public.evaluations),'[]'::jsonb),
    'appointments',coalesce((select jsonb_agg(jsonb_build_object('id',id,'studentId',student_id,
      'date',scheduled_on,'time',to_char(scheduled_at,'HH24:MI')) order by scheduled_on,scheduled_at) from public.appointments),'[]'::jsonb),
    'products',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'category',category,
      'price',price,'stock',stock,'variant',variant,'color',color,'version',version) order by created_at,id) from public.products),'[]'::jsonb),
    'sales',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'date',s.sold_on,
      'studentId',coalesce(s.student_id::text,''),'discount',s.discount,'method',s.method,
      'items',coalesce((select jsonb_agg(jsonb_build_object('productId',product_id,'quantity',quantity,'price',price) order by product_id)
        from public.sale_items where sale_id=s.id),'[]'::jsonb)) order by s.sold_on,s.id) from public.sales s),'[]'::jsonb),
    'movements',coalesce((select jsonb_agg(jsonb_build_object('id',id,'date',occurred_on,
      'description',description,'category',category,'kind',kind,'amount',amount) order by occurred_on,id) from public.movements),'[]'::jsonb),
    'settings',(select jsonb_build_object('name',name,'professional',professional,'phone',phone,
      'email',email,'address',address,'open',to_char(opens_at,'HH24:MI'),'close',to_char(closes_at,'HH24:MI'),
      'methods',payment_methods,'logo',logo,'orange',orange,'blue',blue,
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
      insert into public.student_schedule values(student_id_value,(day_value#>>'{}')::smallint,(v->'times'->>(day_value#>>'{}'))::time);
    end loop;
    if not existed and (v->>'active')::boolean and (v->>'start')::date <= (date_trunc('month',current_day)+interval '1 month - 1 day')::date then
      month_value:=date_trunc('month',current_day)::date;
      insert into public.bills(student_id,month,amount,due_date)
      select student_id_value,month_value,monthly_price,month_value+((v->>'due')::integer-1)
      from public.plans where days=(v->>'plan')::smallint on conflict(student_id,month) do nothing;
    end if;
  when 'set_student_active' then
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
    insert into public.evaluations(id,student_id,evaluated_on,weight,height,fat,muscle,visceral,water,notes)
    values((v->>'id')::uuid,(v->>'studentId')::uuid,(v->>'date')::date,(v->>'weight')::numeric,
      (v->>'height')::numeric,(v->>'fat')::numeric,(v->>'muscle')::numeric,(v->>'visceral')::numeric,
      (v->>'water')::numeric,coalesce(v->>'notes',''));
    delete from public.appointments where student_id=(v->>'studentId')::uuid and scheduled_on=(v->>'date')::date;
  when 'delete_evaluation' then
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
    insert into public.products(id,name,category,price,stock,variant,color)
    values((v->>'id')::uuid,trim(v->>'name'),v->>'category',(v->>'price')::numeric,(v->>'stock')::integer,coalesce(v->>'variant',''),v->>'color')
    on conflict(id) do update set name=excluded.name,category=excluded.category,price=excluded.price,
      stock=excluded.stock,variant=excluded.variant,color=excluded.color,version=public.products.version+1;
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
  when 'save_settings' then
    v:=p_payload->'settings';
    if jsonb_array_length(v->'planPrices')<>5 then raise exception 'Informe os cinco planos.' using errcode='22023'; end if;
    update public.studio_settings set name=trim(v->>'name'),professional=v->>'professional',phone=v->>'phone',
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
commit;

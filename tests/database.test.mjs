import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

// PostgreSQL real em WebAssembly. Apenas auth.uid() e os papéis do Supabase
// são simulados; schema, funções, constraints, RLS e transações são executados.
let db;
const admin = "11111111-1111-4111-8111-111111111111";
const outsider = "22222222-2222-4222-8222-222222222222";
let today, month;
const student = () => ({
  id: randomUUID(),
  name: "Aluno de teste",
  birth: "1995-05-15",
  cpf: "12345678901",
  phone: "(16) 99999-1234",
  email: "aluno@exemplo.com",
  address: "",
  emergency: "",
  start: today,
  active: true,
  plan: 3,
  days: [0, 2, 4],
  times: { 0: "07:00", 2: "07:00", 4: "07:00" },
  due: 10,
  notes: "",
});
async function role(user = admin) {
  await db.exec("reset role; set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
}
async function state() {
  return (await db.query("select public.get_studio_state() as data")).rows[0]
    .data;
}
async function action(type, payload, requestId = randomUUID()) {
  return (
    await db.query(
      "select public.apply_studio_action($1,$2::jsonb,$3::uuid) as data",
      [type, JSON.stringify(payload), requestId],
    )
  ).rows[0].data;
}
async function createStudent() {
  const s = student();
  const store = await action("save_student", { student: s });
  return { s, store, bill: store.bills[0] };
}
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
    insert into auth.users values('${admin}'),('${outsider}');
    create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;
    grant select,insert on storage.objects to anon,authenticated;
    create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;`);
  const sql = await readFile(
    new URL("../supabase/migrations/202610090001_studio.sql", import.meta.url),
    "utf8",
  );
  const storage = await readFile(
    new URL(
      "../supabase/migrations/202610090002_private_storage.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(sql);
  await db.exec(storage);
  // Repetir a instalação mantém dados e não duplica os planos/políticas.
  await db.exec(sql);
  await db.exec(storage);
  await db.query("insert into public.studio_admins(user_id) values($1)", [
    admin,
  ]);
  ({ today, month } = (
    await db.query(
      "select to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM-DD') as today,to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM') as month",
    )
  ).rows[0]);
});
beforeEach(async () => {
  await db.exec(
    "reset role;truncate public.students,public.products,public.movements,public.mutation_requests cascade;update public.plans set monthly_price=case days when 1 then 160 when 2 then 220 when 3 then 280 when 4 then 360 else 420 end;",
  );
  await role();
});
after(async () => {
  await db?.close();
});

test("migrações criam banco vazio com planos e configurações, sem exemplos", async () => {
  const s = await state();
  assert.deepEqual(s.students, []);
  assert.deepEqual(s.products, []);
  assert.deepEqual(s.bills, []);
  assert.deepEqual(s.settings.planPrices, [160, 220, 280, 360, 420]);
});
test("anônimo não consegue consultar ou alterar dados", async () => {
  await db.exec("reset role;set role anon");
  await assert.rejects(() => state(), /permission denied/);
  await assert.rejects(
    () => db.query("select * from public.students"),
    /permission denied/,
  );
  await assert.rejects(
    () => action("generate_bills", { month }),
    /permission denied/,
  );
});
test("usuário autenticado sem concessão administrativa não acessa registros nem vira admin", async () => {
  await createStudent();
  await role(outsider);
  assert.equal(
    (await db.query("select * from public.students")).rows.length,
    0,
  );
  await assert.rejects(() => state(), /Acesso restrito/);
  await assert.rejects(
    () => action("generate_bills", { month }),
    /Acesso restrito/,
  );
  await assert.rejects(
    () =>
      db.query("insert into public.studio_admins(user_id) values($1)", [
        outsider,
      ]),
    /permission denied/,
  );
});
test("administrador também não escreve diretamente nas tabelas", async () => {
  await assert.rejects(
    () => db.query("update public.plans set monthly_price=1"),
    /permission denied/,
  );
});
test("cadastro cria preferências e uma cobrança; atualização mantém histórico", async () => {
  const { s, store } = await createStudent();
  assert.equal(store.students[0].plan, 3);
  assert.deepEqual(store.students[0].days, [0, 2, 4]);
  assert.equal(store.bills[0].amount, 280);
  const updated = await action("save_student", {
    student: { ...s, name: "Nome atualizado", plan: 1, days: [0] },
  });
  assert.equal(updated.students[0].name, "Nome atualizado");
  assert.equal(updated.bills.length, 1);
  assert.equal(updated.bills[0].amount, 280);
});
test("dias inconsistentes rejeitam o cadastro e revertem a transação", async () => {
  await assert.rejects(
    () => action("save_student", { student: { ...student(), days: [0] } }),
    /quantidade de dias/,
  );
  assert.equal((await state()).students.length, 0);
});
test("CPF duplicado não cria aluno nem cobrança extra", async () => {
  await createStudent();
  await assert.rejects(
    () => action("save_student", { student: student() }),
    /duplicate key/,
  );
  const s = await state();
  assert.equal(s.students.length, 1);
  assert.equal(s.bills.length, 1);
});
test("mensalidades mensais são idempotentes e excluem inativos e início futuro", async () => {
  const { s } = await createStudent();
  await action("generate_bills", { month });
  await action("generate_bills", { month });
  assert.equal((await state()).bills.length, 1);
  const future = (
    await db.query(
      "select to_char((now() at time zone 'America/Sao_Paulo')+interval '2 months','YYYY-MM-DD') as day",
    )
  ).rows[0].day;
  await action("save_student", {
    student: { ...student(), cpf: "98765432100", start: future },
  });
  await action("generate_bills", { month });
  assert.equal((await state()).bills.length, 1);
  const next = (
    await db.query(
      "select to_char((now() at time zone 'America/Sao_Paulo')+interval '1 month','YYYY-MM') as month",
    )
  ).rows[0].month;
  await action("set_student_active", { id: s.id, active: false });
  await action("generate_bills", { month: next });
  assert.equal((await state()).bills.length, 1);
});
test("edição desatualizada não desfaz uma venda nem devolve estoque", async () => {
  const p = {
    id: randomUUID(),
    name: "Creatina teste",
    category: "Suplementos",
    price: 90,
    stock: 5,
    variant: "300 g",
    color: "#579aba",
  };
  const original = (await action("save_product", { product: p })).products[0];
  await action("record_sale", {
    sale: {
      id: randomUUID(),
      date: today,
      studentId: "",
      items: [{ productId: p.id, quantity: 1, price: 90 }],
      discount: 0,
      method: "Pix",
    },
  });
  await assert.rejects(
    () =>
      action("save_product", {
        product: { ...original, name: "Nome alterado" },
      }),
    /outra sessão/,
  );
  const current = (await state()).products[0];
  assert.equal(current.stock, 4);
  const result = await action("save_product", {
    product: { ...current, name: "Nome alterado", stock: 6 },
  });
  assert.equal(result.products[0].stock, 6);
  assert.equal(result.products[0].version, 2);
});
test("payloads incompletos não criam aluno sem dias nem venda sem itens", async () => {
  const s = student();
  delete s.days;
  await assert.rejects(
    () => action("save_student", { student: s }),
    /dias do plano/,
  );
  await assert.rejects(
    () =>
      action("record_sale", {
        sale: { id: randomUUID(), date: today, discount: 0, method: "Pix" },
      }),
    /Carrinho inválido/,
  );
  const store = await state();
  assert.equal(store.students.length, 0);
  assert.equal(store.sales.length, 0);
});
test("recebimento parcial persiste, repetição não duplica, excesso é rejeitado", async () => {
  const { bill } = await createStudent();
  const receipt = {
    id: randomUUID(),
    amount: 100,
    date: today,
    method: "Pix",
    note: "",
    attachment: "",
  };
  const id = randomUUID();
  const payload = { billId: bill.id, receipt };
  await action("record_payment", payload, id);
  await action("record_payment", payload, id);
  assert.equal((await state()).bills[0].receipts.length, 1);
  await assert.rejects(
    () =>
      action("record_payment", {
        billId: bill.id,
        receipt: { ...receipt, id: randomUUID(), amount: 181 },
      }),
    /maior que o saldo/,
  );
  const result = await action("record_payment", {
    billId: bill.id,
    receipt: { ...receipt, id: randomUUID(), amount: 180 },
  });
  assert.equal(
    result.bills[0].receipts.reduce((a, r) => a + r.amount, 0),
    280,
  );
});
test("mesmo identificador não aceita outro payload e não muda o recebimento", async () => {
  const { bill } = await createStudent();
  const id = randomUUID();
  const payload = {
    billId: bill.id,
    receipt: { id: randomUUID(), amount: 100, date: today, method: "Pix" },
  };
  await action("record_payment", payload, id);
  await assert.rejects(
    () =>
      action(
        "record_payment",
        { ...payload, receipt: { ...payload.receipt, amount: 200 } },
        id,
      ),
    /já utilizado/,
  );
  assert.equal((await state()).bills[0].receipts[0].amount, 100);
});
test("venda confirma preço, baixa estoque e mantém histórico em uma transação", async () => {
  const p = {
    id: randomUUID(),
    name: "Whey de teste",
    category: "Suplementos",
    price: 150,
    stock: 3,
    variant: "900 g",
    color: "#579aba",
  };
  await action("save_product", { product: p });
  const sale = {
    id: randomUUID(),
    date: today,
    studentId: "",
    items: [{ productId: p.id, quantity: 2, price: 150 }],
    discount: 10,
    method: "Pix",
  };
  const request = randomUUID();
  const result = await action("record_sale", { sale }, request);
  assert.equal(result.products[0].stock, 1);
  assert.equal(result.sales[0].items[0].price, 150);
  await action("record_sale", { sale }, request);
  assert.equal((await state()).products[0].stock, 1);
  await assert.rejects(
    () => action("record_sale", { sale: { ...sale, id: randomUUID() } }),
    /Estoque insuficiente/,
  );
  assert.equal((await state()).sales.length, 1);
  await assert.rejects(
    () =>
      action("record_sale", {
        sale: {
          ...sale,
          id: randomUUID(),
          items: [{ productId: p.id, quantity: 1, price: 1 }],
        },
      }),
    /preço.*mudou/,
  );
  assert.equal((await state()).products[0].stock, 1);
});
test("agendamento, avaliação e exclusão são persistidos com validação", async () => {
  const { s } = await createStudent();
  const a = { id: randomUUID(), studentId: s.id, date: today, time: "09:00" };
  await action("save_appointment", { appointment: a });
  await assert.rejects(
    () =>
      action("save_appointment", { appointment: { ...a, id: randomUUID() } }),
    /duplicate key/,
  );
  const e = {
    id: randomUUID(),
    studentId: s.id,
    date: today,
    weight: 70,
    height: 1.7,
    fat: 25,
    muscle: 30,
    visceral: 8,
    water: 55,
    notes: "",
  };
  const result = await action("record_evaluation", { evaluation: e });
  assert.equal(result.evaluations.length, 1);
  assert.equal(result.appointments.length, 0);
  await action("delete_evaluation", { id: e.id });
  assert.equal((await state()).evaluations.length, 0);
});
test("despesa e configuração persistem sem alterar cobranças emitidas", async () => {
  const { store } = await createStudent();
  const m = {
    id: randomUUID(),
    date: today,
    description: "Aluguel do studio",
    category: "Aluguel",
    kind: "expense",
    amount: 850,
  };
  await action("record_movement", { movement: m });
  const settings = {
    ...store.settings,
    phone: "(16) 99999-0000",
    planPrices: [170, 230, 290, 370, 430],
  };
  const result = await action("save_settings", { settings });
  assert.deepEqual(result.settings.planPrices, settings.planPrices);
  assert.equal(result.bills[0].amount, 280);
  assert.equal(result.movements[0].amount, 850);
  await action("delete_movement", { id: m.id });
  assert.equal((await state()).movements.length, 0);
});
test("comprovante privado exige administrador e pasta própria; não é público", async () => {
  await db.exec("reset role");
  assert.equal(
    (
      await db.query(
        "select public from storage.buckets where id='studio-documents'",
      )
    ).rows[0]?.public,
    false,
  );
  await role();
  await db.query("insert into storage.objects(bucket_id,name) values($1,$2)", [
    "studio-documents",
    `receipts/${admin}/arquivo.pdf`,
  ]);
  await assert.rejects(
    () =>
      db.query("insert into storage.objects(bucket_id,name) values($1,$2)", [
        "studio-documents",
        `receipts/${outsider}/arquivo.pdf`,
      ]),
    /row-level security/,
  );
  await role(outsider);
  assert.equal(
    (await db.query("select * from storage.objects")).rows.length,
    0,
  );
  await db.exec("reset role;set role anon");
  assert.equal(
    (await db.query("select * from storage.objects")).rows.length,
    0,
  );
});

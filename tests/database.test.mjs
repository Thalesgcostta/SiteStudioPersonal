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
let today, month, legacySnapshot, legacyProductSnapshot;
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
  const management = await readFile(
    new URL(
      "../supabase/migrations/202610140003_studio_management.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.query(
    "insert into public.students(id,name,birth,cpf,phone,start_date,plan_days,due_day) values($1,'Cadastro anterior','1990-05-15','99887766554','16999991234','2026-09-01',3,10)",
    [admin],
  );
  await db.query(
    "insert into public.bills(id,student_id,month,amount,due_date) values($1,$2,'2026-09-01',280,'2026-09-10')",
    [outsider, admin],
  );
  await db.query(
    "insert into public.receipts(id,bill_id,amount,paid_on,method,created_by) values($1,$2,100,'2026-09-10','Pix',$3)",
    [randomUUID(), outsider, admin],
  );
  await db.query(
    "insert into public.evaluations(id,student_id,evaluated_on,weight,height,fat,muscle,visceral,water,notes) values($1,$2,'2026-09-10',70,1.7,25,30,8,55,'Histórico anterior')",
    [randomUUID(), admin],
  );
  await db.exec(management);
  const inventory = await readFile(
    new URL(
      "../supabase/migrations/202610140004_product_inventory.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const legacyProductId = randomUUID();
  const legacySaleId = randomUUID();
  await db.query(
    "insert into public.products(id,name,category,price,stock,variant,color,photo_path,version) values($1,'Produto anterior','Suplementos',55,4,'300 g','#579aba','products/foto-anterior.png',7)",
    [legacyProductId],
  );
  await db.query(
    "insert into public.sales(id,sold_on,discount,subtotal,method,created_by) values($1,'2026-09-10',0,110,'Pix',$2)",
    [legacySaleId, admin],
  );
  await db.query(
    "insert into public.sale_items(sale_id,product_id,quantity,price) values($1,$2,2,55)",
    [legacySaleId, legacyProductId],
  );
  await db.exec(inventory);
  legacyProductSnapshot = (
    await db.query(
      "select p.name,p.stock,p.photo_path,p.version,p.illustration,p.deleted_at,i.price,i.quantity,s.subtotal from public.products p join public.sale_items i on i.product_id=p.id join public.sales s on s.id=i.sale_id where p.id=$1",
      [legacyProductId],
    )
  ).rows[0];
  legacySnapshot = (
    await db.query(
      "select s.name,b.amount,r.amount as received,e.notes,e.charge from public.students s join public.bills b on b.student_id=s.id join public.receipts r on r.bill_id=b.id join public.evaluations e on e.student_id=s.id",
    )
  ).rows[0];
  // Repetir a instalação mantém dados e não duplica os planos/políticas.
  await db.exec(sql);
  await db.exec(storage);
  await db.exec(management);
  await db.exec(inventory);
  await db.query("delete from public.studio_admins where user_id=$1", [
    outsider,
  ]);
  await db.query(
    "insert into public.studio_admins(user_id) values($1) on conflict do nothing",
    [admin],
  );
  ({ today, month } = (
    await db.query(
      "select to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM-DD') as today,to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM') as month",
    )
  ).rows[0]);
});
beforeEach(async () => {
  await db.exec(
    "reset role;truncate public.students,public.products,public.movements,public.mutation_requests,public.dashboard_preferences cascade;update public.plans set monthly_price=case days when 1 then 160 when 2 then 220 when 3 then 280 when 4 then 360 else 420 end;",
  );
  await db.exec(
    "update public.studio_settings set evaluation_price=0,max_per_slot=4;",
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
      db.query(
        "insert into public.studio_admins(user_id) values($1) on conflict do nothing",
        [outsider],
      ),
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

test("usuário criado no Authentication recebe papel administrativo automaticamente", async () => {
  const id = randomUUID();
  await db.exec("reset role");
  await db.query("insert into auth.users(id) values($1)", [id]);
  await role(id);
  assert.equal((await state()).schemaVersion, 4);
});
test("capacidade bloqueia novos encaixes e reativação, mas preserva horários antigos", async () => {
  const first = student();
  let s = await action("save_student", { student: first });
  await action("save_settings", { settings: { ...s.settings, maxPerSlot: 1 } });
  const second = { ...student(), cpf: "98765432100" };
  await assert.rejects(
    () => action("save_student", { student: second }),
    /sem vagas/,
  );
  assert.equal((await state()).students.length, 1);
  await action("save_student", { student: { ...second, active: false } });
  await assert.rejects(
    () => action("set_student_active", { id: second.id, active: true }),
    /sem vagas/,
  );
  await action("save_student", {
    student: { ...first, name: "Nome corrigido" },
  });
  assert.equal((await state()).students[0].name, "Nome corrigido");
});
test("preço de exame gera cobrança, recebimentos parciais são atômicos e histórico não muda", async () => {
  const { s } = await createStudent();
  const initial = await state();
  await action("save_settings", {
    settings: { ...initial.settings, evaluationPrice: 80 },
  });
  const evaluation = {
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
    charge: 80,
  };
  let result = await action("record_evaluation", { evaluation });
  assert.equal(result.evaluations[0].charge, 80);
  assert.deepEqual(result.evaluations[0].payments, []);
  const payment = {
    id: randomUUID(),
    amount: 30,
    date: today,
    method: "Pix",
    note: "Parcial",
  };
  const request = randomUUID();
  await action(
    "record_evaluation_payment",
    { evaluationId: evaluation.id, payment },
    request,
  );
  await action(
    "record_evaluation_payment",
    { evaluationId: evaluation.id, payment },
    request,
  );
  await assert.rejects(
    () =>
      action("record_evaluation_payment", {
        evaluationId: evaluation.id,
        payment: { ...payment, id: randomUUID(), amount: 51 },
      }),
    /saldo do exame/,
  );
  await assert.rejects(
    () => action("delete_evaluation", { id: evaluation.id }),
    /recebimentos/,
  );
  result = await action("save_settings", {
    settings: { ...result.settings, evaluationPrice: 90 },
  });
  assert.equal(result.evaluations[0].charge, 80);
  assert.equal(result.evaluations[0].payments.length, 1);
  await assert.rejects(
    () =>
      action("record_evaluation", {
        evaluation: { ...evaluation, id: randomUUID() },
      }),
    /preço do exame mudou/,
  );
});
test("exame e pagamento imediato são uma transação sem duplicação por repetição", async () => {
  const { s } = await createStudent();
  let store = await state();
  await action("save_settings", {
    settings: { ...store.settings, evaluationPrice: 50 },
  });
  const evaluation = {
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
    charge: 50,
  };
  const payload = {
    evaluation,
    payment: {
      id: randomUUID(),
      amount: 50,
      date: today,
      method: "Pix",
      note: "",
    },
  };
  const id = randomUUID();
  await action("record_evaluation", payload, id);
  store = await action("record_evaluation", payload, id);
  assert.equal(store.evaluations.length, 1);
  assert.equal(store.evaluations[0].payments.length, 1);
  await assert.rejects(
    () =>
      action("record_evaluation", {
        ...payload,
        evaluation: { ...evaluation, id: randomUUID() },
        payment: { ...payload.payment, id: randomUUID(), amount: 51 },
      }),
    /saldo do exame/,
  );
  assert.equal((await state()).evaluations.length, 1);
});
test("categorias e fotos persistem e categorias em uso não podem ser removidas", async () => {
  const original = await state();
  await action("save_settings", {
    settings: {
      ...original.settings,
      productCategories: [...original.settings.productCategories, "Vestuário"],
    },
  });
  const product = {
    id: randomUUID(),
    name: "Camiseta do studio",
    category: "Vestuário",
    price: 70,
    stock: 5,
    variant: "M",
    color: "#579aba",
  };
  let store = await action("save_product", {
    product: {
      ...product,
      photoPath: `products/${admin}/${product.id}/foto.png`,
    },
  });
  assert.equal(store.products[0].category, "Vestuário");
  assert.match(store.products[0].photoPath, /foto.png$/);
  await assert.rejects(
    () =>
      action("save_settings", {
        settings: {
          ...store.settings,
          productCategories: original.settings.productCategories,
        },
      }),
    /em uso/,
  );
  await assert.rejects(
    () =>
      action("save_product", {
        product: {
          ...store.products[0],
          photoPath: `products/${outsider}/${product.id}/foto.png`,
        },
      }),
    /Caminho da foto/,
  );
  store = await action("save_product", {
    product: { ...store.products[0], photoPath: null },
  });
  assert.equal(store.products[0].photoPath, null);
});
test("Dashboard é individual, sem alterar preço e capacidade do studio", async () => {
  const original = await state();
  const widgets = original.settings.dashboardWidgets.map((w) => ({
    ...w,
    visible: w.id === "schedule",
    size: w.id === "schedule" ? "full" : w.size,
  }));
  let store = await action("save_dashboard", { widgets });
  assert.deepEqual(store.settings.dashboardWidgets, widgets);
  assert.equal(store.settings.maxPerSlot, 4);
  store = await action("save_settings", {
    settings: { ...store.settings, evaluationPrice: 33 },
  });
  const id = randomUUID();
  await db.exec("reset role");
  await db.query("insert into auth.users(id) values($1)", [id]);
  await role(id);
  assert.notDeepEqual((await state()).settings.dashboardWidgets, widgets);
  assert.equal(
    (await db.query("select * from public.dashboard_preferences")).rows.length,
    0,
  );
  await role();
  assert.deepEqual((await state()).settings.dashboardWidgets, widgets);
  await assert.rejects(
    () =>
      action("save_dashboard", {
        widgets: widgets.map((w) => ({ id: w.id, size: w.size })),
      }),
    /inválida/,
  );
});

test("bucket de fotos é privado e recusa escrita fora da pasta do administrador", async () => {
  await db.exec("reset role");
  const bucket = (
    await db.query(
      "select public,file_size_limit from storage.buckets where id='product-images'",
    )
  ).rows[0];
  assert.equal(bucket.public, false);
  assert.equal(Number(bucket.file_size_limit), 2097152);
  await role();
  await db.query("insert into storage.objects(bucket_id,name) values($1,$2)", [
    "product-images",
    `products/${admin}/${randomUUID()}/foto.png`,
  ]);
  await assert.rejects(
    () =>
      db.query("insert into storage.objects(bucket_id,name) values($1,$2)", [
        "product-images",
        `products/${outsider}/foto.png`,
      ]),
    /row-level security/,
  );
  await role(outsider);
  assert.equal(
    (
      await db.query(
        "select * from storage.objects where bucket_id='product-images'",
      )
    ).rows.length,
    0,
  );
});

test("migração preserva cadastros, cobrança e recebimento anteriores sem cobrar exames antigos", () => {
  assert.equal(legacySnapshot.name, "Cadastro anterior");
  assert.equal(Number(legacySnapshot.amount), 280);
  assert.equal(Number(legacySnapshot.received), 100);
  assert.equal(legacySnapshot.notes, "Histórico anterior");
  assert.equal(Number(legacySnapshot.charge), 0);
});

test("estoque e ilustração podem ser editados sem alterar valores das vendas anteriores", async () => {
  const initial = {
    id: randomUUID(),
    name: "Pré-treino teste",
    category: "Suplementos",
    price: 45,
    stock: 3,
    variant: "200 g",
    color: "#579aba",
    illustration: "pre-workout",
  };
  let store = await action("save_product", { product: initial });
  assert.equal(store.products[0].illustration, "pre-workout");
  await action("record_sale", {
    sale: {
      id: randomUUID(),
      date: today,
      studentId: "",
      discount: 0,
      method: "Pix",
      items: [{ productId: initial.id, quantity: 1, price: 45 }],
    },
  });
  const current = (await state()).products[0];
  store = await action("save_product", {
    product: {
      ...current,
      name: "Pré-treino atualizado",
      category: "Acessórios",
      price: 50,
      stock: 12,
      variant: "Novo lote",
      color: "#ff6800",
      illustration: "dumbbell",
    },
  });
  assert.equal(store.products[0].stock, 12);
  assert.equal(store.products[0].price, 50);
  assert.equal(store.products[0].category, "Acessórios");
  assert.equal(store.products[0].variant, "Novo lote");
  assert.equal(store.products[0].color, "#ff6800");
  assert.equal(store.products[0].illustration, "dumbbell");
  assert.equal(store.sales[0].items[0].price, 45);
  assert.equal(
    (await db.query("select subtotal from public.sales")).rows[0].subtotal,
    "45.00",
  );
  for (const invalid of [
    { stock: -1 },
    { stock: 1.5 },
    { illustration: "unknown" },
  ])
    await assert.rejects(() =>
      action("save_product", { product: { ...store.products[0], ...invalid } }),
    );
  assert.equal((await state()).products[0].stock, 12);
  const { illustration: _illustration, ...oldClientProduct } =
    store.products[0];
  store = await action("save_product", {
    product: { ...oldClientProduct, stock: 0 },
  });
  assert.equal(store.products[0].illustration, "dumbbell");
  assert.equal(store.products[0].stock, 0);
});

test("exclusão preserva vendas, é idempotente e impede venda ou reativação do produto", async () => {
  const original = (
    await action("save_product", {
      product: {
        id: randomUUID(),
        name: "Barra histórica",
        category: "Alimentos",
        price: 12,
        stock: 6,
        variant: "Chocolate",
        color: "#579aba",
        illustration: "protein-bar",
      },
    })
  ).products[0];
  const sale = {
    id: randomUUID(),
    date: today,
    studentId: "",
    discount: 0,
    method: "Pix",
    items: [{ productId: original.id, quantity: 2, price: 12 }],
  };
  await action("record_sale", { sale });
  await assert.rejects(
    () =>
      action("delete_product", { id: original.id, version: original.version }),
    /outra sessão/,
  );
  let store = await state();
  assert.equal(store.products[0].deletedAt, null);
  const current = store.products[0];
  await role(outsider);
  await assert.rejects(
    () =>
      action("delete_product", { id: current.id, version: current.version }),
    /Acesso restrito/,
  );
  await role();
  const requestId = randomUUID();
  const payload = { id: current.id, version: current.version };
  store = await action("delete_product", payload, requestId);
  const deleted = store.products[0];
  assert.ok(deleted.deletedAt);
  assert.equal(deleted.stock, 4);
  assert.equal(deleted.version, current.version + 1);
  assert.equal(deleted.name, "Barra histórica");
  assert.deepEqual(store.sales[0].items, sale.items);
  assert.equal(store.products.filter((p) => !p.deletedAt).length, 0);
  store = await action("delete_product", payload, requestId);
  assert.equal(store.products[0].deletedAt, deleted.deletedAt);
  assert.equal(store.products[0].version, deleted.version);
  await assert.rejects(
    () => action("record_sale", { sale: { ...sale, id: randomUUID() } }),
    /excluído/,
  );
  await assert.rejects(
    () => action("save_product", { product: { ...deleted, deletedAt: null } }),
    /excluído/,
  );
  await assert.rejects(
    () =>
      action("delete_product", { id: deleted.id, version: deleted.version }),
    /excluído/,
  );
  store = await state();
  assert.equal(store.sales.length, 1);
  assert.equal(store.products[0].stock, 4);
});

test("migração de estoque preserva produtos, fotos e vendas de versões anteriores", () => {
  assert.deepEqual(legacyProductSnapshot, {
    name: "Produto anterior",
    stock: 4,
    photo_path: "products/foto-anterior.png",
    version: 7,
    illustration: "category",
    deleted_at: null,
    price: "55.00",
    quantity: 2,
    subtotal: "110.00",
  });
});

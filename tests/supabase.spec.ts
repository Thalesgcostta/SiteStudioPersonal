import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
const backend = "http://127.0.0.1:59999";
const admin = "11111111-1111-4111-8111-111111111111";
const outsider = "22222222-2222-4222-8222-222222222222";
let db: PGlite;
let today: string;
const user = (id: string) => ({
  id,
  email: id === admin ? "admin@exemplo.com" : "sem-acesso@exemplo.com",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "email" },
  user_metadata: {
    full_name: id === admin ? "Thales Costa" : "Usuário revogado",
  },
  created_at: new Date().toISOString(),
});
const token = (id: string) =>
  [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    Buffer.from(
      JSON.stringify({
        sub: id,
        role: "authenticated",
        aud: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url"),
    "test-signature",
  ].join(".");
const session = (id: string) => ({
  access_token: token(id),
  refresh_token: "test-refresh",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: user(id),
});
async function action(type: string, payload: unknown) {
  return (
    await db.query<{ data: unknown }>(
      "select public.apply_studio_action($1,$2::jsonb,$3::uuid) as data",
      [type, JSON.stringify(payload), randomUUID()],
    )
  ).rows[0].data;
}
test.beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;insert into auth.users values('${admin}'),('${outsider}');`,
  );
  await db.exec(
    await readFile("supabase/migrations/202610090001_studio.sql", "utf8"),
  );
  await db.exec(
    `create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated,anon;grant select,insert on storage.objects to authenticated,anon;create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;`,
  );
  await db.exec(
    await readFile(
      "supabase/migrations/202610090002_private_storage.sql",
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      "supabase/migrations/202610140003_studio_management.sql",
      "utf8",
    ),
  );
  await db.query("delete from public.studio_admins where user_id=$1", [
    outsider,
  ]);
  today = (
    await db.query<{ today: string }>(
      "select to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM-DD') as today",
    )
  ).rows[0].today;
});
test.afterAll(async () => {
  await db.close();
});
test.beforeEach(async () => {
  await db.exec(
    "reset role;truncate public.students,public.products,public.movements,public.mutation_requests,public.dashboard_preferences cascade;update public.studio_settings set evaluation_price=0,max_per_slot=4;set role authenticated;",
  );
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    admin,
  ]);
});
async function mock(
  page: Page,
  {
    failLoad = false,
    legacy = false,
  }: { failLoad?: boolean; legacy?: boolean } = {},
) {
  let fullName = "Thales Costa";
  await page.route(backend + "/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "content-type": "application/json",
    };
    const respond = (body: unknown, status = 200) =>
      route.fulfill({ status, headers, body: JSON.stringify(body) });
    if (request.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (url.pathname === "/auth/v1/token") {
      const body = request.postDataJSON();
      if (body.password !== "SenhaDeTeste123!")
        return respond(
          { message: "Invalid login credentials", code: "invalid_credentials" },
          400,
        );
      return respond(
        session(body.email === "sem-acesso@exemplo.com" ? outsider : admin),
      );
    }
    if (url.pathname === "/auth/v1/logout") return respond({});
    if (url.pathname === "/auth/v1/recover") return respond({});
    if (
      url.pathname.startsWith("/storage/v1/object/sign/") &&
      request.method() === "GET"
    )
      return route.fulfill({
        status: 200,
        headers: { "content-type": "image/png" },
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    let id: string;
    try {
      id = JSON.parse(
        Buffer.from(
          request.headers().authorization.split(".")[1],
          "base64url",
        ).toString(),
      ).sub;
    } catch {
      return respond({ message: "JWT inválido" }, 401);
    }
    if (url.pathname === "/auth/v1/user") {
      if (request.method() === "PUT" && request.postDataJSON().data?.full_name)
        fullName = request.postDataJSON().data.full_name;
      return respond({
        ...user(id),
        user_metadata: {
          full_name: id === admin ? fullName : "Usuário revogado",
        },
      });
    }
    if (url.pathname.startsWith("/storage/v1/object/sign/"))
      return respond({
        signedURL:
          "/object/sign/" +
          url.pathname.slice("/storage/v1/object/sign/".length) +
          "?token=mock",
      });
    if (url.pathname.startsWith("/storage/v1/object/"))
      return respond({
        Key: url.pathname.slice("/storage/v1/object/".length),
        Id: randomUUID(),
      });
    if (url.pathname.startsWith("/rest/v1/rpc/")) {
      if (failLoad) return respond({ message: "Indisponível" }, 503);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      try {
        if (url.pathname.endsWith("/get_studio_state")) {
          const data = (
            await db.query<{ data: any }>(
              "select public.get_studio_state() as data",
            )
          ).rows[0].data;
          if (legacy) {
            delete data.schemaVersion;
            for (const field of [
              "maxPerSlot",
              "evaluationPrice",
              "productCategories",
              "dashboardWidgets",
            ])
              delete data.settings[field];
            for (const e of data.evaluations) {
              delete e.charge;
              delete e.payments;
            }
          }
          return respond(data);
        }
        const body = request.postDataJSON();
        return respond(
          (
            await db.query<{ data: unknown }>(
              "select public.apply_studio_action($1,$2::jsonb,$3::uuid) as data",
              [body.p_type, JSON.stringify(body.p_payload), body.p_request_id],
            )
          ).rows[0].data,
        );
      } catch (e) {
        const error = e as { message: string; code: string };
        return respond(
          { message: error.message, code: error.code },
          error.code === "42501" ? 403 : 400,
        );
      }
    }
    return respond({ message: "Endpoint inesperado" }, 404);
  });
}
async function login(page: Page, email = "admin@exemplo.com") {
  await page.goto("/");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("SenhaDeTeste123!");
  await page.getByRole("button", { name: "Entrar no studio" }).click();
}
async function addStudent(page: Page, withCep = false) {
  await page
    .getByRole("button", { name: "Cadastrar aluno", exact: true })
    .click();
  const d = page.getByRole("dialog");
  if (withCep) {
    await page.route("https://viacep.com.br/ws/01001000/json/", (route) =>
      route.fulfill({
        json: {
          logradouro: "Praça da Sé",
          bairro: "Sé",
          localidade: "São Paulo",
          uf: "SP",
        },
      }),
    );
    await d.getByLabel("CEP", { exact: true }).fill("01001000");
    await d.getByLabel("CEP", { exact: true }).press("Enter");
    await expect(d.getByLabel("Endereço", { exact: true })).toHaveValue(
      "Praça da Sé · Sé · São Paulo/SP · CEP 01001-000",
    );
    await d
      .getByLabel("Endereço", { exact: true })
      .fill("Praça da Sé, 42 · Sé · São Paulo/SP · CEP 01001-000");
  }
  await d.getByLabel("Nome completo *").fill("Alice do Banco");
  await d.getByLabel("Data de nascimento *").fill("1995-05-15");
  await d.getByLabel("CPF *", { exact: true }).fill("12345678901");
  await d.getByLabel("Telefone / WhatsApp *").fill("(16) 99999-1234");
  for (const day of ["Seg", "Qua", "Sex"])
    await d.getByRole("button", { name: new RegExp("^" + day) }).click();
  await d.getByRole("button", { name: "Cadastrar aluno", exact: true }).click();
  await expect(d).toHaveCount(0);
}

test("login exige credenciais e não importa a demonstração para o banco", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/");
  await expect(
    page.getByRole("navigation", { name: "Menu principal" }),
  ).toHaveCount(0);
  await page.getByLabel("E-mail", { exact: true }).fill("admin@exemplo.com");
  await page.getByLabel("Senha", { exact: true }).fill("incorreta");
  await page.getByRole("button", { name: "Entrar no studio" }).click();
  await expect(page.getByRole("alert")).toContainText("incorretos");
  await page.getByLabel("Senha", { exact: true }).fill("SenhaDeTeste123!");
  await page.getByRole("button", { name: "Entrar no studio" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Olá, Thales 👋",
  );
  await expect(page.locator(".metric").first()).toContainText("00");
  expect(
    await page.evaluate(() => localStorage.getItem("katielle-studio-demo-v1")),
  ).toBeNull();
});
test("cadastro e pagamento persistem no PostgreSQL e após recarregar; logout limpa a interface", async ({
  page,
}) => {
  await mock(page);
  await login(page);
  await addStudent(page, true);
  expect(
    (await db.query<{ address: string }>("select address from public.students"))
      .rows[0].address,
  ).toBe("Praça da Sé, 42 · Sé · São Paulo/SP · CEP 01001-000");
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Mensalidades", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Registrar pagamento", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Valor recebido *").fill("100");
  await d.getByRole("button", { name: "Confirmar pagamento" }).click();
  await expect(page.locator("tbody tr")).toContainText("Parcial");
  await page.reload();
  await expect(page.locator("tbody tr")).toContainText("R$ 100,00");
  expect((await db.query("select * from public.receipts")).rows).toHaveLength(
    1,
  );
  expect(
    await page.evaluate(() => localStorage.getItem("katielle-studio-demo-v1")),
  ).toBeNull();
  await page.getByRole("button", { name: "Menu do usuário" }).click();
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(
    page.getByRole("button", { name: "Entrar no studio" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Menu principal" }),
  ).toHaveCount(0);
});
test("falha de saldo no servidor mantém modal e não mostra sucesso falso", async ({
  page,
}) => {
  await mock(page);
  await login(page);
  await addStudent(page);
  await page
    .getByRole("button", { name: "Registrar pagamento", exact: true })
    .click();
  const bill = (await db.query<{ id: string }>("select id from public.bills"))
    .rows[0];
  await action("record_payment", {
    billId: bill.id,
    receipt: { id: randomUUID(), date: today, amount: 250, method: "Pix" },
  });
  const d = page.getByRole("dialog");
  await d.getByLabel("Valor recebido *").fill("100");
  await d.getByRole("button", { name: "Confirmar pagamento" }).click();
  await expect(d.getByRole("alert")).toContainText("maior que o saldo");
  await expect(d).toBeVisible();
  expect((await db.query("select * from public.receipts")).rows).toHaveLength(
    1,
  );
});
test("produto cadastrado e venda atualizam estoque e caixa no banco", async ({
  page,
}) => {
  await mock(page);
  await login(page);
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Vendas de produtos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cadastrar produto", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Nome do produto *").fill("Creatina real");
  await d.getByLabel("Preço (R$) *").fill("90");
  await d.getByLabel("Estoque disponível *").fill("5");
  await d.getByRole("button", { name: "Salvar produto" }).click();
  await expect(d).toHaveCount(0);
  await page.getByRole("button", { name: "Adicionar à venda" }).click();
  await page.getByRole("button", { name: "Finalizar venda" }).click();
  await expect(page.locator(".product-card")).toContainText("4 em estoque");
  expect(
    (await db.query<{ stock: number }>("select stock from public.products"))
      .rows[0].stock,
  ).toBe(4);
  expect(
    (await db.query<{ total: string }>("select total from public.sales"))
      .rows[0].total,
  ).toBe("90.00");
});
test("usuário sem autorização recebe bloqueio administrativo", async ({
  page,
}) => {
  await mock(page);
  await login(page, "sem-acesso@exemplo.com");
  await expect(page.getByRole("alert")).toContainText(
    "permissão administrativa",
  );
  await expect(
    page.getByRole("navigation", { name: "Menu principal" }),
  ).toHaveCount(0);
});
test("banco indisponível não cai silenciosamente no modo de demonstração", async ({
  page,
}) => {
  await mock(page, { failLoad: true });
  await login(page);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Menu principal" }),
  ).toHaveCount(0);
  await expect(page.getByText("Mariana Oliveira")).toHaveCount(0);
});
test("login responsivo mantém contraste, semântica e recuperação de senha", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/");
  const a11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(a11y.violations.map((v) => v.id)).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Esqueci minha senha" }).click();
  await page.getByLabel("E-mail", { exact: true }).fill("admin@exemplo.com");
  await page.getByRole("button", { name: "Enviar instruções" }).click();
  await expect(page.getByRole("status")).toContainText("instruções");
});
test("link de recuperação pede nova senha antes de abrir o studio", async ({
  page,
}) => {
  await mock(page);
  await page.goto(
    "/#access_token=" +
      token(admin) +
      "&refresh_token=test-refresh&token_type=bearer&expires_in=3600&type=recovery",
  );
  await expect(
    page.getByRole("heading", { name: "Defina sua nova senha" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Menu principal" }),
  ).toHaveCount(0);
  await page
    .getByLabel("Nova senha", { exact: true })
    .fill("NovaSenhaDeTeste123!");
  await page.getByLabel("Confirmar nova senha").fill("NovaSenhaDeTeste123!");
  const update = page.waitForRequest(
    (r) => r.url() === backend + "/auth/v1/user" && r.method() === "PUT",
  );
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  expect((await update).postDataJSON().password).toBe("NovaSenhaDeTeste123!");
  await expect(
    page.getByRole("heading", { name: "Olá, Thales 👋" }),
  ).toBeVisible();
});
test("comprovante é enviado pela sessão e vinculado ao pagamento no banco", async ({
  page,
}) => {
  await mock(page);
  await login(page);
  await addStudent(page);
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Mensalidades", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Registrar pagamento", exact: true })
    .first()
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Valor recebido *").fill("100");
  await d.locator("input[type=file]").setInputFiles({
    name: "recibo.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 test receipt"),
  });
  const upload = page.waitForRequest(
    (r) =>
      r.url().includes("/storage/v1/object/studio-documents/receipts/") &&
      r.method() === "POST",
  );
  await d.getByRole("button", { name: "Confirmar pagamento" }).click();
  const request = await upload;
  expect(request.headers().authorization).toContain("Bearer ");
  await expect(d).toHaveCount(0);
  const receipt = (
    await db.query<{ attachment_path: string; attachment_name: string }>(
      "select attachment_path,attachment_name from public.receipts",
    )
  ).rows[0];
  expect(receipt.attachment_path).toMatch(
    new RegExp("^receipts/" + admin + "/"),
  );
  expect(receipt.attachment_name).toBe("recibo.pdf");
});

async function navigate(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name, exact: true })
    .click();
}
async function configuration(page: Page, name: string) {
  await navigate(page, "Configurações");
  await page
    .getByRole("navigation", { name: "Seções de configurações" })
    .getByRole("button", { name, exact: true })
    .click();
}
test("perfil acompanha a conta e nome editado persiste após recarga", async ({
  page,
}) => {
  await mock(page);
  await login(page);
  await expect(page.locator(".sidebar-user")).toContainText("Thales Costa");
  await configuration(page, "Meu perfil");
  await page.getByLabel("Nome de exibição").fill("João Administrativo");
  await page
    .getByRole("button", { name: "Salvar perfil", exact: true })
    .click();
  await expect(page.locator(".sidebar-user")).toContainText(
    "João Administrativo",
  );
  await page.reload();
  await configuration(page, "Meu perfil");
  await expect(page.getByLabel("Nome de exibição")).toHaveValue(
    "João Administrativo",
  );
  await navigate(page, "Dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Olá, João 👋",
  );
});
test("preço configurado, pesquisa do aluno e exame recebido atualizam financeiro e gráfico", async ({
  page,
}) => {
  test.setTimeout(60000);
  await mock(page);
  await login(page);
  await addStudent(page);
  await configuration(page, "Horários e pagamentos");
  await page.getByLabel("Valor da bioimpedância (R$)").fill("80");
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(page.locator('.toast[role="status"]')).toContainText(
    "Configurações salvas",
  );
  await navigate(page, "Bioimpedância");
  await page.getByLabel("Pesquisar aluno", { exact: true }).fill("Alice");
  await page
    .getByLabel("Aluno", { exact: true })
    .selectOption({ label: "Alice do Banco" });
  await page
    .getByRole("button", { name: "Nova avaliação", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  for (const [label, value] of [
    ["Peso (kg) *", "70"],
    ["Altura (cm) *", "170"],
    ["Gordura corporal (%) *", "25"],
    ["Massa muscular (kg) *", "30"],
    ["Gordura visceral (nível) *", "8"],
    ["Água corporal (%) *", "55"],
  ])
    await dialog.getByLabel(label, { exact: true }).fill(value);
  await dialog
    .getByRole("button", { name: "Salvar avaliação", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(
    (
      await db.query<{ charge: string }>(
        "select charge from public.evaluations",
      )
    ).rows[0].charge,
  ).toBe("80.00");
  await navigate(page, "Financeiro");
  await page
    .getByRole("group", { name: "Origem dos valores do financeiro" })
    .getByRole("button", { name: "Bioimpedância", exact: true })
    .click();
  await expect(page.locator(".metric").first()).toContainText("R$ 0,00");
  await expect(page.locator(".metric").last()).toContainText("R$ 80,00");
  await navigate(page, "Bioimpedância");
  await page
    .getByRole("button", { name: "Receber exame", exact: true })
    .click();
  await dialog.getByLabel("Valor recebido do exame (R$)").fill("30");
  await dialog
    .getByRole("button", {
      name: "Confirmar recebimento do exame",
      exact: true,
    })
    .click();
  await expect(dialog).toHaveCount(0);
  await navigate(page, "Financeiro");
  await page
    .getByRole("group", { name: "Origem dos valores do financeiro" })
    .getByRole("button", { name: "Bioimpedância", exact: true })
    .click();
  await expect(page.locator(".metric").first()).toContainText("R$ 30,00");
  await expect(page.locator(".metric").last()).toContainText("R$ 50,00");
  await page.getByText("Ver valores do gráfico", { exact: true }).click();
  await expect(page.locator(".chart-data")).toContainText("R$ 30,00");
  await expect(
    page.locator("tbody tr").filter({ hasText: "Bioimpedância · Alice" }),
  ).toContainText("R$ 30,00");
  await page.reload();
  await expect(
    page.locator("tbody tr").filter({ hasText: "Bioimpedância · Alice" }),
  ).toContainText("R$ 30,00");
});
test("categoria configurada e foto privada persistem no catálogo", async ({
  page,
}) => {
  await mock(page);
  await login(page);
  await configuration(page, "Categorias de produtos");
  await page.getByLabel("Nome da categoria").fill("Vestuário");
  await page
    .getByRole("button", { name: "Adicionar categoria", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(page.locator('.toast[role="status"]')).toContainText(
    "Configurações salvas",
  );
  await navigate(page, "Vendas de produtos");
  await page
    .getByRole("button", { name: "Cadastrar produto", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome do produto *").fill("Camiseta KF");
  await dialog
    .getByLabel("Categoria", { exact: true })
    .selectOption("Vestuário");
  await dialog.getByLabel("Preço (R$) *").fill("60");
  await dialog.getByLabel("Estoque disponível *").fill("3");
  await dialog.getByLabel("Foto do produto").setInputFiles({
    name: "camiseta.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await dialog
    .getByRole("button", { name: "Salvar produto", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: "Foto de Camiseta KF", exact: true }),
  ).toBeVisible();
  expect(
    (
      await db.query<{ photo_path: string }>(
        "select photo_path from public.products",
      )
    ).rows[0].photo_path,
  ).toMatch(new RegExp("^products/" + admin + "/"));
  await page.reload();
  await expect(
    page.getByRole("img", { name: "Foto de Camiseta KF", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Editar produto", exact: true })
    .click();
  await dialog
    .getByRole("button", {
      name: "Usar imagem padrão da categoria",
      exact: true,
    })
    .click();
  await dialog
    .getByRole("button", { name: "Salvar produto", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: "Imagem padrão de Vestuário", exact: true }),
  ).toBeVisible();
});
test("Dashboard oculta e move itens com persistência individual", async ({
  page,
}) => {
  await mock(page);
  await login(page);
  await configuration(page, "Dashboard");
  await page.getByLabel("Gráfico financeiro", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Subir Bioimpedância recebida", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(page.locator('.toast[role="status"]')).toContainText(
    "Dashboard foi atualizado",
  );
  await navigate(page, "Dashboard");
  await expect(page.locator('[data-widget="financialChart"]')).toHaveCount(0);
  const order = await page
    .locator("[data-widget]")
    .evaluateAll((items) => items.map((el) => el.getAttribute("data-widget")));
  expect(order.indexOf("bioimpedance")).toBeLessThan(order.indexOf("products"));
  await page.reload();
  await expect(page.locator('[data-widget="financialChart"]')).toHaveCount(0);
  expect(
    (await db.query("select * from public.dashboard_preferences")).rows,
  ).toHaveLength(1);
});

test("banco antigo continua acessível e novas configurações ficam bloqueadas até a migração", async ({
  page,
}) => {
  await mock(page, { legacy: true });
  await login(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Olá, Thales 👋",
  );
  await expect(page.locator(".storage-notice")).toContainText(
    "Atualização do banco pendente",
  );
  await configuration(page, "Horários e pagamentos");
  await expect(
    page.getByRole("button", { name: "Salvar alterações", exact: true }),
  ).toBeDisabled();
  await navigate(page, "Mensalidades");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Mensalidades e pagamentos",
  );
});

test("saldo de exame com centavos permite quitar o valor exato no formulário", async ({
  page,
}) => {
  await mock(page);
  const initial = (
    await db.query<{ data: any }>("select public.get_studio_state() as data")
  ).rows[0].data;
  await action("save_settings", {
    settings: { ...initial.settings, evaluationPrice: 17.3 },
  });
  await login(page);
  await addStudent(page);
  const id = (await db.query<{ id: string }>("select id from public.students"))
    .rows[0].id;
  await action("record_evaluation", {
    evaluation: {
      id: randomUUID(),
      studentId: id,
      date: today,
      weight: 70,
      height: 1.7,
      fat: 25,
      muscle: 30,
      visceral: 8,
      water: 55,
      notes: "",
      charge: 17.3,
    },
    payment: {
      id: randomUUID(),
      amount: 3.1,
      date: today,
      method: "Pix",
      note: "",
    },
  });
  await page.goto("/#bioimpedancia");
  await page.reload();
  await page
    .getByRole("button", { name: "Receber exame", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Valor recebido do exame (R$)")).toHaveValue(
    "14.2",
  );
  await dialog
    .getByRole("button", {
      name: "Confirmar recebimento do exame",
      exact: true,
    })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(
    (
      await db.query<{ total: string }>(
        "select sum(amount) as total from public.evaluation_payments",
      )
    ).rows[0].total,
  ).toBe("17.30");
});

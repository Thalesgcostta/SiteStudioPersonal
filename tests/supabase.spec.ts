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
  user_metadata: {},
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
  await db.query("insert into public.studio_admins(user_id) values($1)", [
    admin,
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
    "reset role;truncate public.students,public.products,public.movements,public.mutation_requests cascade;set role authenticated;",
  );
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    admin,
  ]);
});
async function mock(
  page: Page,
  { failLoad = false }: { failLoad?: boolean } = {},
) {
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
    if (url.pathname === "/auth/v1/user") return respond(user(id));
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
        if (url.pathname.endsWith("/get_studio_state"))
          return respond(
            (
              await db.query<{ data: unknown }>(
                "select public.get_studio_state() as data",
              )
            ).rows[0].data,
          );
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
async function addStudent(page: Page) {
  await page
    .getByRole("button", { name: "Cadastrar aluno", exact: true })
    .click();
  const d = page.getByRole("dialog");
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
    "Olá, Katielle 👋",
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
  await addStudent(page);
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
  await page.getByRole("button", { name: "Menu da administradora" }).click();
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
    page.getByRole("heading", { name: "Olá, Katielle 👋" }),
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
  await d
    .locator("input[type=file]")
    .setInputFiles({
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

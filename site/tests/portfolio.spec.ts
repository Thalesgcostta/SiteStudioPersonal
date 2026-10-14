import { test, expect } from "@playwright/test";
import type { Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const api = "http://127.0.0.1:59999/rest/v1/rpc/get_public_studio_plans";
const rates = [175, 245, 315, 395, 470].map((monthlyPrice, index) => ({
  days: index + 1,
  monthlyPrice,
}));
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "POST, OPTIONS",
};
const respond = (route: Route, data: unknown, status = 200) =>
  route.request().method() === "OPTIONS"
    ? route.fulfill({ status: 204, headers: cors })
    : route.fulfill({ status, json: data, headers: cors });
test.beforeEach(async ({ page }) => {
  await page.route(api, (route) => respond(route, rates));
  // Fixtures verificam o comportamento das imagens e do carrossel; não substituem os arquivos do cliente.
  await page.route("**/media/*.jpg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="335" height="597"><rect width="335" height="597" fill="#353a42"/><circle cx="166" cy="185" r="65" fill="#ff6800"/><path d="M60 410h210" stroke="#579aba" stroke-width="24"/></svg>',
    }),
  );
});

test("portfolio mostra informações, preços do banco e contatos sem carregar o administrativo", async ({
  page,
}) => {
  const privateCalls: string[] = [];
  page.on("request", (request) => {
    if (/get_studio_state|apply_studio_action|auth\/v1/.test(request.url()))
      privateCalls.push(request.url());
  });
  await page.addInitScript(() =>
    localStorage.setItem(
      "sb-127-auth-token",
      JSON.stringify({ access_token: "sessao-administrativa-privada" }),
    ),
  );
  const request = page.waitForRequest(
    (r) => r.url() === api && r.method() === "POST",
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Seu corpo.",
  );
  await expect(page.locator(".plan-card")).toHaveCount(5);
  await expect(page.locator(".plan-card").nth(2)).toContainText("R$ 315,00");
  expect((await request).headers().authorization).toBeUndefined();
  expect((await request).headers().apikey).toBe(
    "sb_publishable_local_test_only",
  );
  const contact = page.getByRole("link", {
    name: "Agendar aula experimental gratuita",
    exact: true,
  });
  const href = await contact.getAttribute("href");
  expect(href).toContain("https://wa.me/5516992148454?text=");
  expect(decodeURIComponent(href!)).toContain("aula experimental gratuita");
  await expect(
    page.getByRole("link", {
      name: "Conversar sobre o plano de 3 dias por semana",
      exact: true,
    }),
  ).toHaveAttribute("href", /315/);
  await expect(page.locator(".contact-details")).toContainText(
    "Franca, São Paulo",
  );
  await expect(page.locator(".contact-details")).toContainText(
    "(16) 99214-8454",
  );
  await expect(page.getByRole("textbox")).toHaveCount(0);
  expect(privateCalls).toEqual([]);
});

test("carrossel filtra, navega e amplia fotos com teclado e fechamento por Escape", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navegação do site" })
    .getByRole("link", { name: "Galeria", exact: true })
    .click();
  await expect(page.locator(".gallery-slide")).toHaveCount(8);
  await page
    .getByRole("button", { name: "Próximas fotos", exact: true })
    .click();
  await expect(page.locator(".gallery-bottom")).toContainText("Foto 2 de 8");
  await page
    .getByRole("group", { name: "Filtrar fotos" })
    .getByRole("button", { name: "Estrutura", exact: true })
    .click();
  await expect(page.locator(".gallery-slide")).toHaveCount(2);
  await expect(page.locator(".gallery-bottom")).toContainText("Foto 1 de 2");
  const button = page.getByRole("button", {
    name: "Ampliar foto: Nosso espaço em Franca",
    exact: true,
  });
  await button.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Nosso espaço em Franca");
  await dialog.press("ArrowRight");
  await expect(dialog).toContainText("Estrutura para o seu treino");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(button).toBeFocused();
  await page
    .getByRole("group", { name: "Filtrar fotos" })
    .getByRole("button", { name: "Comunidade", exact: true })
    .click();
  await expect(page.locator(".gallery-slide")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Próximas fotos", exact: true }),
  ).toBeDisabled();
});

test("falha ou resposta inválida dos planos mantém preços sob consulta", async ({
  page,
}) => {
  await page.route(api, (route) =>
    respond(route, { message: "Indisponível" }, 503),
  );
  await page.goto("/");
  await expect(page.locator(".plan-note")).toContainText(
    "Consulte os valores atuais",
    { timeout: 10000 },
  );
  await expect(page.locator(".plan-price").first()).toHaveText("Consulte");
  await expect(page.locator(".plan-grid")).not.toContainText("R$ 160");
  await page.route(api, (route) =>
    respond(route, [{ days: 3, monthlyPrice: 999 }]),
  );
  await page.reload();
  await expect(page.locator(".plan-price").nth(2)).toHaveText("Consulte");
  await expect(
    page.getByRole("link", {
      name: "Conversar sobre o plano de 3 dias por semana",
      exact: true,
    }),
  ).toHaveAttribute("href", /5516992148454/);
});

test("desktop e celular preservam layout, contraste, menu e perguntas", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  await expect(page.locator(".plan-price").first()).toContainText("R$ 175");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: "/tmp/studio-public-desktop.png",
    fullPage: true,
  });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const measurements = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      screen: innerWidth,
    }));
    expect(measurements.scroll).toBeLessThanOrEqual(measurements.screen + 1);
  }
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Navegação do site" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Abrir menu", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Navegação do site" })
    .getByRole("link", { name: "Planos", exact: true })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Navegação do site" }),
  ).not.toBeVisible();
  await page
    .getByText("Como funciona a aula experimental gratuita?", { exact: true })
    .click();
  await expect(page.locator("details[open]")).toContainText(
    "Combine um horário",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/tmp/studio-public-mobile.png",
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

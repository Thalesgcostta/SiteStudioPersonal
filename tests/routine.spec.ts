import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});
test("carrinho só aparece com itens, flutua, minimiza e desaparece ao esvaziar", async ({
  page,
}) => {
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Vendas de produtos", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Resumo da venda" }),
  ).toHaveCount(0);
  await expect(page.locator(".cart-launcher")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Adicionar à venda", exact: true })
    .first()
    .click();
  const cart = page.getByRole("complementary", { name: "Resumo da venda" });
  await expect(cart).toBeVisible();
  await expect(cart).toHaveCSS("position", "fixed");
  await page.getByRole("button", { name: "Minimizar resumo da venda" }).click();
  await expect(cart).toHaveCount(0);
  await page.locator(".cart-launcher").click();
  await expect(cart).toBeVisible();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const box = (await cart.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
  }
  await cart.getByRole("button", { name: /Remover .* da venda/ }).click();
  await expect(cart).toHaveCount(0);
  await expect(page.locator(".cart-launcher")).toHaveCount(0);
});
test("virada do ano atualiza competência e gráficos com a página aberta", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-12-31T23:59:50-03:00") });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const month = page.getByLabel("Competência mensal", { exact: true }).first();
  await expect(month).toHaveValue("2026-12");
  await page.clock.fastForward(31000);
  await expect(month).toHaveValue("2027-01");
  await expect(page.locator(".chart").first()).toContainText("2027");
  await month.selectOption("2026-11");
  await expect(page.locator(".chart").first()).not.toContainText("2027");
  await page
    .getByRole("button", { name: "Próxima competência", exact: true })
    .first()
    .click();
  await expect(month).toHaveValue("2026-12");
  await page
    .getByRole("button", { name: "Próxima competência", exact: true })
    .first()
    .click();
  await expect(month).toHaveValue("2027-01");
});
test("reabrir em 2032 usa o ano corrente e mantém a competência histórica na virada do mês", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2032-01-31T23:59:50-03:00") });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const month = page.getByLabel("Competência mensal", { exact: true }).first();
  await expect(month).toHaveValue("2032-01");
  await month.selectOption("2031-12");
  await page.clock.fastForward(31000);
  await expect(month).toHaveValue("2031-12");
  await expect(page.locator(".chart").first()).toContainText("2031");
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Financeiro", exact: true })
    .click();
  await page
    .getByLabel("Data inicial do financeiro", { exact: true })
    .fill("2000-01-01");
  await page
    .getByLabel("Data final do financeiro", { exact: true })
    .fill("2032-02-29");
  await expect(page.locator(".chart").first()).toContainText("2032");
  await expect(page.locator(".chart").first()).not.toContainText("2000");
});
test("despesa fixa reaparece em fevereiro e em ano bissexto sem entrar no caixa antes de pagar", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2028-02-15T12:00:00-03:00") });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Financeiro", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cadastrar despesa fixa", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Descrição *", { exact: true })
    .fill("Aluguel recorrente");
  await dialog.getByLabel("Valor mensal *").fill("1900");
  await dialog.getByLabel("Dia do vencimento *").fill("31");
  await dialog.getByRole("button", { name: "Salvar despesa fixa" }).click();
  const row = page
    .locator(".recurring-panel tr")
    .filter({ hasText: "Aluguel recorrente" });
  await expect(row).toContainText("29/02/2028");
  await expect(row).toContainText("A pagar");
  const before = await page
    .locator(".metric")
    .filter({ hasText: "Despesas pagas" })
    .innerText();
  await expect(row).toContainText("R$ 1.900,00");
  expect(
    await page
      .locator(".metric")
      .filter({ hasText: "Despesas pagas" })
      .innerText(),
  ).toBe(before);
  await row
    .getByRole("button", { name: "Registrar pagamento", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Confirmar pagamento", exact: true })
    .click();
  await expect(row).toContainText("Pago:");
  await page
    .getByRole("button", { name: "Próxima competência", exact: true })
    .first()
    .click();
  await expect(row).toContainText("31/03/2028");
  await expect(row).toContainText("A pagar");
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
});

test("eixo financeiro mostra só o mês e mantém ano nos detalhes", async ({ page }) => {
  const chart = page.locator(".chart").first();
  const labels = chart.locator("svg > text");
  await expect(labels).toHaveCount(6);
  for (const label of await labels.allTextContents()) {
    expect(label).not.toMatch(/\d| de /);
    expect(label.length).toBeLessThanOrEqual(5);
  }
  await expect(chart.locator("circle title").first()).toContainText(/20\d\d/);
});

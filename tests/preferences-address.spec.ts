import { test, expect } from "@playwright/test";
import type { Page, Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function go(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "Abrir menu", exact: true });
  if (
    (await menu.isVisible()) &&
    (await menu.getAttribute("aria-expanded")) === "false"
  )
    await menu.click();
  const button = page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name, exact: true });
  await button.click();
  await expect(button).toHaveAttribute("aria-current", "page");
}
async function displaySettings(page: Page) {
  await go(page, "Configurações");
  await page
    .getByRole("navigation", { name: "Seções de configurações" })
    .getByRole("button", { name: "Tamanho da exibição" })
    .click();
}
async function openStudent(page: Page) {
  await page
    .getByRole("button", { name: "Cadastrar aluno", exact: true })
    .click();
  return page.getByRole("dialog");
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("tamanho aplica imediatamente, persiste e preserva o tamanho do celular", async ({
  page,
}) => {
  await displaySettings(page);
  const heading = page.getByRole("heading", { level: 1 });
  const previous = (await heading.boundingBox())!.height;
  await page.getByLabel("Tamanho da interface").selectOption("1.25");
  await expect
    .poll(async () => (await heading.boundingBox())!.height)
    .toBeGreaterThan(previous);
  await expect
    .poll(() =>
      page.locator(".app").evaluate((el) => getComputedStyle(el).zoom),
    )
    .toBe("1.25");
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    )
    .toBe(true);
  const a11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(a11y.violations.map((v) => v.id)).toEqual([]);
  await page.reload();
  await displaySettings(page);
  await expect(page.getByLabel("Tamanho da interface")).toHaveValue("1.25");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.locator(".app").evaluate((el) => getComputedStyle(el).zoom),
    )
    .toBe("1");
  await expect(page.getByLabel("Tamanho da interface")).toHaveValue("1.25");
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    )
    .toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect
    .poll(() =>
      page.locator(".app").evaluate((el) => getComputedStyle(el).zoom),
    )
    .toBe("1.25");
  await page.getByRole("button", { name: "Voltar ao tamanho padrão" }).click();
  await expect(page.getByLabel("Tamanho da interface")).toHaveValue("1");
});

test("ampliação máxima mantém as oito áreas e o modal dentro da tela", async ({
  page,
}) => {
  test.setTimeout(60000);
  await displaySettings(page);
  await page.getByLabel("Tamanho da interface").selectOption("1.5");
  for (const width of [1920, 1366, 1024]) {
    await page.setViewportSize({ width, height: 768 });
    await expect(page.locator(".app")).toHaveAttribute(
      "data-mobile",
      width / 1.5 <= 760 ? "true" : "false",
    );
    for (const area of [
      "Dashboard",
      "Alunos",
      "Agenda e horários",
      "Bioimpedância",
      "Mensalidades",
      "Vendas de produtos",
      "Financeiro",
      "Configurações",
    ]) {
      await go(page, area);
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          { message: `Área ${area}, largura ${width}, escala 150%` },
        )
        .toBe(true);
    }
    await go(page, "Alunos");
    const dialog = await openStudent(page);
    const bounds = (await dialog.boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(769);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  }
});

test("CEP inválido, inexistente e indisponível preservam o endereço manual", async ({
  page,
}) => {
  let calls = 0;
  let unavailable = false;
  await page.route("https://viacep.com.br/ws/**", (route) => {
    calls++;
    return route.fulfill({
      status: unavailable ? 503 : 200,
      json: unavailable ? {} : { erro: true },
    });
  });
  const dialog = await openStudent(page);
  await dialog
    .getByLabel("Endereço", { exact: true })
    .fill("Rua preenchida manualmente, 12");
  await dialog.getByLabel("CEP", { exact: true }).fill("123");
  await dialog.getByRole("button", { name: "Buscar CEP", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("8 dígitos");
  expect(calls).toBe(0);
  await dialog.getByLabel("CEP", { exact: true }).fill("00000000");
  await dialog.getByRole("button", { name: "Buscar CEP", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("CEP não encontrado");
  await expect(dialog.getByLabel("Endereço", { exact: true })).toHaveValue(
    "Rua preenchida manualmente, 12",
  );
  unavailable = true;
  await dialog.getByRole("button", { name: "Buscar CEP", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "preencha o endereço manualmente",
  );
  await expect(dialog.getByLabel("Endereço", { exact: true })).toHaveValue(
    "Rua preenchida manualmente, 12",
  );
  await expect(
    dialog.getByRole("button", { name: "Cadastrar aluno", exact: true }),
  ).toBeEnabled();
});

test("resposta de CEP antigo não sobrescreve uma busca nova", async ({
  page,
}) => {
  let first!: Route;
  let started!: () => void;
  const firstStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route("https://viacep.com.br/ws/01001000/json/", (route) => {
    first = route;
    started();
  });
  await page.route("https://viacep.com.br/ws/14010000/json/", (route) =>
    route.fulfill({
      json: {
        logradouro: "Rua nova",
        bairro: "Centro",
        localidade: "Ribeirão Preto",
        uf: "SP",
      },
    }),
  );
  const dialog = await openStudent(page);
  await dialog.getByLabel("CEP", { exact: true }).fill("01001000");
  await dialog.getByRole("button", { name: "Buscar CEP", exact: true }).click();
  await firstStarted;
  await expect(
    dialog.getByRole("button", { name: "Cadastrar aluno", exact: true }),
  ).toBeDisabled();
  await dialog.getByLabel("CEP", { exact: true }).fill("14010000");
  await dialog.getByRole("button", { name: "Buscar CEP", exact: true }).click();
  await expect(dialog.getByLabel("Endereço", { exact: true })).toHaveValue(
    "Rua nova · Centro · Ribeirão Preto/SP · CEP 14010-000",
  );
  await first.fulfill({
    json: {
      logradouro: "Rua antiga",
      bairro: "Sé",
      localidade: "São Paulo",
      uf: "SP",
    },
  });
  await expect(dialog.getByLabel("Endereço", { exact: true })).toHaveValue(
    "Rua nova · Centro · Ribeirão Preto/SP · CEP 14010-000",
  );
  await expect(
    dialog.getByRole("button", { name: "Cadastrar aluno", exact: true }),
  ).toBeEnabled();
});

test("CEP geral preenche cidade e estado e permite completar rua manualmente", async ({
  page,
}) => {
  await page.route("https://viacep.com.br/ws/12345000/json/", (route) =>
    route.fulfill({
      json: {
        logradouro: "",
        bairro: "",
        localidade: "Cidade de teste",
        uf: "MG",
      },
    }),
  );
  const dialog = await openStudent(page);
  await dialog.getByLabel("CEP", { exact: true }).fill("12345000");
  // Sair do campo já dispara a busca, sem precisar apertar o botão.
  await dialog.getByLabel("Nome completo *").focus();
  await expect(dialog.getByLabel("Endereço", { exact: true })).toHaveValue(
    "Cidade de teste/MG · CEP 12345-000",
  );
  await expect(dialog.getByRole("status")).toContainText("Complete rua");
  await dialog
    .getByLabel("Endereço", { exact: true })
    .fill("Rua manual, 1 · Cidade de teste/MG · CEP 12345-000");
  await expect(dialog.getByLabel("Endereço", { exact: true })).toHaveValue(
    "Rua manual, 1 · Cidade de teste/MG · CEP 12345-000",
  );
});

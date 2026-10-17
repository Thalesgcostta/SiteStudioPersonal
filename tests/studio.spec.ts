import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});
test("as oito áreas carregam e os filtros apresentam estado vazio", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [menu, title] of [
    ["Alunos", "Alunos"],
    ["Agenda e horários", "Agenda e horários"],
    ["Bioimpedância", "Bioimpedância"],
    ["Mensalidades", "Mensalidades e pagamentos"],
    ["Vendas de produtos", "Vendas de produtos"],
    ["Financeiro", "Financeiro"],
    ["Configurações", "Configurações"],
    ["Dashboard", "Olá, Katielle 👋"],
  ]) {
    await page
      .getByRole("navigation", { name: "Menu principal" })
      .getByRole("button", { name: menu, exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  }
  await page
    .getByRole("textbox", { name: "Busca em Dashboard" })
    .fill("Mariana");
  await expect(page.locator(".global-results")).toContainText(
    "Mariana Oliveira",
  );
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Alunos", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Buscar alunos", exact: true })
    .fill("não existe");
  await expect(page.getByText("Nenhum resultado encontrado")).toBeVisible();
  expect(errors).toEqual([]);
});
test("pagamento parcial atualiza cobrança, caixa, dashboard e persiste após recarregar", async ({
  page,
}) => {
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Mensalidades", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Registrar pagamento", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Aluno", exact: true })
    .selectOption("s6");
  await dialog.getByLabel("Valor recebido *").fill("50");
  await dialog.getByRole("button", { name: "Confirmar pagamento" }).click();
  await expect(page.getByRole("status")).toContainText("parcial");
  const row = page.locator("tbody tr").filter({ hasText: "Pedro Henrique" });
  await expect(row).toContainText("Parcial");
  await expect(row).toContainText("R$ 50,00");
  await page.reload();
  await expect(
    page.locator("tbody tr").filter({ hasText: "Pedro Henrique" }),
  ).toContainText("Parcial");
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Dashboard", exact: true })
    .click();
  await expect(
    page.locator(".metric").filter({ hasText: "Mensalidades recebidas" }),
  ).toContainText("R$ 1.590,00");
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Financeiro", exact: true })
    .click();
  await expect(
    page
      .locator("tbody tr")
      .filter({ hasText: "Mensalidade · Pedro Henrique" }),
  ).toContainText("R$ 50,00");
});
test("cadastro valida dias do plano e cria perfil, agenda e cobrança", async ({
  page,
}) => {
  let cepRequests = 0;
  await page.route("https://viacep.com.br/ws/01001000/json/", (route) => {
    cepRequests++;
    return route.fulfill({
      json: {
        cep: "01001-000",
        logradouro: "Praça da Sé",
        bairro: "Sé",
        localidade: "São Paulo",
        uf: "SP",
      },
    });
  });
  await page
    .getByRole("button", { name: "Cadastrar aluno", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("CEP", { exact: true }).fill("01001000");
  await d.getByRole("button", { name: "Buscar CEP", exact: true }).click();
  await expect(d.getByLabel("Rua / logradouro", { exact: true })).toHaveValue(
    "Praça da Sé",
  );
  await expect(d.getByLabel("Bairro", { exact: true })).toHaveValue("Sé");
  expect(cepRequests).toBe(1);
  await d.getByLabel("Número da residência").fill("42");
  await d.getByLabel("Complemento", { exact: true }).fill("sala 2");
  await d.getByLabel("Nome completo *").fill("Alice Demonstrativa");
  await d.getByLabel("Data de nascimento *").fill("1995-05-15");
  await d.getByLabel("CPF fictício *").fill("12345678901");
  await d.getByLabel("Telefone / WhatsApp *").fill("(16) 99999-1234");
  await d.getByRole("button", { name: "Cadastrar aluno", exact: true }).click();
  await expect(d.getByRole("alert")).toContainText("exatamente 3 dias");
  await d.getByRole("button", { name: /^Seg/ }).click();
  await d.getByRole("button", { name: /^Qua/ }).click();
  await d.getByRole("button", { name: /^Sex/ }).click();
  await d.getByRole("button", { name: "Cadastrar aluno", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Aluno cadastrado");
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Alunos", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Alice Demonstrativa/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Alice Demonstrativa",
  );
  await expect(page.locator(".profile-main")).toContainText("R$ 280,00");
  await expect(page.locator(".profile-card")).toContainText(
    "Praça da Sé, 42 · sala 2",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Editar cadastro", exact: true })
    .click();
  await expect(d.getByLabel("CEP", { exact: true })).toHaveValue("01001-000");
  await d.getByLabel("CEP", { exact: true }).focus();
  await d.getByLabel("Nome completo *").focus();
  expect(cepRequests).toBe(1);
  await expect(d.getByLabel("Número da residência")).toHaveValue("42");
  await expect(d.getByLabel("Complemento", { exact: true })).toHaveValue(
    "sala 2",
  );
  await d.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Agenda e horários", exact: true })
    .click();
  await expect(page.locator(".week-calendar")).toContainText(
    "Alice Demonstrativa",
  );
});
test("venda baixa estoque e separa receita de produto das mensalidades", async ({
  page,
}) => {
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Vendas de produtos", exact: true })
    .click();
  const whey = page
    .locator(".product-card")
    .filter({ hasText: "Whey Protein" });
  await whey.getByRole("button", { name: "Adicionar à venda" }).click();
  await page.getByRole("button", { name: "Aumentar Whey Protein" }).click();
  await page.getByLabel("Desconto em reais").fill("10");
  await expect(page.locator(".cart-total .total")).toContainText("R$ 289,80");
  await page.getByRole("button", { name: "Finalizar venda" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Venda simulada concluída",
  );
  await expect(whey).toContainText("16 em estoque");
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Dashboard", exact: true })
    .click();
  await expect(
    page.locator(".metric").filter({ hasText: "Vendas de produtos" }),
  ).toContainText("R$ 766,00");
  await expect(
    page.locator(".metric").filter({ hasText: "Mensalidades recebidas" }),
  ).toContainText("R$ 1.540,00");
});
test("avaliação calcula IMC, permite comparação neutra e confirma exclusão", async ({
  page,
}) => {
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Bioimpedância", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Nova avaliação", exact: true })
    .click();
  const d = page.getByRole("dialog");
  for (const [label, value] of [
    ["Peso (kg) *", "70"],
    ["Altura (cm) *", "170"],
    ["Gordura corporal (%) *", "25"],
    ["Massa muscular (kg) *", "30"],
    ["Gordura visceral (nível) *", "8"],
    ["Água corporal (%) *", "55"],
  ])
    await d.getByLabel(label, { exact: true }).fill(value);
  await expect(d.locator(".selected-plan")).toContainText("24.2");
  await d.getByRole("button", { name: "Salvar avaliação" }).click();
  await page
    .getByRole("button", { name: "Comparar avaliações", exact: true })
    .click();
  await expect(page.locator(".neutral-difference").first()).toContainText(
    "+3.0 kg",
  );
  await page.getByRole("button", { name: "Histórico", exact: true }).click();
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(4);
  await rows.first().getByRole("button").click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(rows).toHaveCount(4);
  await rows.first().getByRole("button").click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(rows).toHaveCount(3);
});
test("receita e despesa ajustam resultado e exportação gera arquivo", async ({
  page,
}) => {
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Financeiro", exact: true })
    .click();
  await page.getByRole("button", { name: "Nova movimentação" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Descrição *").fill("Limpeza demonstrativa");
  await d.getByLabel("Valor *").fill("40");
  await d.getByRole("button", { name: "Registrar despesa" }).click();
  await expect(
    page.locator(".metric").filter({ hasText: "Resultado do período" }),
  ).toContainText("R$ 646,20");
  const row = page
    .locator("tbody tr")
    .filter({ hasText: "Limpeza demonstrativa" });
  await row
    .getByRole("button", { name: "Excluir Limpeza demonstrativa" })
    .click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(
    page.locator(".metric").filter({ hasText: "Resultado do período" }),
  ).toContainText("R$ 686,20");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/financeiro-.*\.csv/);
});
test("agenda mobile, menu lateral e formulários funcionam sem transbordamento", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Agenda e horários", exact: true })
    .click();
  await expect(page.locator(".daily-calendar")).toBeVisible();
  await expect(page.locator(".week-calendar")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Abrir menu" }),
  ).toHaveAttribute("aria-expanded", "false");
  for (const hash of [
    "dashboard",
    "alunos",
    "agenda",
    "bioimpedancia",
    "mensalidades",
    "produtos",
    "financeiro",
    "configuracoes",
  ]) {
    await page.goto("/#" + hash);
    await page.waitForTimeout(300);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      hash,
    ).toBe(true);
  }
  await page.goto("/#alunos");
  await page
    .getByRole("button", { name: "Cadastrar aluno", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("dashboard mantém contraste e semântica de acessibilidade", async ({
  page,
}) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
test("agendamento identifica conflito e aparece na lista após confirmação", async ({
  page,
}) => {
  const appointment = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("katielle-studio-demo-v1")!)
        .appointments[0],
  );
  await page
    .getByRole("button", { name: "Agendar avaliação", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d
    .getByRole("combobox", { name: "Aluno", exact: true })
    .selectOption("s2");
  await d.getByLabel("Data *", { exact: true }).fill(appointment.date);
  await d.getByLabel("Horário *", { exact: true }).fill(appointment.time);
  await d.getByRole("button", { name: "Confirmar agendamento" }).click();
  await expect(d.getByRole("alert")).toContainText("Já há uma avaliação");
  await d.getByLabel("Horário *", { exact: true }).fill("11:00");
  await d.getByRole("button", { name: "Confirmar agendamento" }).click();
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Bioimpedância", exact: true })
    .click();
  await expect(
    page.locator(".appointment-row").filter({ hasText: "Lucas Ferreira" }),
  ).toContainText("11:00");
});
test("configurações persistem e restauração exige confirmação", async ({
  page,
}) => {
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page
    .getByLabel("Telefone / WhatsApp", { exact: true })
    .fill("(16) 98888-1234");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await page.reload();
  await expect(
    page.getByLabel("Telefone / WhatsApp", { exact: true }),
  ).toHaveValue("(16) 98888-1234");
  await page.getByRole("button", { name: "Restaurar exemplos" }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    page.getByLabel("Telefone / WhatsApp", { exact: true }),
  ).toHaveValue("(16) 98888-1234");
  await page.getByRole("button", { name: "Restaurar exemplos" }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(
    page.getByLabel("Telefone / WhatsApp", { exact: true }),
  ).toHaveValue("(16) 99999-0000");
});

test("controle de estoque e desenho persistem na demonstração, sem apagar vendas ao excluir", async ({
  page,
}) => {
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Vendas de produtos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Controle de estoque", exact: true })
    .click();
  await page
    .getByLabel("Quantidade em estoque de Whey Protein", { exact: true })
    .fill("23");
  await page
    .getByRole("button", {
      name: "Salvar estoque de Whey Protein",
      exact: true,
    })
    .click();
  await expect(page.locator('.toast[role="status"]')).toContainText(
    "Estoque de Whey Protein atualizado",
  );
  await page
    .getByRole("button", { name: "Editar Whey Protein", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Ilustração: Pré-treino", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Salvar produto", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("button", { name: "Controle de estoque", exact: true })
    .click();
  await expect(
    page.getByLabel("Quantidade em estoque de Whey Protein", { exact: true }),
  ).toHaveValue("23");
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("katielle-studio-demo-v1")!),
  );
  expect(before.products.find((p: any) => p.id === "p1").illustration).toBe(
    "pre-workout",
  );
  await page
    .getByRole("button", { name: "Excluir Whey Protein", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("katielle-studio-demo-v1")!),
  );
  expect(after.sales).toEqual(before.sales);
  expect(after.products.find((p: any) => p.id === "p1").deletedAt).toBeTruthy();
  await page
    .getByRole("button", { name: "Catálogo e venda", exact: true })
    .click();
  await expect(
    page.locator(".product-card").filter({ hasText: "Whey Protein" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.locator(".product-card").filter({ hasText: "Whey Protein" }),
  ).toHaveCount(0);
});

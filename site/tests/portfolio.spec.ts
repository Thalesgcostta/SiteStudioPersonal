import { test, expect } from "@playwright/test";
import type { Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const api = "http://127.0.0.1:59999/rest/v1/rpc/get_public_studio_plans";
const rates = [245, 315, 395, 470].map((monthlyPrice, index) => ({
  days: index + 2,
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
  await expect(page.locator(".plan-card")).toHaveCount(4);
  await expect(page.locator(".plan-card h3 strong")).toHaveText([
    "2×",
    "3×",
    "4×",
    "5×",
  ]);
  await expect(page.locator(".plan-card").nth(1)).toContainText("R$ 315,00");
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

test("consulta anterior com cinco planos mantém 2 a 5 dias e atualiza preços ao recarregar", async ({
  page,
}) => {
  await page.route(api, (route) =>
    respond(route, [...rates.toReversed(), { days: 1, monthlyPrice: 175 }]),
  );
  await page.goto("/");
  await expect(page.locator(".plan-card h3 strong")).toHaveText([
    "2×",
    "3×",
    "4×",
    "5×",
  ]);
  await expect(page.locator(".plan-price").first()).toContainText("R$ 245,00");
  await expect(page.locator(".plan-grid")).not.toContainText("R$ 175,00");
  await page.route(api, (route) =>
    respond(
      route,
      rates.map((plan) => ({ ...plan, monthlyPrice: plan.monthlyPrice + 50 })),
    ),
  );
  await page.reload();
  await expect(page.locator(".plan-price").first()).toContainText("R$ 295,00");
  await expect(
    page.getByRole("link", {
      name: "Conversar sobre o plano de 3 dias por semana",
      exact: true,
    }),
  ).toHaveAttribute("href", /365/);
});

test("carrossel filtra, navega e amplia fotos com teclado e fechamento por Escape", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navegação do site" })
    .getByRole("link", { name: "Galeria", exact: true })
    .click();
  await expect(page.locator(".gallery-slide")).toHaveCount(18);
  await page
    .getByRole("button", { name: "Próximas fotos", exact: true })
    .click();
  await expect(page.locator(".gallery-bottom")).toContainText("Foto 2 de 18");
  await page
    .getByRole("group", { name: "Filtrar fotos" })
    .getByRole("button", { name: "Estrutura", exact: true })
    .click();
  await expect(page.locator(".gallery-slide")).toHaveCount(3);
  await expect(page.locator(".gallery-bottom")).toContainText("Foto 1 de 3");
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

test("fotos reais carregam e a ampliação preserva a imagem inteira", async ({
  page,
}) => {
  const failedMedia: string[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/media/") && !response.ok())
      failedMedia.push(response.url());
  });
  await page.goto("/");
  await page.locator("img").evaluateAll((images) =>
    images.forEach((image) => {
      image.loading = "eager";
    }),
  );
  await expect
    .poll(() =>
      page
        .locator("img")
        .evaluateAll((images) =>
          images.every((image) => image.complete && image.naturalWidth > 0),
        ),
    )
    .toBe(true);
  await expect(page.locator(".photo-fallback")).toHaveCount(0);
  const hero = await page
    .locator(".hero-photo-primary img")
    .evaluate((img: HTMLImageElement) => ({
      width: img.naturalWidth,
      height: img.naturalHeight,
    }));
  expect(hero).toEqual({ width: 720, height: 1280 });
  await page
    .getByRole("button", {
      name: "Ampliar foto: Treino individualizado",
      exact: true,
    })
    .click();
  const photo = page.getByRole("dialog").locator("img");
  await expect(photo).toHaveCSS("object-fit", "contain");
  await expect
    .poll(() =>
      photo.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth === 335,
      ),
    )
    .toBe(true);
  expect(failedMedia).toEqual([]);
});

test("vídeo real só carrega após clique e reproduz em sua proporção original", async ({
  page,
}) => {
  const videoRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("studio-em-movimento.mp4"))
      videoRequests.push(request.url());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const player = page.locator("video");
  await page.locator("#em-movimento").scrollIntoViewIfNeeded();
  expect(await player.getAttribute("src")).toBeNull();
  expect(await player.getAttribute("autoplay")).toBeNull();
  expect(videoRequests).toEqual([]);
  await page
    .getByRole("button", { name: "Reproduzir vídeo do studio", exact: true })
    .click();
  await expect
    .poll(() => player.evaluate((video: HTMLVideoElement) => video.currentTime))
    .toBeGreaterThan(0);
  const playback = await player.evaluate((video: HTMLVideoElement) => {
    video.pause();
    return {
      width: video.videoWidth,
      height: video.videoHeight,
      duration: video.duration,
      controls: video.controls,
      inline: video.playsInline,
    };
  });
  expect(playback).toMatchObject({
    width: 1024,
    height: 576,
    controls: true,
    inline: true,
  });
  expect(playback.duration).toBeCloseTo(20, 0);
  expect(videoRequests.length).toBeGreaterThan(0);
  const frame = await page.locator(".video-frame").boundingBox();
  expect(frame!.width / frame!.height).toBeCloseTo(16 / 9, 1);
});

test("falha de vídeo oferece acesso direto ao arquivo", async ({ page }) => {
  await page.route("**/studio-em-movimento.mp4", (route) => route.abort());
  await page.goto("/");
  await page
    .getByRole("button", { name: "Reproduzir vídeo do studio", exact: true })
    .click();
  await expect(page.locator(".video-error")).toContainText(
    "Não foi possível carregar o vídeo",
  );
  await expect(
    page.getByRole("link", { name: "Abrir o vídeo diretamente" }),
  ).toHaveAttribute("href", "/media/studio-em-movimento.mp4");
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
  await page.route(api, (route) =>
    respond(route, [rates[0], rates[0], rates[2], rates[3]]),
  );
  await page.reload();
  await expect(page.locator(".plan-price").first()).toHaveText("Consulte");
  await page.route(api, (route) =>
    respond(route, [rates[0], null, rates[2], rates[3]]),
  );
  await page.reload();
  await expect(page.locator(".plan-price").first()).toHaveText("Consulte");
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
  await expect(page.locator(".plan-price").first()).toContainText("R$ 245");
  await page.locator("img").evaluateAll((images) =>
    images.forEach((image) => {
      image.loading = "eager";
    }),
  );
  await expect
    .poll(() =>
      page
        .locator("img")
        .evaluateAll((images) =>
          images.every((image) => image.complete && image.naturalWidth > 0),
        ),
    )
    .toBe(true);
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

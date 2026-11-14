import { test, expect } from "@playwright/test";
import type { Page, Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "POST, OPTIONS",
};
const selection = {
  version: 1,
  videos: [{ videoId: "ZsS8bJw2i9k", title: "Um pouco do Studio Katielle Faleiros" }],
};
const respond = (route: Route, data: unknown) => route.request().method() === "OPTIONS"
  ? route.fulfill({ status: 204, headers: cors })
  : route.fulfill({ status: 200, json: data, headers: cors });
const desktopButton = (page: Page) => page.getByRole("button", { name: "Ver versão desktop", exact: true }).first();
const mobileButton = (page: Page) => page.getByRole("button", { name: "Voltar à versão celular", exact: true }).first();
const mode = (page: Page) => page.locator("html");

test.beforeEach(async ({ page }) => {
  await page.route("**/rest/v1/rpc/get_public_studio_plans", route => respond(route,
    [220, 280, 360, 420, 600].map((monthlyPrice, index) => ({ days: index + 2, monthlyPrice }))));
  await page.route("**/rest/v1/rpc/get_public_studio_videos", route => respond(route, selection));
  await page.route("https://i.ytimg.com/**", route => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#172c37"/></svg>',
  }));
  await page.route("https://www.youtube-nocookie.com/**", route => route.fulfill({
    contentType: "text/html", body: "<!doctype html><title>Player simulado</title><p>Vídeo externo simulado.</p>",
  }));
  await page.route("https://www.google.com/maps/**", route => route.fulfill({
    contentType: "text/html", body: "<!doctype html><title>Mapa simulado</title><p>Mapa externo simulado.</p>",
  }));
});

for (const width of [320, 390]) {
  test(`smartphone ${width}px começa compacto e mantém planos e navegação sem transbordar`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(mode(page)).toHaveAttribute("data-presentation", "compact");
    await expect(desktopButton(page)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator(".hero-visual")).toBeVisible();
    await expect(page.locator(".hero-brand")).toHaveCSS("opacity", "1");
    await expect(page.locator(".activity-ring")).toHaveCount(3);
    await expect(page.locator("#planos .plan-card")).toHaveCount(5);
    for (const price of await page.locator("#planos .plan-price").all()) {
      await expect(price).toBeVisible();
      await expect(price).toContainText("R$");
    }
    await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
    await expect(page.getByRole("navigation", { name: "Navegação do site" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Abrir menu", exact: true })).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    await page.screenshot({ path: `/tmp/kf-smartphone-${width}.png`, fullPage: true });
    await desktopButton(page).click();
    await expect(mode(page)).toHaveAttribute("data-presentation", "full");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  });
}

test("alternar para desktop restaura conteúdo completo e preserva a escolha ao recarregar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".about-story")).toBeVisible();
  const fullStory = page.locator("#studio").getByText(/Katielle é profissional de educação física e tem mais de 15 anos/);
  await expect(fullStory).not.toBeVisible();
  await desktopButton(page).click();
  await expect(mode(page)).toHaveAttribute("data-presentation", "full");
  await expect(fullStory).toBeVisible();
  await expect(page.locator(".about-story")).toHaveCount(0);
  await expect(page.locator("iframe[title='Localização do Studio Katielle Faleiros em Franca']")).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  await page.reload();
  await expect(mode(page)).toHaveAttribute("data-presentation", "full");
  await expect(mobileButton(page)).toBeVisible();
  await mobileButton(page).click();
  await expect(mode(page)).toHaveAttribute("data-presentation", "compact");
  await expect(fullStory).not.toBeVisible();
  await page.reload();
  await expect(mode(page)).toHaveAttribute("data-presentation", "compact");
});

test("telas maiores usam todo o conteúdo e rotação restaura preferência do celular", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(mode(page)).toHaveAttribute("data-presentation", "compact");
  for (const width of [768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(mode(page)).toHaveAttribute("data-presentation", "full");
    await expect(desktopButton(page)).not.toBeVisible();
    await expect(page.locator(".about-story")).toHaveCount(0);
    await expect(page.locator("#studio").getByText(/Katielle é profissional de educação física e tem mais de 15 anos/)).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(mode(page)).toHaveAttribute("data-presentation", "compact");
  await desktopButton(page).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(mode(page)).toHaveAttribute("data-presentation", "full");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(mode(page)).toHaveAttribute("data-presentation", "full");
});

test("detalhes continuam acessíveis e o mapa compacto só carrega ao abrir", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const map = page.locator("iframe[title='Localização do Studio Katielle Faleiros em Franca']");
  await expect(map).toHaveCount(0);
  const story = page.locator(".about-story");
  await expect(story).not.toHaveAttribute("open", "");
  await page.getByText("Conheça a história da Katielle", { exact: true }).click();
  await expect(story).toHaveAttribute("open", "");
  await expect(story).toContainText("mais de 15 anos");
  await page.getByText("Mais sobre nosso cuidado", { exact: true }).click();
  await expect(page.locator(".method-details")).toHaveAttribute("open", "");
  await expect(page.locator(".method-details")).toContainText("bioimpedância");
  await page.getByText("Ver mapa do studio", { exact: true }).click();
  await expect(page.locator(".compact-map")).toHaveAttribute("open", "");
  await expect(map).toHaveCount(1);
  await expect(map).toBeVisible();
});

test("logo e anéis continuam animados no celular, com pausa e retomada", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(mode(page)).toHaveAttribute("data-presentation", "compact");
  await expect(page.getByRole("img", { name: "KF — Katielle Faleiros Personal Trainer", exact: true })).toBeVisible();
  const rings = page.locator(".activity-ring");
  for (const ring of await rings.all()) {
    await expect(ring).toHaveCSS("animation-iteration-count", "infinite");
    await expect(ring).toHaveCSS("animation-play-state", "running");
  }
  const first = rings.first();
  const before = await first.evaluate(el => getComputedStyle(el).transform);
  await expect.poll(() => first.evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
  await page.getByRole("button", { name: "Pausar movimento da abertura", exact: true }).click();
  await expect(first).toHaveCSS("animation-play-state", "paused");
  await desktopButton(page).click();
  await expect(first).toHaveCSS("animation-play-state", "paused");
  await page.getByRole("button", { name: "Retomar movimento da abertura", exact: true }).click();
  await expect(first).toHaveCSS("animation-play-state", "running");
});

test("armazenamento bloqueado mantém site e alternância utilizáveis na visita", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const blocked = () => { throw new DOMException("Armazenamento bloqueado", "SecurityError"); };
    Storage.prototype.getItem = blocked;
    Storage.prototype.setItem = blocked;
  });
  await page.goto("/");
  await expect(mode(page)).toHaveAttribute("data-presentation", "compact");
  await desktopButton(page).click();
  await expect(mode(page)).toHaveAttribute("data-presentation", "full");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await mobileButton(page).click();
  await expect(mode(page)).toHaveAttribute("data-presentation", "compact");
});

test("preferência inválida cai no modo automático e bloco de identidade do canal é removido em ambas as telas", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("kf-site-presentation", "valor-antigo-invalido"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(mode(page)).toHaveAttribute("data-presentation", "compact");
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator("#em-movimento .channel-identity")).toHaveCount(0);
    await expect(page.getByText("O nosso cuidado, em cada vídeo.", { exact: true })).toHaveCount(0);
    await expect(page.locator("#em-movimento").getByRole("link", { name: "Explorar o canal", exact: true })).toBeVisible();
  }
});

test("conteúdo compacto passa verificação de acessibilidade sem duplicar títulos", async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".hero-brand")).toHaveCSS("opacity", "1");
  await expect(page.locator(".channel-layout")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".plan-price").first()).toContainText("R$");
  const headings = page.getByRole("heading", { level: 2 });
  const titles = await headings.allTextContents();
  expect(new Set(titles).size).toBe(titles.length);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("vídeo continua montado ao alternar e miniaturas parcialmente preenchidas cabem no celular", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/rest/v1/rpc/get_public_studio_videos", route => respond(route, {
    version: 2,
    videos: [...selection.videos, { videoId: "aaaaaaaaaaa", title: "Mais atenção no treino" }],
  }));
  await page.goto("/");
  const section = page.locator("#em-movimento");
  await expect(section.locator(".channel-suggestion")).toHaveCount(1);
  await expect(section.locator(".channel-empty")).toHaveCount(2);
  const suggestion = section.getByRole("button", { name: "Assistir Mais atenção no treino" });
  await suggestion.click();
  const player = section.locator("iframe");
  await expect(player).toHaveCount(1);
  await player.evaluate(el => el.setAttribute("data-playback-test", "same-player"));
  await desktopButton(page).click();
  await expect(player).toHaveAttribute("data-playback-test", "same-player");
  await mobileButton(page).click();
  await expect(player).toHaveAttribute("data-playback-test", "same-player");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});

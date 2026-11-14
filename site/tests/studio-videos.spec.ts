import { test, expect } from "@playwright/test";
import type { Page, Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const rpc = "**/rest/v1/rpc/get_public_studio_videos";
const video = { videoId: "ZsS8bJw2i9k", title: "Um pouco do Studio Katielle Faleiros" };
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, OPTIONS" };
const respond = (route: Route, data: unknown, status = 200) => route.request().method() === "OPTIONS"
  ? route.fulfill({ status: 204, headers: cors }) : route.fulfill({ status, json: data, headers: cors });
async function selection(page: Page, videos: unknown) {
  await page.route(rpc, route => respond(route, { version: 2, videos }));
}
test.beforeEach(async ({ page }) => {
  await selection(page, [video]);
  await page.route("**/rest/v1/rpc/get_public_studio_plans", route => respond(route,
    [220, 280, 360, 420, 600].map((monthlyPrice, i) => ({ days: i + 2, monthlyPrice }))));
  await page.route("https://i.ytimg.com/**", route => route.fulfill({
    contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#172c37"/></svg>',
  }));
  await page.route("https://www.youtube-nocookie.com/**", route => route.fulfill({
    contentType: "text/html", body: "<!doctype html><title>Player simulado</title><p>Player externo simulado para teste local.</p>",
  }));
});

test("vídeo indicado em destaque, três espaços vazios e player só após clique", async ({ page }) => {
  const embeds: string[] = [];
  const privateCalls: string[] = [];
  page.on("request", r => {
    if (r.url().includes("youtube-nocookie.com")) embeds.push(r.url());
    if (/get_studio_state|get_studio_videos|save_studio_videos|auth\/v1/.test(r.url())) privateCalls.push(r.url());
  });
  await page.addInitScript(() => localStorage.setItem("sb-127-auth-token", JSON.stringify({ access_token: "never-send-this-session" })));
  await page.goto("/");
  const section = page.locator("#em-movimento");
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator(".channel-layout")).toHaveAttribute("aria-busy", "false");
  await expect(section.locator(".channel-empty")).toHaveCount(3);
  await expect(section.locator(".channel-suggestion")).toHaveCount(0);
  await expect(section.locator("iframe")).toHaveCount(0);
  expect(embeds).toEqual([]);
  await expect(section.getByRole("link", { name: "Explorar o canal" })).toHaveAttribute("href", "https://www.youtube.com/@KatielleFaleiros.");
  await expect(section.getByRole("link", { name: "Assistir no YouTube", exact: true })).toHaveAttribute("href", `https://www.youtube.com/watch?v=${video.videoId}`);
  await expect(section.locator(".channel-player")).toHaveCSS("border-top-color", "rgb(255, 104, 0)");
  await expect(section.locator(".channel-miniature").first()).toHaveCSS("border-top-style", "dashed");
  await section.getByRole("button", { name: `Reproduzir ${video.title}` }).click();
  await expect(section.locator("iframe")).toHaveAttribute("src", `https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0&playsinline=1`);
  expect(embeds).toHaveLength(1);
  expect(privateCalls).toEqual([]);
});

test("miniaturas trocam o único player e seleção atualiza após recarregar", async ({ page }) => {
  let videos = [video, { videoId: "aaaaaaaaaaa", title: "Técnica com atenção" }, { videoId: "bbbbbbbbbbb", title: "Nosso espaço" }, { videoId: "ccccccccccc", title: "Treino individualizado" }];
  await page.route(rpc, route => respond(route, { version: 4, videos }));
  await page.goto("/");
  const section = page.locator("#em-movimento");
  await expect(section.locator(".channel-suggestion")).toHaveCount(3);
  await expect(section.locator(".channel-empty")).toHaveCount(0);
  await section.getByRole("button", { name: "Assistir Técnica com atenção" }).click();
  await expect(section.locator(".channel-feature-caption h3")).toHaveText("Técnica com atenção");
  await expect(section.locator("iframe")).toHaveCount(1);
  await expect(section.locator(".channel-player")).toBeFocused();
  await expect(section.locator("iframe")).toHaveAttribute("src", /embed\/aaaaaaaaaaa\?/);
  await expect(section.getByRole("button", { name: `Assistir ${video.title}` })).toBeVisible();
  videos = [{ videoId: "ddddddddddd", title: "Nova seleção da gestão" }];
  await page.reload();
  await expect(section.locator(".channel-feature-caption h3")).toHaveText("Nova seleção da gestão");
  await expect(section.locator(".channel-empty")).toHaveCount(3);
});

test("seleção vazia é respeitada e indisponibilidade mantém vídeo inicial e link externo", async ({ page }) => {
  await selection(page, []);
  await page.goto("/");
  const section = page.locator("#em-movimento");
  await expect(section.locator(".channel-no-video")).toContainText("Novas histórias");
  await expect(section.locator(".channel-play")).toHaveCount(0);
  await page.route(rpc, route => respond(route, { message: "RPC ausente" }, 404));
  await page.reload();
  await expect(section.locator(".channel-layout")).toHaveAttribute("aria-busy", "false");
  await expect(section.locator(".channel-feature-caption h3")).toHaveText(video.title);
  await expect(section.getByRole("link", { name: "Assistir no YouTube", exact: true })).toHaveAttribute("href", `https://www.youtube.com/watch?v=${video.videoId}`);
});

test("resposta pública malformada não injeta links ou conteúdo no player", async ({ page }) => {
  await selection(page, [{ videoId: 'bad/path?"onload=', title: "Inválido" }]);
  await page.goto("/");
  const section = page.locator("#em-movimento");
  await expect(section.locator(".channel-layout")).toHaveAttribute("aria-busy", "false");
  await expect(section.locator(".channel-feature-caption h3")).toHaveText(video.title);
  await selection(page, [video, video]);
  await page.reload();
  await expect(section.locator(".channel-layout")).toHaveAttribute("aria-busy", "false");
  await expect(section.locator(".channel-empty")).toHaveCount(3);
});

test("miniatura indisponível mantém título, botão e fallback visual", async ({ page }) => {
  await page.route("https://i.ytimg.com/**", route => route.abort());
  await page.goto("/");
  const section = page.locator("#em-movimento");
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator(".channel-image-fallback")).toHaveText("KF");
  await expect(section.getByRole("button", { name: `Reproduzir ${video.title}` })).toBeVisible();
});

for (const width of [390, 768, 1440]) {
  test(`seção de vídeos cabe em ${width}px e tem controles acessíveis`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const section = page.locator("#em-movimento");
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator(".channel-layout")).toHaveAttribute("aria-busy", "false");
    const frame = await section.locator(".channel-player").boundingBox();
    expect(frame!.width / frame!.height).toBeCloseTo(16 / 9, 1);
    const bounds = await section.evaluate(el => ({ width: innerWidth, right: el.getBoundingClientRect().right, scroll: document.documentElement.scrollWidth }));
    expect(bounds.scroll).toBeLessThanOrEqual(width + 1);
    expect(bounds.right).toBeLessThanOrEqual(width + 1);
    const results = await new AxeBuilder({ page }).include("#em-movimento").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
    await section.screenshot({ path: `/tmp/kf-youtube-${width}.png` });
  });
}

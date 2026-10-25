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
  await expect(page.locator(".gallery-slide")).toHaveCount(16);
  await page
    .getByRole("button", { name: "Próximas fotos", exact: true })
    .click();
  await expect(page.locator(".gallery-bottom")).toContainText("Foto 2 de 16");
  await page
    .getByRole("group", { name: "Filtrar fotos" })
    .getByRole("button", { name: "Estrutura", exact: true })
    .click();
  await expect(page.locator(".gallery-slide")).toHaveCount(5);
  await expect(page.locator(".gallery-bottom")).toContainText("Foto 1 de 5");
  const button = page.getByRole("button", {
    name: "Ampliar foto: Por dentro do nosso studio",
    exact: true,
  });
  await button.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Por dentro do nosso studio");
  await dialog.press("ArrowRight");
  await expect(dialog).toContainText("Um ambiente para cuidar de você");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(button).toBeFocused();
  await page
    .getByRole("group", { name: "Filtrar fotos" })
    .getByRole("button", { name: "A personal", exact: true })
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
  expect(hero).toEqual({ width: 2336, height: 4160 });
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
        (img: HTMLImageElement) => img.complete && img.naturalWidth === 720,
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
  const warnings: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "warning") warnings.push(message.text());
  });
  await page.route(api, (route) =>
    respond(route, { message: "Indisponível" }, 503),
  );
  await page.goto("/");
  await expect(page.locator(".plan-note")).toContainText(
    "Consulte os valores atuais",
    { timeout: 10000 },
  );
  await expect(page.locator(".plan-price").first()).toHaveText("Consulte");
  expect(warnings.some((message) => message.includes("HTTP 503"))).toBe(true);
  expect(warnings.join(" ")).not.toContain("sb_publishable_local_test_only");
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
  await expect(page.locator(".hero-brand")).toHaveCSS("opacity", "1");
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

test("nova apresentação destaca a marca, usa FotoKatielle e mantém todos os planos iguais", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("img", { name: "KF — Katielle Faleiros Personal Trainer" }),
  ).toBeVisible();
  await expect(page.locator("#studio img")).toHaveAttribute(
    "src",
    "/media/katielle-apresentacao.jpg",
  );
  const palettes = await page.locator(".plan-card").evaluateAll((cards) =>
    cards.map((card) => {
      const css = getComputedStyle(card);
      const button = getComputedStyle(card.querySelector(".plan-contact")!);
      return {
        background: css.backgroundColor,
        color: css.color,
        border: css.borderColor,
        transform: css.transform,
        button: button.backgroundColor,
      };
    }),
  );
  expect(new Set(palettes.map((palette) => JSON.stringify(palette))).size).toBe(
    1,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".hero-brand")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".hero-visual")).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("itens do método respondem ao mouse, teclado e toque com a foto correspondente", async ({
  page,
}) => {
  await page.goto("/");
  const group = page.getByRole("group", { name: "Conheça nosso cuidado" });
  const buttons = group.getByRole("button");
  await expect(buttons).toHaveCount(3);
  await expect(buttons.nth(0)).toHaveAttribute("aria-pressed", "true");
  await buttons.nth(1).hover();
  await expect(buttons.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator(".method-photo-layer.is-active img"),
  ).toHaveAttribute("src", "/media/cuidado-na-maquina.jpg");
  await buttons.nth(2).focus();
  await expect(buttons.nth(2)).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator(".method-photo-layer.is-active img"),
  ).toHaveAttribute("src", "/media/studio-iluminacao.jpg");
  await page.setViewportSize({ width: 390, height: 844 });
  await buttons.nth(0).click();
  await expect(buttons.nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator(".method-photo-layer.is-active img"),
  ).toHaveAttribute("src", "/media/acompanhamento-no-supino.jpg");
});

test("contato incorpora mapa real com endereço completo e link externo correspondente", async ({
  page,
}) => {
  await page.goto("/");
  const map = page.locator(".contact-map iframe");
  await expect(map).toHaveAttribute(
    "title",
    "Localização do Studio Katielle Faleiros em Franca",
  );
  const src = new URL((await map.getAttribute("src"))!);
  expect(src.origin).toBe("https://www.google.com");
  expect(src.searchParams.get("output")).toBe("embed");
  expect(src.searchParams.get("q")).toBe(
    "R. Moacir Falaguasta, 2705 - Jardim Tropical, Franca - SP, 14407-061",
  );
  await expect(page.locator(".contact-details")).toContainText(
    "R. Moacir Falaguasta, 2705",
  );
  const url = new URL(
    (await page
      .getByRole("link", { name: "Ver localização", exact: true })
      .getAttribute("href"))!,
  );
  expect(url.searchParams.get("query")).toBe(src.searchParams.get("q"));
  const structured = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent())!,
  );
  expect(structured.address.postalCode).toBe("14407-061");
});

test("planos retomam a cor clara anterior e mantêm zoom no hover", async ({
  page,
}) => {
  await page.goto("/");
  const cards = page.locator(".plan-card");
  for (const card of await cards.all())
    await expect(card).toHaveCSS("background-color", "rgb(248, 247, 243)");
  await cards.nth(1).hover();
  await expect
    .poll(() =>
      cards
        .nth(1)
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a),
    )
    .toBeGreaterThan(1.03);
  await expect(cards.nth(0)).toHaveCSS("transform", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      cards
        .nth(1)
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a),
    )
    .toBeGreaterThan(1.03);
});

test("carrossel avança a cada 2,5 segundos, pausa no hover e retorna ao início", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  const track = page.locator(".gallery-track");
  await track.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(page.locator(".gallery-bottom p")).toHaveAttribute(
    "aria-live",
    "off",
  );
  await page.clock.fastForward(2600);
  await expect(page.locator(".gallery-bottom")).toContainText("Foto 2 de 16");
  await track.hover();
  await expect(page.locator(".gallery-bottom p")).toHaveAttribute(
    "aria-live",
    "polite",
  );
  const position = await track.evaluate((el) => el.scrollLeft);
  await page.clock.fastForward(6500);
  expect(await track.evaluate((el) => el.scrollLeft)).toBeCloseTo(position, 0);
  await track.evaluate((el) =>
    el.scrollTo({ left: el.scrollWidth, behavior: "instant" }),
  );
  await expect(
    page.getByRole("button", { name: "Próximas fotos", exact: true }),
  ).toBeDisabled();
  await page.mouse.move(0, 0);
  await expect(page.locator(".gallery-bottom p")).toHaveAttribute(
    "aria-live",
    "off",
  );
  await page.clock.fastForward(2600);
  await expect
    .poll(() => track.evaluate((el) => el.scrollLeft))
    .toBeLessThan(2);
});

test("pausas manuais continuam funcionando no PC com movimento reduzido", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  const track = page.locator(".gallery-track");
  await track.scrollIntoViewIfNeeded();
  await page
    .getByRole("button", { name: "Pausar carrossel automático", exact: true })
    .click();
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.mouse.move(0, 0);
  await page.clock.fastForward(6500);
  expect(await track.evaluate((el) => el.scrollLeft)).toBe(0);
  await expect(
    page.getByRole("button", { name: "Retomar carrossel automático" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Próximas fotos", exact: true })
    .click();
  await expect(page.locator(".gallery-bottom")).toContainText("Foto 2 de 16");
});

test("hero tem anéis, métricas ilustrativas e paralaxe com pausa", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".ring-progress")).toHaveCount(3);
  await expect(page.locator(".scene-disclaimer")).toContainText(
    "Métricas ilustrativas",
  );
  await expect(page.locator(".metric-vo2")).toContainText("42.1");
  await expect(page.locator(".metric-pace")).toContainText("05:02");
  const card = page.locator(".metric-vo2");
  await page.mouse.move(1300, 200);
  await expect
    .poll(() =>
      card.evaluate((el) =>
        Math.abs(new DOMMatrix(getComputedStyle(el).transform).e),
      ),
    )
    .toBeGreaterThan(1);
  await page
    .getByRole("button", { name: "Pausar movimento da abertura" })
    .click();
  await expect
    .poll(() =>
      card.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e),
    )
    .toBe(0);
  await page.mouse.move(1200, 400);
  await expect
    .poll(() =>
      card.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e),
    )
    .toBe(0);
});

test("todas as seções, cabeçalho e rodapé mantêm fundo escuro", async ({
  page,
}) => {
  await page.goto("/");
  for (const selector of [
    ".hero",
    ".about-section",
    ".method-section",
    ".video-section",
    ".gallery-section",
    ".plans-section",
    ".questions-section",
    ".contact-section",
    ".site-footer",
  ])
    await expect(page.locator(selector)).toHaveCSS(
      "background-color",
      "rgb(11, 16, 19)",
    );
  await expect(page.locator(".site-header")).toHaveCSS(
    "background-color",
    "rgba(11, 16, 19, 0.96)",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Navegação do site" }),
  ).toHaveCSS("background-color", "rgb(11, 16, 19)");
});

test("anéis giram continuamente, respeitam pausa e iniciam mesmo com movimento reduzido", async ({
  page,
}) => {
  await page.goto("/");
  const rings = page.locator(".activity-ring");
  await expect(rings).toHaveCount(3);
  for (const ring of await rings.all()) {
    await expect(ring).toHaveCSS("animation-iteration-count", "infinite");
    await expect(ring).toHaveCSS("animation-play-state", "running");
  }
  const first = rings.first();
  const start = await first.evaluate((el) => getComputedStyle(el).transform);
  await expect
    .poll(() => first.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(start);
  await page
    .getByRole("button", { name: "Pausar movimento da abertura" })
    .click();
  await expect(first).toHaveCSS("animation-play-state", "paused");
  await page
    .getByRole("button", { name: "Retomar movimento da abertura" })
    .click();
  await expect(first).toHaveCSS("animation-play-state", "running");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(first).toHaveCSS("animation-name", "ring-orbit");
});

test("anéis permanecem centralizados em movimento normal e reduzido no PC e celular", async ({
  page,
}) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/");
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const distances = await page
        .locator(".activity-rings")
        .evaluate((svg) => {
          const center = (el: Element) => {
            const rect = el.getBoundingClientRect();
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          };
          const guide = center(svg.querySelector(".orbit-guide")!);
          return [...svg.querySelectorAll(".ring-track")].map((el) => {
            const ring = center(el);
            return Math.hypot(ring.x - guide.x, ring.y - guide.y);
          });
        });
      for (const distance of distances) expect(distance).toBeLessThan(1);
      const alignment = await page
        .locator(".activity-orbit")
        .evaluate((orbit) => {
          const svg = orbit
            .querySelector(".activity-rings")!
            .getBoundingClientRect();
          const brand = orbit
            .querySelector(".hero-brand")!
            .getBoundingClientRect();
          return Math.hypot(
            svg.x + svg.width / 2 - brand.x - brand.width / 2,
            svg.y + svg.height / 2 - brand.y - brand.height / 2,
          );
        });
      expect(alignment).toBeLessThan(1);
    }
  }
});

test("PC inicia anéis e carrossel automaticamente sem preferência salva nem clique em play", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  expect(
    await page.evaluate(() => localStorage.getItem("kf-allow-motion")),
  ).toBeNull();
  const ring = page.locator(".activity-ring").first();
  await expect(ring).toHaveCSS("animation-iteration-count", "infinite");
  await expect(ring).toHaveCSS("animation-play-state", "running");
  await expect(
    page.getByRole("button", { name: "Pausar movimento da abertura" }),
  ).toBeVisible();
  await page.locator(".gallery-track").scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(page.locator(".gallery-bottom p")).toHaveAttribute(
    "aria-live",
    "off",
  );
  await page.clock.fastForward(2600);
  await expect(page.locator(".gallery-bottom")).toContainText("Foto 2 de 16");
  await page.reload();
  await expect(ring).toHaveCSS("animation-play-state", "running");
  await page
    .getByRole("button", { name: "Pausar movimento da abertura" })
    .click();
  await expect(ring).toHaveCSS("animation-play-state", "paused");
});

test("retomar galeria no PC não prende o autoplay após clique de mouse", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  await page.locator(".gallery-track").scrollIntoViewIfNeeded();
  await page
    .getByRole("button", { name: "Pausar carrossel automático", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retomar carrossel automático", exact: true })
    .click();
  // A mouse click may retain focus; only keyboard focus should suspend autoplay.
  await expect(page.locator(".gallery-bottom p")).toHaveAttribute(
    "aria-live",
    "off",
  );
  await page.clock.fastForward(2600);
  await expect(page.locator(".gallery-bottom")).toContainText("Foto 2 de 16");
  await page.keyboard.press("Tab");
  await expect(page.locator(".gallery-bottom p")).toHaveAttribute(
    "aria-live",
    "polite",
  );
});

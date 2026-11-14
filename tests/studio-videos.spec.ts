import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const ids = ["testvideo01", "testvideo02", "testvideo03", "testvideo04"];
const backend = "http://127.0.0.1:59999";
const thumbnail = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function openVideos(page: Page) {
  const menu = page.getByRole("button", { name: "Abrir menu", exact: true });
  if (await menu.isVisible()) {
    if ((await menu.getAttribute("aria-expanded")) === "false") await menu.click();
  }
  await page.getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name: "Configurações", exact: true }).click();
  await page.getByRole("navigation", { name: "Seções de configurações" })
    .getByRole("button", { name: "Vídeos do YouTube", exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.route("https://i.ytimg.com/**", (route) => route.fulfill({ contentType: "image/png", body: thumbnail }));
});

test.describe("seleção demonstrativa de vídeos", () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== "demo", "Usa armazenamento demonstrativo.");
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("kf-studio-youtube-v1", JSON.stringify({ version: 0, videos: [] }));
    });
    await page.reload();
    await openVideos(page);
  });

  test("salva quatro vídeos, promove uma miniatura, remove e restaura a seleção após recarregar", async ({ page }) => {
    for (let index = 0; index < ids.length; index++) {
      await page.getByRole("button", { name: index === 0 ? "Adicionar vídeo principal" : "Adicionar vídeo", exact: true }).click();
      await page.getByLabel(`Link do vídeo ${index + 1}`, { exact: true }).fill(`https://youtu.be/${ids[index]}`);
      await page.getByLabel(`Título do vídeo ${index + 1}`, { exact: true }).fill(`Vídeo selecionado ${index + 1}`);
    }
    await expect(page.getByRole("button", { name: "Adicionar vídeo", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Subir vídeo 2", exact: true }).click();
    await expect(page.getByLabel("Título do vídeo 1", { exact: true })).toHaveValue("Vídeo selecionado 2");
    await page.getByRole("button", { name: "Salvar vídeos", exact: true }).click();
    await expect(page.locator('.toast[role="status"]')).toContainText("Vídeos salvos apenas neste navegador");
    await page.reload();
    await openVideos(page);
    await expect(page.getByLabel("Título do vídeo 1", { exact: true })).toHaveValue("Vídeo selecionado 2");
    await expect(page.getByLabel("Link do vídeo 4", { exact: true })).toHaveValue(`https://www.youtube.com/watch?v=${ids[3]}`);
    await page.getByRole("button", { name: "Remover vídeo 2", exact: true }).click();
    await expect(page.getByLabel("Título do vídeo 2", { exact: true })).toHaveValue("Vídeo selecionado 3");
    await page.getByRole("button", { name: "Salvar vídeos", exact: true }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("kf-studio-youtube-v1")!).videos.map((video: {videoId:string}) => video.videoId))).toEqual([ids[1], ids[2], ids[3]]);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.getByRole("button", { name: "Salvar vídeos", exact: true })).toBeVisible();
  });

  test("rejeita links falsos e vídeos duplicados sem substituir a seleção salva", async ({ page }) => {
    await page.getByRole("button", { name: "Adicionar vídeo principal", exact: true }).click();
    await page.getByLabel("Link do vídeo 1", { exact: true }).fill(`https://youtube.com.evil.example/watch?v=${ids[0]}`);
    await page.getByLabel("Título do vídeo 1", { exact: true }).fill("Vídeo de teste");
    await page.getByRole("button", { name: "Salvar vídeos", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("link HTTPS de vídeo do YouTube válido");
    await page.getByLabel("Link do vídeo 1", { exact: true }).fill(`https://youtu.be/${ids[0]}`);
    await page.getByRole("button", { name: "Adicionar vídeo", exact: true }).click();
    await page.getByLabel("Link do vídeo 2", { exact: true }).fill(`https://www.youtube.com/shorts/${ids[0]}`);
    await page.getByLabel("Título do vídeo 2", { exact: true }).fill("Mesmo vídeo, outro título");
    await page.getByRole("button", { name: "Salvar vídeos", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Cada vídeo deve aparecer apenas uma vez");
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("kf-studio-youtube-v1")!))).toEqual({ version: 0, videos: [] });
    await expect(page.getByLabel("Título do vídeo 2", { exact: true })).toHaveValue("Mesmo vídeo, outro título");
  });

  test("aceita somente IDs e links HTTPS de vídeo do YouTube nos formatos suportados", async ({ page }) => {
    const results = await page.evaluate(async () => {
      const modulePath = "/src/lib/studioVideos.ts";
      const { parseYoutubeVideoId } = await import(modulePath);
      const accepted = [
        "testvideo01",
        "https://www.youtube.com/watch?v=testvideo01&list=PL123",
        "https://youtu.be/testvideo01?t=10",
        "https://m.youtube.com/shorts/testvideo01",
        "https://www.youtube.com/embed/testvideo01",
        "https://www.youtube.com/live/testvideo01",
      ].map((value) => parseYoutubeVideoId(value));
      const rejected = [
        "https://youtube.com.evil.example/watch?v=testvideo01",
        "https://evil.example/?v=testvideo01",
        "https://www.youtube.com@evil.example/watch?v=testvideo01",
        "http://www.youtube.com/watch?v=testvideo01",
        "https://www.youtube.com:444/watch?v=testvideo01",
        "https://www.youtube.com/playlist?list=testvideo01",
        "https://www.youtube.com/watch?v=too-short",
        "javascript:alert(1)",
      ].map((value) => parseYoutubeVideoId(value));
      return { accepted, rejected };
    });
    expect(results.accepted).toEqual(Array(6).fill(ids[0]));
    expect(results.rejected).toEqual(Array(8).fill(null));
  });
});

type Selection = { version: number; videos: { videoId: string; title: string }[] };
async function mockRemote(page: Page, missing = false) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const store = await page.evaluate(async () => {
    const modulePath = "/src/data.ts";
    const { seed } = await import(modulePath);
    return { ...seed(), schemaVersion: 9 };
  });
  let selection: Selection = { version: 4, videos: [{ videoId: ids[0], title: "Vídeo salvo no banco" }] };
  let conflict = false;
  const writes: { p_videos: Selection["videos"]; p_expected_version: number }[] = [];
  const user = {
    id: "11111111-1111-4111-8111-111111111111", email: "admin@exemplo.com", aud: "authenticated", role: "authenticated",
    app_metadata: { provider: "email" }, user_metadata: { full_name: "Katielle Faleiros" }, created_at: new Date().toISOString(),
  };
  const access_token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"), Buffer.from(JSON.stringify({ sub: user.id, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url"), "test-signature"].join(".");
  await page.route(backend + "/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "content-type": "application/json" };
    const respond = (value: unknown, status = 200) => route.fulfill({ status, headers, body: JSON.stringify(value) });
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (path === "/auth/v1/token") return respond({ access_token, refresh_token: "test-refresh", token_type: "bearer", expires_in: 3600, user });
    if (path === "/auth/v1/user") return respond(user);
    if (path.endsWith("/get_studio_state")) return respond(store);
    if (path.endsWith("/get_studio_videos")) return missing ? respond({ code: "PGRST202", message: "Function not found" }, 404) : respond(selection);
    if (path.endsWith("/save_studio_videos")) {
      const body = route.request().postDataJSON();
      writes.push(body);
      if (conflict) return respond({ code: "40001", message: "A seleção foi alterada em outra sessão." }, 409);
      selection = { version: selection.version + 1, videos: body.p_videos };
      return respond(selection);
    }
    return respond({ message: `Unexpected test request: ${path}` }, 404);
  });
  await page.getByLabel("E-mail", { exact: true }).fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill("SenhaDeTeste123!");
  await page.getByRole("button", { name: "Entrar no studio", exact: true }).click();
  await openVideos(page);
  return {
    writes,
    getSelection: () => selection,
    simulateConflict: () => { conflict = true; selection = { version: 9, videos: [{ videoId: ids[1], title: "Alteração de outra sessão" }] }; },
    clearConflict: () => { conflict = false; },
  };
}

test.describe("seleção de vídeos na API administrativa", () => {
  test.beforeEach(async ({}, info) => { test.skip(info.project.name !== "supabase", "Usa API administrativa simulada."); });

  test("salva com a versão lida, preserva campos em conflito e só substitui após recarga explícita", async ({ page }) => {
    const api = await mockRemote(page);
    await expect(page.getByLabel("Título do vídeo 1", { exact: true })).toHaveValue("Vídeo salvo no banco");
    await page.getByLabel("Título do vídeo 1", { exact: true }).fill("Novo destaque do site");
    await page.getByRole("button", { name: "Salvar vídeos", exact: true }).click();
    await expect(page.locator('.toast[role="status"]')).toContainText("Vídeos do site atualizados");
    expect(api.writes[0]).toEqual({ p_videos: [{ videoId: ids[0], title: "Novo destaque do site" }], p_expected_version: 4 });
    api.simulateConflict();
    await page.getByLabel("Título do vídeo 1", { exact: true }).fill("Minha edição ainda não salva");
    await page.getByRole("button", { name: "Salvar vídeos", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Seus campos foram preservados");
    await expect(page.getByLabel("Título do vídeo 1", { exact: true })).toHaveValue("Minha edição ainda não salva");
    await expect(page.getByRole("button", { name: "Salvar vídeos", exact: true })).toBeDisabled();
    expect(api.getSelection().videos[0].title).toBe("Alteração de outra sessão");
    await page.getByRole("button", { name: "Recarregar seleção salva", exact: true }).click();
    await expect(page.getByLabel("Título do vídeo 1", { exact: true })).toHaveValue("Alteração de outra sessão");
    api.clearConflict();
    await page.getByLabel("Título do vídeo 1", { exact: true }).fill("Edição reconciliada");
    await page.getByRole("button", { name: "Salvar vídeos", exact: true }).click();
    await expect.poll(() => api.getSelection().version).toBe(10);
    expect(api.writes[2].p_expected_version).toBe(9);
  });

  test("migração ausente informa a ação necessária e impede salvar", async ({ page }) => {
    await mockRemote(page, true);
    await expect(page.getByRole("alert")).toContainText("Aplique a migração 010");
    await expect(page.getByRole("button", { name: "Salvar vídeos", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Tentar carregar novamente", exact: true })).toBeVisible();
  });
});

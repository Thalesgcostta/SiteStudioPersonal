import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: fileURLToPath(new URL("./site", import.meta.url)),
  envDir: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [
    react(),
    {
      name: "studio-public-config-diagnostics",
      configResolved(config) {
        if (config.command !== "build") return;
        const hasUrl = Boolean(config.env.VITE_SUPABASE_URL?.trim());
        const hasKey = Boolean(
          (
            config.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
            config.env.VITE_SUPABASE_ANON_KEY
          )?.trim(),
        );
        config.logger.info(
          `[Portfólio/Supabase] VITE_SUPABASE_URL: ${hasUrl ? "presente" : "ausente"}; chave pública: ${hasKey ? "presente" : "ausente"}.`,
        );
        if (!hasUrl || !hasKey)
          config.logger.warn(
            "[Portfólio/Supabase] Sem essas variáveis durante o build, os preços aparecerão como Consulte. Cadastre-as nas variáveis de build do projeto público e execute um novo build.",
          );
      },
    },
  ],
  build: { outDir: "../dist-site", emptyOutDir: true },
});

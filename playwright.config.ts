import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    headless: true,
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    },
  },
  projects: [
    {
      name: "demo",
      testMatch: ["studio.spec.ts", "preferences-address.spec.ts"],
      use: { baseURL: "http://127.0.0.1:5180" },
    },
    {
      name: "supabase",
      testMatch: "supabase.spec.ts",
      use: { baseURL: "http://127.0.0.1:5181" },
    },
  ],
  // Servidores isolados: nunca reutilizar o servidor configurado para o banco real.
  webServer: [
    {
      command: "npm run dev -- --port 5180 --strictPort --force",
      url: "http://127.0.0.1:5180",
      reuseExistingServer: false,
      env: {
        VITE_DATA_MODE: "demo",
        VITE_SUPABASE_URL: "",
        VITE_SUPABASE_PUBLISHABLE_KEY: "",
        VITE_SUPABASE_ANON_KEY: "",
      },
    },
    {
      command: "npm run dev -- --port 5181 --strictPort --force",
      url: "http://127.0.0.1:5181",
      reuseExistingServer: false,
      env: {
        VITE_DATA_MODE: "supabase",
        VITE_SUPABASE_URL: "http://127.0.0.1:59999",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test_only",
        VITE_SUPABASE_ANON_KEY: "",
      },
    },
  ],
});

import { useEffect, useState } from "react";
export type PublicPlan = { days: number; monthlyPrice: number };
export const publicPlanDays = [2, 3, 4, 5] as const;
const referencePlans: PublicPlan[] = [220, 280, 360, 420].map(
  (monthlyPrice, index) => ({ days: publicPlanDays[index], monthlyPrice }),
);
class PublicPlansError extends Error {}
const reportFailure = (message: string) =>
  console.warn(`[Planos do studio] ${message}`);

export function usePublicPlans() {
  const [plans, setPlans] = useState<PublicPlan[] | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "unavailable" | "reference"
  >("loading");
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL?.trim();
    const key = (
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )?.trim();
    if (!url || !key || key.startsWith("sb_secret_")) {
      if (!url || !key) {
        const missing = [
          !url && "VITE_SUPABASE_URL",
          !key && "VITE_SUPABASE_PUBLISHABLE_KEY (ou VITE_SUPABASE_ANON_KEY)",
        ].filter(Boolean);
        reportFailure(
          `Configuração ausente no build: ${missing.join(", ")}. Configure as variáveis de build do portfólio e gere um novo build. Variáveis apenas no runtime do Worker não configuram o site estático.`,
        );
      } else {
        reportFailure(
          "A chave configurada não é pública. Use a chave publishable ou anon do projeto Supabase.",
        );
      }
      if (import.meta.env.DEV) {
        setPlans(referencePlans);
        setStatus("reference");
      } else setStatus("unavailable");
      return;
    }
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 7000);
    const headers: Record<string, string> = {
      apikey: key,
      "content-type": "application/json",
    };
    // Uma chave anon legada é um JWT. O site nunca consulta a sessão do administrativo.
    if (!key.startsWith("sb_publishable_")) {
      try {
        const payload = JSON.parse(
          atob(key.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")),
        );
        if (payload.role !== "anon") throw new Error();
        headers.Authorization = `Bearer ${key}`;
      } catch {
        reportFailure(
          "A chave configurada é inválida para consulta pública. Use a chave publishable (sb_publishable_...) ou anon, sem aspas ao cadastrar o valor no Cloudflare.",
        );
        setStatus("unavailable");
        window.clearTimeout(timeout);
        return;
      }
    }
    void fetch(
      `${url.replace(/\/$/, "")}/rest/v1/rpc/get_public_studio_plans`,
      { method: "POST", headers, body: "{}", signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) {
          const advice =
            response.status === 404
              ? "Confira a URL do projeto e execute a migração 006 para criar get_public_studio_plans no mesmo Supabase do administrativo."
              : response.status === 401 || response.status === 403
                ? "Confira a chave pública do mesmo projeto e as permissões da função get_public_studio_plans."
                : "Verifique a disponibilidade do projeto Supabase.";
          throw new PublicPlansError(
            `Consulta recusada: HTTP ${response.status}. ${advice}`,
          );
        }
        const data: unknown = await response.json().catch(() => {
          throw new PublicPlansError(
            "O Supabase não retornou JSON. Confira a URL do projeto configurada no build.",
          );
        });
        if (
          !Array.isArray(data) ||
          data.length < 4 ||
          data.length > 5 ||
          !data.every(
            (p) =>
              p !== null &&
              typeof p === "object" &&
              Number.isInteger(p.days) &&
              p.days >= 1 &&
              p.days <= 5 &&
              Number.isFinite(p.monthlyPrice) &&
              p.monthlyPrice > 0,
          )
        )
          throw new PublicPlansError(
            "Resposta de planos inválida. A função pública deve retornar days e monthlyPrice numéricos para os planos de 2 a 5 dias.",
          );
        // Aceita a função anterior com cinco planos durante a atualização do banco.
        const publicPlans: PublicPlan[] = data.filter((p) => p.days >= 2);
        if (
          publicPlans.length !== publicPlanDays.length ||
          new Set(publicPlans.map((p) => p.days)).size !== publicPlanDays.length
        )
          throw new PublicPlansError(
            "Planos incompletos ou duplicados. Confira os quatro planos de 2 a 5 dias no banco.",
          );
        if (active) {
          setPlans(publicPlans.sort((a, b) => a.days - b.days));
          setStatus("ready");
        }
      })
      .catch((error: unknown) => {
        if (active) {
          reportFailure(
            error instanceof PublicPlansError
              ? error.message
              : controller.signal.aborted
                ? "A consulta ao Supabase excedeu 7 segundos. Confira se o projeto está ativo e tente recarregar a página."
                : "Não foi possível acessar o Supabase. Confira a URL do projeto e a resposta da requisição get_public_studio_plans em Rede/Network.",
          );
          setPlans(null);
          setStatus("unavailable");
        }
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);
  return { plans, status };
}

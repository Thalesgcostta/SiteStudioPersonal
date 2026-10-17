import { useEffect, useState } from "react";
export type PublicPlan = { days: number; monthlyPrice: number };
export const publicPlanDays = [2, 3, 4, 5] as const;
const referencePlans: PublicPlan[] = [220, 280, 360, 420].map(
  (monthlyPrice, index) => ({ days: publicPlanDays[index], monthlyPrice }),
);
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
        if (!response.ok) throw new Error();
        const data: unknown = await response.json();
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
          throw new Error();
        // Aceita a função anterior com cinco planos durante a atualização do banco.
        const publicPlans: PublicPlan[] = data.filter((p) => p.days >= 2);
        if (
          publicPlans.length !== publicPlanDays.length ||
          new Set(publicPlans.map((p) => p.days)).size !== publicPlanDays.length
        )
          throw new Error();
        if (active) {
          setPlans(publicPlans.sort((a, b) => a.days - b.days));
          setStatus("ready");
        }
      })
      .catch(() => {
        if (active) {
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

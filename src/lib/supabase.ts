import { createClient } from "@supabase/supabase-js";

const requestedMode = import.meta.env.VITE_DATA_MODE;
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();
export const dataMode = requestedMode || (url || key ? "supabase" : "demo");
export const initialRecovery = window.location.hash.includes("type=recovery");
function configurationError() {
  if (!["demo", "supabase"].includes(dataMode))
    return "VITE_DATA_MODE deve ser demo ou supabase.";
  if (dataMode === "demo") return "";
  if (!url || !key || url.includes("SEU-PROJETO"))
    return "Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no arquivo .env.local ou nas variáveis do Cloudflare Pages.";
  try {
    const parsed = new URL(url);
    if (
      parsed.username ||
      parsed.password ||
      !(
        parsed.protocol === "https:" ||
        (parsed.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(parsed.hostname))
      )
    )
      return "Use a URL HTTPS do projeto Supabase.";
  } catch {
    return "A URL do Supabase é inválida.";
  }
  if (key.startsWith("sb_secret_"))
    return "Uma chave secreta não pode ser usada no navegador. Substitua pela chave publishable e revogue a chave exposta.";
  if (!key.startsWith("sb_publishable_")) {
    try {
      const payload = JSON.parse(
        atob(key.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")),
      );
      if (payload.role !== "anon")
        return "Use somente a chave publishable ou anon, nunca service_role.";
    } catch {
      return "Use a chave publishable (sb_publishable_...) ou a antiga chave anon do Supabase.";
    }
  }
  return "";
}
export const configError = configurationError();
export const supabase =
  dataMode === "supabase" && !configError
    ? createClient(url!, key!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
export function errorMessage(error: unknown): string {
  const e = error as { code?: string; message?: string; status?: number };
  if (e?.code === "42501")
    return "Este usuário não tem permissão administrativa. Confira o cadastro em studio_admins.";
  if (e?.code === "23505")
    return "Já existe um registro com este CPF, horário ou identificador. Atualize os dados antes de tentar novamente.";
  if (e?.code === "23503")
    return "Um registro relacionado não foi encontrado. Atualize os dados.";
  if (e?.code === "23514" || e?.code === "23502" || e?.code === "22P02")
    return "Revise os campos: um valor obrigatório, formato ou limite não foi aceito pelo banco.";
  if (e?.code === "PGRST202" || e?.code === "42P01")
    return "Execute as migrações SQL deste projeto no Supabase antes de entrar.";
  if (e?.message === "Invalid login credentials")
    return "E-mail ou senha incorretos.";
  if (e?.message === "Email not confirmed")
    return "Confirme o e-mail ou use um usuário confirmado no painel do Supabase.";
  if (e?.code === "22023") return e.message || "Operação inválida.";
  return "Não foi possível confirmar a operação. Verifique a conexão e atualize os dados antes de tentar novamente.";
}

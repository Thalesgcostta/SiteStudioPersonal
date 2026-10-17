// Cliente exclusivo do cadastro público: não importa o SDK nem lê sessões administrativas.
export async function publicRegistrationRpc<T>(
  name: string,
  payload: unknown,
): Promise<T> {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !key || key.startsWith("sb_secret_"))
    throw new Error(
      "Cadastro temporariamente indisponível. Entre em contato com o studio.",
    );
  const headers: Record<string, string> = {
    apikey: key,
    "content-type": "application/json",
  };
  if (!key.startsWith("sb_publishable_")) {
    try {
      const token = JSON.parse(
        atob(key.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")),
      );
      if (token.role !== "anon") throw new Error();
      headers.Authorization = `Bearer ${key}`;
    } catch {
      throw new Error(
        "Cadastro temporariamente indisponível. Entre em contato com o studio.",
      );
    }
  }
  try {
    const response = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/rpc/${name}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: AbortSignal.timeout(15000),
      },
    );
    const result = await response.json();
    if (!response.ok) {
      if (result.code === "22023" && typeof result.message === "string")
        throw new Error(result.message);
      throw new Error(
        "Não foi possível enviar o cadastro. Tente novamente ou entre em contato com o studio.",
      );
    }
    return result as T;
  } catch (error) {
    if (error instanceof Error && error.name === "Error") throw error;
    throw new Error(
      "Confira sua conexão e tente novamente. Se o envio já foi recebido, ele não será duplicado.",
    );
  }
}

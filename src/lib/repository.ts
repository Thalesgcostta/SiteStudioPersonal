import type { Store } from "../data";
import { uid } from "../data";
import { assertStore } from "./actions";
import type { StudioAction } from "./actions";
import { errorMessage, supabase } from "./supabase";

export async function loadRemoteStore(): Promise<Store> {
  if (!supabase) throw new Error("Supabase não configurado.");
  const { data, error } = await supabase.rpc("get_studio_state");
  if (error) throw new Error(errorMessage(error));
  assertStore(data);
  return data;
}
export async function applyRemoteAction(action: StudioAction): Promise<Store> {
  if (!supabase) throw new Error("Supabase não configurado.");
  if (action.type === "reset_demo")
    throw new Error(
      "Restaurar exemplos só está disponível no modo de demonstração.",
    );
  const requestId = uid();
  const { type, ...rest } = action;
  const payload: Record<string, unknown> = { ...rest };
  if (action.type === "record_payment") {
    delete payload.file;
    if (action.file) {
      if (
        action.file.size > 5 * 1024 * 1024 ||
        !["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(
          action.file.type,
        )
      )
        throw new Error("Use imagem PNG, JPEG, WebP ou PDF de até 5 MB.");
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user)
        throw new Error("Sua sessão expirou. Entre novamente.");
      const safeName = action.file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `receipts/${auth.user.id}/${action.billId}/${action.receipt.id}/${safeName}`;
      const { error } = await supabase.storage
        .from("studio-documents")
        .upload(path, action.file, {
          contentType: action.file.type,
          upsert: false,
        });
      if (error)
        throw new Error(
          "Não foi possível enviar o comprovante. Confira a conexão, o bucket privado e a segunda migração SQL.",
        );
      payload.receipt = {
        ...action.receipt,
        attachment: action.file.name,
        attachmentPath: path,
      };
    }
  }
  // A mesma solicitação é reutilizada em uma única repetição por falha de transporte.
  // O banco deduplica o identificador dentro da transação.
  let response = await supabase.rpc("apply_studio_action", {
    p_type: type,
    p_payload: payload,
    p_request_id: requestId,
  });
  if (
    response.error &&
    !response.error.code &&
    response.error.message?.includes("fetch")
  )
    response = await supabase.rpc("apply_studio_action", {
      p_type: type,
      p_payload: payload,
      p_request_id: requestId,
    });
  if (response.error) throw new Error(errorMessage(response.error));
  assertStore(response.data);
  return response.data;
}
export async function downloadReceipt(path: string, name: string) {
  if (!supabase)
    throw new Error("Comprovantes reais requerem o modo Supabase.");
  const { data, error } = await supabase.storage
    .from("studio-documents")
    .download(path);
  if (error || !data)
    throw new Error(
      "Não foi possível baixar o comprovante. Confira sua sessão e a conexão.",
    );
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name || "comprovante";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

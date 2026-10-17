import type { Store } from "../data";
import { uid, upgradeStore } from "../data";
import { assertStore } from "./actions";
import type { StudioAction } from "./actions";
import { errorMessage, supabase } from "./supabase";
let serverVersion = 0;

export async function loadRemoteStore(): Promise<Store> {
  if (!supabase) throw new Error("Supabase não configurado.");
  const { data, error } = await supabase.rpc("get_studio_state");
  if (error) throw new Error(errorMessage(error));
  assertStore(data);
  serverVersion = data.schemaVersion || 1;
  return upgradeStore({ ...data, schemaVersion: serverVersion });
}
export async function applyRemoteAction(action: StudioAction): Promise<Store> {
  if (!supabase) throw new Error("Supabase não configurado.");
  if (serverVersion < 8 && action.type === "delete_student")
    throw new Error("Execute a migração 202610170008_student_deletion.sql no Supabase para excluir alunos.");
  if (
    serverVersion < 7 &&
    ([
      "save_recurring_expense",
      "pay_recurring_expense",
      "set_registration_access",
    ].includes(action.type) ||
      (action.type === "save_student" && action.student.addressFields))
  )
    throw new Error(
      "Execute a migração 202610170007_studio_registration_expenses.sql no Supabase para usar endereços separados, despesas fixas e cadastro por link.",
    );
  if (
    serverVersion < 4 &&
    (action.type === "delete_product" ||
      (action.type === "save_product" &&
        action.product.illustration &&
        action.product.illustration !== "category"))
  )
    throw new Error(
      "Execute a migração 202610140004_product_inventory.sql no Supabase para usar exclusão e desenhos de produtos.",
    );
  if (
    serverVersion < 3 &&
    (["save_settings", "save_dashboard", "record_evaluation_payment"].includes(
      action.type,
    ) ||
      (action.type === "save_product" &&
        (action.file || action.product.photoPath !== undefined)) ||
      (action.type === "record_evaluation" &&
        (action.evaluation.charge > 0 || action.payment)))
  )
    throw new Error(
      "Execute a migração 202610140003_studio_management.sql no Supabase para usar esta função.",
    );
  if (action.type === "reset_demo")
    throw new Error(
      "Restaurar exemplos só está disponível no modo de demonstração.",
    );
  const requestId = uid();
  const { type, ...rest } = action;
  const payload: Record<string, unknown> = { ...rest };
  delete payload.file;
  if (action.type === "save_product") {
    const product = { ...action.product };
    delete product.photo;
    if (action.file) {
      if (
        action.file.size > 2 * 1024 * 1024 ||
        !["image/png", "image/jpeg", "image/webp"].includes(action.file.type)
      )
        throw new Error("Use uma foto PNG, JPEG ou WebP de até 2 MB.");
      const { data: auth, error } = await supabase.auth.getUser();
      if (error || !auth.user)
        throw new Error("Entre novamente para enviar a foto.");
      const ext =
        action.file.type === "image/png"
          ? "png"
          : action.file.type === "image/webp"
            ? "webp"
            : "jpg";
      const path = `products/${auth.user.id}/${product.id}/${uid()}.${ext}`;
      const upload = await supabase.storage
        .from("product-images")
        .upload(path, action.file, {
          contentType: action.file.type,
          upsert: false,
        });
      if (upload.error)
        throw new Error(
          "Não foi possível enviar a foto. Confira a migração 003 e a conexão.",
        );
      product.photoPath = path;
    }
    payload.product = product;
  }
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
  serverVersion = response.data.schemaVersion || 1;
  return upgradeStore({
    ...response.data,
    schemaVersion: response.data.schemaVersion || 1,
  });
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

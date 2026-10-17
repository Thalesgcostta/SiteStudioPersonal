import { Copy, Link, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useStudio } from "./context";
export function RegistrationLink() {
  const { store, mode, execute, saving, notify, open } = useStudio();
  const access = store.registrationAccess;
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);
  const url = new URL("cadastro.html", window.location.href);
  url.hash = access?.token || "";
  const pending = store.students.filter(
    (student) => student.registrationPending,
  ).length;
  return (
    <details className="registration-link-panel">
      <summary>
        <Link size={17} /> Cadastro por link{" "}
        {pending > 0 && <span>{pending} aguardando conferência</span>}
      </summary>
      <div>
        {mode === "demo" ? (
          <p>
            O envio de cadastros fica disponível no modo Supabase, com a
            migração 007 aplicada.
          </p>
        ) : !access ? (
          <p>
            Execute a migração 202610170007_studio_registration_expenses.sql no
            Supabase para habilitar o formulário.
          </p>
        ) : (
          <>
            <p>
              Envie este link aos alunos. Eles preenchem os dados sem login e
              aparecem como “Cadastro pendente” para conferência e ativação. O
              envio não altera cadastros já existentes com o mesmo CPF.
            </p>
            <div className="registration-copy">
              <input
                aria-label="Link de cadastro dos alunos"
                readOnly
                value={url.href}
              />
              <button
                className="button secondary"
                disabled={!access.enabled}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url.href);
                    notify("Link de cadastro copiado.");
                  } catch {
                    notify("Selecione o link e copie com Ctrl+C.");
                  }
                }}
              >
                <Copy size={16} /> Copiar link
              </button>
            </div>
            <div className="registration-access-actions">
              <label>
                <input
                  type="checkbox"
                  checked={pendingEnabled ?? access.enabled}
                  disabled={saving || pendingEnabled !== null}
                  onChange={(event) => {
                    const enabled = event.target.checked;
                    setPendingEnabled(enabled);
                    void execute({ type: "set_registration_access", enabled })
                      .catch((error) => notify(error.message))
                      .finally(() => setPendingEnabled(null));
                  }}
                />{" "}
                Aceitar cadastros por este link
              </label>
              <button
                className="text-button"
                disabled={saving}
                onClick={() =>
                  open({
                    type: "confirm",
                    title: "Gerar novo link de cadastro?",
                    message:
                      "O link atual deixará de aceitar cadastros. Envie o novo link aos alunos que ainda não preencheram.",
                    onConfirm: async () => {
                      await execute({
                        type: "set_registration_access",
                        rotate: true,
                      });
                      notify("Novo link gerado.");
                    },
                  })
                }
              >
                <RefreshCw size={15} /> Gerar novo link
              </button>
            </div>
          </>
        )}
      </div>
    </details>
  );
}

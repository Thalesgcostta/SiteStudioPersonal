import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, LockKeyhole, LogOut, RefreshCw } from "lucide-react";
import { supabase, errorMessage } from "./lib/supabase";
export function AuthGate({
  error = "",
  loading = false,
  recovery = false,
  onRecovered,
  onRetry,
  onLogout,
}: {
  error?: string;
  loading?: boolean;
  recovery?: boolean;
  onRecovered?: () => void;
  onRetry?: () => void;
  onLogout?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reset, setReset] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || pending) return;
    setFormError("");
    setMessage("");
    if (recovery && (password.length < 12 || password !== confirm)) {
      setFormError("Use pelo menos 12 caracteres e confirme a mesma senha.");
      return;
    }
    setPending(true);
    try {
      if (recovery) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        onRecovered?.();
      } else if (reset) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + window.location.pathname,
        });
        if (error) throw error;
        setMessage(
          "Se houver uma conta para este e-mail, você receberá as instruções para redefinir a senha.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <img src="/logo.svg" alt="KF Personal Trainer" />
        <span>GESTÃO DO STUDIO</span>
      </div>
      <section className="auth-card" aria-label="Acesso administrativo">
        <div className="auth-lock">
          <LockKeyhole size={24} />
        </div>
        <h1>
          {loading
            ? "Preparando seu studio"
            : error
              ? "Não foi possível abrir o studio"
              : recovery
                ? "Defina sua nova senha"
                : reset
                  ? "Recuperar acesso"
                  : "Acesse seu studio"}
        </h1>
        <p>
          {loading
            ? "Carregando os dados com segurança."
            : error
              ? "Confira a configuração ou sua permissão administrativa."
              : recovery
                ? "Escolha uma senha forte para a conta administrativa."
                : reset
                  ? "Informe o e-mail da conta administrativa."
                  : "Entre com sua conta administrativa para continuar."}
        </p>
        {loading ? (
          <div className="auth-loading" role="status">
            Carregando…
          </div>
        ) : error ? (
          <>
            <p className="form-error" role="alert">
              {error}
            </p>
            {onRetry && (
              <button className="button primary full" onClick={onRetry}>
                <RefreshCw size={16} />
                Tentar novamente
              </button>
            )}
            {onLogout && (
              <button className="button secondary full" onClick={onLogout}>
                <LogOut size={15} />
                Voltar para o login
              </button>
            )}
            {!onRetry && (
              <p className="subtle-note">
                O passo a passo está em docs/SUPABASE.md, na pasta do projeto.
              </p>
            )}
          </>
        ) : (
          <form onSubmit={submit}>
            {!recovery && (
              <label className="field">
                E-mail
                <input
                  required
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </label>
            )}
            {(!reset || recovery) && (
              <label className="field">
                {recovery ? "Nova senha" : "Senha"}
                <input
                  required
                  type="password"
                  autoComplete={recovery ? "new-password" : "current-password"}
                  minLength={recovery ? 12 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            )}
            {recovery && (
              <label className="field">
                Confirmar nova senha
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </label>
            )}
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            {message && (
              <p className="auth-message" role="status">
                {message}
              </p>
            )}
            <button
              className="button primary full"
              type="submit"
              disabled={pending}
            >
              {pending
                ? "Aguarde…"
                : recovery
                  ? "Salvar nova senha"
                  : reset
                    ? "Enviar instruções"
                    : "Entrar no studio"}
            </button>
            {!recovery && (
              <button
                type="button"
                className="auth-reset-link"
                onClick={() => {
                  setReset(!reset);
                  setMessage("");
                  setFormError("");
                }}
              >
                {reset ? (
                  <>
                    <ArrowLeft size={14} />
                    Voltar para o login
                  </>
                ) : (
                  "Esqueci minha senha"
                )}
              </button>
            )}
          </form>
        )}
        <footer>
          <LockKeyhole size={12} />
          Acesso exclusivo à administração
        </footer>
      </section>
      <p className="auth-tagline">
        Há mais de 15 anos transformando vidas através da musculação.
      </p>
    </div>
  );
}

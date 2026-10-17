import React, { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import ReactDOM from "react-dom/client";
import { CheckCircle2, Send } from "lucide-react";
import { AddressFields } from "../AddressFields";
import { emptyAddress } from "../address";
import { Brand } from "../components";
import { currency, today, uid, weekdays } from "../data";
import { useCalendar } from "../lib/useCalendar";
import { publicRegistrationRpc } from "./api";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "../styles.css";

type Config = {
  name: string;
  open: string;
  close: string;
  plans: { days: number; monthlyPrice: number }[];
};
function Registration() {
  useCalendar();
  const token = window.location.hash.slice(1);
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addressBusy, setAddressBusy] = useState(false);
  const [received, setReceived] = useState(false);
  const busy = useRef(false);
  const previous = useRef({ payload: "", id: uid() });
  const [form, setForm] = useState({
    name: "",
    birth: "",
    cpf: "",
    phone: "",
    email: "",
    addressFields: emptyAddress(),
    emergency: "",
    plan: 3,
    days: [] as number[],
    times: {} as Record<number, string>,
    consent: false,
  });
  useEffect(() => {
    let active = true;
    if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(token)) {
      setError(
        "Link de cadastro inválido. Solicite o link completo ao studio.",
      );
      setLoading(false);
      return;
    }
    void publicRegistrationRpc<Config>("get_public_registration_config", {
      p_token: token,
    })
      .then((data) => {
        if (active) setConfig(data);
      })
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : "Não foi possível abrir o cadastro.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy.current || addressBusy) return;
    if (form.days.length !== form.plan) {
      setError(`Escolha ${form.plan} dias de preferência.`);
      return;
    }
    const student = {
      ...form,
      name: form.name.trim(),
      cpf: form.cpf.replace(/\D/g, ""),
    };
    const payload = JSON.stringify(student);
    if (payload !== previous.current.payload)
      previous.current = { payload, id: uid() };
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const result = await publicRegistrationRpc<{ received: boolean }>(
        "submit_student_registration",
        {
          p_token: token,
          p_student: student,
          p_request_id: previous.current.id,
        },
      );
      if (!result.received)
        throw new Error("Não foi possível confirmar o envio. Tente novamente.");
      setReceived(true);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Não foi possível enviar.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  return (
    <main className="registration-shell">
      <header>
        <Brand />
        <span>CADASTRO DE ALUNO</span>
      </header>
      <section className="registration-card">
        {received ? (
          <div className="registration-success" role="status">
            <CheckCircle2 size={50} />
            <h1>Cadastro enviado!</h1>
            <p>
              Obrigado por preencher seus dados. A equipe do studio vai conferir
              as informações e confirmar seu plano e horários.
            </p>
            <p>Você pode fechar esta página.</p>
          </div>
        ) : (
          <>
            <span className="eyebrow">UM NOVO COMEÇO</span>
            <h1>Vamos conhecer você.</h1>
            <p className="registration-intro">
              Preencha seus dados para o cadastro no{" "}
              {config?.name || "Studio Katielle Faleiros"}. Os horários
              informados são preferências e serão confirmados pela equipe.
            </p>
            {loading ? (
              <p role="status">Preparando seu cadastro…</p>
            ) : (
              config && (
                <form onSubmit={submit}>
                  <fieldset disabled={saving}>
                    <legend>Seus dados</legend>
                    <div className="form-grid">
                      <label className="field span-2">
                        Nome completo *
                        <input
                          required
                          minLength={3}
                          maxLength={150}
                          autoComplete="name"
                          value={form.name}
                          onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        Data de nascimento *
                        <input
                          type="date"
                          required
                          min="1900-01-01"
                          max={today}
                          autoComplete="bday"
                          value={form.birth}
                          onChange={(e) =>
                            setForm({ ...form, birth: e.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        CPF *
                        <input
                          required
                          inputMode="numeric"
                          minLength={11}
                          maxLength={11}
                          value={form.cpf}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              cpf: e.target.value.replace(/\D/g, ""),
                            })
                          }
                        />
                      </label>
                      <label className="field">
                        Telefone / WhatsApp *
                        <input
                          type="tel"
                          required
                          minLength={10}
                          maxLength={30}
                          autoComplete="tel"
                          value={form.phone}
                          onChange={(e) =>
                            setForm({ ...form, phone: e.target.value })
                          }
                          placeholder="Telefone com DDD"
                        />
                      </label>
                      <label className="field">
                        E-mail
                        <input
                          type="email"
                          maxLength={200}
                          autoComplete="email"
                          value={form.email}
                          onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                          }
                        />
                      </label>
                      <AddressFields
                        value={form.addressFields}
                        onChange={(addressFields) =>
                          setForm((previous) => ({
                            ...previous,
                            addressFields,
                          }))
                        }
                        onBusyChange={setAddressBusy}
                        disabled={saving}
                        required
                      />
                      <label className="field span-2">
                        Contato de emergência
                        <input
                          maxLength={300}
                          value={form.emergency}
                          onChange={(e) =>
                            setForm({ ...form, emergency: e.target.value })
                          }
                          placeholder="Nome, parentesco e telefone"
                        />
                      </label>
                    </div>
                  </fieldset>
                  <fieldset disabled={saving}>
                    <legend>Sua rotina de treino</legend>
                    <label className="field">
                      Frequência desejada
                      <select
                        value={form.plan}
                        onChange={(e) => {
                          const plan = Number(e.target.value);
                          setForm({
                            ...form,
                            plan,
                            days: form.days.slice(0, plan),
                          });
                        }}
                      >
                        {config.plans.map((plan) => (
                          <option value={plan.days} key={plan.days}>
                            {plan.days} vezes por semana ·{" "}
                            {currency(plan.monthlyPrice)}/mês
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="subtle-note">
                      Selecione {form.plan} dias. O studio confirmará a
                      disponibilidade antes de ativar seu cadastro.
                    </p>
                    <div className="weekday-picker">
                      {weekdays.map((day, index) => (
                        <button
                          type="button"
                          key={day}
                          aria-pressed={form.days.includes(index)}
                          className={
                            form.days.includes(index) ? "selected" : ""
                          }
                          disabled={
                            !form.days.includes(index) &&
                            form.days.length >= form.plan
                          }
                          onClick={() =>
                            setForm({
                              ...form,
                              days: form.days.includes(index)
                                ? form.days.filter((day) => day !== index)
                                : [...form.days, index].sort(),
                              times: {
                                ...form.times,
                                [index]: form.times[index] || config.open,
                              },
                            })
                          }
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                    <div className="form-grid">
                      {form.days.map((day) => (
                        <label className="field" key={day}>
                          Horário de preferência · {weekdays[day]}
                          <input
                            type="time"
                            required
                            min={config.open}
                            max={config.close}
                            value={form.times[day]}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                times: { ...form.times, [day]: e.target.value },
                              })
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="registration-consent">
                    <input
                      type="checkbox"
                      required
                      checked={form.consent}
                      disabled={saving}
                      onChange={(e) =>
                        setForm({ ...form, consent: e.target.checked })
                      }
                    />
                    <span>
                      Autorizo o uso destas informações pelo studio para
                      realizar meu cadastro e entrar em contato sobre meus
                      treinos.
                    </span>
                  </label>
                  {error && (
                    <p className="form-error" role="alert">
                      {error}
                    </p>
                  )}
                  <button
                    className="button primary full"
                    type="submit"
                    disabled={saving || addressBusy}
                  >
                    <Send size={18} />
                    {saving ? "Enviando…" : "Enviar meu cadastro"}
                  </button>
                  <p className="subtle-note">
                    O envio não confirma matrícula, reserva de horário ou
                    pagamento. A equipe do studio fará essa confirmação.
                  </p>
                </form>
              )
            )}
            {!loading && !config && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </section>
      <footer>
        Studio Katielle Faleiros · Seus dados são enviados diretamente ao
        studio.
      </footer>
    </main>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Registration />
  </React.StrictMode>,
);

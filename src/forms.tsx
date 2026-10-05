import { CalendarDays, Check, CircleAlert, FileUp } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Empty, FormActions, Modal } from "./components";
import { useStudio } from "./context";
import type { ModalRequest } from "./context";
import {
  currentMonth,
  currency,
  methods,
  monthLabel,
  months,
  paidAmount,
  today,
  uid,
  weekdays,
} from "./data";
import type { Student } from "./data";

export function ModalHost({
  request,
  onClose,
}: {
  request: ModalRequest;
  onClose: () => void;
}) {
  return request.type === "student" ? (
    <StudentForm studentId={request.studentId} onClose={onClose} />
  ) : request.type === "payment" ? (
    <PaymentForm studentId={request.studentId} onClose={onClose} />
  ) : request.type === "evaluation" ? (
    <EvaluationForm studentId={request.studentId} onClose={onClose} />
  ) : request.type === "appointment" ? (
    <AppointmentForm studentId={request.studentId} onClose={onClose} />
  ) : request.type === "movement" ? (
    <MovementForm onClose={onClose} />
  ) : (
    <Modal title={request.title || "Confirmar ação?"} onClose={onClose}>
      <div className="confirm-body">
        <CircleAlert size={32} />
        <p>{request.message}</p>
      </div>
      <div className="form-actions">
        <button className="button secondary" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="button danger-button"
          onClick={() => {
            request.onConfirm?.();
            onClose();
          }}
        >
          Confirmar
        </button>
      </div>
    </Modal>
  );
}

function StudentForm({
  studentId,
  onClose,
}: {
  studentId?: string;
  onClose: () => void;
}) {
  const { store, setStore, notify } = useStudio();
  const existing = store.students.find((s) => s.id === studentId);
  const initial: Student = existing
    ? { ...existing, days: [...existing.days], times: { ...existing.times } }
    : {
        id: uid(),
        name: "",
        birth: "",
        cpf: "",
        phone: "",
        email: "",
        address: "",
        emergency: "",
        start: today,
        active: true,
        plan: 3,
        days: [],
        times: {},
        due: 10,
        notes: "",
      };
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const update = <K extends keyof Student>(key: K, value: Student[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 3) {
      setError("Informe um nome com pelo menos três caracteres.");
      return;
    }
    if (form.cpf.replace(/\D/g, "").length !== 11) {
      setError("Informe um CPF com 11 dígitos. Use apenas dados fictícios.");
      return;
    }
    if (form.phone.replace(/\D/g, "").length < 10) {
      setError("Informe um telefone com DDD.");
      return;
    }
    if (form.days.length !== form.plan) {
      setError(
        `Escolha exatamente ${form.plan} ${form.plan === 1 ? "dia" : "dias"} de treino para este plano.`,
      );
      return;
    }
    if (form.days.some((d) => !form.times[d])) {
      setError("Informe o horário de preferência para cada dia escolhido.");
      return;
    }
    const saved = { ...form, name: form.name.trim() };
    setStore((s) => ({
      ...s,
      students: existing
        ? s.students.map((a) => (a.id === existing.id ? saved : a))
        : [...s.students, saved],
      bills:
        existing || !form.active
          ? s.bills
          : [
              ...s.bills,
              {
                id: uid(),
                studentId: form.id,
                month: currentMonth,
                amount: s.settings.planPrices[form.plan - 1],
                due: `${currentMonth}-${String(form.due).padStart(2, "0")}`,
                receipts: [],
              },
            ],
    }));
    notify(
      existing
        ? "Cadastro atualizado."
        : "Aluno cadastrado! A mensalidade foi criada para este mês.",
    );
    onClose();
  };
  return (
    <Modal
      title={existing ? "Editar aluno" : "Um novo começo"}
      subtitle={
        existing
          ? "Atualize o cadastro e a rotina do aluno."
          : "Cadastre um aluno e prepare uma jornada personalizada."
      }
      onClose={onClose}
      wide
    >
      <form onSubmit={submit}>
        <div className="modal-content">
          <h3 className="form-section-title">Dados pessoais</h3>
          <div className="form-grid">
            <label className="field span-2">
              Nome completo *
              <input
                autoComplete="off"
                required
                minLength={3}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Como o aluno se chama?"
              />
            </label>
            <label className="field">
              Data de nascimento *
              <input
                required
                type="date"
                max={today}
                value={form.birth}
                onChange={(e) => update("birth", e.target.value)}
              />
            </label>
            <label className="field">
              CPF fictício *
              <input
                required
                inputMode="numeric"
                maxLength={14}
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => update("cpf", e.target.value)}
              />
            </label>
            <label className="field">
              Telefone / WhatsApp *
              <input
                required
                type="tel"
                placeholder="(16) 99999-0000"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </label>
            <label className="field">
              E-mail
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="aluno@exemplo.com"
              />
            </label>
            <label className="field span-2">
              Endereço
              <input
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
              />
            </label>
            <label className="field span-2">
              Contato de emergência
              <input
                value={form.emergency}
                onChange={(e) => update("emergency", e.target.value)}
                placeholder="Nome, parentesco e telefone"
              />
            </label>
            <label className="field">
              Data de início *
              <input
                required
                type="date"
                value={form.start}
                onChange={(e) => update("start", e.target.value)}
              />
            </label>
            <label className="field">
              Status
              <select
                value={form.active ? "ativo" : "inativo"}
                onChange={(e) => update("active", e.target.value === "ativo")}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </label>
          </div>
          <h3 className="form-section-title">Um plano para cada rotina</h3>
          <div className="plan-picker">
            {store.settings.planPrices.map((price, i) => (
              <button
                key={i}
                type="button"
                className={form.plan === i + 1 ? "selected" : ""}
                aria-pressed={form.plan === i + 1}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    plan: i + 1,
                    days: f.days.slice(0, i + 1),
                  }))
                }
              >
                <span>
                  {i + 1} {i === 0 ? "dia" : "dias"}
                </span>
                <small>por semana</small>
                <strong>{currency(price)}</strong>
                <small>por mês</small>
                {form.plan === i + 1 && <Check size={14} />}
              </button>
            ))}
          </div>
          <div className="selected-plan">
            <span>Valor mensal do plano</span>
            <strong>
              {currency(store.settings.planPrices[form.plan - 1])}
            </strong>
          </div>
          <h3 className="form-section-title">Dias e horários de preferência</h3>
          <p className="subtle-note">
            Selecione {form.plan} {form.plan === 1 ? "dia" : "dias"}. O horário
            indica uma preferência, sujeito à disponibilidade.
          </p>
          <div className="weekday-picker">
            {weekdays.map((d, i) => (
              <button
                className={form.days.includes(i) ? "selected" : ""}
                key={d}
                type="button"
                aria-pressed={form.days.includes(i)}
                disabled={
                  !form.days.includes(i) && form.days.length >= form.plan
                }
                onClick={() => {
                  setForm((f) => ({
                    ...f,
                    days: f.days.includes(i)
                      ? f.days.filter((a) => a !== i)
                      : [...f.days, i].sort(),
                    times: { ...f.times, [i]: f.times[i] || "07:00" },
                  }));
                  setError("");
                }}
              >
                {d.slice(0, 3)}
                {form.days.includes(i) && <Check size={12} />}
              </button>
            ))}
          </div>
          <div className="form-grid times-grid">
            {form.days.map((d) => (
              <label className="field" key={d}>
                {weekdays[d]}
                <input
                  required
                  type="time"
                  min={store.settings.open}
                  max={store.settings.close}
                  value={form.times[d] || ""}
                  onChange={(e) =>
                    update("times", { ...form.times, [d]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
          <label className="field due-field">
            Dia de vencimento da mensalidade *
            <input
              required
              type="number"
              min="1"
              max="28"
              value={form.due}
              onChange={(e) => update("due", Number(e.target.value))}
            />
            <small>
              De 1 a 28, para manter a mesma data em todos os meses.
            </small>
          </label>
          <label className="field">
            Observações e objetivos
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="O que é importante saber sobre este aluno?"
            />
          </label>
          {existing && (
            <p className="subtle-note">
              Editar o plano mantém os valores das cobranças já emitidas.
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <p className="subtle-note">
            * Campos obrigatórios. Use somente dados fictícios neste protótipo.
          </p>
        </div>
        <FormActions
          onClose={onClose}
          label={existing ? "Salvar alterações" : "Cadastrar aluno"}
        />
      </form>
    </Modal>
  );
}

function PaymentForm({
  studentId,
  onClose,
}: {
  studentId?: string;
  onClose: () => void;
}) {
  const { store, setStore, month, notify } = useStudio();
  const first = store.bills.find(
    (b) => b.month === month && paidAmount(b) < b.amount,
  );
  const [student, setStudent] = useState(
    studentId || first?.studentId || store.students[0]?.id || "",
  );
  const [competence, setCompetence] = useState(month);
  const bill = store.bills.find(
    (b) => b.studentId === student && b.month === competence,
  );
  const balance = bill ? Math.max(0, bill.amount - paidAmount(bill)) : 0;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(store.settings.methods[0] || methods[0]);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [attachment, setAttachment] = useState("");
  const [error, setError] = useState("");
  const entered = amount === "" ? balance : Number(amount);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!bill) return;
    const value = Math.round(entered * 100) / 100;
    if (!Number.isFinite(value) || value <= 0 || value > balance + 0.001) {
      setError(`Informe um valor maior que zero e até ${currency(balance)}.`);
      return;
    }
    const receipt = {
      id: uid(),
      studentId: student,
      month: competence,
      amount: value,
      date,
      method,
      note,
      attachment,
    };
    setStore((s) => ({
      ...s,
      bills: s.bills.map((b) =>
        b.id === bill.id ? { ...b, receipts: [...b.receipts, receipt] } : b,
      ),
    }));
    notify(
      `Pagamento ${value < balance ? "parcial " : ""}registrado com sucesso: ${currency(value)}.`,
    );
    onClose();
  };
  return (
    <Modal
      title="Registrar pagamento"
      subtitle="Uma confirmação simples para manter tudo em dia."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-content">
          <label className="field">
            Aluno *
            <select
              aria-label="Aluno"
              required
              value={student}
              onChange={(e) => {
                setStudent(e.target.value);
                setAmount("");
                setError("");
              }}
            >
              {store.students.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label className="field">
              Competência *
              <select
                value={competence}
                onChange={(e) => {
                  setCompetence(e.target.value);
                  setAmount("");
                  setError("");
                }}
              >
                {months.map((m) => (
                  <option value={m} key={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Data do pagamento *
              <input
                type="date"
                required
                max={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          {bill ? (
            <div className="payment-balance">
              <span>
                Valor devido <b>{currency(bill.amount)}</b>
              </span>
              <span>
                Já pago <b>{currency(paidAmount(bill))}</b>
              </span>
              <span>
                Saldo em aberto <strong>{currency(balance)}</strong>
              </span>
            </div>
          ) : (
            <Empty
              title="Sem cobrança nesta competência"
              text="Selecione outro aluno ou uma competência com mensalidade."
            />
          )}
          <label className="field">
            Valor recebido *
            <div className="money-input">
              <span>R$</span>
              <input
                required
                min="0.01"
                max={balance}
                step="0.01"
                type="number"
                value={amount === "" ? balance : amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <small>
              Valores menores que o saldo geram um pagamento parcial.
            </small>
          </label>
          <label className="field">
            Forma de pagamento *
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {store.settings.methods.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Observações
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Informações adicionais sobre o pagamento"
            />
          </label>
          <label className="receipt-upload">
            <FileUp size={23} />
            <strong>{attachment || "Selecionar comprovante"}</strong>
            <span>Imagem ou PDF · somente o nome do arquivo é demonstrado</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setAttachment(e.target.files?.[0]?.name || "")}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <p className="subtle-note">
            Registro simulado. Nenhuma cobrança será realizada.
          </p>
        </div>
        <FormActions
          onClose={onClose}
          label="Confirmar pagamento"
          disabled={!bill || balance <= 0}
        />
      </form>
    </Modal>
  );
}

function EvaluationForm({
  studentId,
  onClose,
}: {
  studentId?: string;
  onClose: () => void;
}) {
  const { store, setStore, notify } = useStudio();
  const [student, setStudent] = useState(
    studentId || store.students[0]?.id || "",
  );
  const [date, setDate] = useState(today);
  const [values, setValues] = useState({
    weight: "",
    height: "",
    fat: "",
    muscle: "",
    visceral: "",
    water: "",
  });
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const specs = [
    { key: "weight" as const, label: "Peso (kg)", min: 1, max: 400 },
    { key: "height" as const, label: "Altura (cm)", min: 50, max: 250 },
    { key: "fat" as const, label: "Gordura corporal (%)", min: 0, max: 75 },
    { key: "muscle" as const, label: "Massa muscular (kg)", min: 0, max: 200 },
    {
      key: "visceral" as const,
      label: "Gordura visceral (nível)",
      min: 1,
      max: 60,
    },
    { key: "water" as const, label: "Água corporal (%)", min: 0, max: 100 },
  ];
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (Number(values.muscle) > Number(values.weight)) {
      setError("A massa muscular não pode exceder o peso informado.");
      return;
    }
    setStore((s) => ({
      ...s,
      evaluations: [
        ...s.evaluations,
        {
          id: uid(),
          studentId: student,
          date,
          weight: Number(values.weight),
          height: Number(values.height) / 100,
          fat: Number(values.fat),
          muscle: Number(values.muscle),
          visceral: Number(values.visceral),
          water: Number(values.water),
          notes,
        },
      ],
      appointments: s.appointments.filter(
        (a) => !(a.studentId === student && a.date === date),
      ),
    }));
    notify("Avaliação registrada com sucesso.");
    onClose();
  };
  return (
    <Modal
      title="Nova avaliação"
      subtitle="Registre dados fictícios de bioimpedância."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-content">
          <label className="field">
            Aluno *
            <select
              aria-label="Aluno"
              required
              value={student}
              onChange={(e) => setStudent(e.target.value)}
            >
              {store.students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Data da avaliação *
            <input
              required
              type="date"
              max={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <div className="form-grid">
            {specs.map((s) => (
              <label className="field" key={s.key}>
                {s.label} *
                <input
                  required
                  type="number"
                  min={s.min}
                  max={s.max}
                  step="0.1"
                  value={values[s.key]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [s.key]: e.target.value }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="selected-plan">
            <span>IMC calculado</span>
            <strong>
              {values.weight && Number(values.height) > 0
                ? (
                    Number(values.weight) /
                    (Number(values.height) / 100) ** 2
                  ).toFixed(1)
                : "—"}{" "}
              <small>kg/m²</small>
            </strong>
          </div>
          <label className="field">
            Observações
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <p className="subtle-note">
            Sem classificação automática. A interpretação cabe ao profissional.
          </p>
        </div>
        <FormActions onClose={onClose} label="Salvar avaliação" />
      </form>
    </Modal>
  );
}

function AppointmentForm({
  studentId,
  onClose,
}: {
  studentId?: string;
  onClose: () => void;
}) {
  const { store, setStore, notify } = useStudio();
  const [student, setStudent] = useState(
    studentId || store.students[0]?.id || "",
  );
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("09:00");
  const [error, setError] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (store.appointments.some((a) => a.date === date && a.time === time)) {
      setError("Já há uma avaliação neste horário. Escolha outro horário.");
      return;
    }
    setStore((s) => ({
      ...s,
      appointments: [
        ...s.appointments,
        { id: uid(), studentId: student, date, time },
      ],
    }));
    notify("Avaliação agendada com sucesso.");
    onClose();
  };
  return (
    <Modal
      title="Agendar avaliação"
      subtitle="Reserve um momento de cuidado e acompanhamento."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-content">
          <div className="appointment-form-icon">
            <CalendarDays size={30} />
          </div>
          <label className="field">
            Aluno *
            <select
              aria-label="Aluno"
              required
              value={student}
              onChange={(e) => setStudent(e.target.value)}
            >
              {store.students
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="form-grid">
            <label className="field">
              Data *
              <input
                required
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="field">
              Horário *
              <input
                required
                type="time"
                min={store.settings.open}
                max={store.settings.close}
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <p className="subtle-note">Agendamento simulado de bioimpedância.</p>
        </div>
        <FormActions onClose={onClose} label="Confirmar agendamento" />
      </form>
    </Modal>
  );
}

function MovementForm({ onClose }: { onClose: () => void }) {
  const { setStore, notify } = useStudio();
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Aluguel");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setStore((s) => ({
      ...s,
      movements: [
        ...s.movements,
        {
          id: uid(),
          description: description.trim(),
          category,
          kind,
          amount: Math.round(Number(amount) * 100) / 100,
          date,
        },
      ],
    }));
    notify(
      kind === "income"
        ? "Receita registrada com sucesso."
        : "Despesa registrada com sucesso.",
    );
    onClose();
  };
  return (
    <Modal
      title="Nova movimentação"
      subtitle="Registre uma entrada ou saída efetivamente realizada."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-content">
          <div className="movement-type">
            <button
              type="button"
              aria-pressed={kind === "income"}
              className={kind === "income" ? "selected" : ""}
              onClick={() => {
                setKind("income");
                setCategory("Outras receitas");
              }}
            >
              Receita
            </button>
            <button
              type="button"
              aria-pressed={kind === "expense"}
              className={kind === "expense" ? "selected" : ""}
              onClick={() => {
                setKind("expense");
                setCategory("Aluguel");
              }}
            >
              Despesa
            </button>
          </div>
          <label className="field">
            Descrição *
            <input
              required
              minLength={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: manutenção de equipamentos"
            />
          </label>
          <div className="form-grid">
            <label className="field">
              Valor *
              <div className="money-input">
                <span>R$</span>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </label>
            <label className="field">
              Data *
              <input
                required
                type="date"
                max={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          <label className="field">
            Categoria *
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {(kind === "expense"
                ? [
                    "Aluguel",
                    "Energia",
                    "Água",
                    "Manutenção",
                    "Mercadorias",
                    "Outras despesas",
                  ]
                : ["Outras receitas"]
              ).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <p className="subtle-note">
            Mensalidades são registradas em “Pagamentos” e vendas em “Produtos”.
          </p>
        </div>
        <FormActions
          onClose={onClose}
          label={kind === "expense" ? "Registrar despesa" : "Registrar receita"}
        />
      </form>
    </Modal>
  );
}

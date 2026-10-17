import { useState } from "react";
import type { FormEvent } from "react";
import { Check, Pencil, Plus, Repeat2 } from "lucide-react";
import { Empty, FormActions, Modal, Panel } from "../components";
import { useStudio } from "../context";
import {
  currency,
  dateLabel,
  expenseCategories,
  monthLabel,
  today,
  uid,
} from "../data";
import type { RecurringExpense } from "../data";
import { dueInMonth } from "../calendar";

export function RecurringExpenses() {
  const { store, month, open } = useStudio();
  const expenses = store.recurringExpenses || [];
  const rows = expenses.map((expense) => ({
    ...expense,
    expected:
      expense.startMonth <= month &&
      (!expense.endMonth || expense.endMonth >= month),
    paid: store.movements.find(
      (m) => m.recurringExpenseId === expense.id && m.recurringMonth === month,
    ),
  }));
  const expected = rows.filter((row) => row.expected);
  return (
    <Panel
      className="recurring-panel"
      title="Despesas fixas"
      subtitle={`Previsão mensal · ${monthLabel(month)}`}
      action={
        <button
          className="button secondary small"
          onClick={() => open({ type: "recurring_expense" })}
        >
          <Plus size={15} /> Cadastrar despesa fixa
        </button>
      }
    >
      <div className="recurring-totals">
        <span>
          Previsto{" "}
          <strong>
            {currency(expected.reduce((sum, row) => sum + row.amount, 0))}
          </strong>
        </span>
        <span>
          Pago{" "}
          <strong>
            {currency(
              expected.reduce((sum, row) => sum + (row.paid?.amount || 0), 0),
            )}
          </strong>
        </span>
        <span>
          A pagar{" "}
          <strong>
            {currency(
              expected
                .filter((row) => !row.paid)
                .reduce((sum, row) => sum + row.amount, 0),
            )}
          </strong>
        </span>
      </div>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Despesa</th>
                <th>Valor mensal</th>
                <th>Vencimento</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.description}</strong>
                    <small>
                      {row.category} · desde {monthLabel(row.startMonth)}
                      {row.endMonth ? ` até ${monthLabel(row.endMonth)}` : ""}
                    </small>
                  </td>
                  <td>{currency(row.amount)}</td>
                  <td>
                    {row.expected
                      ? dateLabel(dueInMonth(month, row.dueDay))
                      : `Dia ${row.dueDay}`}
                  </td>
                  <td>
                    {row.paid ? (
                      <span className="status status-pago">
                        Pago: {currency(row.paid.amount)}
                        <small>{dateLabel(row.paid.date)}</small>
                      </span>
                    ) : (
                      <span className="status status-pendente">
                        {row.expected ? "A pagar" : "Fora da competência"}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="recurring-actions">
                      <button
                        className="icon-button"
                        aria-label={`Editar despesa fixa ${row.description}`}
                        onClick={() =>
                          open({ type: "recurring_expense", expenseId: row.id })
                        }
                      >
                        <Pencil size={16} />
                      </button>
                      {row.expected && !row.paid && (
                        <button
                          className="button secondary small"
                          onClick={() =>
                            open({
                              type: "recurring_payment",
                              expenseId: row.id,
                            })
                          }
                        >
                          <Check size={14} /> Registrar pagamento
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="Organize suas despesas recorrentes"
          text="Cadastre aluguel, funcionários e outras despesas mensais."
        />
      )}
      <p className="subtle-note recurring-note">
        <Repeat2 size={15} /> A previsão reaparece a cada mês. Confirme o
        pagamento para incluí-lo nas despesas e nos gráficos pela data em que
        foi pago.
      </p>
    </Panel>
  );
}

export function RecurringExpenseForm({
  expenseId,
  onClose,
}: {
  expenseId?: string;
  onClose: () => void;
}) {
  const { store, month, execute, saving, notify } = useStudio();
  const existing = store.recurringExpenses?.find(
    (expense) => expense.id === expenseId,
  );
  const [form, setForm] = useState<RecurringExpense>(
    existing
      ? { ...existing }
      : {
          id: uid(),
          description: "",
          category: "Aluguel",
          amount: 0,
          dueDay: 10,
          startMonth: month,
          endMonth: "",
        },
  );
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    try {
      await execute({
        type: "save_recurring_expense",
        expense: { ...form, description: form.description.trim() },
      });
      notify("Despesa fixa salva.");
      onClose();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a despesa.",
      );
    }
  };
  return (
    <Modal
      title={existing ? "Editar despesa fixa" : "Cadastrar despesa fixa"}
      subtitle="Uma previsão para cada mês, sem alterar pagamentos já registrados."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-content form-grid">
          <label className="field span-2">
            Descrição *
            <input
              required
              minLength={3}
              maxLength={200}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Ex.: aluguel do studio"
            />
          </label>
          <label className="field">
            Categoria
            <select
              aria-label="Categoria"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {expenseCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Valor mensal *
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={form.amount || ""}
              onChange={(e) =>
                setForm({ ...form, amount: Number(e.target.value) })
              }
            />
          </label>
          <label className="field">
            Dia do vencimento *
            <input
              type="number"
              required
              min={1}
              max={31}
              value={form.dueDay}
              onChange={(e) =>
                setForm({ ...form, dueDay: Number(e.target.value) })
              }
            />
          </label>
          <label className="field">
            Primeira competência *
            <input
              type="month"
              required
              value={form.startMonth}
              onChange={(e) => setForm({ ...form, startMonth: e.target.value })}
            />
          </label>
          <label className="field span-2">
            Última competência (opcional)
            <input
              type="month"
              min={form.startMonth}
              value={form.endMonth}
              onChange={(e) => setForm({ ...form, endMonth: e.target.value })}
            />
            <small>
              Deixe em branco para continuar todos os meses. Preencha para
              encerrar a recorrência.
            </small>
          </label>
          <p className="subtle-note span-2">
            Meses sem o dia escolhido usam o último dia do mês. Alterações não
            modificam pagamentos já registrados.
          </p>
          {error && (
            <p role="alert" className="form-error span-2">
              {error}
            </p>
          )}
        </div>
        <FormActions onClose={onClose} label="Salvar despesa fixa" />
      </form>
    </Modal>
  );
}

export function RecurringPaymentForm({
  expenseId,
  onClose,
}: {
  expenseId: string;
  onClose: () => void;
}) {
  const { store, month, execute, saving, notify } = useStudio();
  const expense = store.recurringExpenses?.find(
    (item) => item.id === expenseId,
  );
  const [amount, setAmount] = useState(expense?.amount || 0);
  const [date, setDate] = useState(today);
  const [error, setError] = useState("");
  if (!expense) return null;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    try {
      await execute({
        type: "pay_recurring_expense",
        id: expenseId,
        month,
        date,
        amount,
      });
      notify("Pagamento da despesa fixa registrado.");
      onClose();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar o pagamento.",
      );
    }
  };
  return (
    <Modal
      title="Pagar despesa fixa"
      subtitle={`${expense.description} · ${monthLabel(month)}`}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-content form-grid">
          <label className="field">
            Valor pago *
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
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
          {error && (
            <p role="alert" className="form-error span-2">
              {error}
            </p>
          )}
        </div>
        <FormActions onClose={onClose} label="Confirmar pagamento" />
      </form>
    </Modal>
  );
}

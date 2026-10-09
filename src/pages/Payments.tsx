import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Avatar,
  Direction,
  Empty,
  LineChart,
  Metric,
  MonthSelect,
  PageIntro,
  Panel,
  Status,
} from "../components";
import { useStudio } from "../context";
import {
  billStatus,
  currency,
  dateLabel,
  monthLabel,
  months,
  normalize,
  paidAmount,
  saleTotal,
} from "../data";
import { finances } from "../metrics";
import { downloadReceipt } from "../lib/repository";

export function Payments() {
  const { store, execute, saving, mode, month, search, open, notify } =
    useStudio();
  const [status, setStatus] = useState("todos");
  const [student, setStudent] = useState("todos");
  const [query, setQuery] = useState("");
  const f = finances(store, month);
  const list = f.bills.filter((b) => {
    const s = store.students.find((s) => s.id === b.studentId);
    return (
      s &&
      normalize(s.name).includes(normalize(query || search)) &&
      (status === "todos" || billStatus(b) === status) &&
      (student === "todos" || b.studentId === student)
    );
  });
  return (
    <>
      <PageIntro
        eyebrow="TRANQUILIDADE PARA A ROTINA"
        title="Mensalidades e pagamentos"
        description="Acompanhe cada competência e mantenha tudo em dia."
        actions={
          <>
            <MonthSelect />
            <button
              className="button secondary"
              disabled={saving}
              onClick={() =>
                open({
                  type: "confirm",
                  title: "Gerar mensalidades?",
                  message:
                    "Serão criadas cobranças para os alunos ativos desta competência. As cobranças existentes serão preservadas.",
                  onConfirm: async () => {
                    await execute({ type: "generate_bills", month });
                    notify("Mensalidades da competência geradas.");
                  },
                })
              }
            >
              Gerar mensalidades
            </button>
            <button
              className="button primary"
              onClick={() => open({ type: "payment" })}
            >
              <Plus size={17} />
              Registrar pagamento
            </button>
          </>
        }
      />
      <div className="metrics four">
        <Metric
          label="Total da competência"
          value={currency(f.bills.reduce((a, b) => a + b.amount, 0))}
          detail={`${f.bills.length} mensalidades`}
          icon={<Wallet size={18} />}
        />
        <Metric
          label="Pago na competência"
          value={currency(f.bills.reduce((a, b) => a + paidAmount(b), 0))}
          detail="Pagamentos vinculados às cobranças"
          icon={<CheckCircle2 size={18} />}
          tone="green"
        />
        <Metric
          label="Saldo em aberto"
          value={currency(f.pending)}
          detail="Pendente, vencido e parcial"
          icon={<Clock3 size={18} />}
          tone="orange"
        />
        <Metric
          label="Cobranças vencidas"
          value={String(
            f.bills.filter((b) => billStatus(b) === "Vencido").length,
          )}
          detail="Sem pagamento após o vencimento"
          icon={<CircleDollarSign size={18} />}
          tone="red"
        />
      </div>
      <Panel
        title="Controle de mensalidades"
        subtitle={`Competência de ${monthLabel(month)}`}
      >
        <div className="toolbar">
          <label className="search-field">
            <Search size={17} />
            <input
              placeholder="Buscar aluno..."
              aria-label="Buscar mensalidade por aluno"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Filtrar aluno nas mensalidades"
            value={student}
            onChange={(e) => setStudent(e.target.value)}
          >
            <option value="todos">Todos os alunos</option>
            {store.students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="filter-tabs">
            <button
              className={status === "todos" ? "active" : ""}
              onClick={() => setStatus("todos")}
            >
              Todas
            </button>
            {["Pago", "Pendente", "Vencido", "Parcial"].map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={status === s ? "active" : ""}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {list.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Aluno / plano</th>
                  <th>Valor devido</th>
                  <th>Valor pago</th>
                  <th>Saldo</th>
                  <th>Vencimento</th>
                  <th>Pagamento / forma</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((b) => {
                  const s = store.students.find((s) => s.id === b.studentId)!;
                  return (
                    <tr key={b.id}>
                      <td>
                        <div className="person-cell">
                          <Avatar name={s.name} />
                          <span>
                            <strong>{s.name}</strong>
                            <small>
                              {s.plan} {s.plan === 1 ? "dia" : "dias"} / semana
                            </small>
                          </span>
                        </div>
                      </td>
                      <td>{currency(b.amount)}</td>
                      <td>{currency(paidAmount(b))}</td>
                      <td>
                        <strong
                          className={
                            b.amount - paidAmount(b) > 0 ? "balance-open" : ""
                          }
                        >
                          {currency(b.amount - paidAmount(b))}
                        </strong>
                      </td>
                      <td>{dateLabel(b.due)}</td>
                      <td>
                        {b.receipts.length ? (
                          b.receipts.map((r) => (
                            <div key={r.id} className="receipt-cell">
                              <span>{dateLabel(r.date)}</span>
                              <small>
                                {r.method} · {currency(r.amount)}
                                {r.attachmentPath ? (
                                  <button
                                    className="text-button"
                                    onClick={() =>
                                      void downloadReceipt(
                                        r.attachmentPath!,
                                        r.attachment,
                                      ).catch((e) => notify(e.message))
                                    }
                                  >
                                    Baixar comprovante
                                  </button>
                                ) : (
                                  r.attachment && ` · ${r.attachment}`
                                )}
                              </small>
                            </div>
                          ))
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <Status value={billStatus(b)} />
                      </td>
                      <td>
                        {billStatus(b) !== "Pago" && (
                          <button
                            className="button secondary small"
                            onClick={() =>
                              open({ type: "payment", studentId: s.id })
                            }
                          >
                            Registrar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
        <div className="table-footer">
          {list.length} mensalidades ·{" "}
          {mode === "demo"
            ? "Pagamentos simulados, sem transações reais."
            : "Recebimentos registrados no banco do studio."}
        </div>
      </Panel>
    </>
  );
}

export function Finance() {
  const { store, execute, mode, month, search, open, notify } = useStudio();
  const [category, setCategory] = useState("todas");
  const [kind, setKind] = useState("todos");
  const [start, setStart] = useState(`${month}-01`);
  const last = (m: string) => {
    const d = new Date(`${m}-01T12:00:00`);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().slice(0, 10);
  };
  const [end, setEnd] = useState(last(month));
  useEffect(() => {
    setStart(`${month}-01`);
    setEnd(last(month));
  }, [month]);
  const transactions = [
    ...store.bills.flatMap((b) =>
      b.receipts.map((r) => ({
        id: r.id,
        date: r.date,
        description: `Mensalidade · ${store.students.find((s) => s.id === r.studentId)?.name || "Aluno"}`,
        category: "Mensalidades",
        kind: "income" as const,
        amount: r.amount,
        editable: false,
      })),
    ),
    ...store.sales.map((s) => ({
      id: s.id,
      date: s.date,
      description: `Venda de produtos · ${store.students.find((a) => a.id === s.studentId)?.name || "Balcão"}`,
      category: "Produtos",
      kind: "income" as const,
      amount: saleTotal(s),
      editable: false,
    })),
    ...store.movements.map((m) => ({ ...m, editable: true })),
  ]
    .filter(
      (t) =>
        t.date >= start &&
        t.date <= end &&
        (category === "todas" || t.category === category) &&
        (kind === "todos" || t.kind === kind) &&
        normalize(t.description).includes(normalize(search)),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const fees = transactions
    .filter((t) => t.category === "Mensalidades")
    .reduce((a, t) => a + t.amount, 0);
  const products = transactions
    .filter((t) => t.category === "Produtos")
    .reduce((a, t) => a + t.amount, 0);
  const income = transactions
    .filter((t) => t.kind === "income")
    .reduce((a, t) => a + t.amount, 0);
  const expenses = transactions
    .filter((t) => t.kind === "expense")
    .reduce((a, t) => a + t.amount, 0);
  const graph = [...months].reverse().map((m) => ({
    label: monthLabel(m, true).split(" de ")[0],
    ...finances(store, m),
  }));
  const exportCSV = () => {
    const rows = [
      ["Data", "Descrição", "Categoria", "Tipo", "Valor"],
      ...transactions.map((t) => [
        dateLabel(t.date),
        t.description,
        t.category,
        t.kind === "income" ? "Receita" : "Despesa",
        t.amount.toFixed(2).replace(".", ","),
      ]),
    ];
    const blob = new Blob(
      [
        "\uFEFF" +
          rows
            .map((r) =>
              r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(";"),
            )
            .join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financeiro-${start}-${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Movimentações exportadas em CSV.");
  };
  return (
    <>
      <PageIntro
        eyebrow="CLAREZA PARA CRESCER"
        title="Financeiro"
        description="O equilíbrio do seu studio, com cada número no lugar."
        actions={
          <>
            <MonthSelect />
            <button
              className="button primary"
              onClick={() => open({ type: "movement" })}
            >
              <Plus size={17} />
              Nova movimentação
            </button>
          </>
        }
      />
      <div className="metrics four">
        <Metric
          label="Receitas recebidas"
          value={currency(income)}
          detail="Entradas efetivadas no período"
          icon={<ArrowDownLeft size={18} />}
          tone="green"
        />
        <Metric
          label="Despesas pagas"
          value={currency(expenses)}
          detail="Saídas efetivadas no período"
          icon={<ArrowUpRight size={18} />}
          tone="orange"
        />
        <Metric
          label="Resultado do período"
          value={currency(income - expenses)}
          detail="Receitas menos despesas"
          icon={<TrendingUp size={18} />}
          tone="dark"
        />
        <Metric
          label="Saldo a receber no mês"
          value={currency(finances(store, month).pending)}
          detail="Previsto · não incluído nas receitas"
          icon={<Clock3 size={18} />}
        />
      </div>
      <div className="finance-top">
        <Panel
          title="Evolução financeira"
          subtitle="Valores recebidos e despesas dos últimos 6 meses"
        >
          <LineChart data={graph} />
        </Panel>
        <Panel
          title="Origem das receitas"
          subtitle="Valores efetivamente recebidos no período"
        >
          <div className="revenue-source">
            <span className="source-icon blue">
              <UsersIcon />
            </span>
            <div>
              <span>Mensalidades</span>
              <strong>{currency(fees)}</strong>
            </div>
            <span>{income ? Math.round((fees / income) * 100) : 0}%</span>
          </div>
          <div className="source-progress">
            <span style={{ width: `${income ? (fees / income) * 100 : 0}%` }} />
          </div>
          <div className="revenue-source">
            <span className="source-icon orange">
              <ShoppingBag size={20} />
            </span>
            <div>
              <span>Produtos</span>
              <strong>{currency(products)}</strong>
            </div>
            <span>{income ? Math.round((products / income) * 100) : 0}%</span>
          </div>
          <div className="source-progress orange">
            <span
              style={{ width: `${income ? (products / income) * 100 : 0}%` }}
            />
          </div>
          <div className="other-income">
            <span>Outras receitas</span>
            <strong>{currency(income - fees - products)}</strong>
          </div>
          <div className="note-box">
            <b>Regime de caixa</b>
            <p>
              Mensalidades entram nas receitas pela data do pagamento, mesmo
              quando pertencem a outra competência.
            </p>
          </div>
        </Panel>
      </div>
      <Panel
        title="Movimentações"
        subtitle="Histórico do período selecionado"
        action={
          <button className="button secondary small" onClick={exportCSV}>
            <Download size={15} />
            Exportar CSV
          </button>
        }
      >
        <div className="toolbar finance-filters">
          <label>
            De
            <input
              aria-label="Data inicial do financeiro"
              type="date"
              value={start}
              max={end}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Até
            <input
              aria-label="Data final do financeiro"
              type="date"
              min={start}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <select
            aria-label="Filtrar categoria financeira"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="todas">Todas as categorias</option>
            {[
              "Mensalidades",
              "Produtos",
              ...new Set(store.movements.map((m) => m.category)),
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar tipo de movimentação"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="todos">Receitas e despesas</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>
        </div>
        {transactions.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Movimentação</th>
                  <th>Categoria</th>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="transaction-title">
                        <Direction income={t.kind === "income"} />
                        <strong>{t.description}</strong>
                      </div>
                    </td>
                    <td>{t.category}</td>
                    <td>{dateLabel(t.date)}</td>
                    <td>
                      <span
                        className={`status ${t.kind === "income" ? "status-pago" : "status-pendente"}`}
                      >
                        {t.kind === "income" ? (
                          <ArrowDownLeft size={12} />
                        ) : (
                          <ArrowUpRight size={12} />
                        )}{" "}
                        {t.kind === "income" ? "Receita" : "Despesa"}
                      </span>
                    </td>
                    <td
                      className={
                        t.kind === "income" ? "amount-income" : "amount-expense"
                      }
                    >
                      {t.kind === "income" ? "+" : "−"} {currency(t.amount)}
                    </td>
                    <td>
                      {t.editable && (
                        <button
                          className="icon-button danger"
                          aria-label={`Excluir ${t.description}`}
                          onClick={() =>
                            open({
                              type: "confirm",
                              title: "Excluir movimentação?",
                              message: `${t.description}, no valor de ${currency(t.amount)}, será removida do protótipo.`,
                              onConfirm: async () => {
                                await execute({
                                  type: "delete_movement",
                                  id: t.id,
                                });
                                notify("Movimentação excluída.");
                              },
                            })
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
        <div className="table-footer">
          {transactions.length} movimentações ·{" "}
          {mode === "demo"
            ? "Valores fictícios para demonstração."
            : "Registros financeiros do studio."}
        </div>
      </Panel>
    </>
  );
}
function UsersIcon() {
  return <Wallet size={20} />;
}

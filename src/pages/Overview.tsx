import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  DollarSign,
  LayoutGrid,
  List,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import {
  Avatar,
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
  normalize,
  paidAmount,
  today,
  weekdays,
} from "../data";
import { finances } from "../metrics";
import { monthSeries } from "../calendar";
import { RegistrationLink } from "../RegistrationLink";

export function Dashboard() {
  const { store, month, go, open, user } = useStudio();
  const f = finances(store, month);
  const find = (id: string) => store.students.find((s) => s.id === id)!;
  const day = (new Date(`${today}T12:00:00`).getDay() + 6) % 7;
  const scheduled = store.students
    .filter((s) => s.active && s.days.includes(day))
    .sort((a, b) => (a.times[day] || "").localeCompare(b.times[day] || ""));
  const upcoming = [...f.bills]
    .filter((b) => paidAmount(b) < b.amount)
    .sort((a, b) => a.due.localeCompare(b.due));
  const counts = ["Pago", "Pendente", "Vencido", "Parcial"].map((status) => ({
    status,
    count: f.bills.filter((b) => billStatus(b) === status).length,
  }));
  const graph = monthSeries(month)
    .reverse()
    .map((m) => ({
      label: monthLabel(m, true),
      ...finances(store, m),
    }));
  const date = new Date(`${today}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const contents = {
    students: (
      <Metric
        label="Alunos ativos"
        value={String(store.students.filter((s) => s.active).length).padStart(
          2,
          "0",
        )}
        icon={<Users size={18} />}
        detail="Pessoas em movimento"
      />
    ),
    fees: (
      <Metric
        label="Mensalidades recebidas"
        value={currency(f.fees)}
        icon={<CircleDollarSign size={18} />}
        detail="Recebido no mês"
        tone="green"
      />
    ),
    pending: (
      <Metric
        label="Valores pendentes"
        value={currency(f.pending)}
        icon={<Clock3 size={18} />}
        detail={`${f.bills.filter((b) => paidAmount(b) < b.amount).length} mensalidades em aberto`}
        tone="orange"
      />
    ),
    products: (
      <Metric
        label="Vendas de produtos"
        value={currency(f.products)}
        icon={<ShoppingBag size={18} />}
        detail="Recebido no mês"
        tone="blue"
      />
    ),
    result: (
      <Metric
        label="Resultado do mês"
        value={currency(f.result)}
        icon={<TrendingUp size={18} />}
        detail="Receitas menos despesas"
        tone="dark"
      />
    ),
    financialChart: (
      <Panel
        title="Seu financeiro em perspectiva"
        subtitle="Receitas e despesas dos últimos 6 meses"
        action={
          <button className="text-button" onClick={() => go("financeiro")}>
            Ver financeiro <ArrowRight size={14} />
          </button>
        }
      >
        <LineChart
          data={graph.map((v) => ({
            ...v,
            fees: v.income,
            products: v.expenses,
            expenses: v.result,
          }))}
          labels={["Receitas", "Despesas", "Resultado"]}
        />
        <div className="chart-footer">
          <span>
            <i className="tiny-dot" />
            Valores efetivamente recebidos
          </span>
          <span>Todos os valores em reais</span>
        </div>
      </Panel>
    ),
    billStatus: (
      <Panel
        title="Mensalidades"
        subtitle={monthLabel(month)}
        action={<Wallet size={19} className="muted" />}
        className="payments-overview"
      >
        <div
          className="donut"
          style={{
            background: `conic-gradient(#579aba 0 ${(counts[0].count / f.bills.length) * 100 || 0}%, #e5ad75 ${(counts[0].count / f.bills.length) * 100 || 0}% ${((counts[0].count + counts[1].count) / f.bills.length) * 100 || 0}%, #d87768 ${((counts[0].count + counts[1].count) / f.bills.length) * 100 || 0}% ${((counts[0].count + counts[1].count + counts[2].count) / f.bills.length) * 100 || 0}%, #b1a1c6 0 100%)`,
          }}
        >
          <div>
            <strong>{f.bills.length}</strong>
            <span>mensalidades</span>
          </div>
        </div>
        <div className="donut-legend">
          {counts.map((c, i) => (
            <div key={c.status}>
              <span>
                <i className={`legend-dot dot-${i}`} />
                {c.status === "Pago"
                  ? "Pagas"
                  : c.status === "Pendente"
                    ? "Pendentes"
                    : c.status === "Vencido"
                      ? "Vencidas"
                      : "Parciais"}
              </span>
              <b>{c.count}</b>
            </div>
          ))}
        </div>
        <button
          className="button secondary full"
          onClick={() => go("mensalidades")}
        >
          Gerenciar mensalidades <ArrowRight size={14} />
        </button>
      </Panel>
    ),
    quickActions: (
      <div className="quick-actions">
        <span>O que vamos fazer hoje?</span>
        {[
          { label: "Cadastrar aluno", icon: UserPlus, type: "student" },
          { label: "Registrar pagamento", icon: DollarSign, type: "payment" },
          {
            label: "Agendar avaliação",
            icon: CalendarDays,
            type: "appointment",
          },
          { label: "Realizar venda", icon: ShoppingBag, type: "sale" },
        ].map((a) => (
          <button
            key={a.label}
            onClick={() =>
              a.type === "sale"
                ? go("produtos")
                : open({
                    type: a.type as "student" | "payment" | "appointment",
                  })
            }
          >
            <a.icon size={17} />
            {a.label}
            <Plus size={14} />
          </button>
        ))}
      </div>
    ),
    schedule: (
      <Panel
        title="Agenda de hoje"
        subtitle={`${scheduled.length} alunos previstos · ${dateLabel(today)}`}
        action={
          <button className="text-button" onClick={() => go("agenda")}>
            Ver agenda <ArrowRight size={14} />
          </button>
        }
      >
        <div className="schedule-list">
          {scheduled.slice(0, 5).map((s) => (
            <button
              key={s.id}
              className="schedule-row"
              onClick={() => go(`alunos/${s.id}`)}
            >
              <span className="time">{s.times[day]}</span>
              <Avatar name={s.name} />
              <div>
                <strong>{s.name}</strong>
                <span>
                  {s.plan} {s.plan === 1 ? "dia" : "dias"} por semana
                </span>
              </div>
              <span className="session-label">Treino individual</span>
            </button>
          ))}
          {!scheduled.length && (
            <Empty
              title="Uma pausa na agenda"
              text="Nenhum aluno previsto para hoje."
            />
          )}
        </div>
        <div className="panel-foot">
          <span className="subtle-note">
            <span className="live-dot" />
            Horários de preferência dos alunos
          </span>
        </div>
      </Panel>
    ),
    attention: (
      <Panel
        title="Acompanhe de perto"
        subtitle="Pequenas ações que fazem a diferença"
        className="attention-panel"
      >
        <div className="attention-label">
          <span>
            <Clock3 size={14} />
            Mensalidades em aberto
          </span>
          <button className="text-button" onClick={() => go("mensalidades")}>
            Ver todas <ArrowRight size={13} />
          </button>
        </div>
        {upcoming.slice(0, 3).map((b) => (
          <button
            className="due-row"
            key={b.id}
            onClick={() => open({ type: "payment", studentId: b.studentId })}
          >
            <Avatar name={find(b.studentId).name} size="small" />
            <div>
              <strong>{find(b.studentId).name}</strong>
              <span>Vencimento em {dateLabel(b.due).slice(0, 5)}</span>
            </div>
            <div className="align-right">
              <strong>{currency(b.amount - paidAmount(b))}</strong>
              <Status value={billStatus(b)} />
            </div>
          </button>
        ))}
        {!upcoming.length && (
          <div className="mini-empty">Tudo em dia nesta competência.</div>
        )}
        <div className="attention-label evaluation-label">
          <span>
            <SlidersHorizontal size={14} />
            Próximas avaliações
          </span>
          <button className="text-button" onClick={() => go("bioimpedancia")}>
            Ver todas <ArrowRight size={13} />
          </button>
        </div>
        {store.appointments
          .filter((a) => a.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, 2)
          .map((a) => (
            <div className="evaluation-row" key={a.id}>
              <span className="date-tile">
                <b>{a.date.slice(8)}</b>
                <small>
                  {new Date(`${a.date}T12:00:00`)
                    .toLocaleDateString("pt-BR", { month: "short" })
                    .replace(".", "")}
                </small>
              </span>
              <div>
                <strong>{find(a.studentId)?.name}</strong>
                <span>{a.time} · Bioimpedância</span>
              </div>
              <button
                className="icon-button"
                aria-label={`Registrar avaliação de ${find(a.studentId)?.name}`}
                onClick={() =>
                  open({ type: "evaluation", studentId: a.studentId })
                }
              >
                <ArrowRight size={16} />
              </button>
            </div>
          ))}
        {!store.appointments.some((a) => a.date >= today) && (
          <div className="mini-empty">Nenhuma avaliação agendada.</div>
        )}
      </Panel>
    ),
    institutional: (
      <div className="institutional">
        <span className="brand-line" />
        Há mais de 15 anos transformando vidas através da musculação.
      </div>
    ),
    bioimpedance: (
      <Metric
        label="Bioimpedância recebida"
        value={currency(f.bioimpedance)}
        icon={<CircleDollarSign size={18} />}
        detail="Recebido no mês"
        tone="blue"
      />
    ),
  };
  return (
    <>
      <PageIntro
        eyebrow="SEU STUDIO, EM UM SÓ LUGAR"
        title={`Olá, ${user.firstName} 👋`}
        description="Cada detalhe em dia. Mais tempo para transformar vidas."
        actions={
          <>
            <span className="today-label">
              <CalendarDays size={15} />
              {date}
            </span>
            <MonthSelect />
          </>
        }
      />
      <div className="dashboard-layout">
        {store.settings.dashboardWidgets
          .filter((w) => w.visible)
          .map((w) => (
            <div
              key={w.id}
              className={`dashboard-widget dashboard-${w.size}`}
              data-widget={w.id}
            >
              {contents[w.id]}
            </div>
          ))}
      </div>
      {!store.settings.dashboardWidgets.some((w) => w.visible) && (
        <Empty
          title="Seu Dashboard está vazio"
          text="Escolha os itens em Configurações → Dashboard."
          action={
            <button
              className="button primary"
              onClick={() => go("configuracoes")}
            >
              Personalizar Dashboard
            </button>
          }
        />
      )}
    </>
  );
}

export function Students() {
  const { store, search, month, go, open, mode } = useStudio();
  const [view, setView] = useState("table");
  const [status, setStatus] = useState("todos");
  const [plan, setPlan] = useState("todos");
  const [payment, setPayment] = useState("todos");
  const [query, setQuery] = useState("");
  const list = store.students.filter(
    (s) =>
      normalize(s.name).includes(normalize(query || search)) &&
      (status === "todos" ||
        (status === "pendente"
          ? s.registrationPending
          : status === "ativo"
            ? s.active
            : !s.active && !s.registrationPending)) &&
      (plan === "todos" || s.plan === Number(plan)) &&
      (payment === "todos" ||
        store.bills.some(
          (b) =>
            b.studentId === s.id &&
            b.month === month &&
            billStatus(b) === payment,
        )),
  );
  const pay = (id: string) => {
    const b = store.bills.find((b) => b.studentId === id && b.month === month);
    return b ? billStatus(b) : "Sem cobrança";
  };
  return (
    <>
      <PageIntro
        eyebrow="RELAÇÕES QUE TRANSFORMAM"
        title="Alunos"
        description="Conheça cada pessoa. Cuide de cada jornada."
        actions={
          <>
            <MonthSelect />
            <button
              className="button primary"
              onClick={() => open({ type: "student" })}
            >
              <Plus size={17} />
              Cadastrar aluno
            </button>
          </>
        }
      />
      <RegistrationLink />
      <div className="section-summary">
        <span>
          <Users size={17} />
          <b>{store.students.length}</b> alunos cadastrados
        </span>
        <span>
          <i className="live-dot" />
          {store.students.filter((s) => s.active).length} ativos
        </span>
      </div>
      <Panel>
        <div className="toolbar">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Buscar alunos"
              placeholder="Buscar por nome do aluno..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Filtrar status do aluno"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
            <option value="pendente">Cadastros pendentes</option>
          </select>
          <select
            aria-label="Filtrar plano"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          >
            <option value="todos">Todos os planos</option>
            {store.settings.planPrices.map((_, i) => (
              <option value={i + 1} key={i}>
                {i + 1} {i === 0 ? "dia" : "dias"} / semana
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar mensalidade"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
          >
            <option value="todos">Todas as mensalidades</option>
            {["Pago", "Pendente", "Vencido", "Parcial"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <div className="segmented">
            <button
              aria-label="Visualização em tabela"
              aria-pressed={view === "table"}
              className={view === "table" ? "active" : ""}
              onClick={() => setView("table")}
            >
              <List size={17} />
            </button>
            <button
              aria-label="Visualização em cartões"
              aria-pressed={view === "cards"}
              className={view === "cards" ? "active" : ""}
              onClick={() => setView("cards")}
            >
              <LayoutGrid size={17} />
            </button>
          </div>
        </div>
        {!list.length ? (
          <Empty />
        ) : view === "table" ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Plano</th>
                  <th>Dias de treino</th>
                  <th>Preferência de horário</th>
                  <th>Mensalidade</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <button
                        className="person-cell"
                        onClick={() => go(`alunos/${s.id}`)}
                      >
                        <Avatar name={s.name} />
                        <span>
                          <strong>{s.name}</strong>
                          <small>{s.phone}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      {s.plan} {s.plan === 1 ? "dia" : "dias"} / semana
                      <small>
                        {currency(store.settings.planPrices[s.plan - 1])} / mês
                      </small>
                    </td>
                    <td>
                      <div className="day-chips">
                        {s.days.map((d) => (
                          <span key={d}>{weekdays[d].slice(0, 3)}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {[...new Set(s.days.map((d) => s.times[d]))].join(" · ")}
                    </td>
                    <td>
                      <Status value={pay(s.id)} />
                    </td>
                    <td>
                      <Status
                        value={
                          s.registrationPending
                            ? "Cadastro pendente"
                            : s.active
                              ? "Ativo"
                              : "Inativo"
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Ver perfil de ${s.name}`}
                        onClick={() => go(`alunos/${s.id}`)}
                      >
                        <ArrowRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="student-cards">
            {list.map((s) => (
              <button
                className="student-card"
                key={s.id}
                onClick={() => go(`alunos/${s.id}`)}
              >
                <div className="student-card-top">
                  <Avatar name={s.name} size="large" />
                  <Status
                    value={
                      s.registrationPending
                        ? "Cadastro pendente"
                        : s.active
                          ? "Ativo"
                          : "Inativo"
                    }
                  />
                </div>
                <h3>{s.name}</h3>
                <p>
                  {s.plan} {s.plan === 1 ? "dia" : "dias"} por semana ·{" "}
                  {currency(store.settings.planPrices[s.plan - 1])}
                </p>
                <div className="day-chips">
                  {s.days.map((d) => (
                    <span key={d}>
                      {weekdays[d].slice(0, 3)} · {s.times[d]}
                    </span>
                  ))}
                </div>
                <div className="student-card-bottom">
                  <Status value={pay(s.id)} />
                  <ArrowRight size={16} />
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="table-footer">
          {list.length} de {store.students.length} alunos ·{" "}
          {mode === "demo" ? "Dados demonstrativos" : "Cadastro do studio"}
        </div>
      </Panel>
    </>
  );
}

export function StudentProfile({ id }: { id: string }) {
  const { store, execute, mode, go, open, notify } = useStudio();
  const s = store.students.find((s) => s.id === id);
  if (!s)
    return (
      <Empty
        title="Aluno não encontrado"
        action={
          <button className="button secondary" onClick={() => go("alunos")}>
            Voltar para alunos
          </button>
        }
      />
    );
  const bills = store.bills
    .filter((b) => b.studentId === id)
    .sort((a, b) => b.month.localeCompare(a.month));
  const evaluations = store.evaluations
    .filter((e) => e.studentId === id)
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <button className="back-button" onClick={() => go("alunos")}>
        <ChevronLeft size={16} />
        Voltar para alunos
      </button>
      <PageIntro
        title={s.name}
        description="Uma visão completa da jornada no studio."
        actions={
          <>
            <button
              className="button secondary"
              onClick={() => open({ type: "student", studentId: id })}
            >
              Editar cadastro
            </button>
            <button
              className="button primary"
              onClick={() => open({ type: "payment", studentId: id })}
            >
              <DollarSign size={16} />
              Registrar pagamento
            </button>
          </>
        }
      />
      <div className="profile-grid">
        <Panel className="profile-card">
          <Avatar name={s.name} size="profile" />
          <h2>{s.name}</h2>
          <Status
            value={
              s.registrationPending
                ? "Cadastro pendente"
                : s.active
                  ? "Ativo"
                  : "Inativo"
            }
          />
          <dl>
            <dt>Telefone / WhatsApp</dt>
            <dd>{s.phone}</dd>
            <dt>E-mail</dt>
            <dd>{s.email || "Não informado"}</dd>
            <dt>Nascimento</dt>
            <dd>{dateLabel(s.birth)}</dd>
            <dt>{mode === "demo" ? "CPF demonstrativo" : "CPF"}</dt>
            <dd>{s.cpf}</dd>
            <dt>Endereço</dt>
            <dd>{s.address || "Não informado"}</dd>
            <dt>Contato de emergência</dt>
            <dd>{s.emergency || "Não informado"}</dd>
            <dt>No studio desde</dt>
            <dd>{dateLabel(s.start)}</dd>
          </dl>
          <button
            className="button secondary full"
            onClick={() =>
              open({
                type: "confirm",
                title: s.active
                  ? "Inativar aluno?"
                  : s.registrationPending
                    ? "Ativar cadastro do aluno?"
                    : "Reativar aluno?",
                message: s.registrationPending
                  ? `Após conferir o cadastro de ${s.name}, a ativação incluirá os horários na agenda e criará a mensalidade quando a data de início permitir, respeitando a disponibilidade.`
                  : `O histórico de ${s.name} será mantido. ${s.active ? "O aluno deixará de aparecer na agenda." : "O aluno voltará a aparecer na agenda."}`,
                onConfirm: async () => {
                  await execute({
                    type: "set_student_active",
                    id,
                    active: !s.active,
                  });
                  notify(
                    s.active
                      ? "Aluno inativado. Histórico preservado."
                      : s.registrationPending
                        ? "Cadastro ativado."
                        : "Aluno reativado.",
                  );
                },
              })
            }
          >
            {s.active
              ? "Inativar aluno"
              : s.registrationPending
                ? "Ativar cadastro"
                : "Reativar aluno"}
          </button>
          <button
            className="button danger-button full"
            onClick={() => open({
              type: "confirm",
              title: "Excluir aluno definitivamente?",
              message: `Excluir ${s.name}? O cadastro, os horários, as mensalidades e pagamentos, as bioimpedâncias e as vendas vinculadas serão apagados. Os totais financeiros serão recalculados. O estoque não será alterado. Esta ação não pode ser desfeita.`,
              onConfirm: async () => {
                await execute({ type: "delete_student", id, expectedName: s.name });
                go("alunos");
                notify("Aluno e histórico vinculado excluídos.");
              },
            })}
          >
            Excluir aluno
          </button>
        </Panel>
        <div className="profile-main">
          <Panel title="Plano e rotina" subtitle="Atendimento individualizado">
            <div className="plan-summary">
              <div>
                <span>
                  {s.plan} {s.plan === 1 ? "dia" : "dias"} por semana
                </span>
                <strong>
                  {currency(store.settings.planPrices[s.plan - 1])}
                  <small> / mês</small>
                </strong>
              </div>
              <span>Vencimento: dia {s.due}</span>
            </div>
            <div className="training-days">
              {s.days.map((d) => (
                <div key={d}>
                  <CalendarDays size={17} />
                  <strong>{weekdays[d]}</strong>
                  <span>{s.times[d]}</span>
                </div>
              ))}
            </div>
            <p className="subtle-note">
              Os horários cadastrados indicam a preferência do aluno.
            </p>
            <div className="note-box">
              <b>Observações e objetivos</b>
              <p>{s.notes || "Nenhuma observação cadastrada."}</p>
            </div>
          </Panel>
          <Panel
            title="Histórico de mensalidades"
            action={
              <button
                className="text-button"
                onClick={() => go("mensalidades")}
              >
                Ver mensalidades <ArrowRight size={14} />
              </button>
            }
          >
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Competência</th>
                    <th>Devido</th>
                    <th>Pago</th>
                    <th>Saldo</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => (
                    <tr key={b.id}>
                      <td className="capitalize">{monthLabel(b.month)}</td>
                      <td>{currency(b.amount)}</td>
                      <td>{currency(paidAmount(b))}</td>
                      <td>{currency(b.amount - paidAmount(b))}</td>
                      <td>
                        <Status value={billStatus(b)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!bills.length && (
              <Empty
                title="Sem cobranças cadastradas"
                text="As mensalidades aparecerão aqui."
              />
            )}
          </Panel>
          <Panel
            title="Avaliações de bioimpedância"
            action={
              <button
                className="text-button"
                onClick={() => open({ type: "evaluation", studentId: id })}
              >
                <Plus size={14} />
                Nova avaliação
              </button>
            }
          >
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Peso</th>
                    <th>IMC</th>
                    <th>Gordura</th>
                    <th>Massa muscular</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((e) => (
                    <tr key={e.id}>
                      <td>{dateLabel(e.date)}</td>
                      <td>{e.weight.toFixed(1)} kg</td>
                      <td>{(e.weight / e.height ** 2).toFixed(1)}</td>
                      <td>{e.fat.toFixed(1)}%</td>
                      <td>{e.muscle.toFixed(1)} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!evaluations.length && (
              <Empty
                title="Uma nova jornada começa aqui"
                text="Registre a primeira avaliação do aluno."
              />
            )}
            <div className="table-footer">
              {mode === "demo"
                ? "Valores fictícios, sem interpretação clínica automática."
                : "Resultados apresentados sem interpretação clínica automática."}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

export function Schedule() {
  const { store, search, go, open } = useStudio();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(
    (new Date(`${today}T12:00:00`).getDay() + 6) % 7,
  );
  const [time, setTime] = useState("todos");
  const [mode, setMode] = useState("week");
  const base = new Date(`${today}T12:00:00`);
  base.setDate(base.getDate() - ((base.getDay() + 6) % 7) + offset * 7);
  const dates = weekdays.map((_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const times = [
    ...new Set([
      "06:00",
      "07:00",
      "08:00",
      "09:00",
      "10:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
      "18:00",
      "19:00",
      ...store.students.flatMap((s) => s.days.map((d) => s.times[d])),
    ]),
  ].sort();
  const list = (d: number, t: string) =>
    store.students.filter(
      (s) =>
        s.active &&
        s.days.includes(d) &&
        s.times[d] === t &&
        normalize(s.name).includes(normalize(search)),
    );
  const occupancy = (d: number, t: string) =>
    store.students.filter(
      (s) => s.active && s.days.includes(d) && s.times[d] === t,
    ).length;
  const visible = times.filter((t) => time === "todos" || time === t);
  return (
    <>
      <PageIntro
        eyebrow="TEMPO PARA CUIDAR"
        title="Agenda e horários"
        description="Uma rotina organizada para um atendimento próximo."
        actions={
          <button
            className="button primary"
            onClick={() => open({ type: "student" })}
          >
            <UserPlus size={17} />
            Adicionar aluno
          </button>
        }
      />
      <Panel>
        <div className="calendar-toolbar">
          <div className="calendar-date">
            <button
              className="icon-button"
              aria-label="Semana anterior"
              onClick={() => setOffset(offset - 1)}
            >
              <ChevronLeft size={19} />
            </button>
            <strong>
              {dateLabel(dates[0]).slice(0, 5)} — {dateLabel(dates[5])}
            </strong>
            <button
              className="icon-button"
              aria-label="Próxima semana"
              onClick={() => setOffset(offset + 1)}
            >
              <ChevronRight size={19} />
            </button>
            <button
              className="button secondary small"
              onClick={() => {
                setOffset(0);
                setSelected((new Date(`${today}T12:00:00`).getDay() + 6) % 7);
              }}
            >
              Hoje
            </button>
          </div>
          <div className="calendar-controls">
            <select
              aria-label="Filtrar horário"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            >
              <option value="todos">Todos os horários</option>
              {times.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select
              aria-label="Filtrar dia da semana"
              value={mode === "week" ? "todos" : selected}
              onChange={(e) => {
                if (e.target.value === "todos") setMode("week");
                else {
                  setSelected(Number(e.target.value));
                  setMode("day");
                }
              }}
            >
              <option value="todos">Semana completa</option>
              {weekdays.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
            <div className="segmented">
              <button
                className={mode === "week" ? "active" : ""}
                onClick={() => setMode("week")}
              >
                Semana
              </button>
              <button
                className={mode === "day" ? "active" : ""}
                onClick={() => setMode("day")}
              >
                Dia
              </button>
            </div>
          </div>
        </div>
        <div className="mobile-day-tabs">
          {weekdays.map((d, i) => (
            <button
              className={selected === i ? "active" : ""}
              key={d}
              onClick={() => setSelected(i)}
            >
              <span>{d.slice(0, 3)}</span>
              <strong>{dates[i].slice(8)}</strong>
            </button>
          ))}
        </div>
        <div className={`week-calendar ${mode === "day" ? "hidden" : ""}`}>
          <div className="calendar-grid calendar-grid-head">
            <span>Horário</span>
            {weekdays.map((d, i) => (
              <div key={d} className={dates[i] === today ? "is-today" : ""}>
                <span>{d}</span>
                <b>{dates[i].slice(8)}</b>
                <small>
                  {
                    store.students.filter((s) => s.active && s.days.includes(i))
                      .length
                  }{" "}
                  alunos previstos
                </small>
              </div>
            ))}
          </div>
          {visible.map((t) => (
            <div
              className="calendar-grid calendar-grid-row"
              key={t}
              style={{
                minHeight: Math.max(
                  100,
                  Math.max(...weekdays.map((_, d) => list(d, t).length)) * 66 +
                    38,
                ),
              }}
            >
              <span className="calendar-time">{t}</span>
              {weekdays.map((_, d) => (
                <div className="calendar-cell" key={d}>
                  {list(d, t).map((s) => (
                    <button
                      className="calendar-event"
                      key={s.id}
                      onClick={() => go(`alunos/${s.id}`)}
                    >
                      <span className="event-dot" />
                      <strong>{s.name}</strong>
                      <small>
                        {s.plan} {s.plan === 1 ? "dia" : "dias"} / semana
                      </small>
                    </button>
                  ))}
                  {!list(d, t).length && (
                    <span className="available">
                      {occupancy(d, t) ? "Nenhum aluno da busca" : "Disponível"}
                    </span>
                  )}
                  {occupancy(d, t) > 0 && (
                    <span
                      className={`occupancy ${occupancy(d, t) > store.settings.maxPerSlot ? "capacity-warning" : ""}`}
                    >
                      {occupancy(d, t)}/{store.settings.maxPerSlot} vagas
                      {occupancy(d, t) > store.settings.maxPerSlot
                        ? " · excedido"
                        : occupancy(d, t) === store.settings.maxPerSlot
                          ? " · lotado"
                          : ""}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className={`daily-calendar ${mode === "day" ? "show" : ""}`}>
          <h3>
            {weekdays[selected] || "Domingo"},{" "}
            {dateLabel(dates[selected] || today)}
          </h3>
          {visible.map((t) => (
            <div className="daily-slot" key={t}>
              <strong>{t}</strong>
              <div>
                {selected < 6 &&
                  list(selected, t).map((s) => (
                    <button
                      className="daily-event"
                      key={s.id}
                      onClick={() => go(`alunos/${s.id}`)}
                    >
                      <Avatar name={s.name} size="small" />
                      <span>{s.name}</span>
                      <ArrowRight size={15} />
                    </button>
                  ))}
                {(selected > 5 || !list(selected, t).length) && (
                  <span className="available">
                    {occupancy(selected, t)
                      ? "Nenhum aluno da busca"
                      : "Horário disponível"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="table-footer">
          Grade recorrente · Capacidade: {store.settings.maxPerSlot} alunos por
          horário por horário.
        </div>
      </Panel>
    </>
  );
}

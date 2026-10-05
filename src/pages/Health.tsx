import {
  Activity,
  ArrowRight,
  CalendarDays,
  Plus,
  Ruler,
  Scale,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, Empty, PageIntro, Panel } from "../components";
import { useStudio } from "../context";
import { dateLabel, normalize, today } from "../data";
import type { Evaluation } from "../data";
const metrics: {
  key: keyof Evaluation | "bmi";
  label: string;
  unit: string;
}[] = [
  { key: "weight", label: "Peso", unit: "kg" },
  { key: "bmi", label: "IMC", unit: "kg/m²" },
  { key: "fat", label: "Gordura corporal", unit: "%" },
  { key: "muscle", label: "Massa muscular", unit: "kg" },
  { key: "visceral", label: "Gordura visceral", unit: "nível" },
  { key: "water", label: "Água corporal", unit: "%" },
];
const value = (e: Evaluation, key: keyof Evaluation | "bmi") =>
  key === "bmi" ? e.weight / e.height ** 2 : Number(e[key]);
export function Health() {
  const { store, setStore, search, open, notify, go } = useStudio();
  const [student, setStudent] = useState(store.students[0]?.id || "");
  const [tab, setTab] = useState("summary");
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const list = store.evaluations
    .filter((e) => e.studentId === student)
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = list.at(-1);
  const selected = store.students.find((s) => s.id === student);
  const a = list.find((e) => e.id === compareA) || list[0];
  const b = list.find((e) => e.id === compareB) || list.at(-1);
  const matchingStudents = store.students.filter((s) =>
    normalize(s.name).includes(normalize(search)),
  );
  useEffect(() => {
    if (
      search &&
      matchingStudents.length &&
      !matchingStudents.some((s) => s.id === student)
    ) {
      setStudent(matchingStudents[0].id);
      setCompareA("");
      setCompareB("");
    }
  }, [search, student, matchingStudents.map((s) => s.id).join(",")]);
  if (search && !matchingStudents.length)
    return (
      <>
        <PageIntro
          title="Bioimpedância"
          description="Acompanhe as avaliações dos seus alunos."
        />
        <Panel>
          <Empty text="Nenhum aluno corresponde à busca informada." />
        </Panel>
      </>
    );
  const upcoming = store.appointments
    .filter((p) => p.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <PageIntro
        eyebrow="CADA JORNADA É ÚNICA"
        title="Bioimpedância"
        description="Acompanhe os dados. Entenda a evolução de cada aluno."
        actions={
          <>
            <button
              className="button secondary"
              onClick={() => open({ type: "appointment", studentId: student })}
            >
              <CalendarDays size={16} />
              Agendar avaliação
            </button>
            <button
              className="button primary"
              onClick={() => open({ type: "evaluation", studentId: student })}
            >
              <Plus size={17} />
              Nova avaliação
            </button>
          </>
        }
      />
      <div className="health-toolbar">
        <label className="field">
          Aluno
          <select
            value={student}
            onChange={(e) => {
              setStudent(e.target.value);
              setCompareA("");
              setCompareB("");
            }}
          >
            {store.students
              .filter((s) => normalize(s.name).includes(normalize(search)))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </label>
        <div className="fictitious-label">
          <Activity size={15} />
          Valores fictícios para demonstração
        </div>
      </div>
      {selected && (
        <div className="health-person">
          <Avatar name={selected.name} />
          <div>
            <strong>{selected.name}</strong>
            <span>
              {list.length} avaliações registradas
              {latest && ` · Última em ${dateLabel(latest.date)}`}
            </span>
          </div>
          <button
            className="text-button"
            onClick={() => go(`alunos/${selected.id}`)}
          >
            Ver perfil <ArrowRight size={14} />
          </button>
        </div>
      )}
      <div className="page-tabs">
        <button
          className={tab === "summary" ? "active" : ""}
          onClick={() => setTab("summary")}
        >
          Visão geral
        </button>
        <button
          className={tab === "history" ? "active" : ""}
          onClick={() => setTab("history")}
        >
          Histórico
        </button>
        <button
          className={tab === "compare" ? "active" : ""}
          onClick={() => setTab("compare")}
        >
          Comparar avaliações
        </button>
      </div>
      {!latest ? (
        <Panel>
          <Empty
            title="O primeiro passo de uma nova jornada"
            text="Este aluno ainda não possui avaliações registradas."
            action={
              <button
                className="button primary"
                onClick={() => open({ type: "evaluation", studentId: student })}
              >
                <Plus size={16} />
                Registrar avaliação
              </button>
            }
          />
        </Panel>
      ) : tab === "summary" ? (
        <>
          <div className="health-metrics">
            {metrics.map((m, i) => (
              <div className="health-metric" key={m.key}>
                <span>
                  {m.label}
                  {i === 0 ? (
                    <Scale size={17} />
                  ) : i === 1 ? (
                    <Ruler size={17} />
                  ) : (
                    <Activity size={17} />
                  )}
                </span>
                <strong>
                  {value(latest, m.key).toFixed(1).replace(".", ",")}{" "}
                  <small>{m.unit}</small>
                </strong>
                <p>Em {dateLabel(latest.date)}</p>
              </div>
            ))}
          </div>
          <div className="health-charts">
            <Panel
              title="Evolução do peso"
              subtitle="Histórico de avaliações · kg"
            >
              <EvolutionChart evaluations={list} field="weight" />
            </Panel>
            <Panel
              title="Composição corporal"
              subtitle="Gordura corporal (%) e massa muscular (kg)"
            >
              <EvolutionChart
                evaluations={list}
                field="fat"
                secondary="muscle"
              />
            </Panel>
          </div>
          <Panel
            title="Notas da avaliação"
            subtitle={`Altura: ${(latest.height * 100).toFixed(0)} cm · ${dateLabel(latest.date)}`}
          >
            <p className="evaluation-note">
              {latest.notes || "Nenhuma observação registrada."}
            </p>
          </Panel>
        </>
      ) : tab === "history" ? (
        <Panel
          title="Histórico de avaliações"
          subtitle="Resultados apresentados sem classificação automática"
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Peso</th>
                  <th>Altura</th>
                  <th>IMC</th>
                  <th>Gordura</th>
                  <th>Músculo</th>
                  <th>Visceral</th>
                  <th>Água</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...list].reverse().map((e) => (
                  <tr key={e.id}>
                    <td>{dateLabel(e.date)}</td>
                    <td>{e.weight.toFixed(1)} kg</td>
                    <td>{(e.height * 100).toFixed(0)} cm</td>
                    <td>{value(e, "bmi").toFixed(1)}</td>
                    <td>{e.fat.toFixed(1)}%</td>
                    <td>{e.muscle.toFixed(1)} kg</td>
                    <td>{e.visceral}</td>
                    <td>{e.water.toFixed(1)}%</td>
                    <td>
                      <button
                        className="icon-button danger"
                        aria-label={`Excluir avaliação de ${dateLabel(e.date)}`}
                        onClick={() =>
                          open({
                            type: "confirm",
                            title: "Excluir avaliação?",
                            message: `A avaliação demonstrativa de ${dateLabel(e.date)} será removida do histórico.`,
                            onConfirm: () => {
                              setStore((p) => ({
                                ...p,
                                evaluations: p.evaluations.filter(
                                  (a) => a.id !== e.id,
                                ),
                              }));
                              notify("Avaliação excluída.");
                            },
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : list.length < 2 ? (
        <Panel>
          <Empty
            title="Ainda não há duas avaliações"
            text="Registre outra avaliação para habilitar a comparação."
          />
        </Panel>
      ) : (
        <Panel
          title="Compare dois momentos"
          subtitle="As diferenças são descritivas e não representam uma avaliação clínica."
        >
          <div className="comparison-selects">
            <label className="field">
              Avaliação inicial
              <select
                value={a?.id}
                onChange={(e) => setCompareA(e.target.value)}
              >
                {list.map((e) => (
                  <option key={e.id} value={e.id}>
                    {dateLabel(e.date)}
                  </option>
                ))}
              </select>
            </label>
            <ArrowRight size={22} />
            <label className="field">
              Avaliação de comparação
              <select
                value={b?.id}
                onChange={(e) => setCompareB(e.target.value)}
              >
                {list.map((e) => (
                  <option key={e.id} value={e.id}>
                    {dateLabel(e.date)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {a?.id === b?.id ? (
            <p className="form-error">Selecione duas avaliações diferentes.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Indicador</th>
                    <th>{dateLabel(a!.date)}</th>
                    <th>{dateLabel(b!.date)}</th>
                    <th>Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...metrics,
                    { key: "height" as const, label: "Altura", unit: "m" },
                  ].map((m) => {
                    const diff = value(b!, m.key) - value(a!, m.key);
                    return (
                      <tr key={m.key}>
                        <td>
                          <strong>{m.label}</strong>
                        </td>
                        <td>
                          {value(a!, m.key).toFixed(m.key === "height" ? 2 : 1)}{" "}
                          {m.unit}
                        </td>
                        <td>
                          {value(b!, m.key).toFixed(m.key === "height" ? 2 : 1)}{" "}
                          {m.unit}
                        </td>
                        <td>
                          <span className="neutral-difference">
                            {diff > 0 ? "+" : ""}
                            {diff.toFixed(m.key === "height" ? 2 : 1)}{" "}
                            {m.key === "fat" || m.key === "water"
                              ? "p.p."
                              : m.unit}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
      <Panel
        title="Próximas avaliações"
        subtitle="Agendamentos de todos os alunos"
        className="appointments-panel"
      >
        {upcoming.map((p) => (
          <div className="appointment-row" key={p.id}>
            <CalendarDays size={20} />
            <div>
              <strong>
                {store.students.find((s) => s.id === p.studentId)?.name}
              </strong>
              <span>
                {dateLabel(p.date)} às {p.time}
              </span>
            </div>
            <button
              className="text-button"
              onClick={() =>
                open({ type: "evaluation", studentId: p.studentId })
              }
            >
              Registrar avaliação <ArrowRight size={14} />
            </button>
            <button
              className="icon-button danger"
              aria-label="Cancelar avaliação agendada"
              onClick={() =>
                open({
                  type: "confirm",
                  title: "Cancelar agendamento?",
                  message:
                    "Este agendamento será removido da agenda de avaliações.",
                  onConfirm: () => {
                    setStore((s) => ({
                      ...s,
                      appointments: s.appointments.filter((a) => a.id !== p.id),
                    }));
                    notify("Agendamento cancelado.");
                  },
                })
              }
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {!upcoming.length && (
          <Empty
            title="Sem avaliações agendadas"
            text="Escolha um aluno e reserve um horário."
          />
        )}
      </Panel>
      <p className="subtle-note">
        Dados fictícios. Os resultados devem ser interpretados por um
        profissional habilitado.
      </p>
    </>
  );
}
function EvolutionChart({
  evaluations,
  field,
  secondary,
}: {
  evaluations: Evaluation[];
  field: "weight" | "fat";
  secondary?: "muscle";
}) {
  const series = secondary ? [field, secondary] : [field];
  const max =
    Math.max(...evaluations.flatMap((e) => series.map((k) => e[k])), 1) * 1.25;
  const colors = ["var(--brand-blue)", "var(--brand-orange)"];
  const x = (i: number) => 55 + i * (470 / Math.max(evaluations.length - 1, 1));
  return (
    <div className="evolution-chart">
      <div className="chart-legend">
        {series.map((k, i) => (
          <span key={k}>
            <i style={{ background: colors[i] }} />
            {k === "weight"
              ? "Peso (kg)"
              : k === "fat"
                ? "Gordura (%)"
                : "Massa muscular (kg)"}
          </span>
        ))}
      </div>
      <svg
        viewBox="0 0 570 220"
        role="img"
        aria-label="Gráfico dos resultados fictícios das avaliações"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((k) => (
          <g key={k}>
            <line
              x1="55"
              x2="530"
              y1={170 - k * 135}
              y2={170 - k * 135}
              stroke="#edf0f4"
              strokeDasharray="3 4"
            />
            <text
              x="42"
              y={174 - k * 135}
              fontSize="11"
              textAnchor="end"
              fill="#929ba8"
            >
              {(max * k).toFixed(0)}
            </text>
          </g>
        ))}
        {series.map((key, j) => (
          <g key={key}>
            <polyline
              points={evaluations
                .map((e, i) => `${x(i)},${170 - (e[key] / max) * 135}`)
                .join(" ")}
              stroke={colors[j]}
              fill="none"
              strokeWidth="2.5"
            />
            {evaluations.map((e, i) => (
              <g key={e.id}>
                <circle
                  cx={x(i)}
                  cy={170 - (e[key] / max) * 135}
                  r="4"
                  fill={colors[j]}
                />
                <text
                  x={x(i)}
                  y={156 - (e[key] / max) * 135}
                  fontSize="11"
                  textAnchor="middle"
                  fill={colors[j]}
                >
                  {e[key].toFixed(1)}
                </text>
              </g>
            ))}
          </g>
        ))}
        {evaluations.map((e, i) => (
          <text
            key={e.id}
            x={x(i)}
            y="201"
            fontSize="11"
            textAnchor="middle"
            fill="#929ba8"
          >
            {dateLabel(e.date).slice(0, 5)}
          </text>
        ))}
      </svg>
    </div>
  );
}

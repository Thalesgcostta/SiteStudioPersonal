import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Minus,
  X,
} from "lucide-react";
import { currency, initials, monthLabel, availableMonths } from "./data";
import { useStudio } from "./context";
import { shiftMonth } from "./calendar";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "compact" : ""}`}>
      <svg viewBox="160 35 275 163" aria-label="KF" role="img">
        <path
          fill="var(--brand-orange)"
          d="M171 82 213 40 213 100 273 40 325 40 257 108 289 140 289 191 233 135 213 155 213 191 171 191Z"
        />
        <path
          fill="var(--brand-blue)"
          d="M294 82 336 40 428 40 389 79 335 79 335 98 390 98 390 138 335 138 335 191 294 191Z"
        />
      </svg>
      {!compact && (
        <div>
          <strong>Katielle Faleiros</strong>
          <span>PERSONAL TRAINER</span>
        </div>
      )}
    </div>
  );
}
export function Avatar({
  name,
  size = "normal",
}: {
  name: string;
  size?: string;
}) {
  return (
    <span
      className={`avatar ${size} color-${name.length % 5}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
export function Status({ value }: { value: string }) {
  const Icon =
    value === "Pago" || value === "Ativo"
      ? CheckCircle2
      : value === "Vencido" || value === "Inativo"
        ? CircleAlert
        : value === "Parcial"
          ? Minus
          : Clock3;
  return (
    <span
      className={`status status-${value.toLowerCase().replaceAll(" ", "-")}`}
    >
      <Icon size={12} />
      {value}
    </span>
  );
}
export function Empty({
  title = "Nenhum resultado encontrado",
  text = "Tente ajustar a busca ou os filtros.",
  action,
}: {
  title?: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <CircleAlert size={25} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function MonthSelect() {
  const { month, setMonth, store } = useStudio();
  return (
    <div className="month-navigation">
      <button
        type="button"
        className="icon-button"
        aria-label="Competência anterior"
        onClick={() => setMonth(shiftMonth(month, -1))}
      >
        <ChevronLeft size={17} />
      </button>
      <label className="month-select">
        <span className="sr-only">Competência mensal</span>
        <select
          aria-label="Competência mensal"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          {availableMonths(store, month).map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        <ChevronDown size={15} />
      </label>
      <button
        type="button"
        className="icon-button"
        aria-label="Próxima competência"
        onClick={() => setMonth(shiftMonth(month, 1))}
      >
        <ChevronRight size={17} />
      </button>
    </div>
  );
}
export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="intro-actions">{actions}</div>
    </div>
  );
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Metric({
  label,
  value,
  icon,
  detail,
  tone = "blue",
  trend,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  detail: string;
  tone?: string;
  trend?: string;
}) {
  return (
    <div className={`metric ${tone}`}>
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <div className="metric-detail">
        {trend && (
          <span className="trend">
            <ArrowUpRight size={12} />
            {trend}
          </span>
        )}
        {detail}
      </div>
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focus = ref.current?.querySelector<HTMLElement>(
      "input,select,button,textarea",
    );
    focus?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = ref.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", handler);
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <header className="modal-header">
          <div>
            <h2 id={id}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="Fechar modal"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
export function LineChart({
  data,
  labels = ["Mensalidades", "Produtos", "Despesas"],
  small = false,
}: {
  data: { label: string; fees: number; products: number; expenses: number }[];
  labels?: string[];
  small?: boolean;
}) {
  const max =
    Math.max(...data.flatMap((d) => [d.fees, d.products, d.expenses]), 1) * 1.2;
  const min =
    Math.min(...data.flatMap((d) => [d.fees, d.products, d.expenses]), 0) * 1.2;
  const colors = ["var(--brand-blue)", "var(--brand-orange)", "#b9c1cd"];
  const point = (v: number, i: number) =>
    `${58 + i * (528 / Math.max(1, data.length - 1))},${200 - ((v - min) / (max - min)) * 160}`;
  const paths = (["fees", "products", "expenses"] as const).slice(
    0,
    labels.length,
  );
  return (
    <div className={`chart ${small ? "small" : ""}`}>
      <div className="chart-legend">
        {labels.map((label, i) => (
          <span key={label}>
            <i style={{ background: colors[i] }} />
            {label}
          </span>
        ))}
      </div>
      <svg
        viewBox="0 0 610 240"
        role="img"
        aria-label={`Evolução mensal de ${labels.join(", ")}. Valores em reais.`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((k) => (
          <g key={k}>
            <line
              x1="58"
              x2="586"
              y1={200 - k * 160}
              y2={200 - k * 160}
              stroke="#edf0f4"
              strokeDasharray="3 4"
            />
            <text
              x="43"
              y={204 - k * 160}
              textAnchor="end"
              fill="#929ba8"
              fontSize="12"
            >
              {currency(min + (max - min) * k).replace(",00", "")}
            </text>
          </g>
        ))}
        {paths.map((key, j) => (
          <g key={key}>
            <polyline
              points={data.map((d, i) => point(d[key], i)).join(" ")}
              fill="none"
              stroke={colors[j]}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {data.map((d, i) => (
              <circle
                key={i}
                cx={58 + i * (528 / Math.max(1, data.length - 1))}
                cy={200 - ((d[key] - min) / (max - min)) * 160}
                r="4"
                fill={colors[j]}
                stroke="white"
                strokeWidth="2"
              >
                <title>
                  {d.label} · {labels[j]}: {currency(d[key])}
                </title>
              </circle>
            ))}
          </g>
        ))}
        {data.map((d, i) => (
          <text
            key={d.label}
            x={58 + i * (528 / Math.max(1, data.length - 1))}
            y="228"
            textAnchor={
              i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"
            }
            fill="#8992a0"
            fontSize="12"
          >
            {i % Math.ceil(Math.max(1, data.length - 1) / 5) === 0 ||
            i === data.length - 1
              ? d.label
              : ""}
          </text>
        ))}
      </svg>
      <details className="chart-data">
        <summary>Ver valores do gráfico</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mês</th>
                {labels.map((l) => (
                  <th key={l}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.label}>
                  <td>{d.label}</td>
                  {paths.map((key) => (
                    <td key={key}>{currency(d[key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
export function Direction({ income }: { income: boolean }) {
  return (
    <span className={`direction ${income ? "income" : "expense"}`}>
      {income ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
    </span>
  );
}
export function ProductArt({
  id,
  color,
  name,
}: {
  id: string;
  color: string;
  name: string;
}) {
  return (
    <svg viewBox="0 0 220 180" role="img" aria-label={`Ilustração de ${name}`}>
      <ellipse cx="110" cy="157" rx="54" ry="9" fill="#000" opacity=".055" />
      {id === "p3" ? (
        <g transform="rotate(-12 110 90)">
          <rect x="36" y="63" width="148" height="61" rx="7" fill={color} />
          <path
            d="M38 63v61M182 63v61"
            stroke="#fff"
            strokeWidth="5"
            strokeDasharray="2 2"
            opacity=".6"
          />
          <text x="58" y="85" fill="#fff" fontSize="9" letterSpacing="3">
            STUDIO NUTRI
          </text>
          <text x="59" y="105" fill="#fff" fontSize="16" fontWeight="800">
            PROTEIN BAR
          </text>
        </g>
      ) : id === "p5" ? (
        <g>
          <ellipse
            cx="110"
            cy="91"
            rx="65"
            ry="40"
            fill="none"
            stroke={color}
            strokeWidth="19"
          />
          <ellipse
            cx="110"
            cy="91"
            rx="65"
            ry="40"
            fill="none"
            stroke="#fff"
            strokeWidth="1"
            opacity=".2"
          />
        </g>
      ) : id === "p4" || id === "p6" ? (
        <g>
          <rect
            x="82"
            y="35"
            width="56"
            height="115"
            rx={id === "p4" ? 13 : 20}
            fill={color}
          />
          <rect x="85" y="27" width="50" height="20" rx="6" fill="#30383f" />
          {id === "p4" && (
            <path
              d="M113 25h22v-8h-21"
              fill="none"
              stroke="#30383f"
              strokeWidth="7"
            />
          )}
          <path
            d="M91 57v77"
            stroke="#fff"
            opacity=".17"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <text
            x="110"
            y="101"
            fill="#fff"
            textAnchor="middle"
            fontSize="17"
            fontWeight="800"
          >
            KF
          </text>
          <text
            x="110"
            y="117"
            fill="#fff"
            textAnchor="middle"
            fontSize="6"
            letterSpacing="1"
          >
            PERSONAL TRAINER
          </text>
        </g>
      ) : (
        <g>
          <rect
            x="65"
            y={id === "p2" ? 56 : 38}
            width="90"
            height={id === "p2" ? 91 : 110}
            rx="12"
            fill="#fafafa"
            stroke="#d5dbe0"
          />
          <rect
            x="63"
            y={id === "p2" ? 48 : 30}
            width="94"
            height="20"
            rx="5"
            fill="#30363c"
          />
          <rect
            x="65"
            y={id === "p2" ? 78 : 67}
            width="90"
            height="53"
            fill={color}
          />
          <text
            x="110"
            y={id === "p2" ? 91 : 81}
            textAnchor="middle"
            fill="#fff"
            fontSize="7"
            letterSpacing="2"
          >
            STUDIO NUTRI
          </text>
          <text
            x="110"
            y={id === "p2" ? 109 : 101}
            textAnchor="middle"
            fill="#fff"
            fontSize={id === "p2" ? 11 : 20}
            fontWeight="800"
          >
            {id === "p2" ? "CREATINA" : "WHEY"}
          </text>
          <text
            x="110"
            y={id === "p2" ? 121 : 116}
            textAnchor="middle"
            fill="#fff"
            fontSize="7"
            letterSpacing="1"
          >
            {id === "p2" ? "100% PURA" : "PROTEIN"}
          </text>
          <path d="M74 56v80" stroke="#fff" strokeWidth="4" opacity=".3" />
        </g>
      )}
    </svg>
  );
}
export function FormActions({
  onClose,
  label = "Salvar",
  disabled = false,
}: {
  onClose: () => void;
  label?: string;
  disabled?: boolean;
}) {
  const { saving } = useStudio();
  return (
    <footer className="form-actions">
      <button
        type="button"
        className="button secondary"
        disabled={saving}
        onClick={onClose}
      >
        Cancelar
      </button>
      <button
        className="button primary"
        disabled={disabled || saving}
        type="submit"
      >
        <Check size={16} />
        {saving ? "Salvando…" : label}
      </button>
    </footer>
  );
}

export const currency = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n,
  );
export const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
export const currentMonth = today.slice(0, 7);
export const dateLabel = (s: string) =>
  new Date(`${s}T12:00:00`).toLocaleDateString("pt-BR");
export const monthLabel = (s: string, short = false) =>
  new Date(`${s}-15T12:00:00`).toLocaleDateString("pt-BR", {
    month: short ? "short" : "long",
    year: "numeric",
  });
export const months = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(`${currentMonth}-15T12:00:00`);
  d.setMonth(d.getMonth() - i);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
});
export const weekdays = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
export const methods = [
  "Pix",
  "Dinheiro",
  "Cartão de débito",
  "Cartão de crédito",
];
export const plans = [160, 220, 280, 360, 420];
export type Student = {
  id: string;
  name: string;
  birth: string;
  cpf: string;
  phone: string;
  email: string;
  address: string;
  emergency: string;
  start: string;
  active: boolean;
  plan: number;
  days: number[];
  times: Record<number, string>;
  due: number;
  notes: string;
};
export type Receipt = {
  id: string;
  studentId: string;
  month: string;
  amount: number;
  date: string;
  method: string;
  note: string;
  attachment: string;
  attachmentPath?: string | null;
};
export type Bill = {
  id: string;
  studentId: string;
  month: string;
  amount: number;
  due: string;
  receipts: Receipt[];
};
export type Evaluation = {
  id: string;
  studentId: string;
  date: string;
  weight: number;
  height: number;
  fat: number;
  muscle: number;
  visceral: number;
  water: number;
  notes: string;
  charge: number;
  payments: EvaluationPayment[];
};
export type EvaluationPayment = {
  id: string;
  amount: number;
  date: string;
  method: string;
  note: string;
};
export type Appointment = {
  id: string;
  studentId: string;
  date: string;
  time: string;
};
export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  variant: string;
  color: string;
  version?: number;
  photoPath?: string | null;
  photo?: string;
};
export type Sale = {
  id: string;
  date: string;
  studentId: string;
  items: { productId: string; quantity: number; price: number }[];
  discount: number;
  method: string;
};
export type Movement = {
  id: string;
  date: string;
  description: string;
  category: string;
  kind: "income" | "expense";
  amount: number;
};
export type Settings = {
  name: string;
  professional: string;
  phone: string;
  email: string;
  address: string;
  open: string;
  close: string;
  methods: string[];
  logo: string;
  orange: string;
  blue: string;
  planPrices: number[];
  maxPerSlot: number;
  evaluationPrice: number;
  productCategories: string[];
  dashboardWidgets: DashboardWidget[];
};
export const widgetLabels = {
  students: "Alunos ativos",
  fees: "Mensalidades recebidas",
  pending: "Valores pendentes",
  products: "Vendas de produtos",
  bioimpedance: "Bioimpedância recebida",
  result: "Resultado do mês",
  financialChart: "Gráfico financeiro",
  billStatus: "Situação das mensalidades",
  quickActions: "Atalhos",
  schedule: "Agenda de hoje",
  attention: "Cobranças e próximas avaliações",
  institutional: "Mensagem do studio",
};
export type DashboardWidget = {
  id: keyof typeof widgetLabels;
  visible: boolean;
  size: "small" | "half" | "full";
};
export const defaultWidgets = (): DashboardWidget[] =>
  Object.keys(widgetLabels).map((id, index) => ({
    id: id as DashboardWidget["id"],
    visible: true,
    size:
      index < 6
        ? "small"
        : ["quickActions", "institutional"].includes(id)
          ? "full"
          : "half",
  }));
export const settingsDefaults = () => ({
  maxPerSlot: 4,
  evaluationPrice: 0,
  productCategories: ["Suplementos", "Alimentos", "Acessórios"],
  dashboardWidgets: defaultWidgets(),
});
export const evaluationPaid = (e: Evaluation) =>
  Math.round(e.payments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;
export const evaluationBalance = (e: Evaluation) =>
  Math.max(0, Math.round((e.charge - evaluationPaid(e)) * 100) / 100);
export function upgradeStore(store: Store): Store {
  return {
    ...store,
    schemaVersion: store.schemaVersion ?? 3,
    settings: { ...settingsDefaults(), ...store.settings },
    evaluations: store.evaluations.map((e) => ({
      ...e,
      charge: e.charge ?? 0,
      payments: e.payments || [],
    })),
  };
}
export type Store = {
  schemaVersion: number;
  students: Student[];
  bills: Bill[];
  evaluations: Evaluation[];
  appointments: Appointment[];
  products: Product[];
  sales: Sale[];
  movements: Movement[];
  settings: Settings;
};
export const saleTotal = (s: Sale) =>
  Math.round(
    (s.items.reduce((a, i) => a + i.price * i.quantity, 0) - s.discount) * 100,
  ) / 100;
export const paidAmount = (b: Bill) =>
  Math.round(b.receipts.reduce((a, r) => a + r.amount, 0) * 100) / 100;
export const billStatus = (b: Bill) =>
  paidAmount(b) >= b.amount
    ? "Pago"
    : paidAmount(b) > 0
      ? "Parcial"
      : b.due < today
        ? "Vencido"
        : "Pendente";
const names = [
  "Mariana Oliveira",
  "Lucas Ferreira",
  "Ana Carolina Santos",
  "Rafael Almeida",
  "Juliana Costa",
  "Pedro Henrique",
  "Camila Rodrigues",
  "Bruno Martins",
  "Fernanda Lima",
  "Gabriel Souza",
  "Beatriz Ribeiro",
  "André Pereira",
];
export function seed(): Store {
  const students: Student[] = names.map((name, i) => ({
    id: `s${i + 1}`,
    name,
    birth: `${1988 + (i % 12)}-0${(i % 9) + 1}-15`,
    cpf: "000.000.000-00",
    phone: `(16) 99999-${String(1100 + i).padStart(4, "0")}`,
    email: `${name.split(" ")[0].toLowerCase()}@exemplo.com`,
    address: "Rua das Flores, 120 · Ribeirão Preto, SP",
    emergency: "Contato demonstrativo · (16) 98888-0000",
    start: `${months[5]}-10`,
    active: i !== 11,
    plan: (i % 5) + 1,
    days:
      i % 5 === 0
        ? [0]
        : i % 5 === 1
          ? [1, 3]
          : i % 5 === 2
            ? [0, 2, 4]
            : i % 5 === 3
              ? [0, 1, 3, 4]
              : [0, 1, 2, 3, 4],
    times: {
      0: ["07:00", "08:00", "09:00"][i % 3],
      1: "08:00",
      2: "07:00",
      3: "17:00",
      4: "08:00",
    },
    due: i === 6 ? 3 : i === 7 ? 4 : 10 + (i % 4),
    notes:
      "Fortalecimento muscular, saúde e qualidade de vida. Dados fictícios para apresentação.",
  }));
  const bills: Bill[] = months.flatMap((month, mi) =>
    students
      .filter((s) => s.active)
      .map((s, i) => {
        const amount = plans[s.plan - 1];
        const paid =
          mi === 0
            ? i < 5
              ? amount
              : i === 8
                ? 100
                : 0
            : i === 10 && mi === 1
              ? 0
              : amount;
        return {
          id: `b${month}${s.id}`,
          studentId: s.id,
          month,
          amount,
          due: `${month}-${String(s.due).padStart(2, "0")}`,
          receipts: paid
            ? [
                {
                  id: `r${month}${s.id}`,
                  studentId: s.id,
                  month,
                  amount: paid,
                  date: `${month}-02`,
                  method: methods[i % 4],
                  note: "Pagamento demonstrativo",
                  attachment: "",
                },
              ]
            : [],
        };
      }),
  );
  const products: Product[] = [
    {
      id: "p1",
      name: "Whey Protein",
      category: "Suplementos",
      price: 149.9,
      stock: 18,
      variant: "Baunilha · 900 g",
      color: "#5b9bbb",
    },
    {
      id: "p2",
      name: "Creatina monohidratada",
      category: "Suplementos",
      price: 89.9,
      stock: 8,
      variant: "100% pura · 300 g",
      color: "#eb7e42",
    },
    {
      id: "p3",
      name: "Barra de proteína",
      category: "Alimentos",
      price: 12.9,
      stock: 32,
      variant: "Chocolate · 45 g",
      color: "#ac8773",
    },
    {
      id: "p4",
      name: "Coqueteleira",
      category: "Acessórios",
      price: 39.9,
      stock: 3,
      variant: "Preta · 600 ml",
      color: "#4e5963",
    },
    {
      id: "p5",
      name: "Mini band",
      category: "Acessórios",
      price: 29.9,
      stock: 12,
      variant: "Resistência média",
      color: "#609b98",
    },
    {
      id: "p6",
      name: "Garrafa térmica",
      category: "Acessórios",
      price: 79.9,
      stock: 2,
      variant: "Azul · 500 ml",
      color: "#5b9bbb",
    },
  ];
  const sales: Sale[] = months.flatMap((month, i) => [
    {
      id: `v${i}a`,
      date: `${month}-02`,
      studentId: "s1",
      items: [
        { productId: "p1", quantity: 2, price: 149.9 },
        { productId: "p2", quantity: 1, price: 89.9 },
      ],
      discount: 0,
      method: "Pix",
    },
    {
      id: `v${i}b`,
      date: `${month}-03`,
      studentId: "s3",
      items: [
        { productId: "p3", quantity: 4, price: 12.9 },
        { productId: "p4", quantity: 1, price: 39.9 },
      ],
      discount: 5,
      method: "Cartão de débito",
    },
  ]);
  const movements: Movement[] = months.flatMap((month) => [
    {
      id: `m${month}1`,
      date: `${month}-01`,
      description: "Aluguel do studio",
      category: "Aluguel",
      kind: "expense" as const,
      amount: 850,
    },
    {
      id: `m${month}2`,
      date: `${month}-03`,
      description: "Energia elétrica",
      category: "Energia",
      kind: "expense" as const,
      amount: 135,
    },
    {
      id: `m${month}3`,
      date: `${month}-04`,
      description: "Abastecimento de água",
      category: "Água",
      kind: "expense" as const,
      amount: 65,
    },
    {
      id: `m${month}4`,
      date: `${month}-02`,
      description: "Compra de mercadorias",
      category: "Mercadorias",
      kind: "expense" as const,
      amount: 190,
    },
    {
      id: `m${month}5`,
      date: `${month}-04`,
      description: "Manutenção de equipamentos",
      category: "Manutenção",
      kind: "expense" as const,
      amount: 90,
    },
  ]);
  const evaluations: Evaluation[] = students.slice(0, 6).flatMap((s, i) =>
    [0, 1, 2].map((j) => ({
      id: `e${s.id}${j}`,
      studentId: s.id,
      date: `${months[2 - j]}-02`,
      weight: 67 + i * 3 - j * 0.8,
      height: 1.65 + i * 0.02,
      fat: 28 + i - j * 0.7,
      muscle: 26 + i + j * 0.4,
      visceral: 7 + i,
      water: 51 + i + j * 0.3,
      notes:
        "Avaliação demonstrativa. Os resultados devem ser interpretados por profissional habilitado.",
      charge: 0,
      payments: [],
    })),
  );
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() + 2);
  const next = d.toISOString().slice(0, 10);
  return {
    students,
    schemaVersion: 3,
    bills,
    evaluations,
    appointments: [
      { id: "a1", studentId: "s1", date: next, time: "09:00" },
      { id: "a2", studentId: "s5", date: next, time: "10:00" },
      { id: "a3", studentId: "s3", date: next, time: "14:00" },
    ],
    products,
    sales,
    movements,
    settings: {
      ...settingsDefaults(),
      name: "Katielle Faleiros",
      professional: "Profissional de Educação Física",
      phone: "(16) 99999-0000",
      email: "contato@studio.exemplo",
      address: "Ribeirão Preto · SP",
      open: "06:00",
      close: "20:00",
      methods: [...methods],
      logo: "/logo.svg",
      orange: "#ff6800",
      blue: "#579aba",
      planPrices: [...plans],
    },
  };
}
export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("");
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export const uid = () => crypto.randomUUID();

export function availableMonths(store: Store) {
  const next = new Date(`${currentMonth}-15T12:00:00`);
  next.setMonth(next.getMonth() + 1);
  const upcoming = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  return [
    ...new Set([
      ...months,
      upcoming,
      ...store.bills.map((b) => b.month),
      ...store.sales.map((s) => s.date.slice(0, 7)),
      ...store.movements.map((m) => m.date.slice(0, 7)),
      ...store.evaluations.flatMap((e) => [
        e.date.slice(0, 7),
        ...e.payments.map((p) => p.date.slice(0, 7)),
      ]),
    ]),
  ]
    .sort()
    .reverse();
}

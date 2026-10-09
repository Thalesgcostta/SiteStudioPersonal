import { currentMonth, paidAmount, plans, seed, uid } from "../data";
import type {
  Appointment,
  Evaluation,
  Movement,
  Product,
  Receipt,
  Sale,
  Settings,
  Store,
  Student,
} from "../data";

export type StudioAction =
  | { type: "save_student"; student: Student }
  | { type: "set_student_active"; id: string; active: boolean }
  | { type: "generate_bills"; month: string }
  | { type: "record_payment"; billId: string; receipt: Receipt; file?: File }
  | { type: "record_evaluation"; evaluation: Evaluation }
  | { type: "delete_evaluation"; id: string }
  | { type: "save_appointment"; appointment: Appointment }
  | { type: "delete_appointment"; id: string }
  | { type: "save_product"; product: Product }
  | { type: "record_sale"; sale: Sale }
  | { type: "record_movement"; movement: Movement }
  | { type: "delete_movement"; id: string }
  | { type: "save_settings"; settings: Settings }
  | { type: "reset_demo" };

export const emptyStore = (): Store => ({
  students: [],
  bills: [],
  evaluations: [],
  appointments: [],
  products: [],
  sales: [],
  movements: [],
  settings: {
    name: "Katielle Faleiros",
    professional: "Profissional de Educação Física",
    phone: "",
    email: "",
    address: "",
    open: "06:00",
    close: "20:00",
    methods: ["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito"],
    logo: "/logo.svg",
    orange: "#ff6800",
    blue: "#579aba",
    planPrices: [...plans],
  },
});
export function applyDemoAction(s: Store, a: StudioAction): Store {
  switch (a.type) {
    case "save_student": {
      const existing = s.students.some((x) => x.id === a.student.id);
      const createBill =
        !existing &&
        a.student.active &&
        a.student.start <= `${currentMonth}-31`;
      return {
        ...s,
        students: existing
          ? s.students.map((x) => (x.id === a.student.id ? a.student : x))
          : [...s.students, a.student],
        bills: createBill
          ? [
              ...s.bills,
              {
                id: uid(),
                studentId: a.student.id,
                month: currentMonth,
                amount: s.settings.planPrices[a.student.plan - 1],
                due: `${currentMonth}-${String(a.student.due).padStart(2, "0")}`,
                receipts: [],
              },
            ]
          : s.bills,
      };
    }
    case "set_student_active":
      return {
        ...s,
        students: s.students.map((x) =>
          x.id === a.id ? { ...x, active: a.active } : x,
        ),
      };
    case "generate_bills":
      return {
        ...s,
        bills: [
          ...s.bills,
          ...s.students
            .filter(
              (x) =>
                x.active &&
                x.start <= `${a.month}-31` &&
                !s.bills.some(
                  (b) => b.studentId === x.id && b.month === a.month,
                ),
            )
            .map((x) => ({
              id: uid(),
              studentId: x.id,
              month: a.month,
              amount: s.settings.planPrices[x.plan - 1],
              due: `${a.month}-${String(x.due).padStart(2, "0")}`,
              receipts: [],
            })),
        ],
      };
    case "record_payment": {
      const bill = s.bills.find((x) => x.id === a.billId);
      if (
        !bill ||
        a.receipt.amount <= 0 ||
        a.receipt.amount > bill.amount - paidAmount(bill)
      )
        throw new Error("Valor recebido maior que o saldo ou inválido.");
      return {
        ...s,
        bills: s.bills.map((x) =>
          x.id === a.billId
            ? { ...x, receipts: [...x.receipts, a.receipt] }
            : x,
        ),
      };
    }
    case "record_evaluation":
      return {
        ...s,
        evaluations: [...s.evaluations, a.evaluation],
        appointments: s.appointments.filter(
          (x) =>
            !(
              x.studentId === a.evaluation.studentId &&
              x.date === a.evaluation.date
            ),
        ),
      };
    case "delete_evaluation":
      return { ...s, evaluations: s.evaluations.filter((x) => x.id !== a.id) };
    case "save_appointment": {
      if (
        s.appointments.some(
          (x) => x.date === a.appointment.date && x.time === a.appointment.time,
        )
      )
        throw new Error("Já há uma avaliação neste horário.");
      return { ...s, appointments: [...s.appointments, a.appointment] };
    }
    case "delete_appointment":
      return {
        ...s,
        appointments: s.appointments.filter((x) => x.id !== a.id),
      };
    case "save_product":
      return {
        ...s,
        products: s.products.some((x) => x.id === a.product.id)
          ? s.products.map((x) => (x.id === a.product.id ? a.product : x))
          : [...s.products, a.product],
      };
    case "record_sale": {
      if (
        a.sale.items.some(
          (i) =>
            !s.products.some(
              (p) =>
                p.id === i.productId &&
                p.stock >= i.quantity &&
                p.price === i.price,
            ),
        )
      )
        throw new Error("Estoque ou preço mudou. Atualize o catálogo.");
      return {
        ...s,
        sales: [...s.sales, a.sale],
        products: s.products.map((x) => ({
          ...x,
          stock:
            x.stock -
            (a.sale.items.find((i) => i.productId === x.id)?.quantity || 0),
        })),
      };
    }
    case "record_movement":
      return { ...s, movements: [...s.movements, a.movement] };
    case "delete_movement":
      return { ...s, movements: s.movements.filter((x) => x.id !== a.id) };
    case "save_settings":
      return { ...s, settings: a.settings };
    case "reset_demo":
      return seed();
  }
}
export function assertStore(value: unknown): asserts value is Store {
  const s = value as Partial<Store> | null;
  if (
    !s ||
    ![
      "students",
      "bills",
      "evaluations",
      "appointments",
      "products",
      "sales",
      "movements",
    ].every((key) => Array.isArray(s[key as keyof Store])) ||
    !s.settings ||
    s.settings.planPrices?.length !== 5
  )
    throw new Error(
      "Resposta do banco inválida. Confira se as migrações foram executadas.",
    );
}

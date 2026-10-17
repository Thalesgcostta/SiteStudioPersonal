import {
  currentMonth,
  paidAmount,
  plans,
  seed,
  uid,
  settingsDefaults,
  evaluationBalance,
} from "../data";
import type {
  Appointment,
  Evaluation,
  EvaluationPayment,
  DashboardWidget,
  Movement,
  RecurringExpense,
  Product,
  Receipt,
  Sale,
  Settings,
  Store,
  Student,
} from "../data";

export type StudioAction =
  | { type: "save_student"; student: Student }
  | { type: "delete_student"; id: string; expectedName: string }
  | { type: "set_student_active"; id: string; active: boolean }
  | { type: "generate_bills"; month: string }
  | { type: "record_payment"; billId: string; receipt: Receipt; file?: File }
  | {
      type: "record_evaluation";
      evaluation: Evaluation;
      payment?: EvaluationPayment;
    }
  | {
      type: "record_evaluation_payment";
      evaluationId: string;
      payment: EvaluationPayment;
    }
  | { type: "delete_evaluation"; id: string }
  | { type: "save_appointment"; appointment: Appointment }
  | { type: "delete_appointment"; id: string }
  | { type: "save_product"; product: Product; file?: File }
  | { type: "delete_product"; id: string; version?: number }
  | { type: "record_sale"; sale: Sale }
  | { type: "record_movement"; movement: Movement }
  | { type: "delete_movement"; id: string }
  | { type: "save_recurring_expense"; expense: RecurringExpense }
  | {
      type: "pay_recurring_expense";
      id: string;
      month: string;
      date: string;
      amount: number;
    }
  | { type: "set_registration_access"; enabled?: boolean; rotate?: boolean }
  | { type: "save_settings"; settings: Settings }
  | { type: "save_dashboard"; widgets: DashboardWidget[] }
  | { type: "reset_demo" };

export const emptyStore = (): Store => ({
  schemaVersion: 4,
  students: [],
  bills: [],
  evaluations: [],
  appointments: [],
  products: [],
  sales: [],
  movements: [],
  settings: {
    ...settingsDefaults(),
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
      assertCapacity(s, a.student);
      const existing = s.students.some((x) => x.id === a.student.id);
      const createBill =
        !existing &&
        a.student.active &&
        a.student.start <= `${currentMonth}-31`;
      return {
        ...s,
        students: existing
          ? s.students.map((x) =>
              x.id === a.student.id
                ? {
                    ...a.student,
                    registrationPending: a.student.active
                      ? false
                      : a.student.registrationPending,
                  }
                : x,
            )
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
    case "delete_student": {
      const student = s.students.find((x) => x.id === a.id);
      if (!student || student.name !== a.expectedName)
        throw new Error("O cadastro mudou. Atualize antes de excluir.");
      return {
        ...s,
        students: s.students.filter((x) => x.id !== a.id),
        bills: s.bills.filter((x) => x.studentId !== a.id),
        evaluations: s.evaluations.filter((x) => x.studentId !== a.id),
        appointments: s.appointments.filter((x) => x.studentId !== a.id),
        sales: s.sales.filter((x) => x.studentId !== a.id),
      };
    }
    case "set_student_active": {
      const student = s.students.find((x) => x.id === a.id);
      if (student && a.active && !student.active)
        assertCapacity(s, { ...student, active: true });
      return {
        ...s,
        students: s.students.map((x) =>
          x.id === a.id ? { ...x, active: a.active } : x,
        ),
      };
    }
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
    case "record_evaluation": {
      if (a.evaluation.charge !== s.settings.evaluationPrice)
        throw new Error("O preço do exame mudou. Atualize os dados.");
      const evaluation = {
        ...a.evaluation,
        payments: [] as EvaluationPayment[],
      };
      if (a.payment) {
        if (a.payment.amount <= 0 || a.payment.amount > evaluation.charge)
          throw new Error("Pagamento maior que o saldo do exame.");
        evaluation.payments = [a.payment];
      }
      return {
        ...s,
        evaluations: [...s.evaluations, evaluation],
        appointments: s.appointments.filter(
          (x) =>
            !(
              x.studentId === a.evaluation.studentId &&
              x.date === a.evaluation.date
            ),
        ),
      };
    }
    case "record_evaluation_payment": {
      const e = s.evaluations.find((e) => e.id === a.evaluationId);
      if (
        !e ||
        a.payment.amount <= 0 ||
        a.payment.amount > evaluationBalance(e)
      )
        throw new Error("Pagamento maior que o saldo do exame.");
      return {
        ...s,
        evaluations: s.evaluations.map((e) =>
          e.id === a.evaluationId
            ? { ...e, payments: [...e.payments, a.payment] }
            : e,
        ),
      };
    }
    case "delete_evaluation": {
      if (s.evaluations.find((e) => e.id === a.id)?.payments.length)
        throw new Error("Avaliação com recebimentos não pode ser excluída.");
      return { ...s, evaluations: s.evaluations.filter((x) => x.id !== a.id) };
    }
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
    case "save_product": {
      const existing = s.products.find((x) => x.id === a.product.id);
      if (existing?.deletedAt) throw new Error("Este produto já foi excluído.");
      if (existing && (existing.version ?? 1) !== (a.product.version ?? 1))
        throw new Error(
          "O produto foi alterado em outra sessão. Atualize o catálogo antes de editar.",
        );
      if (
        !Number.isInteger(a.product.stock) ||
        a.product.stock < 0 ||
        !Number.isFinite(a.product.price) ||
        a.product.price <= 0 ||
        a.product.name.trim().length < 3
      )
        throw new Error("Informe nome, preço e quantidade em estoque válidos.");
      const product = {
        ...a.product,
        deletedAt: null,
        version: (existing ? (existing.version ?? 1) : 0) + 1,
      };
      return {
        ...s,
        products: existing
          ? s.products.map((x) => (x.id === product.id ? product : x))
          : [...s.products, product],
      };
    }
    case "delete_product": {
      const product = s.products.find((x) => x.id === a.id);
      if (!product || product.deletedAt)
        throw new Error("Produto não encontrado ou já excluído.");
      if ((product.version ?? 1) !== (a.version ?? 1))
        throw new Error(
          "O produto foi alterado em outra sessão. Atualize o estoque antes de excluir.",
        );
      return {
        ...s,
        products: s.products.map((x) =>
          x.id === a.id
            ? {
                ...x,
                deletedAt: new Date().toISOString(),
                version: (x.version ?? 1) + 1,
              }
            : x,
        ),
      };
    }
    case "record_sale": {
      if (
        a.sale.items.some(
          (i) =>
            !s.products.some(
              (p) =>
                p.id === i.productId &&
                !p.deletedAt &&
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
          version:
            (x.version ?? 1) +
            (a.sale.items.some((i) => i.productId === x.id) ? 1 : 0),
        })),
      };
    }
    case "record_movement":
      return { ...s, movements: [...s.movements, a.movement] };
    case "save_recurring_expense": {
      const expenses = s.recurringExpenses || [];
      const existing = expenses.find((item) => item.id === a.expense.id);
      if (existing && existing.version !== a.expense.version)
        throw new Error(
          "A despesa foi alterada em outra sessão. Atualize antes de editar.",
        );
      if (
        !Number.isFinite(a.expense.amount) ||
        a.expense.amount <= 0 ||
        a.expense.description.trim().length < 3 ||
        a.expense.dueDay < 1 ||
        a.expense.dueDay > 31 ||
        (a.expense.endMonth && a.expense.endMonth < a.expense.startMonth)
      )
        throw new Error("Revise os dados da despesa fixa.");
      const expense = { ...a.expense, version: (existing?.version || 0) + 1 };
      return {
        ...s,
        recurringExpenses: existing
          ? expenses.map((item) => (item.id === expense.id ? expense : item))
          : [...expenses, expense],
      };
    }
    case "pay_recurring_expense": {
      const expense = s.recurringExpenses?.find((item) => item.id === a.id);
      if (
        !expense ||
        a.month < expense.startMonth ||
        (expense.endMonth && a.month > expense.endMonth)
      )
        throw new Error("Despesa fixa não prevista nesta competência.");
      if (
        s.movements.some(
          (item) =>
            item.recurringExpenseId === a.id && item.recurringMonth === a.month,
        )
      )
        throw new Error("Esta despesa já foi paga nesta competência.");
      if (!Number.isFinite(a.amount) || a.amount <= 0)
        throw new Error("Informe um valor válido.");
      return {
        ...s,
        movements: [
          ...s.movements,
          {
            id: uid(),
            date: a.date,
            description: expense.description,
            category: expense.category,
            kind: "expense",
            amount: a.amount,
            recurringExpenseId: a.id,
            recurringMonth: a.month,
          },
        ],
      };
    }
    case "set_registration_access":
      return {
        ...s,
        registrationAccess: {
          token: a.rotate ? uid() : s.registrationAccess?.token || uid(),
          enabled: a.enabled ?? s.registrationAccess?.enabled ?? true,
        },
      };
    case "delete_movement":
      return { ...s, movements: s.movements.filter((x) => x.id !== a.id) };
    case "save_settings":
      if (
        s.products.some(
          (p) => !a.settings.productCategories.includes(p.category),
        )
      )
        throw new Error("Uma categoria em uso não pode ser removida.");
      return { ...s, settings: a.settings };
    case "save_dashboard":
      return { ...s, settings: { ...s.settings, dashboardWidgets: a.widgets } };
    case "reset_demo":
      return seed();
  }
}
function assertCapacity(s: Store, student: Student) {
  if (!student.active) return;
  const existing = s.students.find((x) => x.id === student.id);
  for (const day of student.days) {
    if (
      existing?.active &&
      existing.days.includes(day) &&
      existing.times[day] === student.times[day]
    )
      continue;
    if (
      s.students.filter(
        (x) =>
          x.active &&
          x.id !== student.id &&
          x.days.includes(day) &&
          x.times[day] === student.times[day],
      ).length >= s.settings.maxPerSlot
    )
      throw new Error(
        `Horário ${student.times[day]} sem vagas. Escolha outro horário.`,
      );
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

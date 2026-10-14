import { paidAmount, saleTotal } from "./data";
import type { Store } from "./data";
export const finances = (store: Store, month: string) => {
  const bills = store.bills.filter((b) => b.month === month);
  const fees = store.bills
    .flatMap((b) => b.receipts)
    .filter((r) => r.date.startsWith(month))
    .reduce((a, r) => a + r.amount, 0);
  const products = store.sales
    .filter((s) => s.date.startsWith(month))
    .reduce((a, s) => a + saleTotal(s), 0);
  const movements = store.movements.filter((m) => m.date.startsWith(month));
  const bioimpedance = store.evaluations
    .flatMap((e) => e.payments)
    .filter((p) => p.date.startsWith(month))
    .reduce((sum, p) => sum + p.amount, 0);
  const bioPending = store.evaluations
    .filter((e) => e.date.startsWith(month))
    .reduce(
      (sum, e) =>
        sum +
        Math.max(0, e.charge - e.payments.reduce((s, p) => s + p.amount, 0)),
      0,
    );
  const extra = movements
    .filter((m) => m.kind === "income")
    .reduce((a, m) => a + m.amount, 0);
  const expenses = movements
    .filter((m) => m.kind === "expense")
    .reduce((a, m) => a + m.amount, 0);
  return {
    bills,
    fees,
    products,
    bioimpedance,
    bioPending,
    extra,
    expenses,
    income: fees + products + bioimpedance + extra,
    result: fees + products + bioimpedance + extra - expenses,
    pending: bills.reduce(
      (a, b) => a + Math.max(0, b.amount - paidAmount(b)),
      0,
    ),
  };
};

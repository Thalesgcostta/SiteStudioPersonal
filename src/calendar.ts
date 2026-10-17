const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export const dateNow = () => formatter.format(new Date());
export const shiftMonth = (month: string, offset: number) => {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, index - 1 + offset, 15));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};
export const monthSeries = (month: string, count = 6) =>
  Array.from({ length: count }, (_, i) => shiftMonth(month, -i));
export const monthEnd = (month: string) => {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index, 0)).toISOString().slice(0, 10);
};
export const dueInMonth = (month: string, day: number) =>
  `${month}-${String(Math.min(day, Number(monthEnd(month).slice(8)))).padStart(2, "0")}`;
export let today = dateNow();
export let currentMonth = today.slice(0, 7);
export let months = monthSeries(currentMonth);
const listeners = new Set<() => void>();
export const calendarSnapshot = () => today;
export function subscribeCalendar(listener: () => void) {
  const refresh = () => {
    const next = dateNow();
    if (next === today) return;
    today = next;
    currentMonth = next.slice(0, 7);
    months = monthSeries(currentMonth);
    listeners.forEach((notify) => notify());
  };
  listeners.add(listener);
  const timer = window.setInterval(refresh, 30000);
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
  refresh();
  return () => {
    listeners.delete(listener);
    clearInterval(timer);
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
}

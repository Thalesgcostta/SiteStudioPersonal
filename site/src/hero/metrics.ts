/** Visual-only defaults. A future data adapter can supply a new immutable snapshot. */
export type PerformanceSnapshot = {
  vo2Max: number;
  pace: string;
  heartRate: number;
  source: "illustrative" | "connected";
};
export const illustrativePerformance: PerformanceSnapshot = {
  vo2Max: 42.1,
  pace: "05:02",
  heartRate: 142,
  source: "illustrative",
};

import type { Direction, Outcome } from "@/types/prediction";

export function getMoveThresholdPct(): number {
  const raw = process.env.NEXT_PUBLIC_MOVE_THRESHOLD_PCT ?? "0.5";
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0.5;
}

/**
 * Outcome from entry → exit price and predicted direction.
 * |move| <= threshold → neutral (no meaningful move).
 */
export function evaluatePrediction(
  entryPrice: number,
  exitPrice: number,
  direction: Direction,
  thresholdPct: number,
): { pctChange: number; outcome: Exclude<Outcome, "pending"> } {
  if (!Number.isFinite(entryPrice) || entryPrice === 0) {
    return { pctChange: 0, outcome: "neutral" };
  }
  const pctChange = ((exitPrice - entryPrice) / entryPrice) * 100;

  if (!Number.isFinite(pctChange) || Math.abs(pctChange) <= thresholdPct) {
    return { pctChange, outcome: "neutral" };
  }

  if (direction === "up" && pctChange > thresholdPct) {
    return { pctChange, outcome: "correct" };
  }
  if (direction === "down" && pctChange < -thresholdPct) {
    return { pctChange, outcome: "correct" };
  }
  return { pctChange, outcome: "incorrect" };
}

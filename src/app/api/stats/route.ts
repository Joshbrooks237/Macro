import { NextResponse } from "next/server";
import { getMoveThresholdPct } from "@/lib/evaluate";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let database;
  try {
    database = getDb();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const threshold = getMoveThresholdPct();

  try {
    const totals = database
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN outcome = 'pending' THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN outcome = 'correct' THEN 1 ELSE 0 END) AS correct,
         SUM(CASE WHEN outcome = 'incorrect' THEN 1 ELSE 0 END) AS incorrect,
         SUM(CASE WHEN outcome = 'neutral' THEN 1 ELSE 0 END) AS neutral
       FROM predictions`,
    )
      .get() as {
      total: number;
      pending: number | null;
      correct: number | null;
      incorrect: number | null;
      neutral: number | null;
    };

    const scored = (totals.correct ?? 0) + (totals.incorrect ?? 0);
    const win_rate_pct =
      scored > 0 ? ((totals.correct ?? 0) / scored) * 100 : null;

    return NextResponse.json({
      threshold_pct: threshold,
      total: totals.total,
      pending: totals.pending ?? 0,
      correct: totals.correct ?? 0,
      incorrect: totals.incorrect ?? 0,
      neutral: totals.neutral ?? 0,
      scored_count: scored,
      win_rate_pct,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stats query failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

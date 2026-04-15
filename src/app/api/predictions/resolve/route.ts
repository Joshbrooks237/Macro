import { NextResponse } from "next/server";
import { evaluatePrediction, getMoveThresholdPct } from "@/lib/evaluate";
import { getDb } from "@/lib/db";
import { getPrice } from "@/lib/prices";
import type { AssetKey, PredictionRow } from "@/types/prediction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  let database;
  try {
    database = getDb();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database unavailable";
    return NextResponse.json({ error: message, resolved_count: 0, resolved: [], errors: [] }, { status: 500 });
  }

  const now = new Date().toISOString();
  const threshold = getMoveThresholdPct();

  const pending = database
    .prepare(
      `SELECT id, created_at, asset, direction, horizon_hours, note,
 entry_price, due_at, resolved_at, exit_price, pct_change, outcome
       FROM predictions
       WHERE outcome = 'pending' AND datetime(due_at) <= datetime(?)`,
    )
    .all(now) as PredictionRow[];

  const resolved: PredictionRow[] = [];
  const errors: { id: number; message: string }[] = [];

  for (const p of pending) {
    try {
      const quote = await getPrice(p.asset as AssetKey);
      const { pctChange, outcome } = evaluatePrediction(
        p.entry_price,
        quote.price,
        p.direction,
        threshold,
      );

      database
        .prepare(
          `UPDATE predictions
           SET resolved_at = ?, exit_price = ?, pct_change = ?, outcome = ?
           WHERE id = ?`,
        )
        .run(now, quote.price, pctChange, outcome, p.id);

      const updated = database
        .prepare(
          `SELECT id, created_at, asset, direction, horizon_hours, note,
                  entry_price, due_at, resolved_at, exit_price, pct_change, outcome
           FROM predictions WHERE id = ?`,
        )
        .get(p.id) as PredictionRow;
      resolved.push(updated);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Resolve failed";
      errors.push({ id: p.id, message });
    }
  }

  return NextResponse.json({
    threshold_pct: threshold,
    resolved_count: resolved.length,
    resolved,
    errors,
  });
}

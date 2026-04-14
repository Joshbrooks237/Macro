import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPrice } from "@/lib/prices";
import type { AssetKey, Direction, PredictionRow } from "@/types/prediction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseBody(body: unknown): {
  asset: AssetKey;
  direction: Direction;
  horizon_hours: number;
  note: string | null;
} | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const asset = o.asset;
  const direction = o.direction;
  const horizon = o.horizon_hours ?? o.horizonHours;
  const note = o.note;

  if (
    asset !== "oil" &&
    asset !== "gold" &&
    asset !== "stocks" &&
    asset !== "crypto"
  ) {
    return null;
  }
  if (direction !== "up" && direction !== "down") return null;
  const horizon_hours =
    typeof horizon === "number" ? horizon : Number.parseInt(String(horizon), 10);
  if (horizon_hours !== 24 && horizon_hours !== 48) return null;

  let noteStr: string | null = null;
  if (note != null) {
    if (typeof note !== "string") return null;
    const t = note.trim();
    noteStr = t.length ? t.slice(0, 2000) : null;
  }

  return { asset, direction, horizon_hours, note: noteStr };
}

export async function GET() {
  const database = getDb();
  const rows = database
    .prepare(
      `SELECT id, created_at, asset, direction, horizon_hours, note,
 entry_price, due_at, resolved_at, exit_price, pct_change, outcome
       FROM predictions
       ORDER BY datetime(created_at) DESC`,
    )
    .all() as PredictionRow[];
  return NextResponse.json({ predictions: rows });
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseBody(json);
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "Invalid payload. Expected asset (oil|gold|stocks|crypto), direction (up|down), horizon_hours (24|48), optional note.",
      },
      { status: 400 },
    );
  }

  let entryPrice: number;
  try {
    const quote = await getPrice(parsed.asset);
    entryPrice = quote.price;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Price fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const created = new Date();
  const due = new Date(
    created.getTime() + parsed.horizon_hours * 60 * 60 * 1000,
  );
  const created_at = created.toISOString();
  const due_at = due.toISOString();

  const database = getDb();
  const result = database
    .prepare(
      `INSERT INTO predictions (
        created_at, asset, direction, horizon_hours, note,
        entry_price, due_at, outcome
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    )
    .run(
      created_at,
      parsed.asset,
      parsed.direction,
      parsed.horizon_hours,
      parsed.note,
      entryPrice,
      due_at,
    );

  const id = Number(result.lastInsertRowid);
  const row = database
    .prepare(
      `SELECT id, created_at, asset, direction, horizon_hours, note,
              entry_price, due_at, resolved_at, exit_price, pct_change, outcome
       FROM predictions WHERE id = ?`,
    )
    .get(id) as PredictionRow;

  return NextResponse.json({ prediction: row }, { status: 201 });
}

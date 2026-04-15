export const ASSET_KEYS = [
  "oil",
  "wti",
  "brent",
  "gold",
  "silver",
  "stocks",
  "crypto",
  "dxy",
  "treasury_10y",
  "vix",
  "natgas",
  "copper",
  "mos",
  "ntr",
  "cf",
] as const;

export type AssetKey = (typeof ASSET_KEYS)[number];

export function isAssetKey(v: string): v is AssetKey {
  return (ASSET_KEYS as readonly string[]).includes(v);
}
export type Direction = "up" | "down";
export type Outcome = "pending" | "correct" | "incorrect" | "neutral";

export type PredictionRow = {
  id: number;
  created_at: string;
  asset: AssetKey;
  direction: Direction;
  horizon_hours: number;
  note: string | null;
  entry_price: number;
  due_at: string;
  resolved_at: string | null;
  exit_price: number | null;
  pct_change: number | null;
  outcome: Outcome;
};

export type PriceResult = {
  price: number;
  /** Finnhub previous close; undefined for crypto simple price fetch */
  previousClose?: number;
};

/** Batch ticker / API payload row */
export type QuoteRow =
  | {
      asset: AssetKey;
      label: string;
      ok: true;
      price: number;
      sessionPct: number | null;
    }
  | { asset: AssetKey; label: string; ok: false; error: string };

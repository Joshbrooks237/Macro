export type AssetKey = "oil" | "gold" | "stocks" | "crypto";
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

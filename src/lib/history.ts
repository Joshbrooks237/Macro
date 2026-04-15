import type { AssetKey } from "@/types/prediction";
import { assetLabel } from "@/lib/prices";

const ETF_SYMBOL: Record<Exclude<AssetKey, "crypto">, string> = {
  oil: "USO",
  gold: "GLD",
  silver: "SLV",
  stocks: "SPY",
};

/** Yahoo chart symbol: gold uses COMEX futures (≈ spot $/oz), not GLD. */
function yahooHistorySymbol(asset: Exclude<AssetKey, "crypto">): string {
  if (asset === "gold") return "GC=F";
  return ETF_SYMBOL[asset];
}

export type HistoryPoint = {
  /** Unix ms */
  t: number;
  price: number;
  /** Short label for axis */
  label: string;
};

export type HistoryResponse = {
  asset: AssetKey;
  title: string;
  points: HistoryPoint[];
  source: "finnhub" | "yahoo" | "coingecko";
  days: number;
};

const HISTORY_CACHE_TTL_MS = 5 * 60 * 1000;
const historyCache = new Map<
  string,
  { at: number; data: HistoryResponse }
>();

function cacheKey(asset: AssetKey, days: number) {
  return `${asset}:${days}`;
}

function formatDateLabel(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Finnhub /stock/candle often returns 403 on free tier. Try it; return null on failure or empty.
 */
async function tryFinnhubDaily(
  asset: Exclude<AssetKey, "crypto">,
  days: number,
): Promise<HistoryResponse | null> {
  const token = process.env.FINNHUB_API_KEY?.trim();
  if (!token) return null;
  /** Gold is priced from Yahoo GC=F ($/oz); Finnhub GLD candles are a different instrument. */
  if (asset === "gold") return null;

  const symbol = ETF_SYMBOL[asset];
  const to = Math.floor(Date.now() / 1000);
  const from = to - (days + 5) * 24 * 60 * 60;

  const url =
    `https://finnhub.io/api/v1/stock/candle?` +
    `symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}&token=${encodeURIComponent(token)}`;

  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 403 || res.status === 401) {
    return null;
  }
  if (!res.ok) {
    return null;
  }

  const json = (await res.json()) as {
    s: string;
    t?: number[];
    c?: number[];
  };

  if (json.s !== "ok" || !json.t?.length || !json.c?.length) {
    return null;
  }

  const points: HistoryPoint[] = json.t.map((unixSec, i) => ({
    t: unixSec * 1000,
    price: json.c![i],
    label: formatDateLabel(unixSec * 1000),
  }));

  return {
    asset,
    title: assetLabel(asset),
    points,
    source: "finnhub",
    days,
  };
}

/** Yahoo chart API — unofficial but works with a browser-like User-Agent (no API key). */
async function fetchYahooDaily(
  asset: Exclude<AssetKey, "crypto">,
  days: number,
): Promise<HistoryResponse> {
  const symbol = yahooHistorySymbol(asset);
  const range =
    days <= 5 ? "5d" : days <= 10 ? "10d" : days <= 30 ? "1mo" : "3mo";

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=1d&range=${range}`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (compatible; MacroPredictionLearningBot/1.0; educational)",
    },
  });

  if (!res.ok) {
    throw new Error(`Yahoo chart error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: (number | null)[] }> };
      }>;
      error?: { description?: string };
    };
  };

  const err = json.chart?.error?.description;
  if (err) {
    throw new Error(`Yahoo: ${err}`);
  }

  const result = json.chart?.result?.[0];
  const timestamps = result?.timestamp;
  const closes = result?.indicators?.quote?.[0]?.close;

  if (!timestamps?.length || !closes?.length) {
    return {
      asset,
      title: assetLabel(asset),
      points: [],
      source: "yahoo",
      days,
    };
  }

  const points: HistoryPoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (c == null || !Number.isFinite(c)) continue;
    const t = timestamps[i] * 1000;
    points.push({ t, price: c, label: formatDateLabel(t) });
  }

  const trimmed = points.length > days ? points.slice(-days) : points;

  return {
    asset,
    title: assetLabel(asset),
    points: trimmed,
    source: "yahoo",
    days,
  };
}

async function fetchEtfHistory(
  asset: Exclude<AssetKey, "crypto">,
  days: number,
): Promise<HistoryResponse> {
  const fromFinnhub = await tryFinnhubDaily(asset, days);
  if (fromFinnhub && fromFinnhub.points.length > 0) {
    return fromFinnhub;
  }
  return fetchYahooDaily(asset, days);
}

async function fetchCoingeckoWeek(days: number): Promise<HistoryResponse> {
  const url =
    `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?` +
    `vs_currency=usd&days=${days}&interval=daily`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "MacroPredictionLearningBot/1.0 (educational)",
    },
  });

  if (res.status === 429) {
    const ck = cacheKey("crypto", days);
    const stale = historyCache.get(ck);
    if (stale) {
      return stale.data;
    }
    throw new Error(
      "CoinGecko rate limited. Wait a bit or open this chart again later.",
    );
  }

  if (!res.ok) {
    throw new Error(`CoinGecko error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { prices?: [number, number][] };
  const raw = json.prices ?? [];

  const points: HistoryPoint[] = raw.map(([t, price]) => ({
    t,
    price,
    label: formatDateLabel(t),
  }));

  return {
    asset: "crypto",
    title: assetLabel("crypto"),
    points,
    source: "coingecko",
    days,
  };
}

/**
 * Daily closes for ETFs: Finnhub candles if your plan allows, else Yahoo chart (no key).
 * Bitcoin: CoinGecko. Cached ~5 minutes per asset.
 */
export async function getHistory(
  asset: AssetKey,
  days: number,
): Promise<HistoryResponse> {
  const d = Math.min(30, Math.max(1, Math.floor(days)));
  const key = cacheKey(asset, d);
  const hit = historyCache.get(key);
  if (hit && Date.now() - hit.at < HISTORY_CACHE_TTL_MS) {
    return hit.data;
  }

  const data =
    asset === "crypto"
      ? await fetchCoingeckoWeek(d)
      : await fetchEtfHistory(asset, d);

  historyCache.set(key, { at: Date.now(), data });
  return data;
}

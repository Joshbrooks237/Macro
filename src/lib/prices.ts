import type { AssetKey, PriceResult } from "@/types/prediction";

const COINGECKO_BTC =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";

const SYMBOL_MAP: Record<Exclude<AssetKey, "crypto">, string> = {
  oil: "USO",
  gold: "GLD",
  stocks: "SPY",
};

type FinnhubQuote = {
  c: number;
  h: number;
  l: number;
  o: number;
  pc: number;
};

function getFinnhubToken(): string {
  const token = process.env.FINNHUB_API_KEY?.trim();
  if (!token) {
    throw new Error(
      "FINNHUB_API_KEY is not set. Add it to .env (see .env.example).",
    );
  }
  return token;
}

/**
 * Fetches current price (and previous close when from Finnhub).
 * Crypto uses CoinGecko; oil/gold/stocks use Finnhub quote.
 */
export async function getPrice(asset: AssetKey): Promise<PriceResult> {
  if (asset === "crypto") {
    const res = await fetch(COINGECKO_BTC, { next: { revalidate: 60 } });
    if (!res.ok) {
      throw new Error(`CoinGecko error: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as { bitcoin?: { usd?: number } };
    const usd = data.bitcoin?.usd;
    if (typeof usd !== "number" || !Number.isFinite(usd)) {
      throw new Error("CoinGecko returned an invalid bitcoin.usd price");
    }
    return { price: usd };
  }

  const symbol = SYMBOL_MAP[asset];
  const token = getFinnhubToken();
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`Finnhub error: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as FinnhubQuote;
  if (typeof data.c !== "number" || !Number.isFinite(data.c)) {
    throw new Error(`Finnhub returned invalid current price for ${symbol}`);
  }
  return {
    price: data.c,
    previousClose: typeof data.pc === "number" ? data.pc : undefined,
  };
}

/** Intraday % vs previous close from Finnhub fields (informational only). */
export function finnhubSessionPctChange(quote: PriceResult): number | null {
  if (
    quote.previousClose == null ||
    quote.previousClose === 0 ||
    !Number.isFinite(quote.previousClose)
  ) {
    return null;
  }
  return ((quote.price - quote.previousClose) / quote.previousClose) * 100;
}

export function assetLabel(asset: AssetKey): string {
  const labels: Record<AssetKey, string> = {
    oil: "Oil (USO)",
    gold: "Gold (GLD)",
    stocks: "Stocks (SPY)",
    crypto: "Bitcoin",
  };
  return labels[asset];
}

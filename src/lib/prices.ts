import type { AssetKey, PriceResult, QuoteRow } from "@/types/prediction";

const COINGECKO_BTC =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";

/** In-memory BTC quote to stay under CoinGecko public rate limits (ticker + tabs + dev). */
let cryptoCache: { price: number; fetchedAt: number } | null = null;

function cryptoCacheTtlMs(): number {
  const sec = Number.parseInt(
    process.env.COINGECKO_CACHE_TTL_SEC ?? "90",
    10,
  );
  return Number.isFinite(sec) && sec >= 20 ? sec * 1000 : 90_000;
}

async function fetchBitcoinUsdFromCoingecko(
  fetchInit: RequestInit,
): Promise<number> {
  const res = await fetch(COINGECKO_BTC, {
    ...fetchInit,
    headers: {
      Accept: "application/json",
      "User-Agent": "MacroPredictionLearningBot/1.0 (local; educational)",
      ...(fetchInit.headers as Record<string, string> | undefined),
    },
  });

  if (res.status === 429) {
    if (cryptoCache) {
      return cryptoCache.price;
    }
    throw new Error(
      "CoinGecko rate limited (429). Wait a minute, or raise COINGECKO_CACHE_TTL_SEC in .env (default 90s).",
    );
  }

  if (!res.ok) {
    throw new Error(`CoinGecko error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { bitcoin?: { usd?: number } };
  const usd = data.bitcoin?.usd;
  if (typeof usd !== "number" || !Number.isFinite(usd)) {
    throw new Error("CoinGecko returned an invalid bitcoin.usd price");
  }
  return usd;
}

const SYMBOL_MAP: Record<Exclude<AssetKey, "crypto">, string> = {
  oil: "USO",
  gold: "GLD",
  stocks: "SPY",
};

/** Display order for tickers and batch quotes */
export const TRACKED_ASSETS: AssetKey[] = [
  "stocks",
  "gold",
  "oil",
  "crypto",
];

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
 * @param options.noCache — use for live tickers (bypasses Next fetch cache)
 */
export async function getPrice(
  asset: AssetKey,
  options?: { noCache?: boolean },
): Promise<PriceResult> {
  const fetchInit = options?.noCache
    ? ({ cache: "no-store" } as const)
    : ({ next: { revalidate: 60 } } as const);

  if (asset === "crypto") {
    const ttl = cryptoCacheTtlMs();
    const now = Date.now();
    if (cryptoCache && now - cryptoCache.fetchedAt < ttl) {
      return { price: cryptoCache.price };
    }

    try {
      const usd = await fetchBitcoinUsdFromCoingecko(fetchInit);
      cryptoCache = { price: usd, fetchedAt: Date.now() };
      return { price: usd };
    } catch (e) {
      if (cryptoCache) {
        return { price: cryptoCache.price };
      }
      throw e;
    }
  }

  const symbol = SYMBOL_MAP[asset];
  const token = getFinnhubToken();
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token)}`;
  const res = await fetch(url, fetchInit);
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

/** Parallel quotes for all tracked markets (partial success if one leg fails). */
export async function getAllPriceSnapshots(options?: {
  noCache?: boolean;
}): Promise<{ rows: QuoteRow[]; fetchedAt: string }> {
  const noCache = options?.noCache ?? true;
  const fetchedAt = new Date().toISOString();
  const rows = await Promise.all(
    TRACKED_ASSETS.map(async (asset): Promise<QuoteRow> => {
      try {
        const quote = await getPrice(asset, { noCache });
        return {
          asset,
          label: assetLabel(asset),
          ok: true,
          price: quote.price,
          sessionPct: finnhubSessionPctChange(quote),
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Quote failed";
        return {
          asset,
          label: assetLabel(asset),
          ok: false,
          error: message,
        };
      }
    }),
  );
  return { rows, fetchedAt };
}

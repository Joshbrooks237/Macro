import type { AssetKey, PriceResult, QuoteRow } from "@/types/prediction";

const COINGECKO_BTC =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";

/** In-memory BTC quote to stay under CoinGecko public rate limits (ticker + tabs + dev). */
let cryptoCache: { price: number; fetchedAt: number } | null = null;

/** Gold uses Yahoo GC=F ($/oz); short cache to limit unofficial API calls. */
let goldCache: { result: PriceResult; fetchedAt: number } | null = null;

function goldCacheTtlMs(): number {
  const sec = Number.parseInt(process.env.GOLD_YAHOO_CACHE_TTL_SEC ?? "45", 10);
  return Number.isFinite(sec) && sec >= 15 ? sec * 1000 : 45_000;
}

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

type YahooQuoteMeta = {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
};

/**
 * COMEX gold front-month futures (GC=F) — USD per troy ounce, matches typical “gold price” headlines.
 * Not the GLD ETF share price.
 */
async function fetchGoldSpotFromYahoo(
  fetchInit: RequestInit,
): Promise<PriceResult> {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=1d&range=5d";
  const res = await fetch(url, {
    ...fetchInit,
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (compatible; MacroPredictionLearningBot/1.0; educational)",
      ...(fetchInit.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    throw new Error(`Yahoo gold (GC=F) error: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as {
    chart?: { result?: Array<{ meta?: YahooQuoteMeta }> };
  };
  const meta = json.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw new Error("Yahoo returned no valid gold futures price (GC=F)");
  }
  const pc = meta?.chartPreviousClose ?? meta?.previousClose;
  return {
    price,
    previousClose:
      typeof pc === "number" && Number.isFinite(pc) && pc > 0 ? pc : undefined,
  };
}

const SYMBOL_MAP: Record<Exclude<AssetKey, "crypto" | "gold">, string> = {
  oil: "USO",
  silver: "SLV",
  stocks: "SPY",
};

/** Display order for tickers and batch quotes */
export const TRACKED_ASSETS: AssetKey[] = [
  "stocks",
  "gold",
  "silver",
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
 * Crypto uses CoinGecko; ETFs/commodity proxies use Finnhub quote.
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

  if (asset === "gold") {
    const ttl = goldCacheTtlMs();
    const now = Date.now();
    if (goldCache && now - goldCache.fetchedAt < ttl) {
      return goldCache.result;
    }
    try {
      const result = await fetchGoldSpotFromYahoo(fetchInit);
      goldCache = { result, fetchedAt: Date.now() };
      return result;
    } catch (e) {
      if (goldCache) {
        return goldCache.result;
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
    gold: "Gold (GC=F, $/oz)",
    silver: "Silver (SLV)",
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

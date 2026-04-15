import type { AssetKey, PriceResult, QuoteRow } from "@/types/prediction";

const COINGECKO_BTC =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";

/** In-memory BTC quote to stay under CoinGecko public rate limits (ticker + tabs + dev). */
let cryptoCache: { price: number; fetchedAt: number } | null = null;

const YAHOO_SPOT_SYMBOL = {
  gold: "GC=F",
  wti: "CL=F",
  brent: "BZ=F",
  dxy: "DX-Y.NYB",
  treasury_10y: "^TNX",
  vix: "^VIX",
  natgas: "NG=F",
  copper: "HG=F",
} as const satisfies Record<string, string>;

type YahooSpotAsset = keyof typeof YAHOO_SPOT_SYMBOL;

const yahooSpotCache: Partial<
  Record<YahooSpotAsset, { result: PriceResult; fetchedAt: number }>
> = {};

function yahooSpotCacheTtlMs(): number {
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

function isYahooSpotAsset(asset: AssetKey): asset is YahooSpotAsset {
  return Object.prototype.hasOwnProperty.call(YAHOO_SPOT_SYMBOL, asset);
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

async function fetchYahooSpotFromChart(
  symbol: string,
  labelForErrors: string,
  fetchInit: RequestInit,
): Promise<PriceResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
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
    throw new Error(
      `Yahoo (${labelForErrors}) error: ${res.status} ${res.statusText}`,
    );
  }
  const json = (await res.json()) as {
    chart?: { result?: Array<{ meta?: YahooQuoteMeta }> };
  };
  const meta = json.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw new Error(`Yahoo returned no valid price (${labelForErrors})`);
  }
  const pc = meta?.chartPreviousClose ?? meta?.previousClose;
  return {
    price,
    previousClose:
      typeof pc === "number" && Number.isFinite(pc) && pc > 0 ? pc : undefined,
  };
}

const FINNHUB_SYMBOL = {
  oil: "USO",
  silver: "SLV",
  stocks: "SPY",
  mos: "MOS",
  ntr: "NTR",
  cf: "CF",
} as const;

type FinnhubQuoteAsset = keyof typeof FINNHUB_SYMBOL;

function isFinnhubQuoteAsset(asset: AssetKey): asset is FinnhubQuoteAsset {
  return Object.prototype.hasOwnProperty.call(FINNHUB_SYMBOL, asset);
}

/** Display order for tickers and batch quotes */
export const TRACKED_ASSETS: AssetKey[] = [
  "stocks",
  "gold",
  "silver",
  "oil",
  "wti",
  "brent",
  "crypto",
  "dxy",
  "treasury_10y",
  "vix",
  "natgas",
  "copper",
  "mos",
  "ntr",
  "cf",
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
 * Crypto uses CoinGecko; indices/commodities use Yahoo chart; ETFs/stocks use Finnhub quote.
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

  if (isYahooSpotAsset(asset)) {
    const ttl = yahooSpotCacheTtlMs();
    const now = Date.now();
    const hit = yahooSpotCache[asset];
    if (hit && now - hit.fetchedAt < ttl) {
      return hit.result;
    }
    const symbol = YAHOO_SPOT_SYMBOL[asset];
    try {
      const result = await fetchYahooSpotFromChart(
        symbol,
        symbol,
        fetchInit,
      );
      yahooSpotCache[asset] = { result, fetchedAt: Date.now() };
      return result;
    } catch (e) {
      if (hit) {
        return hit.result;
      }
      throw e;
    }
  }

  if (!isFinnhubQuoteAsset(asset)) {
    throw new Error(`No price feed configured for asset: ${asset}`);
  }

  const symbol = FINNHUB_SYMBOL[asset];
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

/** Intraday % vs previous close from Finnhub / Yahoo meta (informational only). */
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

/** Short label for ticker cards (full detail in tooltip / charts). */
export function assetTickerLabel(asset: AssetKey): string {
  const labels: Record<AssetKey, string> = {
    oil: "USO",
    wti: "WTI",
    brent: "Brent",
    gold: "Gold",
    silver: "SLV",
    stocks: "SPY",
    crypto: "Bitcoin",
    dxy: "DXY",
    treasury_10y: "10Y yield",
    vix: "VIX",
    natgas: "Nat gas",
    copper: "Copper",
    mos: "MOS",
    ntr: "NTR",
    cf: "CF",
  };
  return labels[asset];
}

export function assetLabel(asset: AssetKey): string {
  const labels: Record<AssetKey, string> = {
    oil: "Oil (USO)",
    wti: "WTI crude (CL=F, $/bbl)",
    brent: "Brent crude (BZ=F, $/bbl)",
    gold: "Gold (GC=F, $/oz)",
    silver: "Silver (SLV)",
    stocks: "Stocks (SPY)",
    crypto: "Bitcoin",
    dxy: "DXY (ICE USD index)",
    treasury_10y: "10Y Treasury yield (^TNX)",
    vix: "VIX",
    natgas: "Natural gas (NG=F)",
    copper: "Copper (HG=F, $/lb)",
    mos: "Mosaic (MOS)",
    ntr: "Nutrien (NTR)",
    cf: "CF Industries (CF)",
  };
  return labels[asset];
}

/** Ticker / chart display — not always USD. */
export function formatAssetPrice(asset: AssetKey, price: number): string {
  if (asset === "treasury_10y") {
    return `${price.toFixed(2)}%`;
  }
  if (asset === "vix" || asset === "dxy") {
    return price.toFixed(2);
  }
  if (asset === "natgas" || asset === "copper") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(price);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
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

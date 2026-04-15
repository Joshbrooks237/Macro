/**
 * Polymarket Gamma API — geopolitical / world-affairs discovery by official tags.
 * Docs: https://docs.polymarket.com/developers/gamma-markets-api/get-markets
 */

export const GAMMA_API = "https://gamma-api.polymarket.com";

/** Curated tags: Geopolitics, Foreign Policy, World (verified via Gamma). */
export const GEOPOLITICS_GAMMA_TAG_IDS = [
  "100265", // Geopolitics
  "101794", // Foreign Policy
  "101970", // World
] as const;

type GammaMarket = {
  question?: string;
  slug?: string;
  outcomes?: string;
  outcomePrices?: string;
  closed?: boolean;
  active?: boolean;
  acceptingOrders?: boolean;
};

export type GammaEventRaw = {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  volume?: number;
  volume24hr?: number;
  liquidity?: number;
  markets?: GammaMarket[];
};

export type PolymarketGeopoliticsRow = {
  id: string;
  title: string;
  slug: string;
  url: string;
  volume24hr: number | null;
  liquidity: number | null;
  /** Yes outcome price 0–1 from Gamma `outcomePrices` only when the market is open for orders. */
  yesPrice: number | null;
  marketQuestion: string | null;
};

function parseJsonArray(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Reads the Yes outcome price from Gamma only. Does not infer probabilities.
 */
function yesPriceFromGammaOutcomePrices(m: GammaMarket | undefined): number | null {
  if (!m) return null;
  const outcomes = parseJsonArray(m.outcomes);
  const prices = parseJsonArray(m.outcomePrices).map((p) => Number.parseFloat(p));
  if (!outcomes.length || prices.length !== outcomes.length) return null;
  const yesIdx = outcomes.findIndex((o) => o.toLowerCase() === "yes");
  const idx = yesIdx >= 0 ? yesIdx : 0;
  const p = prices[idx];
  if (!Number.isFinite(p) || p < 0 || p > 1) return null;
  return p;
}

/** Strict: only markets Polymarket marks as open and accepting orders (avoids showing stale 0/1 resolves as “live”). */
function pickQuotableMarket(markets: GammaMarket[] | undefined): GammaMarket | undefined {
  if (!markets?.length) return undefined;
  return markets.find((m) => m.closed === false && m.acceptingOrders === true);
}

function pickDisplayMarketForTitle(markets: GammaMarket[] | undefined): GammaMarket | undefined {
  const q = pickQuotableMarket(markets);
  if (q) return q;
  if (!markets?.length) return undefined;
  const notClosed = markets.find((m) => m.closed === false);
  return notClosed ?? markets[0];
}

export function normalizeGammaEvent(raw: GammaEventRaw): PolymarketGeopoliticsRow | null {
  try {
    const id = raw.id;
    const title = raw.title?.trim();
    const slug = raw.slug?.trim();
    if (!id || !title || !slug) return null;

    const quotable = pickQuotableMarket(raw.markets);
    const displayM = pickDisplayMarketForTitle(raw.markets);
    const yesPrice = quotable ? yesPriceFromGammaOutcomePrices(quotable) : null;

    const volume24hr =
      typeof raw.volume24hr === "number" && Number.isFinite(raw.volume24hr)
        ? raw.volume24hr
        : null;
    const liquidity =
      typeof raw.liquidity === "number" && Number.isFinite(raw.liquidity)
        ? raw.liquidity
        : null;

    return {
      id,
      title,
      slug,
      url: `https://polymarket.com/event/${encodeURIComponent(slug)}`,
      volume24hr,
      liquidity,
      yesPrice:
        yesPrice != null && Number.isFinite(yesPrice) ? yesPrice : null,
      marketQuestion: displayM?.question?.trim() ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchEventsForTag(
  tagId: string,
  limit: number,
  init?: RequestInit,
): Promise<GammaEventRaw[]> {
  const url =
    `${GAMMA_API}/events?` +
    new URLSearchParams({
      tag_id: tagId,
      active: "true",
      closed: "false",
      limit: String(limit),
      order: "volume_24hr",
      ascending: "false",
    }).toString();

  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      console.warn(
        `[polymarket] Gamma HTTP ${res.status} for tag ${tagId} — skipping tag`,
      );
      return [];
    }
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as GammaEventRaw[]) : [];
  } catch (e) {
    console.warn(`[polymarket] Gamma fetch failed for tag ${tagId}:`, e);
    return [];
  }
}

/**
 * Merges events from several tags, dedupes by event id, sorts by 24h volume.
 */
export async function fetchPolymarketGeopoliticsSnapshot(options?: {
  perTagLimit?: number;
  maxEvents?: number;
  fetchInit?: RequestInit;
}): Promise<{
  events: PolymarketGeopoliticsRow[];
  tagIds: readonly string[];
}> {
  const perTagLimit = options?.perTagLimit ?? 14;
  const maxEvents = options?.maxEvents ?? 18;
  const init = options?.fetchInit;

  const buckets = await Promise.all(
    GEOPOLITICS_GAMMA_TAG_IDS.map((id) =>
      fetchEventsForTag(id, perTagLimit, init),
    ),
  );

  const byId = new Map<string, GammaEventRaw>();
  for (const list of buckets) {
    for (const ev of list) {
      const id = ev.id;
      if (!id) continue;
      const prev = byId.get(id);
      if (!prev) {
        byId.set(id, ev);
        continue;
      }
      const a = prev.volume24hr ?? 0;
      const b = ev.volume24hr ?? 0;
      if (b > a) byId.set(id, ev);
    }
  }

  const merged = Array.from(byId.values()).sort((x, y) => {
    const vx = x.volume24hr ?? 0;
    const vy = y.volume24hr ?? 0;
    return vy - vx;
  });

  const events: PolymarketGeopoliticsRow[] = [];
  for (const raw of merged) {
    const row = normalizeGammaEvent(raw);
    if (row) events.push(row);
    if (events.length >= maxEvents) break;
  }

  return { events, tagIds: GEOPOLITICS_GAMMA_TAG_IDS };
}

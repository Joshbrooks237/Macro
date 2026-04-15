/**
 * ZeroHedge full RSS (official CMS feed — headlines & links, not the X API).
 * @see https://www.zerohedge.com → More → RSS
 */

export const ZEROHEDGE_RSS_URL = "https://cms.zerohedge.com/fullrss2.xml";

export type ZerohedgeRssItem = {
  title: string;
  link: string;
  pubDate: string | null;
};

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number.parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCodePoint(Number.parseInt(h, 16)),
    );
}

function extractFirstTagContent(block: string, tag: string): string | null {
  const re = new RegExp(
    `<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`,
    "i",
  );
  const m = block.match(re);
  if (!m) return null;
  let inner = m[1].trim();
  if (inner.startsWith("<![CDATA[")) {
    inner = inner.slice(9).replace(/\]\]>\s*$/, "").trim();
  }
  return decodeBasicEntities(inner);
}

/**
 * Parses RSS 2.0 items (title, link, pubDate). No XML dependency — sufficient for this feed shape.
 */
export function parseZerohedgeRssXml(xml: string, limit: number): ZerohedgeRssItem[] {
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  const out: ZerohedgeRssItem[] = [];
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null && out.length < limit) {
    const block = m[1];
    const title = extractFirstTagContent(block, "title");
    const link = extractFirstTagContent(block, "link");
    const pubDate = extractFirstTagContent(block, "pubDate");
    if (!title || !link || !link.startsWith("http")) continue;
    out.push({ title, link, pubDate: pubDate ?? null });
  }
  return out;
}

export async function fetchZerohedgeRssItems(
  limit: number,
  init?: RequestInit,
): Promise<ZerohedgeRssItem[]> {
  const res = await fetch(ZEROHEDGE_RSS_URL, {
    ...init,
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, */*",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`ZeroHedge RSS HTTP ${res.status}`);
  }
  const xml = await res.text();
  return parseZerohedgeRssXml(xml, limit);
}

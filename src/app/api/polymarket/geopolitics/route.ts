import { NextResponse } from "next/server";
import { fetchPolymarketGeopoliticsSnapshot } from "@/lib/polymarketGeopolitics";

export const runtime = "nodejs";

/**
 * Plain `cache: "no-store"` avoids Next dev quirks seen with `next: { revalidate }`
 * on outbound fetch from route handlers. Response still uses short CDN caching.
 */
export async function GET() {
  try {
    const { events, tagIds } = await fetchPolymarketGeopoliticsSnapshot({
      fetchInit: { cache: "no-store" },
    });
    return NextResponse.json(
      {
        ok: true as const,
        events,
        tagIds: [...tagIds],
        disclaimer:
          "Figures are copied from Polymarket’s Gamma API at request time (event volume and, when shown, the Yes token price fields). This app does not compute or model those values.",
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=120, stale-while-revalidate=300",
        },
      },
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Polymarket geopolitics fetch failed";
    console.error("[polymarket] /api/polymarket/geopolitics:", e);
    return NextResponse.json(
      { ok: false as const, error: message, events: [] },
      { status: 502 },
    );
  }
}

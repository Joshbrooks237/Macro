import { NextResponse } from "next/server";
import {
  ZEROHEDGE_RSS_URL,
  fetchZerohedgeRssItems,
} from "@/lib/zerohedgeRss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await fetchZerohedgeRssItems(12, {
      next: { revalidate: 300 },
    });
    return NextResponse.json(
      {
        ok: true as const,
        items,
        feedUrl: ZEROHEDGE_RSS_URL,
        note:
          "Headlines from ZeroHedge’s official RSS (cms.zerohedge.com). This is not the X/Twitter API — for @zerohedge posts on X, use the link below or an X embed/API.",
        profileUrl: "https://x.com/zerohedge",
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "ZeroHedge RSS fetch failed";
    return NextResponse.json(
      { ok: false as const, error: message, items: [] },
      { status: 502 },
    );
  }
}

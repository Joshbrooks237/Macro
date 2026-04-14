import { NextResponse } from "next/server";
import { assetLabel, finnhubSessionPctChange, getPrice } from "@/lib/prices";
import type { AssetKey } from "@/types/prediction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const asset = searchParams.get("asset") as AssetKey | null;
  if (
    !asset ||
    (asset !== "oil" &&
      asset !== "gold" &&
      asset !== "stocks" &&
      asset !== "crypto")
  ) {
    return NextResponse.json(
      { error: "Query ?asset= oil|gold|stocks|crypto required" },
      { status: 400 },
    );
  }

  try {
    const quote = await getPrice(asset);
    const sessionPct = finnhubSessionPctChange(quote);
    return NextResponse.json({
      asset,
      label: assetLabel(asset),
      price: quote.price,
      previous_close: quote.previousClose ?? null,
      session_pct_vs_prev_close: sessionPct,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Price fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { assetLabel, finnhubSessionPctChange, getPrice } from "@/lib/prices";
import { isAssetKey } from "@/types/prediction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("asset");
  if (!raw || !isAssetKey(raw)) {
    return NextResponse.json(
      { error: "Query ?asset= must be a supported market key" },
      { status: 400 },
    );
  }
  const asset = raw;

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

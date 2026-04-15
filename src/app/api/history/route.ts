import { NextResponse } from "next/server";
import { getHistory } from "@/lib/history";
import type { AssetKey } from "@/types/prediction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseAsset(v: string | null): AssetKey | null {
  if (
    v === "oil" ||
    v === "gold" ||
    v === "silver" ||
    v === "stocks" ||
    v === "crypto"
  ) {
    return v;
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const asset = parseAsset(searchParams.get("asset"));
  const daysRaw = searchParams.get("days");
  const days = daysRaw
    ? Number.parseInt(daysRaw, 10)
    : 7;

  if (!asset) {
    return NextResponse.json(
      { error: "Query ?asset= oil|gold|silver|stocks|crypto required" },
      { status: 400 },
    );
  }

  try {
    const data = await getHistory(asset, Number.isFinite(days) ? days : 7);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "History fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

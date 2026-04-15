import { NextResponse } from "next/server";
import { getHistory } from "@/lib/history";
import { isAssetKey } from "@/types/prediction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("asset");
  const daysRaw = searchParams.get("days");
  const days = daysRaw
    ? Number.parseInt(daysRaw, 10)
    : 7;

  if (!raw || !isAssetKey(raw)) {
    return NextResponse.json(
      { error: "Query ?asset= must be a supported market key" },
      { status: 400 },
    );
  }
  const asset = raw;

  try {
    const data = await getHistory(asset, Number.isFinite(days) ? days : 7);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "History fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

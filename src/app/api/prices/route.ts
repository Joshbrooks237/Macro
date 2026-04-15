import { NextResponse } from "next/server";
import { getAllPriceSnapshots } from "@/lib/prices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { rows, fetchedAt } = await getAllPriceSnapshots({ noCache: true });
    return NextResponse.json({ quotes: rows, fetched_at: fetchedAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Batch quote failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

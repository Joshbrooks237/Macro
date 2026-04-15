"use client";

import { fetchJson } from "@/lib/readJsonResponse";
import type { AssetKey } from "@/types/prediction";
import { useEffect, useState } from "react";

type PricePayload = {
  asset: AssetKey;
  label: string;
  price: number;
  previous_close: number | null;
  session_pct_vs_prev_close: number | null;
};

export function LivePrice({ asset }: { asset: AssetKey }) {
  const [data, setData] = useState<PricePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const json = await fetchJson<PricePayload>(
          `/api/price?asset=${encodeURIComponent(asset)}`,
        );
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Price error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asset]);

  if (loading) {
    return (
      <p className="text-sm text-macro-muted">Loading live price…</p>
    );
  }
  if (error) {
    return <p className="text-sm text-red-300">{error}</p>;
  }
  if (!data) return null;

  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

  const session =
    data.session_pct_vs_prev_close != null
      ? `${data.session_pct_vs_prev_close >= 0 ? "+" : ""}${data.session_pct_vs_prev_close.toFixed(2)}% vs prev close`
      : null;

  return (
    <div className="rounded-lg border border-macro-border bg-black/20 px-3 py-2 text-sm">
      <span className="font-medium text-white">{data.label}</span>
      <span className="mx-2 text-macro-muted">·</span>
      <span className="tabular-nums text-emerald-200">{fmt.format(data.price)}</span>
      {session ? (
        <span className="ml-2 text-xs text-macro-muted">({session})</span>
      ) : null}
    </div>
  );
}

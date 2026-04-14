"use client";

import { useEffect, useState } from "react";

type Asset = "oil" | "gold" | "stocks" | "crypto";

type PricePayload = {
  asset: Asset;
  label: string;
  price: number;
  previous_close: number | null;
  session_pct_vs_prev_close: number | null;
};

export function LivePrice({ asset }: { asset: Asset }) {
  const [data, setData] = useState<PricePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/price?asset=${encodeURIComponent(asset)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Price error");
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
      <p className="text-sm text-[var(--muted)]">Loading live price…</p>
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
    <div className="rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2 text-sm">
      <span className="font-medium text-white">{data.label}</span>
      <span className="mx-2 text-[var(--muted)]">·</span>
      <span className="tabular-nums text-emerald-200">{fmt.format(data.price)}</span>
      {session ? (
        <span className="ml-2 text-xs text-[var(--muted)]">({session})</span>
      ) : null}
    </div>
  );
}

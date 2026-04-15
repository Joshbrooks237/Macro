"use client";

import { fetchJson } from "@/lib/readJsonResponse";
import type { PolymarketGeopoliticsRow } from "@/lib/polymarketGeopolitics";
import { useEffect, useState } from "react";

type Payload =
  | {
      ok: true;
      events: PolymarketGeopoliticsRow[];
      tagIds: string[];
      disclaimer: string;
    }
  | { ok: false; error: string; events: [] };

function formatVol(n: number | null) {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}

export function PolymarketGeopolitics() {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJson<Payload>("/api/polymarket/geopolitics", { cache: "no-store" })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled)
          setData({
            ok: false,
            error: "Could not load Polymarket snapshot.",
            events: [],
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <section className="rounded-xl border border-macro-border bg-macro-surface/60 p-4 ring-1 ring-white/5">
        <div className="h-24 animate-pulse rounded-lg bg-black/25" />
      </section>
    );
  }

  if (!data.ok) {
    return (
      <section className="rounded-xl border border-amber-900/50 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
        <p className="font-medium text-amber-50">Polymarket (geopolitics tags)</p>
        <p className="mt-1 text-xs text-amber-200/90">{data.error}</p>
      </section>
    );
  }

  if (data.events.length === 0) {
    return (
      <section className="rounded-xl border border-macro-border bg-macro-surface/60 px-4 py-3 text-sm text-macro-muted">
        No active tagged markets returned right now.
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-macro-border bg-macro-surface/60 ring-1 ring-white/5">
      <div className="border-b border-macro-border px-4 py-3 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-400">
          Polymarket · geopolitics tags
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">
          World &amp; foreign-policy markets
        </h2>
        <p className="mt-1 text-xs text-macro-muted">
          Pulled from Gamma tags{" "}
          <span className="text-slate-400">
            Geopolitics, Foreign Policy, World
          </span>
          — merged, deduped, sorted by{" "}
          <span className="text-slate-400">volume24hr</span> on each event.
          Prices are shown only when Gamma lists a market as open and{" "}
          <span className="text-slate-400">acceptingOrders: true</span>; we read
          the <span className="text-slate-400">Yes</span> slot in{" "}
          <span className="text-slate-400">outcomePrices</span> when that label
          exists, otherwise the first outcome (no extra math).
        </p>
      </div>
      <ul className="divide-y divide-macro-border">
        {data.events.map((row) => (
          <li key={row.id}>
            <a
              href={row.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug text-slate-100">
                  {row.title}
                </p>
                {row.marketQuestion &&
                row.marketQuestion !== row.title ? (
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-macro-muted">
                    {row.marketQuestion}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
                {row.yesPrice != null ? (
                  <span
                    className="rounded-md bg-emerald-950/60 px-2 py-0.5 font-mono text-xs tabular-nums text-emerald-300 ring-1 ring-emerald-800/50"
                    title="From Polymarket Gamma outcomePrices for the Yes outcome (tradable market only)."
                  >
                    Yes {(row.yesPrice * 100).toFixed(1)}¢
                  </span>
                ) : (
                  <span className="text-[11px] text-macro-muted">
                    No quotable Yes price
                  </span>
                )}
                <span className="font-mono text-[10px] tabular-nums text-macro-muted">
                  24h vol (Gamma) {formatVol(row.volume24hr)}
                </span>
              </div>
            </a>
          </li>
        ))}
      </ul>
      <p className="border-t border-macro-border px-4 py-2.5 text-center text-[10px] leading-relaxed text-macro-muted sm:px-5">
        {data.disclaimer} Data from Polymarket’s public Gamma API; links open
        polymarket.com.
      </p>
    </section>
  );
}

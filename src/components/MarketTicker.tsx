"use client";

import { MarketChartModal } from "@/components/MarketChartModal";
import { assetCardClasses } from "@/lib/assetTheme";
import { fetchJson } from "@/lib/readJsonResponse";
import type { AssetKey, QuoteRow } from "@/types/prediction";
import { useCallback, useEffect, useRef, useState } from "react";

/** CoinGecko public API is strict; server caches BTC ~90s — poll a bit slower. */
const POLL_MS = 30_000;

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function SessionBadge({ pct }: { pct: number | null }) {
  if (pct == null || !Number.isFinite(pct)) {
    return (
      <span className="text-[10px] uppercase tracking-wide text-macro-muted">
        —
      </span>
    );
  }
  const up = pct >= 0;
  return (
    <span
      className={`font-mono text-xs tabular-nums ${
        up ? "text-emerald-400" : "text-rose-400"
      }`}
    >
      {up ? "+" : ""}
      {pct.toFixed(2)}%
    </span>
  );
}

function QuoteCard({
  row,
  flash,
  onOpenChart,
}: {
  row: QuoteRow;
  flash: "up" | "down" | null;
  onOpenChart?: (asset: AssetKey) => void;
}) {
  const borderFlash =
    flash === "up"
      ? "ring-emerald-500/50"
      : flash === "down"
        ? "ring-rose-500/50"
        : "ring-transparent";

  const theme = assetCardClasses[row.asset];

  if (!row.ok) {
    return (
      <div
        className={`flex min-h-[88px] overflow-hidden rounded-xl bg-macro-surface ring-1 ring-macro-border transition-shadow duration-300 ${borderFlash}`}
      >
        <span
          className="w-1 shrink-0 bg-slate-600"
          aria-hidden
        />
        <div className="min-w-0 flex-1 p-3">
          <p className="text-xs font-medium text-slate-300">{row.label}</p>
          <p className="mt-1 line-clamp-2 text-[11px] text-amber-200/90">
            {row.error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      title="Open 7-day chart"
      onClick={() => onOpenChart?.(row.asset)}
      className={`flex w-full overflow-hidden rounded-xl bg-macro-surface text-left ring-1 ring-macro-border transition-[box-shadow,ring-color] duration-300 focus:outline-none ${theme.ringHover} ${theme.focusVisible} ${borderFlash} ${flash ? "shadow-lg" : ""}`}
    >
      <span
        className={`w-1 shrink-0 self-stretch ${theme.accentBar}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium leading-tight text-slate-200">
            {row.label}
          </p>
          <SessionBadge pct={row.sessionPct} />
        </div>
        <p className="mt-2 font-mono text-lg font-semibold tabular-nums tracking-tight text-white">
          {formatUsd(row.price)}
        </p>
        <p className="mt-1.5 text-[10px] text-slate-500">
          Tap for last week →
        </p>
      </div>
    </button>
  );
}

export function MarketTicker() {
  const [chartAsset, setChartAsset] = useState<AssetKey | null>(null);
  const [quotes, setQuotes] = useState<QuoteRow[] | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevPrices = useRef<Record<string, number>>({});
  const [flashMap, setFlashMap] = useState<
    Record<string, "up" | "down" | null>
  >({});

  const tick = useCallback(async () => {
    try {
      const data = await fetchJson<{ quotes: QuoteRow[]; fetched_at: string }>(
        "/api/prices",
        { cache: "no-store" },
      );

      const rows = data.quotes as QuoteRow[];
      const nextFlash: Record<string, "up" | "down" | null> = {};

      for (const row of rows) {
        if (!row.ok) continue;
        const prev = prevPrices.current[row.asset];
        if (prev != null && row.price !== prev) {
          nextFlash[row.asset] = row.price > prev ? "up" : "down";
        }
        prevPrices.current[row.asset] = row.price;
      }

      setQuotes(rows);
      setFetchedAt(data.fetched_at ?? null);
      setError(null);
      setFlashMap(nextFlash);
      if (Object.keys(nextFlash).length > 0) {
        window.setTimeout(() => setFlashMap({}), 700);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ticker failed");
    }
  }, []);

  useEffect(() => {
    tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  }, [tick]);

  const timeLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  return (
    <div className="flex flex-col">
      <MarketChartModal
        asset={chartAsset}
        onClose={() => setChartAsset(null)}
      />
      <div className="flex items-center justify-between gap-2 px-1 pb-3 lg:px-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
            Live markets
          </span>
        </div>
        <span className="font-mono text-[10px] text-macro-muted">
          {timeLabel}
        </span>
      </div>

      {error ? (
        <p className="mb-3 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
          {error}
        </p>
      ) : null}

      {/* Mobile / tablet: compact strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 lg:hidden">
        {quotes?.map((row) => (
          <QuoteCard
            key={row.asset}
            row={row}
            flash={flashMap[row.asset] ?? null}
            onOpenChart={setChartAsset}
          />
        )) ??
          [1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-[88px] animate-pulse rounded-xl bg-macro-surface ring-1 ring-macro-border"
            />
          ))}
      </div>

      {/* Desktop: vertical stack in sidebar */}
      <div className="hidden space-y-3 lg:block">
        {quotes?.map((row) => (
          <QuoteCard
            key={row.asset}
            row={row}
            flash={flashMap[row.asset] ?? null}
            onOpenChart={setChartAsset}
          />
        )) ??
          [1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-[92px] animate-pulse rounded-xl bg-macro-surface ring-1 ring-macro-border"
            />
          ))}
      </div>

      <p className="mt-4 hidden text-[10px] leading-relaxed text-macro-muted lg:block">
        Updates every ~{POLL_MS / 1000}s (BTC may reuse a server cache up to ~90s
        to avoid CoinGecko limits). Session % uses prior close from the same
        feed (Finnhub for ETFs; Yahoo for gold GC=F; none for Bitcoin).
      </p>
    </div>
  );
}

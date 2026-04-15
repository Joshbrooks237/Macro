"use client";

import { MarketChartModal } from "@/components/MarketChartModal";
import { MarketCompareModal } from "@/components/MarketCompareModal";
import { assetCardClasses } from "@/lib/assetTheme";
import {
  assetLabel,
  assetTickerLabel,
  formatAssetPrice,
  TRACKED_ASSETS,
} from "@/lib/prices";
import { fetchJson } from "@/lib/readJsonResponse";
import type { AssetKey, QuoteRow } from "@/types/prediction";
import { useCallback, useEffect, useRef, useState } from "react";

/** CoinGecko public API is strict; server caches BTC ~90s — poll a bit slower. */
const POLL_MS = 30_000;

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
        className={`flex min-h-[76px] overflow-hidden rounded-xl bg-macro-surface ring-1 ring-macro-border transition-shadow duration-300 sm:min-h-[80px] ${borderFlash}`}
      >
        <span
          className="w-1 shrink-0 bg-slate-600"
          aria-hidden
        />
        <div className="min-w-0 flex-1 p-2.5 sm:p-3">
          <p className="text-xs font-medium text-slate-300">
            {assetTickerLabel(row.asset)}
          </p>
          <p className="sr-only">{row.label}</p>
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
      title={`${assetLabel(row.asset)} — open 7-day chart`}
      onClick={() => onOpenChart?.(row.asset)}
      className={`flex w-full min-h-[76px] overflow-hidden rounded-xl bg-macro-surface text-left ring-1 ring-macro-border transition-[box-shadow,ring-color] duration-300 focus:outline-none sm:min-h-[80px] ${theme.ringHover} ${theme.focusVisible} ${borderFlash} ${flash ? "shadow-lg" : ""}`}
    >
      <span
        className={`w-1 shrink-0 self-stretch ${theme.accentBar}`}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 items-center gap-2 p-2.5 sm:p-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold leading-snug text-slate-200 sm:text-xs">
            {assetTickerLabel(row.asset)}
          </p>
          <p className="mt-1 font-mono text-base font-semibold tabular-nums tracking-tight text-white sm:text-lg">
            {formatAssetPrice(row.asset, row.price)}
          </p>
          <p className="mt-0.5 hidden text-[9px] text-slate-500 sm:block">
            Chart →
          </p>
        </div>
        <div className="shrink-0 self-start pt-0.5">
          <SessionBadge pct={row.sessionPct} />
        </div>
      </div>
    </button>
  );
}

export function MarketTicker() {
  const [chartAsset, setChartAsset] = useState<AssetKey | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
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
      <MarketCompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
      />
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 px-1 pb-3 lg:px-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
              Live markets
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCompareOpen(true)}
            className="rounded-lg border border-macro-border bg-black/25 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-black/40 hover:text-white"
          >
            Compare overlay
          </button>
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
          Array.from({ length: TRACKED_ASSETS.length }, (_, i) => i).map((i) => (
            <div
              key={i}
              className="h-[76px] animate-pulse rounded-xl bg-macro-surface ring-1 ring-macro-border sm:h-[80px]"
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
          Array.from({ length: TRACKED_ASSETS.length }, (_, i) => i).map((i) => (
            <div
              key={i}
              className="h-[76px] animate-pulse rounded-xl bg-macro-surface ring-1 ring-macro-border sm:h-[80px]"
            />
          ))}
      </div>

      <p className="mt-4 hidden text-[10px] leading-relaxed text-macro-muted lg:block">
        Updates every ~{POLL_MS / 1000}s (BTC may reuse a server cache up to ~90s
        to avoid CoinGecko limits). Session % uses prior close from the same
        feed (Finnhub for US-listed symbols; Yahoo for indices, futures, and
        gold; none for Bitcoin).
      </p>
    </div>
  );
}

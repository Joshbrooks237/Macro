"use client";

import type { AssetKey } from "@/types/prediction";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const FUN_SUBTITLES = [
  "Past squiggles, present attitude.",
  "Technically, it's art.",
  "Where your thesis meets the receipts.",
  "Not a crystal ball — just a wiggly mirror.",
  "Zoom out, touch grass, log the prediction anyway.",
];

type HistoryPayload = {
  asset: AssetKey;
  title: string;
  days: number;
  points: { t: number; price: number; label: string }[];
  source: string;
};

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  }).format(n);
}

export function MarketChartModal({
  asset,
  onClose,
}: {
  asset: AssetKey | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<HistoryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const subtitle = useMemo(() => {
    if (!asset) return "";
    return FUN_SUBTITLES[Math.floor(Math.random() * FUN_SUBTITLES.length)];
  }, [asset]);

  const load = useCallback(async () => {
    if (!asset) return;
    setLoading(true);
    setErr(null);
    setData(null);
    try {
      const res = await fetch(
        `/api/history?asset=${encodeURIComponent(asset)}&days=7`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load history");
      setData(json as HistoryPayload);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Chart failed");
    } finally {
      setLoading(false);
    }
  }, [asset]);

  useEffect(() => {
    if (asset) load();
  }, [asset, load]);

  useEffect(() => {
    if (!asset) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [asset, onClose]);

  if (!asset) return null;

  const chartData =
    data?.points.map((p) => ({
      name: p.label,
      price: p.price,
    })) ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chart-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl border border-macro-border bg-macro-surface shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-macro-border px-4 py-3 sm:px-5">
          <div>
            <h2
              id="chart-title"
              className="text-base font-semibold text-white sm:text-lg"
            >
              {data?.title ?? "Loading…"}
            </h2>
            <p className="mt-0.5 text-xs text-macro-muted">
              Last {data?.days ?? 7} days · tap outside or Esc to close
            </p>
            <p className="mt-1 text-xs italic text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-macro-border bg-black/30 px-2.5 py-1 text-sm text-slate-300 hover:bg-black/50"
          >
            Close
          </button>
        </div>

        <div className="min-h-[280px] flex-1 px-2 py-4 sm:px-4">
          {loading ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-macro-muted">
              Drawing the squiggle…
            </div>
          ) : err ? (
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-3 text-sm text-amber-100">
              {err}
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-center text-sm text-macro-muted">
              No daily candles returned — markets may be closed or data
              unavailable for this symbol.
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="macroChartFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#3b82f6"
                        stopOpacity={0.45}
                      />
                      <stop
                        offset="100%"
                        stopColor="#3b82f6"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#2a3140"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#8b95a8", fontSize: 11 }}
                    axisLine={{ stroke: "#2a3140" }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "#8b95a8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                    }
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#141922",
                      border: "1px solid #2a3140",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#8b95a8" }}
                    formatter={(value: number) => [formatUsd(value), "Close"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    fill="url(#macroChartFill)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#93c5fd" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {data?.source ? (
          <p className="border-t border-macro-border px-4 py-2 text-center text-[10px] text-macro-muted sm:px-5">
            Data:{" "}
            {data.source === "coingecko"
              ? "CoinGecko"
              : data.source === "yahoo"
                ? "Yahoo Finance (unofficial chart API)"
                : "Finnhub"}{" "}
            · for learning, not trading
          </p>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { assetCardClasses, assetChartColors } from "@/lib/assetTheme";
import { fetchJson } from "@/lib/readJsonResponse";
import type { AssetKey } from "@/types/prediction";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<HistoryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const gradientId = useId().replace(/:/g, "");
  const loadSeq = useRef(0);

  const subtitle = useMemo(() => {
    if (!asset) return "";
    return FUN_SUBTITLES[Math.floor(Math.random() * FUN_SUBTITLES.length)];
  }, [asset]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!asset) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [asset]);

  const load = useCallback(async () => {
    if (!asset) return;
    const seq = ++loadSeq.current;
    setLoading(true);
    setErr(null);
    try {
      const json = await fetchJson<HistoryPayload>(
        `/api/history?asset=${encodeURIComponent(asset)}&days=7`,
        { cache: "no-store" },
      );
      if (seq !== loadSeq.current || json.asset !== asset) return;
      setData(json);
    } catch (e) {
      if (seq !== loadSeq.current) return;
      setErr(e instanceof Error ? e.message : "Chart failed");
    } finally {
      if (seq === loadSeq.current) setLoading(false);
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

  const chartData = useMemo(() => {
    if (!asset || !data || data.asset !== asset) return [];
    return data.points.map((p) => ({
      name: p.label,
      price: p.price,
    }));
  }, [data, asset]);

  const showChart = chartData.length > 0;
  const chartStale = Boolean(
    asset && loading && data && data.asset === asset && showChart,
  );
  const awaitingFirstPaint = Boolean(
    asset &&
      loading &&
      (!data || data.asset !== asset || !showChart),
  );

  if (!asset || !mounted) return null;

  const modalTheme = assetCardClasses[asset];
  const chartColors = assetChartColors[asset];

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chart-title"
        className={`relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-macro-border bg-macro-surface shadow-2xl ring-1 ring-white/10 ${modalTheme.modalTopAccent}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-macro-border px-4 py-3 sm:px-5">
          <div>
            <h2
              id="chart-title"
              className="text-base font-semibold text-white sm:text-lg"
            >
              {data?.asset === asset ? data.title : "Loading…"}
            </h2>
            <p className="mt-0.5 text-xs text-macro-muted">
              Last{" "}
              {data?.asset === asset ? data.days : 7} days · click outside or
              Esc to close
            </p>
            <p className="mt-1 text-xs italic text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-macro-border bg-black/30 px-2.5 py-1 text-sm text-slate-300 hover:bg-black/50"
          >
            Close
          </button>
        </div>

        <div className="min-h-[280px] flex-1 px-2 py-4 sm:px-4">
          {awaitingFirstPaint && !err ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-macro-muted">
              Drawing the squiggle…
            </div>
          ) : err ? (
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-3 text-sm text-amber-100">
              {err}
            </div>
          ) : !showChart ? (
            <div className="flex h-[260px] items-center justify-center text-center text-sm text-macro-muted">
              No daily candles returned — markets may be closed or data
              unavailable for this symbol.
            </div>
          ) : (
            <div
              className={`relative isolate h-[300px] w-full sm:h-[320px] ${chartStale ? "opacity-80" : "opacity-100"}`}
            >
              {chartStale ? (
                <div className="pointer-events-none absolute right-2 top-0 z-10 rounded-md bg-black/50 px-2 py-0.5 text-[10px] text-slate-300">
                  Updating…
                </div>
              ) : null}
              <ResponsiveContainer
                width="100%"
                height="100%"
                debounce={0}
                initialDimension={{ width: 520, height: 308 }}
              >
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id={gradientId}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={chartColors.stroke}
                        stopOpacity={0.45}
                      />
                      <stop
                        offset="100%"
                        stopColor={chartColors.stroke}
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
                    stroke={chartColors.stroke}
                    strokeWidth={2.25}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill={`url(#${gradientId})`}
                    dot={false}
                    activeDot={{ r: 4, fill: chartColors.activeDot }}
                    isAnimationActive
                    animationBegin={120}
                    animationDuration={1400}
                    animationEasing="ease-in-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {data?.asset === asset && data?.source ? (
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
    </div>,
    document.body,
  );
}

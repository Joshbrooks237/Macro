"use client";

import { assetChartColors } from "@/lib/assetTheme";
import { TRACKED_ASSETS, assetLabel } from "@/lib/prices";
import { fetchJson } from "@/lib/readJsonResponse";
import type { AssetKey } from "@/types/prediction";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type HistoryPayload = {
  asset: AssetKey;
  title: string;
  days: number;
  points: { t: number; price: number; label: string }[];
  source: string;
};

function dayKeyUtc(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

function shortDayLabel(yyyyMmDd: string) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

type ChartRow = {
  name: string;
  day: string;
} & Partial<Record<AssetKey, number>>;

function shortAssetName(asset: AssetKey) {
  const raw = assetLabel(asset);
  const head = raw.split("(")[0]?.trim() ?? raw;
  return head;
}

type CrossingMarker = {
  /** XAxis category — second day of the segment where lines cross */
  x: string;
  y: number;
  pairs: string;
};

/** Pairwise intersections of straight segments between consecutive days (rebased values). */
function computeCrossingMarkers(
  rows: ChartRow[],
  assets: AssetKey[],
): CrossingMarker[] {
  if (assets.length < 2) return [];

  const raw: { x: string; y: number; label: string }[] = [];

  for (let i = 0; i < rows.length - 1; i++) {
    const r0 = rows[i];
    const r1 = rows[i + 1];
    for (let j = 0; j < assets.length; j++) {
      for (let k = j + 1; k < assets.length; k++) {
        const a = assets[j];
        const b = assets[k];
        const va0 = r0[a];
        const va1 = r1[a];
        const vb0 = r0[b];
        const vb1 = r1[b];
        if (va0 == null || va1 == null || vb0 == null || vb1 == null) {
          continue;
        }
        const denom = va1 - va0 - (vb1 - vb0);
        if (Math.abs(denom) < 1e-9) continue;
        const u = (vb0 - va0) / denom;
        if (u <= 1e-5 || u >= 1 - 1e-5) continue;
        const y = va0 + u * (va1 - va0);
        const label = `${shortAssetName(a)} × ${shortAssetName(b)}`;
        raw.push({ x: r1.name, y, label });
      }
    }
  }

  const merged: CrossingMarker[] = [];
  for (const item of raw) {
    const hit = merged.find(
      (m) => m.x === item.x && Math.abs(m.y - item.y) < 1.15,
    );
    if (hit) {
      hit.y = (hit.y + item.y) / 2;
      if (!hit.pairs.includes(item.label)) {
        hit.pairs = hit.pairs ? `${hit.pairs} · ${item.label}` : item.label;
      }
    } else {
      merged.push({ x: item.x, y: item.y, pairs: item.label });
    }
  }
  return merged;
}

function CrossingStar(props: {
  cx?: number;
  cy?: number;
  label: string;
}) {
  const { cx, cy, label } = props;
  if (cx == null || cy == null) return null;
  return (
    <g className="pointer-events-auto">
      <title>{`Crossing: ${label} (indexed scale)`}</title>
      <path
        transform={`translate(${cx},${cy}) scale(0.5)`}
        d="M0,-7 L1.7,-2.2 L6.9,-2.2 L2.7,1.5 L4.2,6.9 L0,3.8 L-4.2,6.9 L-2.7,1.5 L-6.9,-2.2 L-1.7,-2.2 Z"
        fill="#4ade80"
        stroke="#14532d"
        strokeWidth={0.85}
      />
    </g>
  );
}

function buildCompareRows(
  histories: Partial<Record<AssetKey, HistoryPayload>>,
): ChartRow[] {
  const perAsset = new Map<AssetKey, Map<string, number>>();

  for (const asset of TRACKED_ASSETS) {
    const hist = histories[asset];
    if (!hist?.points.length) continue;

    const sorted = [...hist.points].sort(
      (a, b) => dayKeyUtc(a.t).localeCompare(dayKeyUtc(b.t)) || a.t - b.t,
    );
    const base = sorted[0].price;
    if (!base) continue;

    const byDay = new Map<string, number>();
    for (const p of sorted) {
      const k = dayKeyUtc(p.t);
      byDay.set(k, (p.price / base) * 100);
    }
    perAsset.set(asset, byDay);
  }

  const allDays = new Set<string>();
  perAsset.forEach((byDay) => {
    byDay.forEach((_v, k) => allDays.add(k));
  });

  return Array.from(allDays)
    .sort()
    .map((day) => {
      const row: ChartRow = { name: shortDayLabel(day), day };
      for (const asset of TRACKED_ASSETS) {
        const v = perAsset.get(asset)?.get(day);
        if (v != null) row[asset] = v;
      }
      return row;
    });
}

export function MarketCompareModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [failed, setFailed] = useState<AssetKey[]>([]);
  const [histories, setHistories] = useState<
    Partial<Record<AssetKey, HistoryPayload>>
  >({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setFailed([]);
    const next: Partial<Record<AssetKey, HistoryPayload>> = {};
    const bad: AssetKey[] = [];

    await Promise.all(
      TRACKED_ASSETS.map(async (asset) => {
        try {
          const json = await fetchJson<HistoryPayload>(
            `/api/history?asset=${encodeURIComponent(asset)}&days=7`,
            { cache: "no-store" },
          );
          next[asset] = json;
        } catch {
          bad.push(asset);
        }
      }),
    );

    setHistories(next);
    setFailed(bad);
    if (Object.keys(next).length === 0) {
      setErr("Could not load any series — check API keys and try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const chartData = useMemo(() => buildCompareRows(histories), [histories]);

  const hasAnyLine = useMemo(
    () => chartData.some((row) => TRACKED_ASSETS.some((a) => row[a] != null)),
    [chartData],
  );

  const activeAssets = useMemo(
    () => TRACKED_ASSETS.filter((a) => histories[a]?.points.length),
    [histories],
  );

  const crossingMarkers = useMemo(
    () => computeCrossingMarkers(chartData, activeAssets),
    [chartData, activeAssets],
  );

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-chart-title"
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-macro-border bg-macro-surface shadow-2xl ring-1 ring-white/10 border-t-4 border-t-slate-500"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-macro-border px-4 py-3 sm:px-5">
          <div>
            <h2
              id="compare-chart-title"
              className="text-base font-semibold text-white sm:text-lg"
            >
              Overlay compare
            </h2>
            <p className="mt-0.5 max-w-xl text-xs text-macro-muted">
              Each line is rebased to <span className="text-slate-300">100</span>{" "}
              on its <span className="text-slate-300">first day</span> in this
              window — so you can spot comoves, not price levels. Calendar days
              aligned in UTC.{" "}
              <span className="text-slate-400">
                Green stars mark where two lines cross between daily points
                (hover for pair names).
              </span>
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              7 days · click outside or Esc to close
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-macro-border bg-black/30 px-2.5 py-1 text-sm text-slate-300 hover:bg-black/50"
          >
            Close
          </button>
        </div>

        <div className="min-h-[300px] flex-1 px-2 py-4 sm:px-4">
          {loading ? (
            <div className="flex h-[320px] items-center justify-center text-sm text-macro-muted">
              Loading series…
            </div>
          ) : err ? (
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-3 text-sm text-amber-100">
              {err}
            </div>
          ) : !hasAnyLine ? (
            <div className="flex h-[320px] items-center justify-center text-center text-sm text-macro-muted">
              No data to plot.
            </div>
          ) : (
            <div className="isolate h-[340px] w-full sm:h-[380px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
                debounce={0}
                initialDimension={{ width: 720, height: 360 }}
              >
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 4, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#2a3140"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#8b95a8", fontSize: 10 }}
                    axisLine={{ stroke: "#2a3140" }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "#8b95a8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    domain={["auto", "auto"]}
                    tickFormatter={(v) =>
                      typeof v === "number" ? v.toFixed(0) : String(v)
                    }
                    label={{
                      value: "Indexed (start = 100)",
                      angle: -90,
                      position: "insideLeft",
                      fill: "#6b7280",
                      fontSize: 10,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#141922",
                      border: "1px solid #2a3140",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#8b95a8" }}
                    formatter={(value: number, name: string) => {
                      const pct = value - 100;
                      const sign = pct >= 0 ? "+" : "";
                      return [
                        `${value.toFixed(2)} (${sign}${pct.toFixed(2)}% vs start)`,
                        name,
                      ];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                    formatter={(value) => (
                      <span className="text-slate-300">{value}</span>
                    )}
                  />
                  {TRACKED_ASSETS.filter((a) => histories[a]?.points.length)
                    .map((asset) => (
                      <Line
                        key={asset}
                        type="monotone"
                        dataKey={asset}
                        name={assetLabel(asset)}
                        stroke={assetChartColors[asset].stroke}
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    ))}
                  {crossingMarkers.map((m, i) => (
                    <ReferenceDot
                      key={`cross-${m.x}-${i}`}
                      x={m.x}
                      y={m.y}
                      r={0}
                      fill="none"
                      stroke="none"
                      isFront
                      ifOverflow="extendDomain"
                      shape={(dotProps) => (
                        <CrossingStar {...dotProps} label={m.pairs} />
                      )}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {failed.length > 0 ? (
          <p className="border-t border-macro-border px-4 py-2 text-center text-[10px] text-amber-200/90 sm:px-5">
            Missing:{" "}
            {failed.map((a) => assetLabel(a)).join(" · ")} — other lines still
            plot if data returned.
          </p>
        ) : (
          <p className="border-t border-macro-border px-4 py-2 text-center text-[10px] text-macro-muted sm:px-5">
            Same feeds as single-asset charts; rebasing is only for comparison.
            Stars use straight segments between days (close to the drawn curves).
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}

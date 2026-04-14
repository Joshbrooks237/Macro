"use client";

import { useCallback, useEffect, useState } from "react";

type Prediction = {
  id: number;
  created_at: string;
  asset: string;
  direction: string;
  horizon_hours: number;
  note: string | null;
  entry_price: number;
  due_at: string;
  resolved_at: string | null;
  exit_price: number | null;
  pct_change: number | null;
  outcome: string;
};

const assetLabels: Record<string, string> = {
  oil: "Oil (USO)",
  gold: "Gold (GLD)",
  stocks: "SPY",
  crypto: "BTC",
};

function outcomeBadge(outcome: string) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
  switch (outcome) {
    case "correct":
      return `${base} bg-emerald-950/80 text-emerald-200 ring-1 ring-emerald-800`;
    case "incorrect":
      return `${base} bg-red-950/80 text-red-200 ring-1 ring-red-900`;
    case "neutral":
      return `${base} bg-slate-800 text-slate-200 ring-1 ring-slate-600`;
    default:
      return `${base} bg-amber-950/60 text-amber-100 ring-1 ring-amber-900`;
  }
}

export function PredictionList({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolveMsg, setResolveMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/predictions");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Load failed");
      setRows(json.predictions ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function resolveDue() {
    setResolving(true);
    setResolveMsg(null);
    try {
      const res = await fetch("/api/predictions/resolve", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Resolve failed");
      const n = json.resolved_count ?? 0;
      const errs = Array.isArray(json.errors) ? json.errors : [];
      let msg =
        n === 0
          ? "No due predictions to resolve."
          : `Resolved ${n} prediction(s).`;
      if (errs.length > 0) {
        const detail = errs
          .map((e: { id?: number; message?: string }) => `#${e.id}: ${e.message}`)
          .join("; ");
        msg += ` ${errs.length} error(s): ${detail}`;
      }
      setResolveMsg(msg);
      await load();
      window.dispatchEvent(new Event("macro-stats-refresh"));
    } catch (e) {
      setResolveMsg(e instanceof Error ? e.message : "Resolve failed");
    } finally {
      setResolving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-[var(--card)] p-8 text-center text-[var(--muted)] ring-1 ring-[var(--border)]">
        Loading predictions…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-white">Your log</h2>
        <button
          type="button"
          onClick={resolveDue}
          disabled={resolving}
          className="rounded-lg border border-[var(--border)] bg-black/30 px-4 py-2 text-sm font-medium text-white hover:bg-black/50 disabled:opacity-50"
        >
          {resolving ? "Resolving…" : "Resolve due predictions"}
        </button>
      </div>
      {resolveMsg ? (
        <p className="text-sm text-[var(--muted)]">{resolveMsg}</p>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-[var(--card)] p-8 text-center text-[var(--muted)] ring-1 ring-[var(--border)]">
          No predictions yet. Log one to start building your track record.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => (
            <li
              key={p.id}
              className="rounded-xl bg-[var(--card)] p-4 ring-1 ring-[var(--border)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-white">
                  {assetLabels[p.asset] ?? p.asset}
                </span>
                <span className="text-[var(--muted)]">·</span>
                <span className="text-slate-200">
                  {p.direction === "up" ? "↑ Up" : "↓ Down"}
                </span>
                <span className="text-[var(--muted)]">·</span>
                <span className="text-sm text-[var(--muted)]">
                  {p.horizon_hours}h
                </span>
                <span className={outcomeBadge(p.outcome)}>{p.outcome}</span>
              </div>
              <div className="mt-2 grid gap-1 text-sm text-[var(--muted)] sm:grid-cols-2">
                <span>
                  Entry:{" "}
                  <span className="tabular-nums text-slate-200">
                    {p.entry_price.toFixed(2)}
                  </span>{" "}
                  · Due:{" "}
                  <span className="text-slate-200">
                    {new Date(p.due_at).toLocaleString()}
                  </span>
                </span>
                {p.resolved_at ? (
                  <span>
                    Exit:{" "}
                    <span className="tabular-nums text-slate-200">
                      {p.exit_price?.toFixed(2) ?? "—"}
                    </span>{" "}
                    · Δ:{" "}
                    <span className="tabular-nums text-slate-200">
                      {p.pct_change != null
                        ? `${p.pct_change >= 0 ? "+" : ""}${p.pct_change.toFixed(2)}%`
                        : "—"}
                    </span>
                  </span>
                ) : (
                  <span>Pending resolution after due time.</span>
                )}
              </div>
              {p.note ? (
                <p className="mt-2 border-t border-[var(--border)] pt-2 text-sm text-slate-300">
                  {p.note}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

type Stats = {
  threshold_pct: number;
  total: number;
  pending: number;
  correct: number;
  incorrect: number;
  neutral: number;
  scored_count: number;
  win_rate_pct: number | null;
};

export function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    setErr(null);
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.total !== "number") throw new Error("Bad stats response");
        setStats(data);
      })
      .catch((e) =>
        setErr(e instanceof Error ? e.message : "Failed to load stats"),
      );
  };

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener("macro-stats-refresh", onRefresh);
    return () => window.removeEventListener("macro-stats-refresh", onRefresh);
  }, []);

  if (err) {
    return (
      <div className="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">
        {err}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl bg-[var(--card)] ring-1 ring-[var(--border)]"
          />
        ))}
      </div>
    );
  }

  const win =
    stats.win_rate_pct != null ? `${stats.win_rate_pct.toFixed(1)}%` : "—";

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Win rate (excl. neutral)"
        value={win}
        hint={`Scored: ${stats.scored_count}`}
      />
      <StatCard label="Correct" value={String(stats.correct)} />
      <StatCard label="Incorrect" value={String(stats.incorrect)} />
      <StatCard
        label="Neutral / pending"
        value={`${stats.neutral} / ${stats.pending}`}
        hint={`Move threshold ±${stats.threshold_pct}%`}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-[var(--card)] px-4 py-3 ring-1 ring-[var(--border)]">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

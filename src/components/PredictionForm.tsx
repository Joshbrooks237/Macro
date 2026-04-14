"use client";

import { useState } from "react";
import { LivePrice } from "./LivePrice";

type Asset = "oil" | "gold" | "stocks" | "crypto";

export function PredictionForm({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const [asset, setAsset] = useState<Asset>("stocks");
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [horizon, setHorizon] = useState<24 | 48>(48);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset,
          direction,
          horizon_hours: horizon,
          note: note.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setMessage("Prediction logged with entry price.");
      setNote("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)]"
    >
      <div>
        <h2 className="text-lg font-semibold text-white">New prediction</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Not trading advice — a structured log so you can compare your thesis
          to what the market actually did.
        </p>
      </div>

      <LivePrice asset={asset} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-[var(--muted)]">Asset</span>
          <select
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={asset}
            onChange={(e) => setAsset(e.target.value as Asset)}
          >
            <option value="stocks">Stocks (SPY)</option>
            <option value="gold">Gold (GLD)</option>
            <option value="oil">Oil (USO)</option>
            <option value="crypto">Bitcoin</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-[var(--muted)]">Direction</span>
          <select
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={direction}
            onChange={(e) => setDirection(e.target.value as "up" | "down")}
          >
            <option value="up">Up</option>
            <option value="down">Down</option>
          </select>
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="text-[var(--muted)]">Horizon</span>
          <div className="mt-2 flex flex-wrap gap-3">
            {([24, 48] as const).map((h) => (
              <label
                key={h}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-white has-[:checked]:border-[var(--accent)] has-[:checked]:bg-blue-950/40"
              >
                <input
                  type="radio"
                  name="horizon"
                  checked={horizon === h}
                  onChange={() => setHorizon(h)}
                  className="accent-[var(--accent)]"
                />
                {h} hours
              </label>
            ))}
          </div>
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="text-[var(--muted)]">Note (optional)</span>
          <textarea
            className="mt-1 min-h-[88px] w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-white outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-[var(--accent)]"
            placeholder="Why you think the move happens (Fed, oil inventories, risk-on, etc.)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
          />
        </label>
      </div>

      {error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : message ? (
        <p className="text-sm text-emerald-300">{message}</p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500 disabled:opacity-50 sm:w-auto"
      >
        {submitting ? "Saving…" : "Log prediction"}
      </button>
    </form>
  );
}

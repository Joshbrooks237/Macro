"use client";

import { assetLabel } from "@/lib/prices";
import { fetchJson } from "@/lib/readJsonResponse";
import { type AssetKey } from "@/types/prediction";
import { useState } from "react";
import { LivePrice } from "./LivePrice";

const ASSET_SELECT_GROUPS: { title: string; keys: readonly AssetKey[] }[] = [
  { title: "Core", keys: ["stocks", "gold", "silver", "crypto"] },
  { title: "Energy", keys: ["oil", "wti", "brent", "natgas"] },
  { title: "Macro & metals", keys: ["dxy", "treasury_10y", "vix", "copper"] },
  { title: "Ag & fertilizer", keys: ["mos", "ntr", "cf"] },
];

export function PredictionForm({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const [asset, setAsset] = useState<AssetKey>("stocks");
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
      await fetchJson<{ prediction: unknown }>("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset,
          direction,
          horizon_hours: horizon,
          note: note.trim() || undefined,
        }),
      });
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
      className="space-y-4 rounded-2xl bg-macro-surface p-6 ring-1 ring-macro-border"
    >
      <div>
        <h2 className="text-lg font-semibold text-white">New prediction</h2>
        <p className="mt-1 text-sm text-macro-muted">
          Not trading advice — a structured log so you can compare your thesis
          to what the market actually did.
        </p>
      </div>

      <LivePrice asset={asset} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-macro-muted">Asset</span>
          <select
            className="mt-1 w-full rounded-lg border border-macro-border bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-macro-accent"
            value={asset}
            onChange={(e) => setAsset(e.target.value as AssetKey)}
          >
            {ASSET_SELECT_GROUPS.map((g) => (
              <optgroup key={g.title} label={g.title}>
                {g.keys.map((key) => (
                  <option key={key} value={key}>
                    {assetLabel(key)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-macro-muted">Direction</span>
          <select
            className="mt-1 w-full rounded-lg border border-macro-border bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-macro-accent"
            value={direction}
            onChange={(e) => setDirection(e.target.value as "up" | "down")}
          >
            <option value="up">Up</option>
            <option value="down">Down</option>
          </select>
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="text-macro-muted">Horizon</span>
          <div className="mt-2 flex flex-wrap gap-3">
            {([24, 48] as const).map((h) => (
              <label
                key={h}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-macro-border bg-black/20 px-3 py-2 text-sm text-white has-[:checked]:border-macro-accent has-[:checked]:bg-blue-950/40"
              >
                <input
                  type="radio"
                  name="horizon"
                  checked={horizon === h}
                  onChange={() => setHorizon(h)}
                  className="accent-macro-accent"
                />
                {h} hours
              </label>
            ))}
          </div>
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="text-macro-muted">Note (optional)</span>
          <textarea
            className="mt-1 min-h-[88px] w-full rounded-lg border border-macro-border bg-black/30 px-3 py-2 text-white outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-macro-accent"
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
        className="w-full rounded-lg bg-macro-accent px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500 disabled:opacity-50 sm:w-auto"
      >
        {submitting ? "Saving…" : "Log prediction"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { MarketTicker } from "@/components/MarketTicker";
import { PredictionForm } from "@/components/PredictionForm";
import { PredictionList } from "@/components/PredictionList";
import { StatsBar } from "@/components/StatsBar";

export default function Home() {
  const [listKey, setListKey] = useState(0);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <main className="relative z-0 order-2 min-h-0 min-w-0 flex-1 lg:order-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <header className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
              Macro Prediction Learning Bot
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Learn from real outcomes
            </h1>
            <p className="mt-3 max-w-2xl text-macro-muted">
              Log a directional view on oil, gold, silver, broad stocks, or
              Bitcoin. The app stores the entry price, waits for your horizon,
              then scores the result using live CoinGecko, Yahoo (gold), and
              Finnhub data — with a neutral band for tiny moves so noise
              doesn’t fake a win rate.
            </p>
          </header>

          <section className="mb-10 space-y-4">
            <StatsBar />
          </section>

          <section className="mb-10">
            <PredictionForm
              onCreated={() => {
                setListKey((k) => k + 1);
                window.dispatchEvent(new Event("macro-stats-refresh"));
              }}
            />
          </section>

          <section>
            <PredictionList refreshKey={listKey} />
          </section>

          <footer className="mt-16 border-t border-macro-border pt-8 text-center text-xs text-macro-muted">
            Educational feedback only — not financial advice. Add{" "}
            <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-slate-300">
              FINNHUB_API_KEY
            </code>{" "}
            for SPY, SLV, and USO quotes (gold uses COMEX GC=F via Yahoo).
          </footer>
        </div>
      </main>

      <aside className="relative z-10 order-1 shrink-0 border-b border-macro-border bg-macro-surface/80 px-4 py-4 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.45)] backdrop-blur-md lg:order-2 lg:sticky lg:top-0 lg:max-h-screen lg:w-80 lg:overflow-y-auto lg:border-b-0 lg:border-l lg:border-t-0 lg:px-5 lg:py-8 lg:pt-8 lg:pb-8 lg:shadow-none xl:w-[22rem]">
        <MarketTicker />
      </aside>
    </div>
  );
}

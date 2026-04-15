"use client";

import { useState } from "react";
import { MarketTicker } from "@/components/MarketTicker";
import { PolymarketGeopolitics } from "@/components/PolymarketGeopolitics";
import { ZeroHedgeFeed } from "@/components/ZeroHedgeFeed";
import { PredictionForm } from "@/components/PredictionForm";
import { PredictionList } from "@/components/PredictionList";
import { StatsBar } from "@/components/StatsBar";

export default function Home() {
  const [listKey, setListKey] = useState(0);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <main className="relative z-0 order-1 min-h-0 min-w-0 flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <header className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
              Macro Prediction Learning Bot
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Learn from real outcomes
            </h1>
            <p className="mt-3 max-w-2xl text-macro-muted">
              Log a directional view on equities, commodities, rates, vol, FX,
              and fertilizer names. The app stores the entry price, waits for
              your horizon, then scores the result using CoinGecko, Yahoo, and
              Finnhub — with a neutral band for tiny moves so noise doesn’t fake
              a win rate.
            </p>
          </header>

          <section className="mb-10 space-y-4">
            <StatsBar />
          </section>

          <section className="mb-10">
            <PolymarketGeopolitics />
          </section>

          <section className="mb-10">
            <ZeroHedgeFeed />
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
            for US-listed symbols; futures, indices, and spot series use Yahoo
            where noted on each card.
          </footer>
        </div>
      </main>

      <aside className="relative z-10 order-2 shrink-0 border-b border-macro-border bg-macro-surface/80 px-4 py-4 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.45)] backdrop-blur-md lg:sticky lg:top-0 lg:max-h-[100dvh] lg:min-h-0 lg:w-80 lg:overflow-y-auto lg:overflow-x-hidden lg:self-start lg:border-b-0 lg:border-l lg:border-t-0 lg:px-4 lg:py-6 lg:shadow-none lg:[-webkit-overflow-scrolling:touch] xl:w-[22rem]">
        <MarketTicker />
      </aside>
    </div>
  );
}

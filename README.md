# Macro

**Learn to get rich and shit** *(results may vary; wealth not included in repo)*

This is the **Macro Prediction Learning Bot** — a full-stack guilt trip for your hot takes. You log a directional view on oil, gold, stocks, or Bitcoin. The app writes down the price like a disappointed accountant, waits 24–48 hours, then tells you whether reality agreed with you or whether you were just vibing.

It is **not** a trading bot. It will not YOLO your rent money. It **will** keep a scoreboard so your future self can cringe with data.

## Features that slap (educationally)

- **Real prices** — CoinGecko for Bitcoin; Finnhub for SPY / GLD / USO (you bring the API key; we bring the spreadsheet energy).
- **Neutral zone** — Moves smaller than your threshold (default 0.5%) count as “meh,” not a W or an L. Tiny wiggles don’t get to hurt your feelings.
- **SQLite** — Your predictions live in a file, not in the cloud next to someone’s NFT collection.

## Quick start

```bash
cp .env.example .env
# Add FINNHUB_API_KEY — https://finnhub.io/register
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log a prediction. Go touch grass. Come back and hit **Resolve due predictions** when the universe has had time to think about what you said.

## Stack

Next.js · React · API routes · SQLite (`better-sqlite3`) · Tailwind · one (1) healthy fear of overfitting your ego

## Legal-ish whisper

Educational / feedback only. Not financial advice. If this README made you rich, tell us your secrets; we’re mostly here for the charts and the humility.

---

*Fork responsibly. Predict wildly. Commit sparingly.*

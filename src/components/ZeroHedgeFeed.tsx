"use client";

import { fetchJson } from "@/lib/readJsonResponse";
import type { ZerohedgeRssItem } from "@/lib/zerohedgeRss";
import Script from "next/script";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    twttr?: {
      widgets: { load: (el?: Element | Document) => void };
    };
  }
}

type RssPayload =
  | {
      ok: true;
      items: ZerohedgeRssItem[];
      feedUrl: string;
      note: string;
      profileUrl: string;
    }
  | { ok: false; error: string; items: [] };

function refreshTwitterTimeline() {
  if (typeof window === "undefined") return;
  try {
    window.twttr?.widgets?.load();
  } catch {
    /* ignore */
  }
}

function formatPub(d: string | null) {
  if (!d) return "";
  const t = Date.parse(d);
  if (!Number.isFinite(t)) return d;
  return new Date(t).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ZeroHedgeFeed() {
  const [rss, setRss] = useState<RssPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJson<RssPayload>("/api/zerohedge/feed", { cache: "no-store" })
      .then((json) => {
        if (!cancelled) setRss(json);
      })
      .catch(() => {
        if (!cancelled)
          setRss({
            ok: false,
            error: "Could not load ZeroHedge RSS.",
            items: [],
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    refreshTwitterTimeline();
  }, []);

  return (
    <section className="rounded-xl border border-macro-border bg-macro-surface/60 ring-1 ring-white/5">
      <div className="border-b border-macro-border px-4 py-3 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-600/90">
          ZeroHedge
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">
          Live X timeline + site RSS
        </h2>
        <p className="mt-1 text-xs text-macro-muted">
          The embed below is ZeroHedge’s official{" "}
          <span className="text-slate-400">@zerohedge</span> profile on X — same
          account that often posts before full articles hit the site. Loads
          X/Twitter’s widget script (third party). Below that: our mirror of
          their CMS RSS for direct article links.
        </p>
      </div>

      <div className="border-b border-macro-border px-2 py-3 sm:px-4">
        <Script
          src="https://platform.twitter.com/widgets.js"
          strategy="lazyOnload"
          onLoad={refreshTwitterTimeline}
        />
        <div className="overflow-hidden rounded-lg border border-macro-border bg-[#0a0e14]">
          <a
            className="twitter-timeline"
            data-theme="dark"
            data-height="560"
            data-chrome="noheader nofooter transparent"
            href="https://twitter.com/zerohedge?ref_src=twsrc%5Etfw"
          >
            Tweets by @zerohedge
          </a>
        </div>
        <p className="mt-2 text-center text-[10px] text-macro-muted">
          If the timeline is blank, an ad blocker or privacy extension may be
          blocking <span className="font-mono text-slate-500">platform.twitter.com</span>
          .
        </p>
      </div>

      <div className="border-b border-macro-border px-4 py-2 sm:px-5">
        <p className="text-xs font-medium text-slate-400">
          Latest on zerohedge.com (RSS)
        </p>
      </div>

      {rss == null ? (
        <div className="px-4 py-6 sm:px-5">
          <div className="h-32 animate-pulse rounded-lg bg-black/25" />
        </div>
      ) : !rss.ok ? (
        <div className="px-4 py-3 text-sm text-amber-200/90 sm:px-5">
          {rss.error}
        </div>
      ) : rss.items.length === 0 ? (
        <div className="px-4 py-3 text-sm text-macro-muted sm:px-5">
          No RSS items returned.
        </div>
      ) : (
        <ul className="divide-y divide-macro-border">
          {rss.items.map((row) => (
            <li key={row.link}>
              <a
                href={row.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2.5 transition-colors hover:bg-white/[0.04] sm:px-5"
              >
                <p className="text-sm font-medium leading-snug text-slate-100">
                  {row.title}
                </p>
                {row.pubDate ? (
                  <p className="mt-1 font-mono text-[10px] tabular-nums text-macro-muted">
                    {formatPub(row.pubDate)}
                  </p>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      )}

      {rss?.ok ? (
        <p className="border-t border-macro-border px-4 py-2.5 text-center text-[10px] text-macro-muted sm:px-5">
          {rss.note}{" "}
          <a
            href={rss.feedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 underline underline-offset-2 hover:text-slate-300"
          >
            RSS source
          </a>
        </p>
      ) : null}
    </section>
  );
}

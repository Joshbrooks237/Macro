import type { AssetKey } from "@/types/prediction";

/**
 * Per-asset accents: slim bar + modal top stripe (Tailwind literals for JIT).
 * Body text stays neutral for readability; color is mainly the bar / chart.
 * Oil amber, gold yellow, silver cyan, stocks blue, crypto violet; macro + ag extras below.
 */
export const assetCardClasses: Record<
  AssetKey,
  {
    accentBar: string;
    modalTopAccent: string;
    ringHover: string;
    focusVisible: string;
  }
> = {
  oil: {
    accentBar: "bg-amber-500",
    modalTopAccent: "border-t-4 border-t-amber-500",
    ringHover: "hover:ring-amber-500/35",
    focusVisible: "focus-visible:ring-2 focus-visible:ring-amber-400",
  },
  wti: {
    accentBar: "bg-amber-600",
    modalTopAccent: "border-t-4 border-t-amber-600",
    ringHover: "hover:ring-amber-600/35",
    focusVisible: "focus-visible:ring-2 focus-visible:ring-amber-500",
  },
  brent: {
    accentBar: "bg-amber-300",
    modalTopAccent: "border-t-4 border-t-amber-300",
    ringHover: "hover:ring-amber-300/35",
    focusVisible: "focus-visible:ring-2 focus-visible:ring-amber-200",
  },
  gold: {
    accentBar: "bg-yellow-400",
    modalTopAccent: "border-t-4 border-t-yellow-400",
    ringHover: "hover:ring-yellow-400/35",
    focusVisible: "focus-visible:ring-2 focus-visible:ring-yellow-300",
  },
  silver: {
    accentBar: "bg-cyan-400",
    modalTopAccent: "border-t-4 border-t-cyan-400",
    ringHover: "hover:ring-cyan-400/35",
    focusVisible: "focus-visible:ring-2 focus-visible:ring-cyan-300",
  },
  stocks: {
    accentBar: "bg-blue-500",
    modalTopAccent: "border-t-4 border-t-blue-500",
    ringHover: "hover:ring-blue-500/35",
    focusVisible: "focus-visible:ring-2 focus-visible:ring-blue-400",
  },
  crypto: {
    accentBar: "bg-violet-500",
    modalTopAccent: "border-t-4 border-t-violet-500",
    ringHover: "hover:ring-violet-500/35",
    focusVisible: "focus-visible:ring-2 focus-visible:ring-violet-400",
  },
  dxy: {
    accentBar: "bg-emerald-500",
    modalTopAccent: "border-t-4 border-t-emerald-500",
    ringHover: "hover:ring-emerald-500/35",
    focusVisible: "focus-visible:ring-2 focus-visible:ring-emerald-400",
  },
  treasury_10y: {
    accentBar: "bg-rose-400",
    modalTopAccent: "border-t-4 border-t-rose-400",
    ringHover: "hover:ring-rose-400/35",
    focusVisible: "focus-visible:ring-2 focus-visible:ring-rose-300",
  },
  vix: {
    accentBar: "bg-fuchsia-500",
    modalTopAccent: "border-t-4 border-t-fuchsia-500",
    ringHover: "hover:ring-fuchsia-500/35",
    focusVisible: "focus-visible:ring-2 focus-visible:ring-fuchsia-400",
  },
  natgas: {
    accentBar: "bg-orange-500",
    modalTopAccent: "border-t-4 border-t-orange-500",
    ringHover: "hover:ring-orange-500/35",
    focusVisible: "focus-visible:ring-2 focus-visible:ring-orange-400",
  },
  copper: {
    accentBar: "bg-orange-700",
    modalTopAccent: "border-t-4 border-t-orange-700",
    ringHover: "hover:ring-orange-700/35",
    focusVisible: "focus-visible:ring-2 focus-visible:ring-orange-600",
  },
  mos: {
    accentBar: "bg-lime-500",
    modalTopAccent: "border-t-4 border-t-lime-500",
    ringHover: "hover:ring-lime-500/35",
    focusVisible: "focus-visible:ring-2 focus-visible:ring-lime-400",
  },
  ntr: {
    accentBar: "bg-teal-400",
    modalTopAccent: "border-t-4 border-t-teal-400",
    ringHover: "hover:ring-teal-400/35",
    focusVisible: "focus-visible:ring-2 focus-visible:ring-teal-300",
  },
  cf: {
    accentBar: "bg-indigo-400",
    modalTopAccent: "border-t-4 border-t-indigo-400",
    ringHover: "hover:ring-indigo-400/35",
    focusVisible: "focus-visible:ring-2 focus-visible:ring-indigo-300",
  },
};

/** Recharts / SVG (hex) — matches accent bars above */
export const assetChartColors: Record<
  AssetKey,
  { stroke: string; activeDot: string }
> = {
  oil: { stroke: "#f59e0b", activeDot: "#fcd34d" },
  wti: { stroke: "#d97706", activeDot: "#fdba74" },
  brent: { stroke: "#fcd34d", activeDot: "#fef3c7" },
  gold: { stroke: "#facc15", activeDot: "#fef08a" },
  silver: { stroke: "#22d3ee", activeDot: "#a5f3fc" },
  stocks: { stroke: "#3b82f6", activeDot: "#93c5fd" },
  crypto: { stroke: "#8b5cf6", activeDot: "#c4b5fd" },
  dxy: { stroke: "#10b981", activeDot: "#6ee7b7" },
  treasury_10y: { stroke: "#fb7185", activeDot: "#fecdd3" },
  vix: { stroke: "#d946ef", activeDot: "#f0abfc" },
  natgas: { stroke: "#f97316", activeDot: "#fdba74" },
  copper: { stroke: "#c2410c", activeDot: "#fed7aa" },
  mos: { stroke: "#84cc16", activeDot: "#d9f99d" },
  ntr: { stroke: "#2dd4bf", activeDot: "#99f6e4" },
  cf: { stroke: "#818cf8", activeDot: "#c7d2fe" },
};

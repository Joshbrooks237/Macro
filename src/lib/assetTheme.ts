import type { AssetKey } from "@/types/prediction";

/**
 * Per-asset accents: slim bar + modal top stripe (Tailwind literals for JIT).
 * Body text stays neutral for readability; color is mainly the bar / chart.
 * Oil amber, gold yellow, silver cyan, stocks blue, crypto violet.
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
};

/** Recharts / SVG (hex) — matches accent bars above */
export const assetChartColors: Record<
  AssetKey,
  { stroke: string; activeDot: string }
> = {
  oil: { stroke: "#f59e0b", activeDot: "#fcd34d" },
  gold: { stroke: "#facc15", activeDot: "#fef08a" },
  silver: { stroke: "#22d3ee", activeDot: "#a5f3fc" },
  stocks: { stroke: "#3b82f6", activeDot: "#93c5fd" },
  crypto: { stroke: "#8b5cf6", activeDot: "#c4b5fd" },
};

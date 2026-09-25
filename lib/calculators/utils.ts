// src/lib/calculators/utils.ts
export function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export const UI = {
  paperBg: "bg-transparent",
  paperDots: "w-full",
  ink: "text-slate-900",
  inkSoft: "text-slate-600",
  card: "bg-white border-[#dce5dd]",
};

export function toNumberSafe(v: string) {
  const n = Number(String(v).replaceAll(",", "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function formatKRW(n: number) {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("ko-KR");
}

export function pct(n: number) {
  if (!Number.isFinite(n)) return "0.0";
  return n.toFixed(1);
}

export function normalizeDay(day: number, dim: number) {
  return clamp(Math.round(day), 1, dim);
}

export function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

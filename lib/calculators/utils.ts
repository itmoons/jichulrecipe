// src/lib/calculators/utils.ts
export function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export const UI = {
  paperBg: "bg-[#FFFFFF]",
  paperDots:
    "bg-[radial-gradient(circle,rgba(251,146,60,0.14)_1px,transparent_1px)] bg-[size:16px_16px]",
  ink: "text-[#3B2F1E]",
  inkSoft: "text-[#6B5642]",
  card: "bg-[#FFF9F2] border-[#F2E4B6]",
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

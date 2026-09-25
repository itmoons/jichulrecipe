// src/components/calculators/Metric.tsx
"use client";

import React from "react";
import { cn } from "@/lib/calculators/utils";

export function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#dce5dd] bg-[#f7faf8] p-4">
      <div className="text-xs font-medium text-slate-600">{title}</div>
      <div className="mt-1 break-words text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export function LegendChip({
  label,
  tone,
  className,
}: {
  label: string;
  tone: "low" | "def";
  className?: string;
}) {
  const cls = tone === "def"
    ? "border-[#1f7a5b] bg-[#1f7a5b] text-white"
    : "border-[#c6e2d4] bg-[#f1f8f4] text-[#176247]";
  return (
    <span className={cn("hidden sm:inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold", cls, className)}>
      {label}
    </span>
  );
}

export function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "danger";
}) {
  const vCls = tone === "danger" ? "text-rose-700" : tone === "ok" ? "text-[#176247]" : "text-slate-700";
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#dce5dd] bg-white px-3 py-2.5">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <span className={cn("text-[12px] font-bold", vCls)}>{value}</span>
    </div>
  );
}

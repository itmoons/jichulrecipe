// src/components/calculators/Metric.tsx
"use client";

import React from "react";
import { cn } from "@/lib/calculators/utils";

export function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#ffedd5] bg-white p-4">
      <div className="text-xs font-semibold text-[#7f7f7f]">{title}</div>
      <div className="mt-1 text-xl font-bold text-[#3B2F1E]">{value}</div>
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
  const cls =
    tone === "def"
      ? "border-[#ff8a3d] bg-[#ff8a3d] text-white"
      : "border-[#ff8a3d] bg-[#ff8a3d] text-[#ffffff]";
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
  const vCls = tone === "danger" ? "text-[#ffffff]" : "text-[#7f7f7f]";
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#ffedd5] bg-[#fff7ed] px-3 py-2">
      <span className="text-[12px] font-semibold text-[#3B2F1E]">{label}</span>
      <span className={cn("text-[12px] font-bold", vCls)}>{value}</span>
    </div>
  );
}

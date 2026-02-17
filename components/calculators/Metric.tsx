// src/components/calculators/Metric.tsx
"use client";

import React from "react";
import { cn } from "@/lib/calculators/utils";

export function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#F2E4B6] bg-white p-4">
      <div className="text-xs font-semibold text-[#6B5642]">{title}</div>
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
      ? "border-[#F97316] bg-[#F97316] text-white"
      : "border-[#FB923C] bg-[#FFE4C7] text-[#F97316]";
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
  const vCls = tone === "danger" ? "text-[#F97316]" : "text-[#6B5642]";
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#F2E4B6] bg-[#FFFFFF] px-3 py-2">
      <span className="text-sm font-semibold text-[#3B2F1E]">{label}</span>
      <span className={cn("text-sm font-bold", vCls)}>{value}</span>
    </div>
  );
}

// src/components/calculators/Inputs.tsx
"use client";

import React from "react";
import { cn } from "@/lib/calculators/utils";

export function MoneyInput({
  label,
  value,
  setValue,
  hint,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <div className="flex items-end justify-between gap-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#9C7A55]">
          ₩
        </span>
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={cn("h-11 w-full rounded-lg border border-[#dce5dd] bg-white pl-8 pr-3 text-sm text-slate-900 outline-none focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20")}
        />
      </div>
    </label>
  );
}

export function NumberInput({
  label,
  value,
  setValue,
  hint,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <div className="flex items-end justify-between gap-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn("h-11 w-full rounded-lg border border-[#dce5dd] bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20")}
      />
    </label>
  );
}

export function TextInput({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn("h-11 w-full rounded-lg border border-[#dce5dd] bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20")}
      />
    </label>
  );
}

export function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("h-11 w-full rounded-lg border border-[#dce5dd] bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20")}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PctInput({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="relative">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={cn("h-11 w-full rounded-lg border border-[#dce5dd] bg-white px-3 pr-10 text-sm text-slate-900 outline-none focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20")}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#9C7A55]">
          %
        </span>
      </div>
    </label>
  );
}

export function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1.5">
      <div className="text-[12px] font-semibold text-[#3B2F1E]">{label}</div>
      <div className="rounded-xl border border-[#e2e5e1] bg-[#1f7a5b] px-3 py-2 text-[12px] font-bold text-white">
        {value}
      </div>
    </div>
  );
}

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
    <div className="grid gap-1.5">
      <div className="flex items-end justify-between gap-2">
        <label className="text-[12px] font-semibold text-[#3B2F1E]">{label}</label>
        {hint && <span className="text-xs text-[#7f7f7f]">{hint}</span>}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#9C7A55]">
          ₩
        </span>
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={cn(
            "h-11 w-full rounded-xl border bg-white pl-8 pr-3 text-[12px] outline-none",
            "border-[#dcefe5] focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20"
          )}
        />
      </div>
    </div>
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
    <div className="grid gap-1.5">
      <div className="flex items-end justify-between gap-2">
        <label className="text-[12px] font-semibold text-[#3B2F1E]">{label}</label>
        {hint && <span className="text-xs text-[#7f7f7f]">{hint}</span>}
      </div>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn(
          "h-11 w-full rounded-xl border bg-white px-3 text-[12px] outline-none",
          "border-[#dcefe5] focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20"
        )}
      />
    </div>
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
    <div className="grid gap-1.5">
      <label className="text-[12px] font-semibold text-[#3B2F1E]">{label}</label>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn(
          "h-11 w-full rounded-xl border bg-white px-3 text-[12px] outline-none",
          "border-[#dcefe5] focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20"
        )}
      />
    </div>
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
    <div className="grid gap-1.5">
      <label className="text-[12px] font-semibold text-[#3B2F1E]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-11 w-full rounded-xl border bg-white px-3 text-[12px] outline-none",
          "border-[#dcefe5] focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20"
        )}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
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
    <div className="grid gap-1.5">
      <label className="text-[12px] font-semibold text-[#3B2F1E]">{label}</label>
      <div className="relative">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={cn(
            "h-11 w-full rounded-xl border bg-white px-3 pr-10 text-[12px] outline-none",
            "border-[#dcefe5] focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20"
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#9C7A55]">
          %
        </span>
      </div>
    </div>
  );
}

export function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1.5">
      <div className="text-[12px] font-semibold text-[#3B2F1E]">{label}</div>
      <div className="rounded-xl border border-[#dcefe5] bg-[#1f7a5b] px-3 py-2 text-[12px] font-bold text-[#7f7f7f]">
        {value}
      </div>
    </div>
  );
}

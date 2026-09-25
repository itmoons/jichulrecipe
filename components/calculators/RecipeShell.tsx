// src/components/calculators/RecipeShell.tsx
"use client";

import React from "react";
import Link from "next/link";
import { cn, UI } from "@/lib/calculators/utils";

export function RecipeShell({
  badge,
  title,
  subtitle,
  backHref = "/calculators",
  children,
}: {
  badge: string;
  title: string;
  subtitle?: React.ReactNode;
  backHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("w-full", UI.paperBg)}>
      <div className={cn("w-full", UI.paperDots)}>
        <div className="w-full py-1">
          <div className="mb-5 flex items-center justify-between gap-3">
            <Link
              href={backHref}
              className="rounded-lg border border-[#dce5dd] bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-[#1f7a5b] hover:text-[#176247]"
            >
              ← 계산기 모음
            </Link>
            <span className="rounded-lg bg-[#eaf5ef] px-3 py-1.5 text-xs font-semibold text-[#176247]">
              {badge}
            </span>
          </div>

          <div className="mb-6">
            <h1 className={cn("text-2xl font-semibold tracking-tight sm:text-3xl", UI.ink)}>
              {title}
            </h1>
            {subtitle ? (
              <p className={cn("mt-2 max-w-3xl text-sm leading-6 sm:text-base", UI.inkSoft)}>{subtitle}</p>
            ) : null}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

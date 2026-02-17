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
    <div className={cn("min-h-screen", UI.paperBg)}>
      <div className={cn("min-h-screen", UI.paperDots)}>
        <div className="mx-auto max-w-6xl px-4 py-7 sm:py-10">
          <div className="mb-5 flex items-center justify-between gap-3">
            <Link
              href={backHref}
              className="rounded-full border border-[#F2E4B6] bg-[#FFF9F2] px-3 py-1.5 text-sm font-semibold text-[#6B5642] hover:border-[#FB923C]"
            >
              ← 계산기 모음
            </Link>
            <span className="rounded-full bg-[#FFE4C7] px-3 py-1.5 text-sm font-semibold text-[#F97316]">
              {badge}
            </span>
          </div>

          <div className="mb-6">
            <h1 className={cn("text-2xl sm:text-3xl font-semibold tracking-tight", UI.ink)}>
              {title}
            </h1>
            {subtitle ? (
              <p className={cn("mt-2 text-sm sm:text-base", UI.inkSoft)}>{subtitle}</p>
            ) : null}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

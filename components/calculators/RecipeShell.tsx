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
        <div className="mx-auto px-2 py-2 sm:py-2">
          <div className="mb-5 flex items-center justify-between gap-3">
            <Link
              href={backHref}
              className="rounded-full border border-[#ffedd5] bg-[#fff7ed] px-3 py-1.5 text-[12px] font-semibold text-[#7f7f7f] hover:border-[#ff8a3d]"
            >
              ← 계산기 모음
            </Link>
            <span className="rounded-full bg-[#ff8a3d] px-3 py-1.5 text-[12px] font-semibold text-[#ffffff]">
              {badge}
            </span>
          </div>

          <div className="mb-6">
            <h1 className={cn("text-2xl sm:text-3xl font-semibold tracking-tight", UI.ink)}>
              {title}
            </h1>
            {subtitle ? (
              <p className={cn("mt-2 text-[12px] sm:text-base", UI.inkSoft)}>{subtitle}</p>
            ) : null}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

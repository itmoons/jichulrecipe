"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function LedgerModeSwitch({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname() || "/";
  if (pathname === "/couple-settings") return null;
  const couple = pathname.startsWith("/couple-ledger") || pathname.startsWith("/couple-settings");
  const relevant = couple || pathname.startsWith("/dashboard") || pathname.startsWith("/saving");
  if (!compact && !relevant) return null;

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const personalHref = pathname === "/couple-ledger/entry" ? `/dashboard/calendar/edit?date=${today}`
    : pathname.includes("/calendar") ? "/dashboard/calendar" : "/dashboard";
  const coupleHref = pathname.startsWith("/dashboard/calendar/edit") ? "/couple-ledger/entry"
    : pathname.includes("/calendar") ? "/couple-ledger/calendar"
    : pathname.includes("/analytics") || pathname === "/dashboard" || pathname.startsWith("/dashboard/yearly")
      ? "/couple-ledger/analytics" : "/couple-ledger";

  return <nav aria-label="장부 종류 선택" className={compact ? "px-4 pb-4" : "mx-auto w-full max-w-[1320px] px-4 py-3 sm:px-6 lg:px-0"}>
    <div className={`grid grid-cols-2 rounded-lg border border-[#dce5dd] bg-white p-1 ${compact ? "w-full" : "w-full max-w-xs"}`}>
      <Link href={personalHref} aria-current={!couple ? "page" : undefined} className={`flex min-h-9 items-center justify-center rounded-md px-3 text-xs font-semibold transition ${!couple ? "bg-[#1f7a5b] text-white" : "text-slate-600 hover:bg-[#f1f8f4]"}`}>개인용</Link>
      <Link href={coupleHref} aria-current={couple ? "page" : undefined} className={`flex min-h-9 items-center justify-center rounded-md px-3 text-xs font-semibold transition ${couple ? "bg-[#1f7a5b] text-white" : "text-slate-600 hover:bg-[#f1f8f4]"}`}>커플용</Link>
    </div>
  </nav>;
}

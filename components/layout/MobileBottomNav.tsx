"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const todayKey = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => mounted && setIsLoggedIn(Boolean(data.session)));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setIsLoggedIn(Boolean(session)));
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  if (!isLoggedIn) return null;

  const itemClass = (active: boolean) => `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${active ? "text-orange-700" : "text-slate-500"}`;

  return (
    <nav aria-label="모바일 빠른 메뉴" className="fixed inset-x-0 bottom-0 z-50 border-t border-orange-100 bg-white px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-sm lg:hidden">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between">
        <Link href="/" className={itemClass(pathname === "/")}>홈</Link>
        <Link href="/dashboard/calendar" className={itemClass(pathname.startsWith("/dashboard/calendar"))}>달력</Link>
        <Link href={`/dashboard/calendar/edit?date=${todayKey()}`} className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#167a5b] px-3 text-[11px] font-bold text-white transition hover:bg-[#0e5742]" aria-label="지출 기록하기">+ 지출</Link>
        <Link href="/dashboard" className={itemClass(pathname === "/dashboard")}>분석</Link>
        <Link href="/saving" className={itemClass(pathname.startsWith("/saving"))}>저축</Link>
      </div>
    </nav>
  );
}

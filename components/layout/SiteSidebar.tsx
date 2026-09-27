"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { LedgerModeSwitch } from "@/components/layout/LedgerModeSwitch";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Calculator,
  Gift,
  HandHeart,
  Home,
  PiggyBank,
  Plus,
  Settings,
  NotebookPen,
} from "lucide-react";

const items = [
  { href: "/", label: "홈", Icon: Home },
  { href: "/dashboard/calendar", label: "레시피 달력", Icon: CalendarDays },
  { href: "/dashboard", label: "소비 분석", Icon: BarChart3 },
  { href: "/dashboard/memos", label: "오늘의 메모", Icon: NotebookPen },
  { href: "/dashboard/gifts", label: "경조사비", Icon: Gift },
  { href: "/saving", label: "저축 · 정기관리", Icon: PiggyBank },
  { href: "/calculators", label: "돈 계산 도구", Icon: Calculator },
];

const coupleItems = [
  { href: "/couple-ledger", label: "커플 장부 홈", Icon: HandHeart },
  { href: "/couple-ledger/entry", label: "공동 지출 기록", Icon: Plus },
  { href: "/couple-ledger/calendar", label: "커플 달력", Icon: CalendarDays },
  { href: "/couple-ledger/analytics", label: "커플 소비 분석", Icon: BarChart3 },
  { href: "/couple-settings", label: "커플 설정", Icon: Settings },
];

function getTodayKeyKST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function SiteSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const coupleMode = pathname.startsWith("/couple-ledger") || pathname.startsWith("/couple-settings");

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => mounted && setIsLoggedIn(Boolean(data.session)));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setIsLoggedIn(Boolean(session)),
    );
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const active = (href: string) =>
    href === "/" || href === "/dashboard" || href === "/couple-ledger"
      ? pathname === href || (href === "/dashboard" && pathname.startsWith("/dashboard/yearly"))
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-60 flex-col border-r border-[#e2e5e1] bg-white xl:flex">
      <Link
        href="/"
        className="flex h-[68px] shrink-0 items-center gap-3 border-b border-[#edf3ef] px-6"
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e2e5e1] bg-white p-1">
          <Image
            src="/logo/logos.png"
            alt="지출레시피"
            fill
            sizes="40px"
            className="object-contain"
            priority
          />
        </span>
        <span className="text-[17px] font-bold tracking-[-0.04em] text-slate-900">
          지출<span className="text-[#1f7a5b]">recipe</span>
        </span>
      </Link>

      <div className="pt-4"><LedgerModeSwitch compact /></div>

      <div className="shrink-0 px-4 py-5">
        <Link
          href={
            isLoggedIn
              ? coupleMode ? "/couple-ledger/entry" : `/dashboard/calendar/edit?date=${getTodayKeyKST()}`
              : "/sign-up"
          }
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1f7a5b] text-[13px] font-bold text-white transition hover:bg-[#176247]"
        >
          <Plus size={16} /> 기록하기
        </Link>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-5" aria-label="주 메뉴">
        {(coupleMode ? coupleItems : items).map(({ href, label, Icon }) => (
          <Link
            key={href}
            aria-current={active(href) ? "page" : undefined}
            href={
              isLoggedIn || href === "/" || href === "/calculators"
                ? href
                : "/sign-in"
            }
            className={`flex h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold transition ${active(href) ? "bg-[#eaf5ef] text-[#176247]" : "text-slate-600 hover:bg-[#f8fafc] hover:text-slate-900"}`}
          >
            <span className="flex w-5 shrink-0 items-center justify-center"><Icon size={18} strokeWidth={active(href) ? 2.25 : 1.8} /></span>
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </nav>

      <div className="shrink-0 border-t border-[#edf3ef] px-3 py-4">
        {isLoggedIn ? (
          <Link
            href="/notifications"
            className="mb-1 flex h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold text-slate-500 transition hover:bg-[#f8fafc] hover:text-slate-900"
          >
            <span className="flex w-5 shrink-0 items-center justify-center"><Bell size={18} /></span> 알림
          </Link>
        ) : null}
        <Link
          href="/settings"
          className={`flex h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold transition ${
            active("/settings")
              ? "bg-[#eaf5ef] text-[#176247]"
              : "text-slate-500 hover:bg-[#f8fafc] hover:text-slate-900"
          }`}
        >
          <span className="flex w-5 shrink-0 items-center justify-center"><Settings
            size={18}
            strokeWidth={active("/settings") ? 2.25 : 1.8}
          /></span>
          설정
        </Link>
        {isLoggedIn ? (
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/");
            }}
            className="mt-3 w-full rounded-lg border border-[#e2e5e1] py-2.5 text-[12px] font-bold text-slate-600 transition hover:bg-[#f8fafc]"
          >
            로그아웃
          </button>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/sign-in"
              className="rounded-lg border border-[#e2e5e1] py-2.5 text-center text-[12px] font-bold text-slate-600"
            >
              로그인
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-[#1f7a5b] py-2.5 text-center text-[12px] font-bold text-white"
            >
              시작하기
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}

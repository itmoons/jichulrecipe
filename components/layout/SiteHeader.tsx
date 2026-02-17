// src/components/layout/SiteHeader.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BRAND_ORANGE = "#FF8A3D";

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true); // 초기 깜빡임 방지용
  const [isNavOpen, setIsNavOpen] = useState(false); // 모바일 메뉴 열림 여부

  // Supabase 세션 기반 로그인 상태 체크
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      setIsLoggedIn(!!session);
      setChecking(false);
    };

    init();

    // 로그인/로그아웃 상태 변화 구독
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsLoggedIn(!!session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsNavOpen(false);
    router.push("/");
  };

  const toggleNav = () => setIsNavOpen((prev) => !prev);
  const closeNav = () => setIsNavOpen(false);

  const isCalendar = pathname?.startsWith("/dashboard/calendar");
  const isDashboard = pathname === "/dashboard";
  const isYearly = pathname?.startsWith("/dashboard/yearly");

  // 로그인 가드용 링크 헬퍼
  const guardedHref = (target: string) =>
    isLoggedIn ? target : "/sign-in";

  return (
    <header
      className={[
        "sticky top-0 z-40 border-b border-orange-100/70",
        "bg-gradient-to-r from-[#FFF9F2] via-[#FFF3E2] to-[#FFE7CF]/95",
        "backdrop-blur shadow-[0_2px_8px_rgba(248,153,75,0.12)]",
      ].join(" ")}
    >
      {/* 상단 바 (PC에서 65% 폭만 사용) */}
      <div className="mx-auto flex w-full max-w-full md:max-w-[100%] items-center justify-between px-4 py-3">
        {/* 좌측: 햄버거 + 로고 */}
        <div className="flex items-center gap-2">
          {/* 햄버거 버튼 - 모바일 전용, 왼쪽 배치 */}
          <button
            type="button"
            onClick={toggleNav}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-orange-200 bg-white/90 text-slate-700 shadow-sm md:hidden"
            aria-label="메뉴 열기"
            aria-expanded={isNavOpen}
          >
            <span className="inline-block text-lg">
              {isNavOpen ? "✕" : "☰"}
            </span>
          </button>

          {/* 로고 + 서비스명 */}
          <Link
            href="/"
            className="flex items-center gap-2"
            onClick={closeNav}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white shadow-sm border border-orange-100">
              <Image
                src="/logo/logo.png"
                alt="지출레시피 로고"
                width={26}
                height={26}
                priority
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-slate-900">
                지출레시피
              </span>
              <span className="text-[11px] text-slate-500">
                사회초년생을 위한 예산 레스토랑
              </span>
            </div>
          </Link>
        </div>

        {/* 데스크톱 내비게이션 */}
        <nav className="hidden items-center gap-4 text-xs font-medium text-slate-700 md:flex">
          <Link
            href={guardedHref("/dashboard/calendar")}
            className={[
              "rounded-full px-3 py-1 transition",
              isCalendar
                ? "bg-white text-slate-900 shadow-sm border border-orange-100"
                : "text-slate-700 hover:bg-white/70 hover:text-slate-900 border border-transparent",
            ].join(" ")}
          >
            레시피 달력
          </Link>
          <Link
            href={guardedHref("/dashboard")}
            className={[
              "rounded-full px-3 py-1 transition",
              isDashboard || isYearly
                ? "bg-white text-slate-900 shadow-sm border border-orange-100"
                : "text-slate-700 hover:bg-white/70 hover:text-slate-900 border border-transparent",
            ].join(" ")}
          >
            레시피 분석
          </Link>
          <Link
            href={guardedHref("/dashboard/recurring")}
            className={[
              "rounded-full px-3 py-1 transition",
              isCalendar
                ? "bg-white text-slate-900 shadow-sm border border-orange-100"
                : "text-slate-700 hover:bg-white/70 hover:text-slate-900 border border-transparent",
            ].join(" ")}
          >
            정기레시피 등록
          </Link>
          <Link
            href={guardedHref("/saving")}
            className={[
              "rounded-full px-3 py-1 transition",
              isDashboard || isYearly
                ? "bg-white text-slate-900 shadow-sm border border-orange-100"
                : "text-slate-700 hover:bg-white/70 hover:text-slate-900 border border-transparent",
            ].join(" ")}
          >
            재료 저장(적금)
          </Link>
          <Link
            href={guardedHref("/dashboard/gifts")}
            className={[
              "rounded-full px-3 py-1 transition",
              isDashboard || isYearly
                ? "bg-white text-slate-900 shadow-sm border border-orange-100"
                : "text-slate-700 hover:bg-white/70 hover:text-slate-900 border border-transparent",
            ].join(" ")}
          >
            경조사비
          </Link>
          <Link
            href={guardedHref("/calculators")}
            className={[
              "rounded-full px-3 py-1 transition",
              isDashboard || isYearly
                ? "bg-white text-slate-900 shadow-sm border border-orange-100"
                : "text-slate-700 hover:bg-white/70 hover:text-slate-900 border border-transparent",
            ].join(" ")}
          >
            계산기
          </Link>

          {/* 로그인 / 로그아웃 버튼 */}
          {!checking && (
            <>
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-orange-200 bg-white px-3 py-1 text-[11px] font-semibold text-[color:var(--brand-orange)] shadow-sm transition hover:bg-orange-50"
                  style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
                >
                  로그아웃
                </button>
              ) : (
                <Link
                  href="/sign-in"
                  className="rounded-md bg-[color:var(--brand-orange)] px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#f27422]"
                  style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
                >
                  로그인
                </Link>
              )}
            </>
          )}
        </nav>

        {/* 모바일 우측: 로그인 / 로그아웃만 */}
        <div className="flex items-center gap-2 md:hidden">
          {!checking && (
            <>
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-orange-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-[color:var(--brand-orange)] shadow-sm transition hover:bg-orange-50"
                  style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
                >
                  로그아웃
                </button>
              ) : (
                <Link
                  href="/sign-in"
                  className="rounded-md bg-[color:var(--brand-orange)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#f27422]"
                  style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
                >
                  로그인
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {isNavOpen && (
        <div className="border-t border-orange-100 bg-white/95 md:hidden">
          <nav className="mx-auto flex w-full max-w-full md:max-w-[65%] flex-col gap-1 px-4 py-3 text-sm font-medium text-slate-700">
            <Link
              href={guardedHref("/dashboard/calendar")}
              className={[
                "rounded-md px-2 py-1.5",
                pathname?.startsWith("/dashboard/calendar")
                  ? "bg-orange-50 text-slate-900"
                  : "hover:bg-orange-50",
              ].join(" ")}
              onClick={closeNav}
            >
              레시피 달력
            </Link>
            <Link
              href={guardedHref("/dashboard")}
              className={[
                "rounded-md px-2 py-1.5",
                pathname === "/dashboard" || pathname?.startsWith("/dashboard/yearly")
                  ? "bg-orange-50 text-slate-900"
                  : "hover:bg-orange-50",
              ].join(" ")}
              onClick={closeNav}
            >
              레시피 분석
            </Link>
            <Link
              href={guardedHref("/dashboard/recurring")}
              className={[
                "rounded-md px-2 py-1.5",
                pathname === "/dashboard" || pathname?.startsWith("/recurring")
                  ? "bg-orange-50 text-slate-900"
                  : "hover:bg-orange-50",
              ].join(" ")}
              onClick={closeNav}
            >
              정기레시피 등록
            </Link>
            <Link
              href={guardedHref("/saving")}
              className={[
                "rounded-md px-2 py-1.5",
                pathname === "/dashboard" || pathname?.startsWith("/saving")
                  ? "bg-orange-50 text-slate-900"
                  : "hover:bg-orange-50",
              ].join(" ")}
              onClick={closeNav}
            >
              재료 저장(적금)
            </Link>
            <Link
              href={guardedHref("/dashboard/gifts")}
              className={[
                "rounded-md px-2 py-1.5",
                pathname === "/dashboard" || pathname?.startsWith("/saving")
                  ? "bg-orange-50 text-slate-900"
                  : "hover:bg-orange-50",
              ].join(" ")}
              onClick={closeNav}
            >
              경조사비
            </Link>
            <Link
              href={guardedHref("/calculators")}
              className={[
                "rounded-md px-2 py-1.5",
                pathname === "/dashboard" || pathname?.startsWith("/saving")
                  ? "bg-orange-50 text-slate-900"
                  : "hover:bg-orange-50",
              ].join(" ")}
              onClick={closeNav}
            >
              계산기
            </Link>


            <span
              className="mt-3 inline-flex items-center justify-center gap-1 rounded-full border border-orange-200 bg-[#FFF7EB] px-3 py-1 text-[11px] text-[color:var(--brand-orange)] shadow-sm"
              style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
            >
              <span>🍳</span>
              <span>오늘의 메뉴: 예산 세팅</span>
            </span>
          </nav>
        </div>
      )}
    </header>
  );
}

// src/components/layout/SiteHeader.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BRAND_ORANGE = "#FF8A3D";

export function SiteHeader() {
  const router = useRouter();
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

  return (
    <header className="sticky top-0 z-40 border-b border-orange-100 bg-gradient-to-r from-[#FFF7EB] via-[#FFF1DF] to-[#FFE7CF]/95 backdrop-blur">
      {/* 상단 바 */}
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* 좌측: 햄버거 + 로고 (모바일), 로고 단독(데스크톱) */}
        <div className="flex items-center gap-2">
          {/* 햄버거 버튼 - 모바일 전용, 왼쪽 배치 */}
          <button
            type="button"
            onClick={toggleNav}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-orange-200 bg-white/80 text-slate-700 shadow-sm md:hidden"
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
            <Image
              src="/logo/logo.png"
              alt="지출레시피 로고"
              width={40}
              height={40}
              priority
            />
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
        <nav className="hidden items-center gap-3 text-xs font-medium text-slate-700 md:flex">
          <Link href="/setup" className="hover:text-slate-900">
            레시피 입력/수정
          </Link>
          <Link href="/dashboard" className="hover:text-slate-900">
            레시피 분석(월별)
          </Link>
          <Link
            href="/dashboard/yearly?year=2025"
            className="hover:text-slate-900"
          >
            레시피 분석(연별)
          </Link>

          <span
            className="rounded-full border border-orange-200 bg-white/70 px-3 py-1 text-[11px] text-[color:var(--brand-orange)] shadow-sm"
            style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
          >
            오늘의 메뉴: 예산 세팅
          </span>

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
                  className="rounded-full bg-[color:var(--brand-orange)] px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#f27422]"
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
                  className="rounded-full bg-[color:var(--brand-orange)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#f27422]"
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
          <nav className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-3 text-sm font-medium text-slate-700">
            <Link
              href="/setup"
              className="rounded-md px-2 py-1.5 hover:bg-orange-50"
              onClick={closeNav}
            >
              레시피 입력/수정
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md px-2 py-1.5 hover:bg-orange-50"
              onClick={closeNav}
            >
              레시피 분석(월별)
            </Link>
            <Link
              href="/dashboard/yearly?year=2025"
              className="rounded-md px-2 py-1.5 hover:bg-orange-50"
              onClick={closeNav}
            >
              레시피 분석(연별)
            </Link>

            <span
              className="mt-2 inline-flex items-center justify-center rounded-full border border-orange-200 bg-[#FFF7EB] px-3 py-1 text-[11px] text-[color:var(--brand-orange)] shadow-sm"
              style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
            >
              오늘의 메뉴: 예산 세팅
            </span>
          </nav>
        </div>
      )}
    </header>
  );
}

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
    // 로그아웃 후 홈으로 이동
    router.push("/");
  };

  return (
    <header className="border-b border-orange-100 bg-gradient-to-r from-[#FFF7EB] via-[#FFF1DF] to-[#FFE7CF]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* 로고 + 서비스명 */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex items-center gap-2">
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
          </div>
        </Link>

        <nav className="flex items-center gap-3 text-xs font-medium text-slate-700">
          <Link href="/setup" className="hover:text-slate-900">
            레시피 입력/수정
          </Link>
          <Link href="/dashboard" className="hover:text-slate-900">
            레시피 분석(월별)
          </Link>
          <Link href="/dashboard/yearly?year=2025" className="hover:text-slate-900">
            레시피 분석(연별)
          </Link>

          <span
            className="hidden rounded-full border border-orange-200 bg-white/70 px-3 py-1 text-[11px] text-[color:var(--brand-orange)] shadow-sm sm:inline"
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
                  className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[color:var(--brand-orange)] shadow-sm border border-orange-200 hover:bg-orange-50 transition"
                  style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
                >
                  로그아웃
                </button>
              ) : (
                <Link
                  href="/sign-in"
                  className="rounded-full bg-[color:var(--brand-orange)] px-3 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-[#f27422] transition"
                  style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
                >
                  로그인
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

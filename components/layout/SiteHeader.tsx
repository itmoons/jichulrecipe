"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import NotificationsPanel from "@/components/NotificationsPanel";

const BRAND_blue = "#4cbcff";
const BRAND_SKY = "#BCE6FF";

// 공개 라우트
const PUBLIC_ROUTES = ["/", "/calculators"];

function isPublicRoute(target: string) {
  return PUBLIC_ROUTES.some((p) => target === p || target.startsWith(p + "/"));
}

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(false);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifWrapRef = useRef<HTMLDivElement | null>(null);

  const [unreadCount, setUnreadCount] = useState(0);

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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsLoggedIn(!!session);

      if (!session) {
        setUnreadCount(0);
        setIsNotifOpen(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    let mounted = true;
    let channel: any = null;

    const loadUnread = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) return;

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("to_user_id", user.id)
        .is("read_at", null);

      if (!mounted) return;
      if (!error) setUnreadCount(count ?? 0);
    };

    const subscribeUnread = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) return;

      channel = supabase
        .channel(`notif-unread:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `to_user_id=eq.${user.id}`,
          },
          () => {
            setUnreadCount((c) => c + 1);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `to_user_id=eq.${user.id}`,
          },
          async () => {
            await loadUnread();
          }
        )
        .subscribe();
    };

    loadUnread();
    subscribeUnread();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!isNotifOpen) return;
      const el = notifWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setIsNotifOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [isNotifOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsNavOpen(false);
    setIsNotifOpen(false);
    router.push("/");
  };

  const toggleNav = () => {
    setIsNotifOpen(false);
    setIsNavOpen((prev) => !prev);
  };

  const closeNav = () => setIsNavOpen(false);

  const toggleNotif = () => {
    setIsNavOpen(false);
    setIsNotifOpen((prev) => !prev);
  };

  const closeNotif = () => setIsNotifOpen(false);

  const isCalendar = pathname?.startsWith("/dashboard/calendar");
  const isDashboard = pathname === "/dashboard";
  const isYearly = pathname?.startsWith("/dashboard/yearly");
  const isCouple = pathname?.startsWith("/couple-ledger");

  const guardedHref = (target: string) => {
    if (isPublicRoute(target)) return target;
    return isLoggedIn ? target : "/sign-in";
  };

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* 1차 헤더 */}
      <div className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] w-full max-w-[1280px] items-center justify-between px-4 sm:px-6">
          {/* 좌측 */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleNav}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm md:hidden"
              aria-label="메뉴 열기"
              aria-expanded={isNavOpen}
            >
              <span className="text-lg">{isNavOpen ? "✕" : "☰"}</span>
            </button>

            <Link
              href="/"
              className="flex items-center gap-3"
              onClick={() => {
                closeNav();
                closeNotif();
              }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white shadow-sm">
                <Image
                  src="/logo/logo.png"
                  alt="지출레시피 로고"
                  width={26}
                  height={26}
                  priority
                />
              </div>

              <div className="flex flex-col leading-tight">
                <span className="text-[22px] font-black tracking-[-0.04em] text-slate-700">
                  지출<span className="text-blue-400">recipe</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  프리미엄 무료 가계부 사이트
                </span>
              </div>
            </Link>
          </div>

          {/* 가운데 메뉴 */}
          <nav className="hidden items-center gap-2 text-[13px] font-semibold text-slate-600 lg:flex">
            <Link
              href={guardedHref("/dashboard/calendar")}
              className={[
                "rounded-md px-3 py-2 transition",
                isCalendar
                  ? "bg-slate-100 text-slate-900"
                  : "hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
              onClick={closeNotif}
            >
              레시피 달력
            </Link>

            <Link
              href={guardedHref("/dashboard")}
              className={[
                "rounded-md px-3 py-2 transition",
                isDashboard || isYearly
                  ? "bg-slate-100 text-slate-900"
                  : "hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
              onClick={closeNotif}
            >
              레시피 분석
            </Link>

            <Link
              href={guardedHref("/dashboard/recurring")}
              className={[
                "rounded-md px-3 py-2 transition",
                pathname?.startsWith("/dashboard/recurring")
                  ? "bg-slate-100 text-slate-900"
                  : "hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
              onClick={closeNotif}
            >
              정기레시피
            </Link>

            <Link
              href={guardedHref("/saving")}
              className={[
                "rounded-md px-3 py-2 transition",
                pathname?.startsWith("/saving")
                  ? "bg-slate-100 text-slate-900"
                  : "hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
              onClick={closeNotif}
            >
              적금
            </Link>

            <Link
              href={guardedHref("/dashboard/gifts")}
              className={[
                "rounded-md px-3 py-2 transition",
                pathname?.startsWith("/dashboard/gifts")
                  ? "bg-slate-100 text-slate-900"
                  : "hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
              onClick={closeNotif}
            >
              경조사비
            </Link>

            <Link
              href={guardedHref("/calculators")}
              className={[
                "rounded-md px-3 py-2 transition",
                pathname?.startsWith("/calculators")
                  ? "bg-slate-100 text-slate-900"
                  : "hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
              onClick={closeNotif}
            >
              계산기
            </Link>

            <Link
              href={guardedHref("/couple-ledger")}
              className={[
                "rounded-md px-3 py-2 transition",
                isCouple
                  ? "bg-slate-100 text-slate-900"
                  : "hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
              onClick={closeNotif}
            >
              커플 장부
            </Link>
          </nav>

          {/* 우측 */}
          <div className="flex items-center gap-2">
            {!checking && isLoggedIn && (
              <div className="relative" ref={notifWrapRef}>
                <button
                  type="button"
                  onClick={toggleNotif}
                  className="relative rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  aria-label="알림"
                  aria-expanded={isNotifOpen}
                >
                  <span className="mr-1">🔔</span>
                  <span className="hidden sm:inline">알림</span>
                  {unreadCount > 0 && (
                    <span
                      className="ml-2 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[color:var(--brand-blue)] px-1.5 py-0.5 text-[10px] font-bold text-white"
                      style={{ ["--brand-blue" as any]: BRAND_blue }}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-[560px] max-w-[92vw]">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <div className="text-[12px] font-extrabold text-slate-900">
                          알림 센터
                        </div>
                        <button
                          type="button"
                          onClick={closeNotif}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          닫기
                        </button>
                      </div>
                      <div className="p-3">
                        <NotificationsPanel onClose={closeNotif} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!checking &&
              (isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  로그아웃
                </button>
              ) : (
                <Link
                  href="/sign-in"
                  className="rounded-md bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-black"
                >
                  로그인
                </Link>
              ))}
          </div>
        </div>
      </div>

      {/* 2차 프로모션 탭 */}
      <div className="border-b border-slate-200 bg-[#fafafa]">
        <div className="mx-auto hidden w-full max-w-[980px] items-center justify-center px-4 md:flex">
          {[
            { label: "지출관리 필수 계산기", active: false, dark: true },
            { label: "적금 관리", active: false, dark: true },
            { label: "사회초년생 가계부", active: true, dark: false },
            { label: "경조사비 관리", active: false, dark: true },
          ].map((item) => (
            <div
              key={item.label}
              className={[
                "flex h-12 flex-1 items-center justify-center border-x border-slate-200 text-center text-[13px] font-bold",
                item.active
                  ? "bg-[color:var(--brand-sky)] text-slate-900"
                  : item.dark
                  ? "bg-[#242424] text-white"
                  : "bg-white text-slate-700",
              ].join(" ")}
              style={{ ["--brand-sky" as any]: BRAND_SKY }}
            >
              {item.label}
            </div>
          ))}
        </div>

        {/* 모바일용 작은 보조 탭 */}
        <div className="px-4 py-2 text-center text-[11px] font-semibold text-slate-600 md:hidden">
          <span className="rounded-full bg-[#BCE6FF] px-3 py-1 text-slate-800">
            첫 기록 혜택 진행 중
          </span>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {isNavOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <nav className="mx-auto flex w-full max-w-full flex-col gap-1 px-4 py-3 text-[12px] font-medium text-slate-700">
            <Link
              href={guardedHref("/dashboard/calendar")}
              className={[
                "rounded-md px-3 py-2",
                pathname?.startsWith("/dashboard/calendar")
                  ? "bg-slate-100 text-slate-900"
                  : "hover:bg-slate-50",
              ].join(" ")}
              onClick={() => {
                closeNav();
                closeNotif();
              }}
            >
              레시피 달력
            </Link>

            <Link
              href={guardedHref("/dashboard")}
              className={[
                "rounded-md px-3 py-2",
                pathname === "/dashboard" || pathname?.startsWith("/dashboard/yearly")
                  ? "bg-slate-100 text-slate-900"
                  : "hover:bg-slate-50",
              ].join(" ")}
              onClick={() => {
                closeNav();
                closeNotif();
              }}
            >
              레시피 분석
            </Link>

            <Link
              href={guardedHref("/dashboard/recurring")}
              className={[
                "rounded-md px-3 py-2",
                pathname?.startsWith("/dashboard/recurring")
                  ? "bg-slate-100 text-slate-900"
                  : "hover:bg-slate-50",
              ].join(" ")}
              onClick={() => {
                closeNav();
                closeNotif();
              }}
            >
              정기레시피 등록
            </Link>

            <Link
              href={guardedHref("/saving")}
              className={[
                "rounded-md px-3 py-2",
                pathname?.startsWith("/saving")
                  ? "bg-slate-100 text-slate-900"
                  : "hover:bg-slate-50",
              ].join(" ")}
              onClick={() => {
                closeNav();
                closeNotif();
              }}
            >
              재료 저장(적금)
            </Link>

            <Link
              href={guardedHref("/dashboard/gifts")}
              className={[
                "rounded-md px-3 py-2",
                pathname?.startsWith("/dashboard/gifts")
                  ? "bg-slate-100 text-slate-900"
                  : "hover:bg-slate-50",
              ].join(" ")}
              onClick={() => {
                closeNav();
                closeNotif();
              }}
            >
              경조사비
            </Link>

            <Link
              href={guardedHref("/calculators")}
              className={[
                "rounded-md px-3 py-2",
                pathname?.startsWith("/calculators")
                  ? "bg-slate-100 text-slate-900"
                  : "hover:bg-slate-50",
              ].join(" ")}
              onClick={() => {
                closeNav();
                closeNotif();
              }}
            >
              계산기
            </Link>

            <Link
              href={guardedHref("/couple-ledger")}
              className={[
                "rounded-md px-3 py-2",
                pathname?.startsWith("/couple-ledger")
                  ? "bg-slate-100 text-slate-900"
                  : "hover:bg-slate-50",
              ].join(" ")}
              onClick={() => {
                closeNav();
                closeNotif();
              }}
            >
              커플 장부
            </Link>

            <div className="mt-3 rounded-xl bg-[#f8fbff] px-3 py-3 text-[12px] text-slate-600">
              <div className="font-bold text-slate-800">첫 기록 혜택</div>
              <div className="mt-1">오늘의 지출을 기록하고 달력 프리뷰를 바로 확인해보세요.</div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
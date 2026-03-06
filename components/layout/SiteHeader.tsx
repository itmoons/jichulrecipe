// src/components/layout/SiteHeader.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import NotificationsPanel from "@/components/NotificationsPanel";

const BRAND_ORANGE = "#FF8A3D";

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
    <header
      className={[
        "sticky top-0 z-40 border-b border-orange-100/70",
        "bg-gradient-to-r from-[#FFF9F2] via-[#FFF3E2] to-[#FFE7CF]/95",
        "backdrop-blur shadow-[0_2px_8px_rgba(248,153,75,0.12)]",
      ].join(" ")}
    >
      <div className="mx-auto flex w-full max-w-full items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleNav}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-orange-200 bg-white/90 text-slate-700 shadow-sm md:hidden"
            aria-label="메뉴 열기"
            aria-expanded={isNavOpen}
          >
            <span className="inline-block text-lg">{isNavOpen ? "✕" : "☰"}</span>
          </button>

          <Link
            href="/"
            className="flex items-center gap-2"
            onClick={() => {
              closeNav();
              closeNotif();
            }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-orange-100 bg-white shadow-sm">
              <Image src="/logo/logo.png" alt="지출레시피 로고" width={26} height={26} priority />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-slate-900">지출레시피</span>
              <span className="text-[11px] text-slate-500">사회초년생을 위한 예산 레스토랑</span>
            </div>
          </Link>
        </div>

        <nav className="hidden items-center gap-4 text-xs font-medium text-slate-700 md:flex">
          <Link
            href={guardedHref("/dashboard/calendar")}
            className={[
              "rounded-full px-3 py-1 transition",
              isCalendar
                ? "border border-orange-100 bg-white text-slate-900 shadow-sm"
                : "border border-transparent text-slate-700 hover:bg-white/70 hover:text-slate-900",
            ].join(" ")}
            onClick={closeNotif}
          >
            레시피 달력
          </Link>

          <Link
            href={guardedHref("/dashboard")}
            className={[
              "rounded-full px-3 py-1 transition",
              isDashboard || isYearly
                ? "border border-orange-100 bg-white text-slate-900 shadow-sm"
                : "border border-transparent text-slate-700 hover:bg-white/70 hover:text-slate-900",
            ].join(" ")}
            onClick={closeNotif}
          >
            레시피 분석
          </Link>

          <Link
            href={guardedHref("/dashboard/recurring")}
            className={[
              "rounded-full px-3 py-1 transition",
              pathname?.startsWith("/dashboard/recurring")
                ? "border border-orange-100 bg-white text-slate-900 shadow-sm"
                : "border border-transparent text-slate-700 hover:bg-white/70 hover:text-slate-900",
            ].join(" ")}
            onClick={closeNotif}
          >
            정기레시피 등록
          </Link>

          <Link
            href={guardedHref("/saving")}
            className={[
              "rounded-full px-3 py-1 transition",
              pathname?.startsWith("/saving")
                ? "border border-orange-100 bg-white text-slate-900 shadow-sm"
                : "border border-transparent text-slate-700 hover:bg-white/70 hover:text-slate-900",
            ].join(" ")}
            onClick={closeNotif}
          >
            재료 저장(적금)
          </Link>

          <Link
            href={guardedHref("/dashboard/gifts")}
            className={[
              "rounded-full px-3 py-1 transition",
              pathname?.startsWith("/dashboard/gifts")
                ? "border border-orange-100 bg-white text-slate-900 shadow-sm"
                : "border border-transparent text-slate-700 hover:bg-white/70 hover:text-slate-900",
            ].join(" ")}
            onClick={closeNotif}
          >
            경조사비
          </Link>

          <Link
            href={guardedHref("/calculators")}
            className={[
              "rounded-full px-3 py-1 transition",
              pathname?.startsWith("/calculators")
                ? "border border-orange-100 bg-white text-slate-900 shadow-sm"
                : "border border-transparent text-slate-700 hover:bg-white/70 hover:text-slate-900",
            ].join(" ")}
            onClick={closeNotif}
          >
            계산기
          </Link>

          <Link
            href={guardedHref("/couple-ledger")}
            className={[
              "rounded-full px-3 py-1 transition",
              isCouple
                ? "border border-orange-100 bg-white text-slate-900 shadow-sm"
                : "border border-transparent text-slate-700 hover:bg-white/70 hover:text-slate-900",
            ].join(" ")}
            onClick={closeNotif}
          >
            커플 장부
          </Link>

          {!checking && isLoggedIn && (
            <div className="relative" ref={notifWrapRef}>
              <button
                type="button"
                onClick={toggleNotif}
                className="relative rounded-full border border-orange-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-800 shadow-sm transition hover:bg-orange-50"
                aria-label="알림"
                aria-expanded={isNotifOpen}
              >
                <span className="mr-1">🔔</span>
                알림
                {unreadCount > 0 && (
                  <span
                    className="ml-2 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[color:var(--brand-orange)] px-1.5 py-0.5 text-[10px] font-bold text-white"
                    style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-[560px] max-w-[92vw]">
                  <div className="rounded-2xl border border-orange-100 bg-white/95 shadow-xl backdrop-blur">
                    <div className="flex items-center justify-between border-b border-orange-100 px-3 py-2">
                      <div className="text-xs font-extrabold text-slate-900">알림 센터</div>
                      <button
                        type="button"
                        onClick={closeNotif}
                        className="rounded-full border border-orange-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-orange-50"
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

        <div className="flex items-center gap-2 md:hidden">
          {!checking && isLoggedIn && (
            <div className="relative" ref={notifWrapRef}>
              <button
                type="button"
                onClick={toggleNotif}
                className="relative rounded-full border border-orange-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-sm transition hover:bg-orange-50"
                aria-label="알림"
                aria-expanded={isNotifOpen}
              >
                🔔
                {unreadCount > 0 && (
                  <span
                    className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[color:var(--brand-orange)] px-1.5 py-0.5 text-[10px] font-bold text-white"
                    style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-[92vw] max-w-[560px]">
                  <div className="rounded-2xl border border-orange-100 bg-white/95 shadow-xl backdrop-blur">
                    <div className="flex items-center justify-between border-b border-orange-100 px-3 py-2">
                      <div className="text-xs font-extrabold text-slate-900">알림 센터</div>
                      <button
                        type="button"
                        onClick={closeNotif}
                        className="rounded-full border border-orange-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-orange-50"
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

      {isNavOpen && (
        <div className="border-t border-orange-100 bg-white/95 md:hidden">
          <nav className="mx-auto flex w-full max-w-full flex-col gap-1 px-4 py-3 text-sm font-medium text-slate-700">
            <Link
              href={guardedHref("/dashboard/calendar")}
              className={[
                "rounded-md px-2 py-1.5",
                pathname?.startsWith("/dashboard/calendar")
                  ? "bg-orange-50 text-slate-900"
                  : "hover:bg-orange-50",
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
                "rounded-md px-2 py-1.5",
                pathname === "/dashboard" || pathname?.startsWith("/dashboard/yearly")
                  ? "bg-orange-50 text-slate-900"
                  : "hover:bg-orange-50",
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
                "rounded-md px-2 py-1.5",
                pathname?.startsWith("/dashboard/recurring")
                  ? "bg-orange-50 text-slate-900"
                  : "hover:bg-orange-50",
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
                "rounded-md px-2 py-1.5",
                pathname?.startsWith("/saving")
                  ? "bg-orange-50 text-slate-900"
                  : "hover:bg-orange-50",
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
                "rounded-md px-2 py-1.5",
                pathname?.startsWith("/dashboard/gifts")
                  ? "bg-orange-50 text-slate-900"
                  : "hover:bg-orange-50",
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
                "rounded-md px-2 py-1.5",
                pathname?.startsWith("/calculators")
                  ? "bg-orange-50 text-slate-900"
                  : "hover:bg-orange-50",
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
                "rounded-md px-2 py-1.5",
                pathname?.startsWith("/couple-ledger")
                  ? "bg-orange-50 text-slate-900"
                  : "hover:bg-orange-50",
              ].join(" ")}
              onClick={() => {
                closeNav();
                closeNotif();
              }}
            >
              커플 장부
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
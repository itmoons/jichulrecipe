"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import NotificationsPanel from "@/components/NotificationsPanel";

const BRAND_ORANGE = "#f97316";

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

  useEffect(() => {
    setIsNavOpen(false);
    setIsNotifOpen(false);
  }, [pathname]);

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

  const mobileMenuItems = [
    {
      href: "/dashboard/calendar",
      label: "레시피 달력",
      active: pathname?.startsWith("/dashboard/calendar"),
    },
    {
      href: "/dashboard",
      label: "레시피 분석",
      active: pathname === "/dashboard" || pathname?.startsWith("/dashboard/yearly"),
    },
    {
      href: "/saving",
      label: "저축 · 정기관리",
      active: pathname?.startsWith("/saving"),
    },
    {
      href: "/dashboard/gifts",
      label: "경조사비",
      active: pathname?.startsWith("/dashboard/gifts"),
    },
    {
      href: "/calculators",
      label: "계산기",
      active: pathname?.startsWith("/calculators"),
    },
    {
      href: "/couple-ledger",
      label: "커플 장부",
      active: pathname?.startsWith("/couple-ledger"),
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full px-3 pt-3 sm:px-6 sm:pt-4">
      {/* 1차 헤더 */}
      <div className="rounded-[22px] border border-white/80 bg-white/75 shadow-[0_12px_40px_rgba(255,138,61,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/65">
        <div className="mx-auto flex h-[64px] w-full max-w-[1380px] items-center justify-between px-3 sm:h-[72px] sm:px-6">
          {/* 좌측 */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleNav}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border border-slate-200 bg-white text-slate-700 shadow-sm md:hidden"
              aria-label="메뉴 열기"
              aria-expanded={isNavOpen}
            >
              <span className="text-[14px] leading-none">{isNavOpen ? "✕" : "☰"}</span>
            </button>

            <Link
              href="/"
              className="flex min-w-0 items-center gap-2.5 sm:gap-3"
              onClick={() => {
                closeNav();
                closeNotif();
              }}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border border-slate-200 bg-white p-1.5 shadow-sm sm:h-12 sm:w-12 sm:p-2">
                <div className="relative h-full w-full">
                  <Image
                    src="/logo/logo.png"
                    alt="지출레시피 로고"
                    fill
                    priority
                    className="object-contain"
                    sizes="(max-width: 640px) 44px, 48px"
                  />
                </div>
              </div>

              <div className="min-w-0 leading-tight">
                <div className="truncate text-[14px] font-black tracking-[-0.04em] text-slate-800 sm:text-[18px]">
                  지출<span className="text-orange-500">recipe</span>
                </div>
                <div className="hidden text-[12px] text-slate-400 sm:block">
                  프리미엄 무료 가계부 사이트
                </div>
              </div>
            </Link>
          </div>

          {/* 가운데 메뉴 - 데스크탑 */}
          <nav className="hidden items-center gap-2 text-[14px] font-semibold text-slate-600 lg:flex">
            <Link
              href={guardedHref("/dashboard/calendar")}
              className={[
                "rounded-xl px-3 py-2 transition",
                isCalendar
                  ? "bg-orange-100 text-orange-800"
                  : "hover:bg-[#ff8a3d]/10 hover:text-slate-900",
              ].join(" ")}
              onClick={closeNotif}
            >
              레시피 달력
            </Link>

            <Link
              href={guardedHref("/dashboard")}
              className={[
                "rounded-xl px-3 py-2 transition",
                isDashboard || isYearly
                  ? "bg-orange-100 text-orange-800"
                  : "hover:bg-[#ff8a3d]/10 hover:text-slate-900",
              ].join(" ")}
              onClick={closeNotif}
            >
              레시피 분석
            </Link>

            <Link
              href={guardedHref("/saving")}
              className={[
                "rounded-xl px-3 py-2 transition",
                pathname?.startsWith("/saving")
                  ? "bg-orange-100 text-orange-800"
                  : "hover:bg-[#ff8a3d]/10 hover:text-slate-900",
              ].join(" ")}
              onClick={closeNotif}
            >
              저축 · 정기관리
            </Link>

            <Link
              href={guardedHref("/dashboard/gifts")}
              className={[
                "rounded-xl px-3 py-2 transition",
                pathname?.startsWith("/dashboard/gifts")
                  ? "bg-orange-100 text-orange-800"
                  : "hover:bg-[#ff8a3d]/10 hover:text-slate-900",
              ].join(" ")}
              onClick={closeNotif}
            >
              경조사비
            </Link>

            <Link
              href={guardedHref("/calculators")}
              className={[
                "rounded-xl px-3 py-2 transition",
                pathname?.startsWith("/calculators")
                  ? "bg-orange-100 text-orange-800"
                  : "hover:bg-[#ff8a3d]/10 hover:text-slate-900",
              ].join(" ")}
              onClick={closeNotif}
            >
              계산기
            </Link>

            <Link
              href={guardedHref("/couple-ledger")}
              className={[
                "rounded-xl px-3 py-2 transition",
                isCouple
                  ? "bg-orange-100 text-orange-800"
                  : "hover:bg-[#ff8a3d]/10 hover:text-slate-900",
              ].join(" ")}
              onClick={closeNotif}
            >
              커플 장부
            </Link>
          </nav>

          {/* 우측 */}
          <div className="flex shrink-0 items-center gap-2">
            {!checking && isLoggedIn && (
              <Link
                href="/notifications"
                onClick={() => {
                  closeNav();
                  closeNotif();
                }}
                className="relative inline-flex h-7 items-center justify-center rounded-[10px] border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 md:hidden"
              >
                알림
                {unreadCount > 0 && (
                  <span
                    className="ml-1 inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: BRAND_ORANGE }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {!checking && isLoggedIn && (
              <div className="relative hidden md:block" ref={notifWrapRef}>
                <button
                  type="button"
                  onClick={toggleNotif}
                  className="relative inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  aria-label="알림"
                  aria-expanded={isNotifOpen}
                >
                  <span className="text-[14px] leading-none">🔔</span>
                  {/* <span className="ml-1">알림</span> */}

                  {unreadCount > 0 && (
                    <span
                      className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: BRAND_ORANGE }}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-[min(560px,92vw)]">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <div className="text-[14px] font-extrabold text-slate-900">
                          알림 센터
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href="/notifications"
                            onClick={closeNotif}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            전체보기
                          </Link>

                          <button
                            type="button"
                            onClick={closeNotif}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[14px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            닫기
                          </button>
                        </div>
                      </div>

                      <div className="max-h-[70vh] overflow-y-auto p-3">
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
                  className="inline-flex h-7 sm:h-10 items-center justify-center rounded-[10px] border border-slate-200 bg-white px-3 text-[10px] sm:text-[12px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  로그아웃
                </button>
              ) : (
                <Link
                  href="/sign-in"
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 text-[10px] font-semibold text-white shadow-[0_8px_18px_rgba(234,88,12,0.25)] transition hover:from-orange-600 hover:to-orange-700"
                >
                  로그인
                </Link>
              ))}
          </div>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {isNavOpen && (
        <div className="border-b border-slate-200 bg-white/95 px-3 py-3 shadow-sm md:hidden">
          <div className="mx-auto max-w-[1320px]">
            <nav className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="text-[14px] font-extrabold text-slate-900">메뉴</div>
                <div className="mt-1 text-[10px] leading-5 text-slate-500">
                  원하는 가계부 기능으로 바로 이동하세요.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3">
                {mobileMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={guardedHref(item.href)}
                    className={[
                      "rounded-xl border px-3 py-3 text-[10px] font-semibold transition",
                      item.active
                        ? "border-slate-300 bg-slate-100 text-slate-900"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                    onClick={() => {
                      closeNav();
                      closeNotif();
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {isLoggedIn && (
                <div className="border-t border-slate-100 px-3 py-3">
                  <Link
                    href="/notifications"
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-[12px] font-semibold text-slate-700"
                    onClick={() => {
                      closeNav();
                      closeNotif();
                    }}
                  >
                    <span>알림 내역 보기</span>
                    {unreadCount > 0 && (
                      <span
                        className="inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                        style={{ backgroundColor: BRAND_ORANGE }}
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                </div>
              )}

              <div className="border-t border-orange-100 bg-orange-50/70 px-4 py-3">
                <div className="text-[10px] font-bold text-slate-800">첫 기록 혜택</div>
                <div className="mt-1 text-[10px] leading-6 text-slate-600">
                  오늘의 지출을 기록하고 소비 달력을 확인해보세요.
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

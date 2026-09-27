"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import NotificationsPanel from "@/components/NotificationsPanel";

const BRAND_ORANGE = "#1f7a5b";

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
  const desktopTitle = isCalendar ? "레시피 달력" : isDashboard || isYearly ? "소비 분석" : pathname?.startsWith("/saving") ? "저축 · 정기관리" : pathname?.startsWith("/calculators") ? "돈 계산 도구" : isCouple ? "커플 장부" : "지출레시피";

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
      href: "/dashboard/memos",
      label: "오늘의 메모",
      active: pathname?.startsWith("/dashboard/memos"),
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
    <header className="sticky top-0 z-40 w-full border-b border-[#e2e5e1] bg-white ">
      {/* 1차 헤더 */}
      <div className="mx-auto flex h-[60px] w-full max-w-[1180px] items-center justify-between px-4 sm:h-[68px] sm:px-6">
          {/* 좌측 */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3 xl:hidden">
            <button
              type="button"
              onClick={toggleNav}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-700 transition hover:bg-orange-50 lg:hidden"
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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e2e5e1] bg-[#f7faf8] p-1.5 sm:h-10 sm:w-10">
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
                <div className="truncate text-[15px] font-bold tracking-[-0.04em] text-slate-800 sm:text-[17px]">
                  지출<span className="text-orange-500">recipe</span>
                </div>
                <div className="hidden text-[11px] text-slate-400 sm:block">
                  쉽고 가벼운 가계부
                </div>
              </div>
            </Link>
          </div>

          <div className="hidden xl:block">
            <p className="text-[14px] font-bold tracking-[-0.03em] text-slate-900">{desktopTitle}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">오늘의 돈 흐름을 확인하세요.</p>
          </div>

          {/* 가운데 메뉴 - 데스크탑 */}
          <nav className="hidden h-full items-center gap-5 text-[13px] font-semibold text-slate-600 lg:flex xl:hidden">
            <Link
              href={guardedHref("/dashboard/calendar")}
              className={[
                "relative flex h-full items-center transition",
                isCalendar
                  ? "text-orange-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#1f7a5b]"
                  : "hover:text-slate-900",
              ].join(" ")}
              onClick={closeNotif}
            >
              레시피 달력
            </Link>

            <Link
              href={guardedHref("/dashboard")}
              className={[
                "relative flex h-full items-center transition",
                isDashboard || isYearly
                  ? "text-orange-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#1f7a5b]"
                  : "hover:text-slate-900",
              ].join(" ")}
              onClick={closeNotif}
            >
              레시피 분석
            </Link>

            <Link
              href={guardedHref("/saving")}
              className={[
                "relative flex h-full items-center transition",
                pathname?.startsWith("/saving")
                  ? "text-orange-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#1f7a5b]"
                  : "hover:text-slate-900",
              ].join(" ")}
              onClick={closeNotif}
            >
              저축 · 정기관리
            </Link>

            <Link
              href={guardedHref("/dashboard/gifts")}
              className={[
                "relative flex h-full items-center transition",
                pathname?.startsWith("/dashboard/gifts")
                  ? "text-orange-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#1f7a5b]"
                  : "hover:text-slate-900",
              ].join(" ")}
              onClick={closeNotif}
            >
              경조사비
            </Link>

            <Link
              href={guardedHref("/calculators")}
              className={[
                "relative flex h-full items-center transition",
                pathname?.startsWith("/calculators")
                  ? "text-orange-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#1f7a5b]"
                  : "hover:text-slate-900",
              ].join(" ")}
              onClick={closeNotif}
            >
              계산기
            </Link>

            <Link
              href={guardedHref("/couple-ledger")}
              className={[
                "relative flex h-full items-center transition",
                isCouple
                  ? "text-orange-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#1f7a5b]"
                  : "hover:text-slate-900",
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
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
                aria-label="알림"
              >
                <Bell size={16} strokeWidth={1.8} aria-hidden="true" />
                {unreadCount > 0 && (
                  <span
                    className="absolute -right-2 -top-2 inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: BRAND_ORANGE }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {!checking && isLoggedIn && (
              <div className="relative hidden lg:block" ref={notifWrapRef}>
                <button
                  type="button"
                  onClick={toggleNotif}
                  className="relative inline-flex h-9 items-center justify-center rounded-lg text-[14px] font-semibold text-slate-600 transition hover:bg-orange-50"
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
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <div className="text-[14px] font-bold text-slate-900">
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
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e2e5e1] bg-white px-3 text-[11px] font-semibold text-slate-700 transition hover:bg-orange-50"
                >
                  로그아웃
                </button>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="hidden h-9 items-center justify-center rounded-lg px-3 text-[12px] font-semibold text-slate-600 transition hover:text-orange-700 sm:inline-flex"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/sign-up"
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-[#1f7a5b] px-3 text-[10px] font-bold text-white transition hover:bg-[#176247] sm:px-4 sm:text-[12px]"
                  >
                    무료로 시작
                  </Link>
                </>
              ))}
          </div>
      </div>

      {/* 모바일 메뉴 */}
      {isNavOpen && (
        <div className="border-t border-[#e2e5e1] bg-white px-4 py-4 lg:hidden">
          <div className="mx-auto max-w-[1180px]">
            <nav>
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="text-[14px] font-bold text-slate-900">메뉴</div>
                <div className="mt-1 text-[10px] leading-5 text-slate-500">
                  원하는 가계부 기능으로 바로 이동하세요.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 py-3">
                {mobileMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={guardedHref(item.href)}
                    className={[
                      "rounded-lg border px-3 py-3 text-[12px] font-semibold transition",
                      item.active
                        ? "border-orange-200 bg-orange-50 text-orange-800"
                        : "border-[#e2e5e1] bg-white text-slate-700 hover:bg-orange-50",
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

              <div className="border-t border-orange-100 bg-orange-50/70 px-3 py-3">
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

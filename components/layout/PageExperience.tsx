"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Lightbulb, X } from "lucide-react";
import { getPageJourney } from "@/lib/page-journey";
import { supabase } from "@/lib/supabaseClient";
import { LedgerModeSwitch } from "@/components/layout/LedgerModeSwitch";

const publicPage = (href: string) => href === "/" || href === "/settings" || href === "/privacy" || href === "/account-delete" || href === "/sign-in" || href === "/sign-up" || href === "/reset-password" || href === "/calculators" || href.startsWith("/calculators/");
const destinationFor = (href: string, signedIn: boolean | null) => signedIn === false && !publicPage(href)
  ? `/sign-in?redirect=${encodeURIComponent(href)}` : href;

function PageJourney({ pathname, signedIn }: { pathname: string; signedIn: boolean | null }) {
  const journey = getPageJourney(pathname);
  const [tipOpen, setTipOpen] = useState(false);
  const nextLabel = signedIn === false && !publicPage(journey.next.href)
    ? `로그인 후 ${journey.next.label}` : journey.next.label;

  useEffect(() => {
    let showTimer: number | undefined;
    let hideTimer: number | undefined;
    try {
      const key = `jichul-tip-v1:${pathname}`;
      if (!localStorage.getItem(key)) {
        showTimer = window.setTimeout(() => {
          setTipOpen(true);
          try { localStorage.setItem(key, "seen"); } catch { /* Storage is optional. */ }
        }, 1600);
        hideTimer = window.setTimeout(() => setTipOpen(false), 8600);
      }
    } catch { /* Storage may be disabled; the tip button still works. */ }
    return () => { window.clearTimeout(showTimer); window.clearTimeout(hideTimer); };
  }, [pathname]);

  return <div className="site-wayfinding relative z-30 border-b border-[#e2e5e1] bg-white">
    <nav aria-label="페이지 이동" className="mx-auto flex min-h-12 w-full max-w-[1360px] items-center gap-3 px-4 py-2 text-xs sm:px-6">
      {journey.back ? <Link href={destinationFor(journey.back.href, signedIn)} className="inline-flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-slate-600 hover:bg-[#f1f8f4] hover:text-[#176247]" aria-label={`이전 페이지: ${journey.back.label}`}><ArrowLeft size={15} className="shrink-0" /><span className="max-w-32 truncate sm:max-w-48">{journey.back.label}</span></Link> : <span className="text-slate-500">지출레시피</span>}
      <span aria-hidden="true" className="text-slate-300">/</span>
      <span aria-current="page" className="min-w-0 flex-1 truncate font-semibold text-slate-800">{journey.label}</span>
      <button type="button" onClick={() => setTipOpen(value => !value)} aria-label="이용 팁" aria-expanded={tipOpen} aria-controls="site-page-tip" className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-[#176247] hover:bg-[#f1f8f4]"><Lightbulb size={14} /><span className="hidden sm:inline">이용 팁</span></button>
      <Link href={destinationFor(journey.next.href, signedIn)} className="inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-md bg-[#eaf5ef] px-2.5 py-1.5 font-semibold text-[#176247] hover:bg-[#dcefe5]" aria-label={`다음: ${nextLabel}`}><span className="hidden max-w-40 truncate sm:inline">{nextLabel}</span><span className="sm:hidden">다음</span><ArrowRight size={15} /></Link>
    </nav>
    {tipOpen && <div id="site-page-tip" role="status" className="site-tip-enter absolute right-4 top-[calc(100%+8px)] z-40 w-[min(320px,calc(100vw-32px))] rounded-lg border border-[#c6e2d4] bg-white p-4 shadow-md sm:right-6">
      <div className="flex items-start gap-3"><span aria-hidden="true" className="text-xl">🥕</span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-[#176247]">{journey.label} 활용 팁</p><p className="mt-1 text-xs leading-5 text-slate-600">{journey.tip}</p></div><button type="button" onClick={() => setTipOpen(false)} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="팁 닫기"><X size={16} /></button></div>
    </div>}
  </div>;
}

function NextPagePrompt({ pathname, signedIn }: { pathname: string; signedIn: boolean | null }) {
  const journey = getPageJourney(pathname);
  return <nav aria-label="이어서 둘러보기" className="mx-auto w-full max-w-[1360px] px-4 pb-8 pt-6 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#d9dfd7] pt-6">
      <div><p className="text-xs font-medium text-slate-500">이어서 둘러보기</p><p className="mt-1 text-sm font-semibold text-slate-800">{journey.next.label}</p></div>
      <div className="flex items-center gap-2">
        {journey.back && <Link href={destinationFor(journey.back.href, signedIn)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9dfd7] bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-[#f6f7f5]"><ArrowLeft size={15} /> 이전</Link>}
        <Link href={destinationFor(journey.next.href, signedIn)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1f7a5b] px-4 py-2 text-xs font-semibold text-white hover:bg-[#176247]">{signedIn === false && !publicPage(journey.next.href) ? "로그인하고 이어보기" : `${journey.next.label} 보기`} <ArrowRight size={15} /></Link>
      </div>
    </div>
  </nav>;
}

export function PageExperience({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [travelling, setTravelling] = useState(false);
  const previousPath = useRef(pathname);
  const stopTimer = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) setSignedIn(!!data.session); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || !(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, location.href);
      if (destination.origin !== location.origin || (destination.pathname === location.pathname && destination.search === location.search)) return;
      setTravelling(true);
      if (stopTimer.current !== null) window.clearTimeout(stopTimer.current);
      stopTimer.current = window.setTimeout(() => setTravelling(false), 4000);
    };
    document.addEventListener("click", onClick);
    return () => { document.removeEventListener("click", onClick); if (stopTimer.current !== null) window.clearTimeout(stopTimer.current); };
  }, []);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    const enter = window.setTimeout(() => setTravelling(true), 0);
    const finish = window.setTimeout(() => setTravelling(false), 600);
    return () => { window.clearTimeout(enter); window.clearTimeout(finish); };
  }, [pathname]);

  return <>
    <div className="relative">
      <PageJourney key={`journey:${pathname}`} pathname={pathname} signedIn={signedIn} />
      {travelling && <div className="site-route-loader" role="status" aria-live="polite" aria-label="다음 페이지를 여는 중">
        <div className="site-route-progress" />
      </div>}
    </div>
    <LedgerModeSwitch />
    <div key={`page:${pathname}`} className="site-page-enter">{children}</div>
    <NextPagePrompt pathname={pathname} signedIn={signedIn} />
  </>;
}

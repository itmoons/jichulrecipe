"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const dismissKey = "jichul-app-dismissed-until";
const sessionKey = "jichul-app-promotion-seen";
export function AppPromotion() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const later = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const restoreFocus = useRef(false);

  const dismiss = () => {
    try { localStorage.setItem(dismissKey, String(Date.now() + 7 * 86400000)); } catch { /* optional storage */ }
    restoreFocus.current = !!card.current?.contains(document.activeElement);
    setOpen(false);
  };

  useEffect(() => {
    if (/^\/(sign-in|sign-up|reset-password|account-delete)/.test(pathname)) return;
    let shown = false;
    try {
      if (sessionStorage.getItem(sessionKey) || Number(localStorage.getItem(dismissKey)) > Date.now()) return;
    } catch { return; }
    const show = () => {
      if (shown || document.visibilityState !== "visible") return;
      if (document.querySelector('[aria-modal="true"]')) return;
      shown = true;
      try { sessionStorage.setItem(sessionKey, "1"); } catch { return; }
      setOpen(true);
    };
    const scroll = () => {
      const range = document.documentElement.scrollHeight - window.innerHeight;
      if (range > 0 && window.scrollY / range >= 0.4) show();
    };
    const timer = window.setTimeout(show, 7000);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => { window.clearTimeout(timer); window.removeEventListener("scroll", scroll); };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // 비모달 안내: 타이핑 중인 입력의 포커스를 빼앗지 않는다.
    if (document.activeElement === document.body) {
      later.current?.focus({ preventScroll: true });
      restoreFocus.current = true;
    }
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); dismiss(); } };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      if (restoreFocus.current && previousFocus.current?.isConnected) previousFocus.current.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;
  return <div ref={card} role="dialog" aria-modal="false" aria-labelledby="app-promotion-title" aria-describedby="app-promotion-description" className="fixed bottom-24 left-4 right-4 z-50 rounded-xl border border-[#c6e2d4] bg-white p-5 shadow-lg sm:left-auto sm:right-6 sm:w-[360px] lg:bottom-6">
    <h2 id="app-promotion-title" className="text-sm font-bold text-slate-900">지출레시피, 앱에서도 무료로 사용하세요</h2>
    <p id="app-promotion-description" className="mt-2 text-xs leading-6 text-slate-600">웹에서 기록한 소비 관리를 모바일에서도 편하게 이어가세요.</p>
    <a href="https://play.google.com/store/apps/details?id=com.jichulrecipe.app&pcampaignid=web_share" target="_blank" rel="noopener noreferrer" aria-label="Google Play에서 무료로 받기 (새 탭)" onClick={() => setOpen(false)} className="mt-4 flex min-h-11 items-center justify-center rounded-lg bg-[#1f7a5b] px-3 text-xs font-semibold text-white">Google Play에서 무료로 받기</a>
    <button ref={later} onClick={dismiss} aria-label="앱 안내 닫기, 7일 후 다시 보기" className="mt-2 min-h-10 w-full rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50">나중에</button>
  </div>;
}

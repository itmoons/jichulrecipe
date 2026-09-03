"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const featureCards = [
  { no: "01", title: "한 번의 기록", text: "수입, 지출, 저축을 오늘의 흐름에 맞게 간단히 기록하세요.", tone: "from-[#fff3e8] to-[#fff3e8]", href: "/dashboard/calendar" },
  { no: "02", title: "한눈에 보는 분석", text: "고정비와 소비 패턴을 월별·카테고리별로 바로 확인합니다.", tone: "from-[#fff3e8] to-[#fff3e8]", href: "/dashboard" },
  { no: "03", title: "목표까지 이어서", text: "적금과 생활 목표를 함께 관리하며 다음 달을 준비합니다.", tone: "from-[#fff3e8] to-[#fff3e8]", href: "/saving" },
];

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[720px] rounded-[32px] border border-white/90 bg-white/70 p-3 shadow-[0_32px_80px_rgba(36,48,60,0.20)] backdrop-blur-xl sm:p-4">
      <div className="overflow-hidden rounded-[23px] border border-[#ff8a3d]/20 bg-[#fff8f2]">
        <div className="flex h-12 items-center justify-between border-b border-[#ff8a3d]/20 bg-white/80 px-4 sm:px-5">
          <div className="flex items-center gap-2"><span className="h-6 w-6 rounded-lg bg-[#ff8a3d]" /><span className="text-xs font-bold text-slate-800">지출레시피</span></div>
          <div className="rounded-full bg-[#ff8a3d]/10 px-3 py-1 text-[10px] font-semibold text-[#ff8a3d]">9월 소비 리포트</div>
        </div>
        <div className="grid min-h-[315px] grid-cols-[92px_1fr] sm:grid-cols-[132px_1fr]">
          <aside className="hidden border-r border-[#ff8a3d]/20 bg-white/65 p-4 sm:block">
            <p className="mb-6 text-[10px] font-bold text-[#ff8a3d]">MY RECIPE</p>
            {["오늘의 기록", "지출 분석", "저축 목표", "정기 지출"].map((item, index) => <div key={item} className={`mb-3 rounded-lg px-3 py-2 text-[10px] font-semibold ${index === 0 ? "bg-[#ff8a3d]/15 text-slate-700" : "text-slate-400"}`}>{item}</div>)}
          </aside>
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] text-slate-400">9월 3일 수요일</p><h3 className="mt-1 text-lg font-bold tracking-tight text-slate-800 sm:text-xl">오늘의 소비 흐름</h3></div><button className="rounded-xl bg-[#ff8a3d] px-3 py-2 text-[10px] font-bold text-slate-900 shadow-lg shadow-[#ff8a3d]/20">+ 기록하기</button></div>
            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              {[{ label: "이번 달 지출", value: "1,248,000", color: "text-slate-800" }, { label: "남은 예산", value: "752,000", color: "text-[#ff8a3d]" }, { label: "저축", value: "400,000", color: "text-[#ff8a3d]" }].map((item) => <div key={item.label} className="rounded-2xl border border-white bg-white/85 p-3 shadow-sm"><p className="text-[9px] text-slate-400">{item.label}</p><p className={`mt-2 text-[11px] font-bold sm:text-sm ${item.color}`}>{item.value}<span className="ml-0.5 text-[8px]">원</span></p></div>)}
            </div>
            <div className="mt-4 rounded-2xl border border-[#ff8a3d]/20 bg-white/80 p-4">
              <div className="flex items-center justify-between"><p className="text-[10px] font-semibold text-slate-600">이번 주 지출 추이</p><p className="text-[10px] font-bold text-[#ff8a3d]">예산 안에서 관리 중</p></div>
              <svg viewBox="0 0 420 100" className="mt-3 h-20 w-full" aria-label="지출 추이 그래프"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#fed7aa" stopOpacity=".55"/><stop offset="1" stopColor="#fff3e8" stopOpacity=".05"/></linearGradient></defs><path d="M0 82 C30 78 32 34 65 54 S105 92 133 55 S175 21 205 49 S245 85 280 62 S319 28 347 48 S388 78 420 35 L420 100 L0 100Z" fill="url(#area)"/><path d="M0 82 C30 78 32 34 65 54 S105 92 133 55 S175 21 205 49 S245 85 280 62 S319 28 347 48 S388 78 420 35" fill="none" stroke="#ff8a3d" strokeWidth="3" strokeLinecap="round"/></svg>
              <div className="flex justify-between text-[9px] text-slate-300"><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span><span>일</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -right-4 top-16 hidden rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-xl backdrop-blur sm:block"><p className="text-[10px] text-slate-400">이번 주 절약</p><p className="mt-1 text-lg font-bold text-[#ff8a3d]">+ 86,000원</p></div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLoggedIn(Boolean(data.session)));
  }, []);

  const start = () => {
    if (loggedIn) {
      const today = new Date().toISOString().slice(0, 10);
      router.push(`/dashboard/calendar/edit?date=${today}`);
      return;
    }
    router.push("/sign-in");
  };

  return (
    <main className="landing-surface min-h-screen overflow-hidden text-slate-900">
      <section className="relative px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-24">
        <div className="pointer-events-none absolute left-[-10%] top-[-18%] h-[520px] w-[520px] rounded-full bg-[#ff8a3d]/20 blur-3xl" />
        <div className="pointer-events-none absolute right-[-10%] top-[4%] h-[420px] w-[420px] rounded-full bg-[#ff8a3d]/16 blur-3xl" />
        <div className="relative mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[0.84fr_1.16fr] lg:gap-10">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#ff8a3d]/30 bg-white/65 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-[#ff8a3d]" /> 오늘의 돈 흐름을 내 손안에</p>
            <h1 className="mt-6 text-4xl font-bold leading-[1.16] tracking-[-0.055em] text-slate-900 sm:text-6xl">기록하면 소비 흐름이 보이는<br /><span className="text-[#ff8a3d]">무료 웹 가계부.</span></h1>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-600 sm:text-lg">수입·지출 기록부터 달력, 소비 분석, 고정비·구독 점검까지 한 곳에서 관리해보세요.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><button onClick={start} className="rounded-2xl bg-[#ff8a3d] px-6 py-4 text-sm font-bold text-slate-900 shadow-[0_16px_32px_rgba(255,138,61,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_36px_rgba(255,138,61,0.32)]">{loggedIn ? "오늘의 지출 기록하기" : "무료로 시작하기"} →</button><Link href="/calculators" className="rounded-2xl border border-white/90 bg-white/65 px-6 py-4 text-center text-sm font-bold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white">돈 계산 도구 둘러보기</Link></div>
            <div className="mt-8 flex items-center gap-5 text-xs text-slate-500"><span>✓ 무료로 시작</span><span>✓ 복잡한 설정 없이</span><span>✓ 내 기록은 안전하게</span></div>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className="border-y border-white/80 bg-white/50 px-5 py-16 backdrop-blur-sm sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[1180px]"><div className="max-w-xl"><p className="text-sm font-bold text-[#ff8a3d]">HOW IT WORKS</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-900 sm:text-4xl">가계부가 복잡할 필요는 없어요.</h2><p className="mt-4 text-base leading-7 text-slate-600">매일의 작은 기록이 모여 나만의 소비 패턴이 됩니다. 필요한 순간에는 분석과 목표 관리까지 자연스럽게 이어집니다.</p></div><div className="mt-10 grid gap-4 md:grid-cols-3">{featureCards.map((card) => <Link key={card.title} href={card.href} className="group rounded-3xl border border-white/90 bg-white/70 p-6 shadow-[0_12px_32px_rgba(36,48,60,0.08)] backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(36,48,60,0.14)]"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${card.tone} text-sm font-bold text-slate-700`}>{card.no}</div><h3 className="mt-7 text-xl font-bold tracking-tight text-slate-800">{card.title}</h3><p className="mt-3 text-sm leading-6 text-slate-500">{card.text}</p><p className="mt-6 text-sm font-bold text-[#ff8a3d]">자세히 보기 →</p></Link>)}</div></div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-24"><div className="mx-auto grid max-w-[1180px] items-center gap-10 rounded-[36px] border border-white/80 bg-white/70 p-7 shadow-[0_22px_60px_rgba(36,48,60,0.10)] backdrop-blur-xl md:grid-cols-[1fr_0.9fr] md:p-12"><div><p className="text-sm font-bold text-[#ff8a3d]">YOUR MONEY, YOUR RHYTHM</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-900 sm:text-4xl">내 소비를 이해하면<br />돈 관리가 쉬워집니다.</h2><p className="mt-5 max-w-lg text-base leading-7 text-slate-600">고정비부터 작은 습관까지, 지출레시피는 숫자를 나열하지 않고 다음 행동을 쉽게 찾도록 도와줍니다.</p><Link href="/dashboard" className="mt-7 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700">소비 분석 미리 보기</Link></div><div className="rounded-[28px] bg-gradient-to-br from-[#fff3e8] via-white to-[#fff3e8] p-5"><div className="rounded-2xl bg-white/80 p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-700">9월 지출 요약</p><span className="rounded-full bg-[#ff8a3d]/15 px-2.5 py-1 text-[10px] font-bold text-slate-700">안정적</span></div><div className="mt-6 space-y-4">{[["고정비", "42%", "bg-[#ff8a3d]"], ["생활비", "31%", "bg-[#ff8a3d]"], ["저축", "27%", "bg-[#ff8a3d]"]].map(([label, value, color]) => <div key={label}><div className="mb-2 flex justify-between text-xs font-semibold text-slate-600"><span>{label}</span><span>{value}</span></div><div className="h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: value }} /></div></div>)}</div></div></div></div></section>

      <section className="px-5 pb-20 sm:px-8 sm:pb-28"><div className="mx-auto max-w-[1180px] rounded-[36px] bg-[#ff8a3d] px-7 py-12 text-center text-slate-900 shadow-[0_24px_60px_rgba(255,138,61,0.30)] sm:px-12 sm:py-16"><p className="text-sm font-semibold text-slate-900/70">오늘부터 시작하는 나만의 소비 레시피</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">숫자에 끌려가지 말고,<br />내 돈의 방향을 정하세요.</h2><button onClick={start} className="mt-8 rounded-2xl bg-white px-6 py-4 text-sm font-bold text-slate-900 shadow-lg transition hover:-translate-y-0.5">{loggedIn ? "오늘 기록하러 가기" : "지출레시피 무료로 시작하기"} →</button></div></section>
    </main>
  );
}

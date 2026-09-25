"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const featureCards = [
  {
    no: "01",
    title: "한 번의 기록",
    text: "수입, 지출, 저축을 오늘의 흐름에 맞게 간단히 기록하세요.",
    href: "/dashboard/calendar",
  },
  {
    no: "02",
    title: "한눈에 보는 분석",
    text: "고정비와 소비 패턴을 월별·카테고리별로 바로 확인합니다.",
    href: "/dashboard",
  },
  {
    no: "03",
    title: "목표까지 이어서",
    text: "적금과 생활 목표를 함께 관리하며 다음 달을 준비합니다.",
    href: "/saving",
  },
];

const faqs = [
  {
    question: "지출레시피에서는 무엇을 할 수 있나요?",
    answer:
      "수입·지출·저축을 날짜별로 기록하고, 월별 소비 흐름과 카테고리별 지출을 확인할 수 있습니다. 정기 지출과 저축 목표도 함께 관리할 수 있습니다.",
  },
  {
    question: "월 지출 목표와 저축 목표는 어떻게 관리하나요?",
    answer:
      "기록하기 화면에서 이번 달 지출 한도와 저축 목표액을 설정할 수 있습니다. 기록 중인 금액을 포함한 목표 달성률과 남은 금액을 바로 확인할 수 있습니다.",
  },
  {
    question: "금융 계산 도구는 무료로 사용할 수 있나요?",
    answer:
      "연봉 실수령액, 대출 이자, 전월세 전환, 적금·복리 등 생활 금융 계산 도구는 무료로 이용할 수 있습니다. 계산 결과는 입력값을 바탕으로 한 참고용 예상치입니다.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
};

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[720px] rounded-xl border border-[#e2e5e1] bg-white p-3 shadow-sm sm:p-4">
      <div className="overflow-hidden rounded-xl border border-[#1f7a5b]/20 bg-[#f6f7f5]">
        <div className="flex h-12 items-center justify-between border-b border-[#1f7a5b]/20 bg-white px-4 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-lg bg-[#1f7a5b]" />
            <span className="text-xs font-bold text-slate-800">지출레시피</span>
          </div>
          <div className="rounded-full bg-[#1f7a5b]/10 px-3 py-1 text-[10px] font-semibold text-[#1f7a5b]">
            9월 소비 리포트
          </div>
        </div>
        <div className="grid min-h-[315px] grid-cols-1 sm:grid-cols-[132px_1fr]">
          <aside className="hidden border-r border-[#1f7a5b]/20 bg-white p-4 sm:block">
            <p className="mb-6 text-[10px] font-bold text-[#1f7a5b]">
              MY RECIPE
            </p>
            {["오늘의 기록", "지출 분석", "저축 목표", "정기 지출"].map(
              (item, index) => (
                <div
                  key={item}
                  className={`mb-3 rounded-lg px-3 py-2 text-[10px] font-semibold ${index === 0 ? "bg-[#1f7a5b]/15 text-slate-700" : "text-slate-400"}`}
                >
                  {item}
                </div>
              ),
            )}
          </aside>
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] text-slate-400">9월 3일 수요일</p>
                <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-800 sm:text-xl">
                  오늘의 소비 흐름
                </h3>
              </div>
              <span className="rounded-lg bg-[#1f7a5b] px-3 py-2 text-[10px] font-semibold text-white">
                + 기록하기
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              {[
                {
                  label: "이번 달 지출",
                  value: "1,248,000",
                  color: "text-slate-800",
                },
                {
                  label: "남은 예산",
                  value: "752,000",
                  color: "text-[#1f7a5b]",
                },
                { label: "저축", value: "400,000", color: "text-[#1f7a5b]" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-[#e2e5e1] bg-white p-3 shadow-sm"
                >
                  <p className="text-[9px] text-slate-400">{item.label}</p>
                  <p
                    className={`mt-2 text-[11px] font-bold sm:text-sm ${item.color}`}
                  >
                    {item.value}
                    <span className="ml-0.5 text-[8px]">원</span>
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-[#1f7a5b]/20 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-slate-600">
                  이번 주 지출 추이
                </p>
                <p className="text-[10px] font-bold text-[#1f7a5b]">
                  예산 안에서 관리 중
                </p>
              </div>
              <svg
                viewBox="0 0 420 100"
                className="mt-3 h-20 w-full"
                aria-label="지출 추이 그래프"
              >
                <defs>
                  <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                    <stop stopColor="#c6e2d4" stopOpacity=".55" />
                    <stop offset="1" stopColor="#eaf5ef" stopOpacity=".05" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 82 C30 78 32 34 65 54 S105 92 133 55 S175 21 205 49 S245 85 280 62 S319 28 347 48 S388 78 420 35 L420 100 L0 100Z"
                  fill="url(#area)"
                />
                <path
                  d="M0 82 C30 78 32 34 65 54 S105 92 133 55 S175 21 205 49 S245 85 280 62 S319 28 347 48 S388 78 420 35"
                  fill="none"
                  stroke="#1f7a5b"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <div className="flex justify-between text-[9px] text-slate-300">
                <span>월</span>
                <span>화</span>
                <span>수</span>
                <span>목</span>
                <span>금</span>
                <span>토</span>
                <span>일</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setLoggedIn(Boolean(data.session)));
  }, []);

  const start = () => {
    if (loggedIn) {
      const today = new Date().toISOString().slice(0, 10);
      router.push(`/dashboard/calendar/edit?date=${today}`);
      return;
    }
    router.push("/sign-up");
  };

  return (
    <main className="landing-surface min-h-screen overflow-hidden text-slate-900">
      <section className="relative px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-24">
        <div className="relative mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[0.84fr_1.16fr] lg:gap-10">
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-wide text-[#1f7a5b]">
              매일 쓰는 가계부, 지출레시피
            </p>
            <h1 className="mt-5 text-3xl font-semibold leading-[1.3] tracking-[-0.04em] text-slate-900 sm:text-5xl">
              오늘 쓴 돈을 기록하고,
              <br />
              <span>이번 달을 살펴보세요.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-600 sm:text-lg">
              수입·지출 기록부터 달력, 소비 분석, 고정비·구독 점검까지 한 곳에서
              관리해보세요.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={start}
                className="rounded-lg bg-[#1f7a5b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#176247]"
              >
                {loggedIn ? "오늘의 지출 기록하기" : "무료로 시작하기"} →
              </button>
              <Link
                href="/calculators"
                className="rounded-lg border border-[#e2e5e1] bg-white px-6 py-4 text-center text-sm font-bold text-slate-700 shadow-sm transition hover:bg-white"
              >
                금융 계산기 둘러보기
              </Link>
            </div>
            <p className="mt-5 text-xs text-slate-500">기록부터 월별 분석까지 무료로 이용할 수 있습니다.</p>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className="border-y border-[#e2e5e1] bg-white px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[1180px]">
          <div className="max-w-xl">
            <p className="text-xs font-semibold text-[#1f7a5b]">기록 · 분석 · 저축</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-900 sm:text-4xl">
              가계부가 복잡할 필요는 없어요.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              매일의 작은 기록이 모여 나만의 소비 패턴이 됩니다. 필요한 순간에는
              분석과 목표 관리까지 자연스럽게 이어집니다.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {featureCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group border-t border-[#e2e5e1] py-6 pr-6 transition hover:border-[#1f7a5b]"
              >
                <div
                  className="text-xs font-medium tabular-nums text-slate-400"
                >
                  {card.no}
                </div>
                <h3 className="mt-7 text-xl font-bold tracking-tight text-slate-800">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {card.text}
                </p>
                <p className="mt-6 text-sm font-bold text-[#1f7a5b]">
                  자세히 보기 →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-[1180px]">
          <p className="text-xs font-semibold text-[#1f7a5b]">이용 안내</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-900">
            무료 가계부, 이렇게 시작하세요.
          </h2>
          <div className="mt-8 divide-y divide-[#e2e5e1] border-y border-[#e2e5e1]">
            {faqs.map((faq) => (
              <article
                key={faq.question}
                className="grid gap-3 py-6 md:grid-cols-[1fr_2fr] md:gap-10"
              >
                <h3 className="text-[15px] font-bold leading-6 text-slate-900">
                  {faq.question}
                </h3>
                <p className="mt-3 text-[13px] leading-6 text-slate-600">
                  {faq.answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-[1180px] items-center gap-10 rounded-xl border border-[#e2e5e1] bg-white p-7 shadow-sm md:grid-cols-[1fr_0.9fr] md:p-12">
          <div>
            <p className="text-sm font-bold text-[#1f7a5b]">
              YOUR MONEY, YOUR RHYTHM
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-900 sm:text-4xl">
              내 소비를 이해하면
              <br />돈 관리가 쉬워집니다.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
              고정비부터 작은 습관까지, 지출레시피는 숫자를 나열하지 않고 다음
              행동을 쉽게 찾도록 도와줍니다.
            </p>
            <Link
              href="/dashboard"
              className="mt-7 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              소비 분석 미리 보기
            </Link>
          </div>
          <div className="rounded-lg border border-[#e2e5e1] bg-white p-5">
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700">
                  9월 지출 요약
                </p>
                <span className="rounded-full bg-[#1f7a5b]/15 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                  안정적
                </span>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  ["고정비", "42%", "bg-[#1f7a5b]"],
                  ["생활비", "31%", "bg-[#1f7a5b]"],
                  ["저축", "27%", "bg-[#1f7a5b]"],
                ].map(([label, value, color]) => (
                  <div key={label}>
                    <div className="mb-2 flex justify-between text-xs font-semibold text-slate-600">
                      <span>{label}</span>
                      <span>{value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${color}`}
                        style={{ width: value }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="mx-auto max-w-[1180px] border-t border-[#d9dfd7] py-10 text-slate-900 sm:py-14">
          <p className="text-xs font-medium text-slate-500">
            하루 한 번, 지출을 정리하는 습관
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
            오늘의 첫 기록을 남겨보세요.
          </h2>
          <button
            onClick={start}
            className="mt-6 rounded-lg bg-[#1f7a5b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#176247]"
          >
            {loggedIn ? "오늘 기록하러 가기" : "지출레시피 무료로 시작하기"} →
          </button>
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </main>
  );
}

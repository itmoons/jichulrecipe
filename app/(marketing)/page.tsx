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
    <div className="relative mx-auto w-full max-w-[720px] overflow-hidden rounded-2xl border border-[#e7e5de] bg-white">
      <div className="bg-[#f7f9f8]">
        <div className="flex h-12 items-center justify-between border-b border-[#e7e5de] bg-white px-4 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-md bg-[#167a5b]" />
            <span className="text-xs font-semibold text-slate-800">지출레시피</span>
          </div>
          <div className="rounded-full bg-[#1f7a5b]/10 px-3 py-1 text-[10px] font-semibold text-[#1f7a5b]">
            9월 소비 리포트
          </div>
        </div>
        <div className="grid min-h-[315px] grid-cols-1 sm:grid-cols-[132px_1fr]">
          <aside className="hidden border-r border-[#e7e5de] bg-white p-4 sm:block">
            <p className="mb-6 text-[10px] font-semibold text-[#167a5b]">
              가계부
            </p>
            {["오늘의 기록", "지출 분석", "저축 목표", "정기 지출"].map(
              (item, index) => (
                <div
                  key={item}
                  className={`mb-2 border-l-2 px-3 py-2 text-[10px] font-medium ${index === 0 ? "border-[#167a5b] bg-[#f1f6f3] text-slate-800" : "border-transparent text-slate-400"}`}
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
                <h3 className="mt-1 text-lg font-bold tracking-[-0.03em] text-slate-800 sm:text-xl">
                  오늘 42,800원을 썼어요
                </h3>
              </div>
              <span className="rounded-md bg-[#167a5b] px-3 py-2 text-[10px] font-semibold text-white">
                + 기록하기
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 divide-x divide-[#e7e5de] border-y border-[#e7e5de] py-3">
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
                  className="px-3 first:pl-0 last:pr-0"
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
            <div className="mt-5 border-t border-[#e3e8e5] pt-4">
              <div className="flex items-center justify-between text-[10px]">
                <p className="font-semibold text-slate-600">오늘의 지출</p>
                <p className="font-semibold text-[#167a5b]">예산 안에서 관리 중</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-slate-500">
                <span>식비 <b className="ml-1 font-semibold text-slate-800">18,500원</b></span>
                <span>생활 <b className="ml-1 font-semibold text-slate-800">14,300원</b></span>
                <span>교통 <b className="ml-1 font-semibold text-slate-800">10,000원</b></span>
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
                  stroke="#167a5b"
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
      <section className="px-4 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-16">
        <div className="mx-auto grid max-w-[1180px] items-center gap-10 lg:grid-cols-[0.84fr_1.16fr] lg:gap-14">
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-wide text-[#167a5b]">
              매일 쓰는 가계부, 지출레시피
            </p>
            <h1 className="mt-4 text-[30px] font-bold leading-[1.32] tracking-[-0.045em] text-slate-900 sm:text-[44px]">
              가계부를 쓰는 이유는
              <br />
              <span>기록이 아니라 절약이니까.</span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-slate-600 sm:text-base">
              지출을 기록하면 소비 패턴을 분석하고, 이번 달 줄일 수 있는 생활비를 찾아드려요.
            </p>
            <div className="mt-7 flex flex-col items-start gap-4">
              <button
                onClick={start}
                className="h-12 rounded-xl bg-[#167a5b] px-5 text-sm font-semibold text-white transition hover:bg-[#0e5742]"
              >
                무료로 시작하기
              </button>
              <Link
                href={loggedIn ? "/dashboard" : "/sign-in?redirect=%2Fdashboard"}
                className="text-sm font-semibold text-[#167a5b] underline-offset-4 hover:underline"
              >
                이번 달 소비 분석 미리보기 →
              </Link>
            </div>
            <p className="mt-5 text-xs text-slate-500">기록부터 월별 분석까지 무료로 이용할 수 있습니다.</p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-[#0e5742]"><Link href="/calculators">생활비 계산 도구</Link><Link href="/couple-household">커플·부부 가계부</Link></div>
          </div>
          <div><ProductPreview /></div>
        </div>
      </section>

      <section className="border-y border-[#e3e8e5] bg-white px-4 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-[1180px]">
          <div className="max-w-xl">
            <p className="text-xs font-semibold text-[#167a5b]">기록 · 분석 · 저축</p>
            <h2 className="mt-3 text-[27px] font-bold tracking-[-0.04em] text-slate-900 sm:text-3xl">
              가계부가 복잡할 필요는 없어요.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              매일의 작은 기록이 모여 나만의 소비 패턴이 됩니다. 필요한 순간에는
              분석과 목표 관리까지 자연스럽게 이어집니다.
            </p>
          </div>
          <div className="mt-9 grid divide-y divide-[#e3e8e5] border-y border-[#e3e8e5] md:grid-cols-3 md:divide-x md:divide-y-0">
            {featureCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group py-6 md:px-6 md:first:pl-0 md:last:pr-0"
              >
                <div
                  className="text-xs font-medium tabular-nums text-slate-400"
                >
                  {card.no}
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight text-slate-800">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {card.text}
                </p>
                <p className="mt-5 text-sm font-semibold text-[#167a5b]">
                  살펴보기
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-[1180px]">
          <p className="text-xs font-semibold text-[#167a5b]">이용 안내</p>
          <h2 className="mt-3 text-[27px] font-bold tracking-[-0.04em] text-slate-900 sm:text-3xl">
            무료 가계부, 이렇게 시작하세요.
          </h2>
          <div className="mt-8 divide-y divide-[#e3e8e5] border-y border-[#e3e8e5]">
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

      <section className="border-y border-[#e3e8e5] bg-white px-4 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-[1180px] items-center gap-10 md:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold text-[#167a5b]">
              이번 달 소비 요약
            </p>
            <h2 className="mt-3 text-[27px] font-bold tracking-[-0.04em] text-slate-900 sm:text-3xl">
              내 소비를 이해하면
              <br />돈 관리가 쉬워집니다.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
              고정비부터 작은 습관까지, 지출레시피는 숫자를 나열하지 않고 다음
              행동을 쉽게 찾도록 도와줍니다.
            </p>
            <Link href="/dashboard" className="mt-6 inline-flex text-sm font-semibold text-[#167a5b] underline-offset-4 hover:underline">소비 분석으로 이동</Link>
          </div>
          <div className="border-y border-[#e3e8e5] py-5">
            <div className="py-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700">
                  9월 지출 요약
                </p>
                <span className="rounded-full bg-[#167a5b]/10 px-2.5 py-1 text-[10px] font-semibold text-[#167a5b]">
                  안정적
                </span>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  ["고정비", "42%", "bg-[#167a5b]"],
                  ["생활비", "31%", "bg-[#167a5b]"],
                  ["저축", "27%", "bg-[#167a5b]"],
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

      <section className="px-4 pb-20 sm:px-8 sm:pb-24">
        <div className="mx-auto max-w-[1180px] border-t border-[#e3e8e5] py-10 text-slate-900 sm:py-14">
          <p className="text-xs font-medium text-slate-500">
            하루 한 번, 지출을 정리하는 습관
          </p>
          <h2 className="mt-3 text-[27px] font-bold tracking-[-0.04em] sm:text-3xl">
            오늘의 첫 기록을 남겨보세요.
          </h2>
          <button
            onClick={start}
            className="mt-6 h-12 rounded-xl bg-[#167a5b] px-5 text-sm font-semibold text-white transition hover:bg-[#0e5742]"
          >
            {loggedIn ? "오늘 기록하러 가기" : "지출레시피 무료로 시작하기"}
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

// src/app/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { PageContainer } from "@/components/layout/PageContainer";

const BRAND_ORANGE = "#FF8A3D";
const BRAND_GREEN = "#4CAF50";
const BRAND_BLUE = "#5673E7";

const recipeCards = [
  {
    icon: "🥗",
    title: "필수 지출 샐러드",
    desc: "월세·관리비·통신비 같은 고정비와 식비·교통비를 한 접시에 담아 정리해줍니다.",
    tag: "기본 플레이트",
  },
  {
    icon: "🍊",
    title: "저축 비타민 플랜",
    desc: "비상자금·단기저축·투자 비율을 세후 월급에 맞춰 자동으로 배분해줍니다.",
    tag: "건강 메뉴",
  },
  {
    icon: "🍷",
    title: "여가·취미 디저트",
    desc: "OTT, 게임, 취미 활동 예산을 '마음 편히 써도 되는 선' 안에서 추천합니다.",
    tag: "즐거운 한 잔",
  },
];

export default function HomePage() {
  return (
    <PageContainer><meta name="google-site-verification" content="RAjkr0_ylgNzStxYF2VE4HNNWU9hVEaBqX6jHMaijiY" />
      {/* 배경 데코레이션 */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#FFF5E4] via-[#FFF9F0] to-[#FDFDFE]" />
      <div className="pointer-events-none fixed left-[-80px] top-[-80px] -z-10 h-56 w-56 rounded-full bg-[rgba(255,184,108,0.35)] blur-3xl" />
      <div className="pointer-events-none fixed right-[-60px] bottom-[-60px] -z-10 h-52 w-52 rounded-full bg-[rgba(86,115,231,0.25)] blur-3xl" />

      {/* 상단 히어로 */}
      <section className="mb-10 grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        {/* 텍스트 영역 */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-5"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
            {/* <span className="h-2 w-2 rounded-full bg-[color:var(--brand-orange)]" /> */}
            <span style={{ ["--brand-orange" as any]: BRAND_ORANGE }}>
              사회초년생 전용 · 지출 레스토랑
            </span>
          </div>

          <h1 className="text-3xl font-bold leading-snug text-slate-900 md:text-[2.1rem]">
            <span className="text-[color:var(--brand-orange)]" style={{ ["--brand-orange" as any]: BRAND_ORANGE }}>
              지출
            </span>
            을 레시피처럼,
            <br />
            <span className="underline decoration-[rgba(86,115,231,0.35)] decoration-4 underline-offset-4">
              10초만에 예산 계획 완성
            </span>
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-slate-700">
            당신에게 맞는 <strong>“월 예산 메뉴판”</strong>을 만들어 주는 서비스, 지출레시피
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/setup"
              className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--brand-orange)] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 hover:translate-y-0.5 hover:bg-[#f27422] transition"
              style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
            >
              🍽 기본 레시피 만들기
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-5 py-2.5 text-sm text-slate-800 shadow-sm hover:bg-white"
            >
              📋 샘플 메뉴 보기
            </Link>
          </div>

          <p className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(76,175,80,0.12)] text-[13px]">
              💡
            </span>
            <p className="max-w-xl text-sm leading-relaxed text-slate-700">
            
            복잡한 재무 용어 대신 레시피처럼 한 접시씩 따라해보세요!
          </p>
          </p>
        </motion.div>

        {/* 오른쪽: 요리/차트 일러스트 카드 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="relative"
        >
          <div className="relative mx-auto max-w-sm rounded-3xl border border-orange-100 bg-white/90 p-4 pb-5 shadow-lg shadow-orange-100">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-400">
                  TODAY&apos;S RECIPE
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  사회초년생 예산 플레이트
                </div>
                <div className="text-[11px] text-slate-500">
                  필수 · 저축 · 여가를 한 접시에 담은 균형 레시피
                </div>
              </div>
              <Image
                src="/logo/logo.png"
                alt="지출레시피 로고"
                width={56}
                height={56}
                className="drop-shadow-sm"
              />
            </div>

            {/* 도넛 차트 + 음식 아이콘 */}
            <div className="mt-4 flex items-center gap-4">
              {/* 도넛 */}
              <div className="relative h-28 w-28">
                <div className="absolute inset-0 rounded-full bg-[rgba(255,237,213,0.9)]" />
                <div className="absolute inset-2 rounded-full border-[6px] border-transparent border-t-[6px] border-t-[color:var(--green)] border-r-[6px] border-r-[color:var(--blue)] border-b-[6px] border-b-[color:var(--orange)]" 
                  style={{
                    ["--green" as any]: BRAND_GREEN,
                    ["--blue" as any]: BRAND_BLUE,
                    ["--orange" as any]: BRAND_ORANGE,
                  }}
                />
                <div className="absolute inset-6 rounded-full bg-white" />
                <div className="absolute inset-9 flex items-center justify-center text-[11px] font-semibold text-slate-600">
                  100%
                </div>
              </div>

              {/* 레전드 + 채소/과일 */}
              <div className="flex-1 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: BRAND_GREEN }}
                    />
                    <span className="text-slate-700">
                      필수 지출 <span className="text-[11px]">(월세·식비)</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">🥦 40%</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: BRAND_BLUE }}
                    />
                    <span className="text-slate-700">
                      저축·비상자금
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">🍋 30%</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: BRAND_ORANGE }}
                    />
                    <span className="text-slate-700">
                      여가·취미 & 기타
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">🍷 30%</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-dashed border-orange-100 pt-3 text-[11px] text-slate-500">
              <span>세후 3,100,000원 기준 추천 레시피</span>
              <span className="rounded-full bg-orange-50 px-2 py-1 font-medium text-orange-500">
                샘플 보기
              </span>
            </div>
          </div>
        </motion.div>
      </section>

      
      {/* 하단: 레시피 카드 3개 */}
      {/* <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">
          지출레시피의 대표 메뉴
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {recipeCards.map((item, idx) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + idx * 0.07 }}
              className="group flex flex-col justify-between rounded-2xl border border-orange-100 bg-white/90 p-4 shadow-sm hover:-translate-y-1 hover:shadow-md hover:shadow-orange-100 transition"
            >
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{item.icon}</span>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </h3>
                  </div>
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-500">
                    {item.tag}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  {item.desc}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                <span>기본 레시피에서 자동 구성</span>
                <span
                  className="text-[11px] text-[color:var(--brand-blue)] group-hover:underline"
                  style={{ ["--brand-blue" as any]: BRAND_BLUE }}
                >
                  자세히 보기 →
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </section> */}

      {/* 이용 플로우: 3단계 안내 */}
      <section className="mt-10 rounded-3xl bg-white/90 p-5 shadow-sm shadow-orange-50">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          지출레시피, 이렇게 사용하세요
        </h2>
        <p className="mb-4 text-xs text-slate-600">
          복잡한 가계부 대신, 한 번 세팅한 레시피를 기준으로 한 달을 보내보는 방식입니다.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2 rounded-2xl bg-[#FFF7EB] p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-orange-500">
                STEP 1
              </span>
              <span className="text-lg">🥕</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              기본 재료(수입·고정비) 넣기
            </h3>
            <p className="text-xs leading-relaxed text-slate-700">
              세후 월급, 월세·관리비, 대출 상환액만 입력
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl bg-[#F4FAFF] p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[color:var(--brand-blue)]"
                style={{ ["--brand-blue" as any]: BRAND_BLUE }}
              >
                STEP 2
              </span>
              <span className="text-lg">📊</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              나의 레시피 분석
            </h3>
            <p className="text-xs leading-relaxed text-slate-700">
              필수 지출·저축·여가비가 비율로 정리.
              “얼마나 차지하는가” 기준선을 먼저 잡기.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl bg-[#F6FFF5] p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[color:var(--brand-green)]"
                style={{ ["--brand-green" as any]: BRAND_GREEN }}
              >
                STEP 3
              </span>
              <span className="text-lg">🍽</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              한 달 써보고 계획대로 조정
            </h3>
            <p className="text-xs leading-relaxed text-slate-700">
              실제 한 달을 살아보며 “여가비를 조금 줄이고 저축을 더 늘릴까?”
              같은 식으로 레시피를 조정하면, 나만의 기준 잡기
            </p>
          </div>
        </div>
      </section>

      {/* 오늘의 샘플 레시피 섹션 */}
      <section className="mt-8 mb-4 rounded-3xl border border-dashed border-orange-200 bg-gradient-to-r from-[#FFF7EB] to-[#FFF9F3] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              오늘의 샘플 레시피
            </h2>
            <p className="text-xs text-slate-600">
              세후 월급 구간별로 가장 많이 선택된 지출 레시피 예시입니다.
            </p>
          </div>
          <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-orange-500 shadow-sm">
            실제 사용자 패턴을 바탕으로 한 예시
          </span>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead className="text-[11px] text-slate-500">
              <tr>
                <th className="px-2 py-1 text-left">세후 월급</th>
                <th className="px-2 py-1 text-left">필수 지출</th>
                <th className="px-2 py-1 text-left">저축·비상자금</th>
                <th className="px-2 py-1 text-left">여가·취미</th>
                <th className="px-2 py-1 text-left">기타 버퍼</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  income: "2,300,000원",
                  essential: "900,000원 (39%)",
                  saving: "500,000원 (22%)",
                  leisure: "250,000원 (11%)",
                  etc: "150,000원 (6%)",
                },
                {
                  income: "2,800,000원",
                  essential: "1,050,000원 (38%)",
                  saving: "650,000원 (23%)",
                  leisure: "300,000원 (11%)",
                  etc: "200,000원 (7%)",
                },
                {
                  income: "3,100,000원",
                  essential: "1,150,000원 (37%)",
                  saving: "750,000원 (24%)",
                  leisure: "330,000원 (11%)",
                  etc: "220,000원 (7%)",
                },
              ].map((row) => (
                <tr
                  key={row.income}
                  className="rounded-xl bg-white/90 shadow-sm shadow-orange-50"
                >
                  <td className="px-2 py-2 font-semibold text-slate-800">
                    {row.income}
                  </td>
                  <td className="px-2 py-2 text-slate-700">{row.essential}</td>
                  <td className="px-2 py-2 text-slate-700">{row.saving}</td>
                  <td className="px-2 py-2 text-slate-700">{row.leisure}</td>
                  <td className="px-2 py-2 text-slate-700">{row.etc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-slate-500">
          * 실제 설정 값은 기본 레시피에서 자유롭게 조정할 수 있으며, 위 표는
          “대략 이런 비율로 쓰면 무리가 적다”는 참고용 예시입니다.
        </p>
      </section>

    </PageContainer>
  );
}

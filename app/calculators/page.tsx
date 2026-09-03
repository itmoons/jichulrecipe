// src/app/calculators/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

type CalcItem = {
  title: string;
  slug: string;
  desc: string;
  tags: string[];
};

type Category = {
  key: string;
  title: string;
  subtitle: string;
  items: CalcItem[];
};

/** 신뢰감 있는 금융 도구 톤: 중립 배경 + 선명한 브랜드 오렌지 */
const UI = {
  // 계산기 본문도 사이트의 따뜻한 기본 배경을 그대로 사용한다.
  paperBg: "bg-transparent",
  paperDots: "",
  ink: "text-slate-900",
  inkSoft: "text-slate-600",
  blue: "#ff8a3d",
  blueDark: "#ff8a3d",
  card: "bg-white border-slate-200",
};

const categories: Category[] = [
  {
    key: "quick",
    title: "연봉·주거·자산 빠른 계산",
    subtitle: "검색량이 높은 생활 금융 계산을 한 화면에 모았습니다. 필요한 숫자만 입력하면 바로 확인할 수 있어요.",
    items: [
      {
        title: "연봉·전월세·복리 빠른 계산",
        slug: "everyday-money",
        desc: "연봉 인상률, 퇴직금, 월급 연봉 환산, 전월세, 마진율, 복리와 투자 수익률을 계산합니다.",
        tags: ["연봉", "전월세", "복리", "투자"],
      },
    ],
  },
  {
    key: "fixed",
    title: "월 고정비·구독·생활비",
    subtitle: "매달 빠져나가는 돈을 먼저 정리하면, 절감 여지가 즉시 보입니다.",
    items: [
      {
        title: "월 고정비 비율 계산기",
        slug: "fixed-cost-ratio",
        desc: "월수입 대비 고정비(주거/통신/보험/구독 등) 비율을 계산합니다.",
        tags: ["고정비", "비율", "점검"],
      },
      {
        title: "구독 총액 계산기",
        slug: "subscription-total",
        desc: "OTT/음원/클라우드/멤버십 등을 합산해 월·연 지출을 보여줍니다.",
        tags: ["구독", "합산", "누수"],
      },
      {
        title: "연간 결제 vs 월간 결제 손익 계산기",
        slug: "annual-vs-monthly",
        desc: "연간 할인 vs 월 결제의 체감 절감액을 비교합니다.",
        tags: ["구독", "연간", "비교"],
      },
      {
        title: "자동결제 누수 점검 계산기",
        slug: "autopay-leak-check",
        desc: "최근 사용빈도 입력으로 ‘안 쓰는 결제’ 누수를 추정합니다.",
        tags: ["자동결제", "누수", "점검"],
      },
      {
        title: "통신비 최적화 계산기",
        slug: "mobile-plan-optimizer",
        desc: "요금제 변경 시 예상 절감액(월/연)을 계산합니다.",
        tags: ["통신비", "절감", "요금제"],
      },
      {
        title: "관리비·공과금 계절요인 비교 계산기",
        slug: "utility-season-compare",
        desc: "전월/전년동월 대비 증감을 보고 계절요인을 분리해봅니다.",
        tags: ["공과금", "비교", "추세"],
      },
      {
        title: "식비 상한선 계산기",
        slug: "food-budget-cap",
        desc: "가구원 수/외식 빈도 기반으로 식비 상한 가이드를 만듭니다.",
        tags: ["식비", "예산", "가이드"],
      },
      {
        title: "커피/배달 지출 누적 계산기",
        slug: "coffee-delivery-accum",
        desc: "주당 횟수·평균금액을 월/연 지출로 환산합니다.",
        tags: ["배달", "커피", "누적"],
      },
      {
        title: "교통비(대중교통 vs 자차) 비교 계산기",
        slug: "transport-compare",
        desc: "월 이동거리 기반으로 교통수단 비용을 비교합니다.",
        tags: ["교통비", "비교", "생활비"],
      },
      {
        title: "소비 카테고리 과소·과다 경보 계산기",
        slug: "category-deviation-alert",
        desc: "자기 기준 대비 카테고리 편차를 시각적으로 확인합니다.",
        tags: ["카테고리", "편차", "점검"],
      },
    ],
  },
  {
    key: "budget",
    title: "예산·현금흐름·가계부 운영",
    subtitle: "‘계획 → 실행 → 점검’ 루프를 자동화하면, 꾸준함이 쉬워집니다.",
    items: [
      {
        title: "월 예산 자동 배분 계산기",
        slug: "monthly-budget-split",
        desc: "필수/선택/저축 비율을 설정해 월 예산을 자동 배분합니다.",
        tags: ["예산", "배분", "설계"],
      },
      {
        title: "가변비 안전예산 계산기",
        slug: "variable-spend-safe",
        desc: "월말 잔액 목표를 고려해 ‘이번 주 쓸 수 있는 돈’을 계산합니다.",
        tags: ["가변비", "주간예산", "안전"],
      },
      {
        title: "무지출 데이 목표 달성 계산기",
        slug: "no-spend-goal",
        desc: "목표 무지출 일수에 필요한 절감액을 역산합니다.",
        tags: ["무지출", "목표", "역산"],
      },
      {
        title: "지출 컷(절감) 목표 역산 계산기",
        slug: "cutback-goal",
        desc: "이번 달 -10% 같은 절감 목표를 카테고리별로 역산합니다.",
        tags: ["절감", "목표", "카테고리"],
      },
      {
        title: "비상금 목표 기간 계산기",
        slug: "emergency-fund-timeline",
        desc: "목표액/월저축 가능액으로 달성 기간을 계산합니다.",
        tags: ["비상금", "기간", "저축"],
      },
      {
        title: "현금흐름 캘린더 계산기",
        slug: "cashflow-calendar",
        desc: "급여일·결제일을 입력해 ‘위험 구간’을 표시합니다.",
        tags: ["현금흐름", "캘린더", "결제일"],
      },
      {
        title: "카드 결제일 변경 효과 계산기",
        slug: "card-billing-date-shift",
        desc: "결제일 변경 시 체감 유동성 변화를 추정합니다.",
        tags: ["카드", "결제일", "유동성"],
      },
      {
        title: "상여/보너스 배분 계산기",
        slug: "bonus-allocation",
        desc: "보너스를 저축·부채·소비로 ‘한 번에’ 배분하는 룰을 만듭니다.",
        tags: ["보너스", "배분", "룰"],
      },
    ],
  },
  {
    key: "debt",
    title: "부채·대출 판단 도구",
    subtitle: "추천이 아니라, ‘비교/민감도/총비용’으로 판단을 돕는 계산기입니다.",
    items: [
      {
        title: "DSR 간이 계산기",
        slug: "dsr-lite",
        desc: "연소득·원리금 기준으로 DSR을 간단히 확인합니다.",
        tags: ["DSR", "부채", "비율"],
      },
      {
        title: "대출 월 상환액 계산기",
        slug: "loan-payment",
        desc: "원리금균등/원금균등 상환을 비교해 월 부담을 봅니다.",
        tags: ["대출", "상환", "비교"],
      },
      {
        title: "금리 인상 민감도 계산기",
        slug: "rate-sensitivity",
        desc: "+0.5%p/+1.0%p 변동 시 월 이자 부담 변화를 추정합니다.",
        tags: ["금리", "민감도", "리스크"],
      },
      {
        title: "중도상환수수료 손익 계산기",
        slug: "prepayment-fee-breakeven",
        desc: "지금 갚기 vs 유지의 손익분기점을 계산합니다.",
        tags: ["중도상환", "수수료", "손익"],
      },
      {
        title: "대환 전후 총이자 비교 계산기",
        slug: "refinance-compare",
        desc: "수수료 포함, 대환 전후 총이자 차이를 비교합니다.",
        tags: ["대환", "총이자", "비교"],
      },
      {
        title: "카드 리볼빙 비용 계산기",
        slug: "revolving-cost",
        desc: "이월금액·수수료율로 누적비용을 계산합니다.",
        tags: ["리볼빙", "수수료", "누적"],
      },
      {
        title: "마이너스통장 사용비용 계산기",
        slug: "credit-line-cost",
        desc: "평균 사용잔액 기준 이자 비용을 추정합니다.",
        tags: ["마통", "이자", "비용"],
      },
    ],
  },
  {
    key: "tax",
    title: "세금·보험·연금·수수료",
    subtitle: "놓치기 쉬운 ‘정기 지출’의 비중을 점검하는 파트입니다.",
    items: [
      {
        title: "연말정산 공제 항목 체크 계산기",
        slug: "tax-deduction-check",
        desc: "간단 입력으로 공제 체크 흐름을 정리합니다.",
        tags: ["연말정산", "공제", "체크"],
      },
      {
        title: "4대보험 실수령액 계산기",
        slug: "net-pay-insurance",
        desc: "월급 기준으로 대략적인 실수령 범위를 확인합니다.",
        tags: ["실수령", "4대보험", "월급"],
      },
      {
        title: "보험료 점검 계산기",
        slug: "insurance-ratio-check",
        desc: "월소득 대비 보험료 비율을 보고 과다 여부를 점검합니다.",
        tags: ["보험", "비율", "점검"],
      },
      {
        title: "연금저축/IRP 납입 페이스 계산기",
        slug: "pension-pace",
        desc: "목표 납입액 대비 월 납입 페이스를 계산합니다.",
        tags: ["연금", "IRP", "페이스"],
      },
      {
        title: "각종 수수료 누적 계산기",
        slug: "fee-accumulator",
        desc: "배달/플랫폼/송금/환전 수수료를 월 단위로 합산합니다.",
        tags: ["수수료", "누적", "점검"],
      },
    ],
  },
];

const quickLinks = [
  { label: "연봉 실수령액", href: "/calculators/net-pay-insurance", detail: "4대보험 반영" },
  { label: "연봉 인상률", href: "/calculators/everyday-money?tool=raise", detail: "인상 후 연봉" },
  { label: "퇴직금", href: "/calculators/everyday-money?tool=severance", detail: "예상 금액" },
  { label: "월급 → 연봉", href: "/calculators/everyday-money?tool=salary", detail: "상여 포함 환산" },
  { label: "대출 이자", href: "/calculators/loan-payment", detail: "월 상환액" },
  { label: "전월세", href: "/calculators/everyday-money?tool=housing", detail: "전환율 환산" },
  { label: "할인율", href: "/calculators/annual-vs-monthly", detail: "연·월 결제 비교" },
  { label: "마진율", href: "/calculators/everyday-money?tool=margin", detail: "원가·판매가" },
  { label: "적금", href: "/calculators/emergency-fund-timeline", detail: "목표 달성 기간" },
  { label: "복리", href: "/calculators/everyday-money?tool=compound", detail: "매월 적립" },
  { label: "투자 수익률", href: "/calculators/everyday-money?tool=return", detail: "예상 평가액" },
];

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function CalculatorsHubPage() {
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");

  const allItems = useMemo(() => {
    const list: Array<CalcItem & { categoryKey: string; categoryTitle: string }> = [];
    for (const c of categories) {
      for (const it of c.items) list.push({ ...it, categoryKey: c.key, categoryTitle: c.title });
    }
    return list;
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return allItems.filter((it) => {
      const inCat = activeCat === "all" ? true : it.categoryKey === activeCat;
      if (!inCat) return false;
      if (!query) return true;
      const hay = `${it.title} ${it.desc} ${it.tags.join(" ")}`.toLowerCase();
      return hay.includes(query);
    });
  }, [allItems, q, activeCat]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const it of filtered) {
      const key = it.categoryKey;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return map;
  }, [filtered]);

  const totalCount = allItems.length;

  return (
    <div className={cn("min-h-screen", UI.paperBg)}>
      {/* 배경 질감 */}
      <div className={cn("min-h-screen", UI.paperDots)}>
        <div className="mx-auto px-0 py-8 sm:py-10">

          <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="relative overflow-hidden border-b border-orange-100 bg-gradient-to-br from-[#fffaf5] via-[#fff3e8] to-[#ffedd5] px-6 py-8 sm:px-9 sm:py-10">
              <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[28px] border-[#ff8a3d]/15" />
              <div className="absolute bottom-0 right-24 h-28 w-px bg-[#ff8a3d]/20" />
              <p className="relative text-xs font-semibold tracking-[0.14em] text-orange-600">JICUL RECIPE · MONEY TOOLS</p>
              <h1 className="relative mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">돈 계산을 가장 쉽게.</h1>
              <p className="relative mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">자주 찾는 계산을 빠르게 확인하고, 필요한 경우 더 자세한 가계부 관리로 이어갈 수 있습니다.</p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-3 lg:grid-cols-6">
              {quickLinks.map((item) => (
                <Link key={item.label} href={item.href} className="group bg-white px-4 py-4 transition hover:bg-slate-50 sm:px-5">
                  <div className="text-sm font-semibold text-slate-800 group-hover:text-orange-700">{item.label} <span className="text-orange-600">→</span></div>
                  <div className="mt-1 text-xs text-slate-500">{item.detail}</div>
                </Link>
              ))}
            </div>
          </section>

          {/* 검색 + 필터(모바일 최적) */}
          <div className="mb-8 sm:mb-10">
            <div className="grid gap-3 sm:gap-4">
              <div className={cn("rounded-2xl border p-5 sm:p-6", UI.card)}>
                <div className="flex flex-col gap-2">
                  <label className={cn("text-[12px] font-semibold", UI.ink)}>검색</label>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600">
                      ⌕
                    </span>
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="예: 구독, 고정비, DSR, 실수령…"
                      className={cn(
                        "h-11 w-full rounded-xl border bg-white pl-9 pr-3 text-[12px] outline-none",
                        "border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                      )}
                    />
                  </div>

                  <div className={cn("text-xs", UI.inkSoft)}>
                    현재 표시: <span className={cn("font-semibold", UI.ink)}>{filtered.length}</span> /{" "}
                    {totalCount}
                  </div>

                  {/* ✅ 카테고리 칩(모바일 가로 스크롤) */}
                  <div className="hidden mt-2 -mx-1 sm:flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button
                      onClick={() => setActiveCat("all")}
                      className={cn(
                        "shrink-0 rounded-lg border px-4 py-2 text-[12px] font-medium transition",
                        activeCat === "all"
                          ? "border-[#ff8a3d] bg-[#ff8a3d] text-slate-900 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:text-orange-700"
                      )}
                    >
                      전체
                    </button>

                    {categories.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => setActiveCat(c.key)}
                        className={cn(
                          "shrink-0 rounded-lg border px-4 py-2 text-[12px] font-medium transition",
                          activeCat === c.key
                            ? "border-[#ff8a3d] bg-[#ff8a3d] text-slate-900 shadow-sm"
                            : "border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:text-orange-700"
                        )}
                      >
                        {c.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 카테고리별 섹션 */}
          <div className="space-y-8 sm:space-y-10">
            {categories.map((cat, index) => {
              const items = grouped.get(cat.key) ?? [];
              if (activeCat !== "all" && activeCat !== cat.key) return null;
              if (items.length === 0) return null;

              return (
                <section
                  key={cat.key}
                  className={cn(
                    "border-b border-slate-200 pb-8 last:border-b-0",
                  )}
                >
                  {/* 섹션 헤더 */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#ff8a3d] text-xs font-bold text-slate-900">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <h2 className={cn("text-lg sm:text-xl font-semibold", UI.ink)}>
                            {cat.title}
                          </h2>
                        </div>
                        <p className={cn("mt-2 text-[12px] leading-relaxed", UI.inkSoft)}>{cat.subtitle}</p>
                      </div>

                      <div className="shrink-0">
                        <div className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {items.length}개
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 카드 그리드(모바일/태블릿 최적) */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((it) => (
                      <Link
                        key={it.slug}
                        href={`/calculators/${it.slug}`}
                        className={cn(
                          "group rounded-xl border bg-white p-5 transition",
                          "border-slate-200 hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className={cn("text-base font-semibold", UI.ink)}>
                              {it.title}
                            </div>
                            <div className={cn("mt-1 line-clamp-2 text-[12px]", UI.inkSoft)}>
                              {it.desc}
                            </div>
                          </div>

                          <div
                            className={cn(
                              "shrink-0 text-sm font-semibold text-slate-400 transition group-hover:text-orange-600"
                            )}
                          >
                            열기 →
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {it.tags.map((t) => (
                            <span
                              key={t}
                              className={cn(
                                "rounded-md px-2 py-1 text-xs font-medium",
                                "bg-slate-50 text-slate-500 border border-slate-100"
                              )}
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}

            {filtered.length === 0 && (
              <div className={cn("rounded-3xl border p-8 sm:p-10 text-center shadow-sm", UI.card)}>
                <div className={cn("text-lg font-semibold", UI.ink)}>검색 결과가 없습니다.</div>
                <div className={cn("mt-2 text-[12px]", UI.inkSoft)}>다른 키워드로 다시 시도해 보세요.</div>
              </div>
            )}
          </div>

          {/* 하단 CTA */}
          <div className={cn("mt-10 sm:mt-12 rounded-3xl border p-5 sm:p-6 shadow-sm", UI.card)}>
            <div className="flex flex-col gap-4  sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className={cn("text-lg font-semibold", UI.ink)}>다음 단계</div>
                <p className={cn("mt-1 text-[12px] leading-relaxed", UI.inkSoft)}>
                  계산 결과를 바탕으로 <span className="font-semibold text-orange-600">“고정비 점검 → 구독 정리 → 예산 배분”</span>{" "}
                  순서로 정리하면 효과가 빠릅니다.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/"
                  className={cn(
                    "rounded-2xl border bg-white px-4 py-2 text-[12px] font-semibold transition",
                    "border-[#fff7ed] text-[#7f7f7f] hover:border-[#ff8a3d]"
                  )}
                >
                  지출레시피 홈으로
                </Link>
                <Link
                  href="/calculators/subscription-total"
                  className={cn(
                    "rounded-2xl px-4 py-2 text-[12px] font-semibold text-white transition shadow-sm",
                    "bg-[#ff8a3d] text-slate-900 hover:bg-[#fb923c]"
                  )}
                >
                  구독 총액 계산부터
                </Link>
              </div>
            </div>
          </div>

          {/* 하단 여백 */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}

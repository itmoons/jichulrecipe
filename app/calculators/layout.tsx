// src/app/calculators/layout.tsx
"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/** 레시피북 톤(연노랑 + 주황) */
const UI = {
  pageBg: "bg-[#ffffff]",
  paperDots:
    "bg-[radial-gradient(circle,rgba(251,146,60,0.12)_1px,transparent_1px)] bg-[size:16px_16px]",
  ink: "text-[#3B2F1E]",
  inkSoft: "text-[#7f7f7f]",
  line: "border-[#e8f8ff]",
  card: "bg-[#f2fbff] border-[#e8f8ff]",
  accent: "text-[#ffffff]",
  accentBg: "bg-[#5bbbf3]",
};

type CalcLink = { title: string; slug: string; group: "A" | "B" | "C" | "D" };

const CALCS: CalcLink[] = [
  // A (1~10)
  { group: "A", title: "월 고정비 비율 계산기", slug: "fixed-cost-ratio" },
  { group: "A", title: "구독 총액 계산기", slug: "subscription-total" },
  { group: "A", title: "연간 결제 vs 월간 결제 손익 계산기", slug: "annual-vs-monthly" },
  { group: "A", title: "자동결제 누수 점검 계산기", slug: "autopay-leak-check" },
  { group: "A", title: "통신비 최적화 계산기", slug: "mobile-plan-optimizer" },
  { group: "A", title: "관리비·공과금 계절요인 비교 계산기", slug: "utility-season-compare" },
  { group: "A", title: "식비 상한선 계산기", slug: "food-budget-cap" },
  { group: "A", title: "커피/배달 지출 누적 계산기", slug: "coffee-delivery-accum" },
  { group: "A", title: "교통비 비교 계산기", slug: "transport-compare" },
  { group: "A", title: "소비 카테고리 과소·과다 경보 계산기", slug: "category-deviation-alert" },

  // B (11~18)
  { group: "B", title: "월 예산 자동 배분 계산기", slug: "monthly-budget-split" },
  { group: "B", title: "가변비 안전예산 계산기", slug: "variable-spend-safe" },
  { group: "B", title: "무지출 데이 목표 달성 계산기", slug: "no-spend-goal" },
  { group: "B", title: "지출 컷 목표 역산 계산기", slug: "cutback-goal" },
  { group: "B", title: "비상금 목표 기간 계산기", slug: "emergency-fund-timeline" },
  { group: "B", title: "현금흐름 캘린더 계산기", slug: "cashflow-calendar" },
  { group: "B", title: "카드 결제일 변경 효과 계산기", slug: "card-billing-date-shift" },
  { group: "B", title: "상여/보너스 배분 계산기", slug: "bonus-allocation" },

  // C (19~25)
  { group: "C", title: "DSR 간이 계산기", slug: "dsr-lite" },
  { group: "C", title: "대출 월 상환액 계산기", slug: "loan-payment" },
  { group: "C", title: "금리 인상 민감도 계산기", slug: "rate-sensitivity" },
  { group: "C", title: "중도상환수수료 손익 계산기", slug: "prepayment-fee-breakeven" },
  { group: "C", title: "대환 전후 총이자 비교 계산기", slug: "refinance-compare" },
  { group: "C", title: "카드 리볼빙 비용 계산기", slug: "revolving-cost" },
  { group: "C", title: "마이너스통장 사용비용 계산기", slug: "credit-line-cost" },

  // D (26~30)
  { group: "D", title: "연말정산 공제 항목 체크 계산기", slug: "tax-deduction-check" },
  { group: "D", title: "4대보험 실수령액 계산기", slug: "net-pay-insurance" },
  { group: "D", title: "보험료 점검 계산기", slug: "insurance-ratio-check" },
  { group: "D", title: "연금저축/IRP 납입 페이스 계산기", slug: "pension-pace" },
  { group: "D", title: "각종 수수료 누적 계산기", slug: "fee-accumulator" },
];

const GROUP_META: Record<CalcLink["group"], { title: string; subtitle: string }> = {
  A: { title: "월 고정비·구독·생활비", subtitle: "매달 새는 돈을 먼저 잡는 파트" },
  B: { title: "예산·현금흐름·가계부 운영", subtitle: "계획 → 실행 → 점검 루프" },
  C: { title: "부채·대출 판단 프레임", subtitle: "추천이 아니라 총비용·민감도" },
  D: { title: "세금·보험·연금·수수료", subtitle: "정기지출·공제·수수료 점검" },
};

function getSlugFromPath(pathname: string) {
  // /calculators/[slug] 또는 /calculators
  const parts = pathname.split("?")[0].split("#")[0].split("/").filter(Boolean);
  const idx = parts.indexOf("calculators");
  if (idx >= 0 && parts.length > idx + 1) return parts[idx + 1];
  return null;
}

function utmUrl(base: string, params: Record<string, string>) {
  const u = new URL(base);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
}

export default function CalculatorsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const slug = useMemo(() => getSlugFromPath(pathname), [pathname]);

  const active = useMemo(() => {
    if (!slug) return null;
    return CALCS.find((c) => c.slug === slug) ?? null;
  }, [slug]);

  const group = active?.group ?? "A";
  const groupMeta = GROUP_META[group];

  const related = useMemo(() => {
    // 같은 그룹에서 현재 페이지 제외, 4개 추천
    const pool = CALCS.filter((c) => c.group === group && c.slug !== slug);
    return pool.slice(0, 4);
  }, [group, slug]);

  const jiculHome = useMemo(() => {
    // “각 페이지별” 유입 트래킹: source/medium/campaign + calculator slug
    return utmUrl("https://www.jiculrecipe.com/", {
      utm_source: "calculators",
      utm_medium: "internal_cta",
      utm_campaign: "recipebook_hub",
      utm_content: slug ?? "hub",
    });
  }, [slug]);

  const jiculChecklist = useMemo(() => {
    // 홈으로 보내되, intent를 분리(체크리스트/가계부 시작)
    return utmUrl("https://www.jiculrecipe.com/", {
      utm_source: "calculators",
      utm_medium: "sticky_cta",
      utm_campaign: "next_step_checklist",
      utm_content: slug ?? "hub",
    });
  }, [slug]);

  return (
    <div className={cn("min-h-screen break-keep", UI.pageBg)}>
      <div className={cn("min-h-screen", UI.paperDots)}>
        {/* Top bar */}
        <header className={cn("sticky top-0 z-30 border-b bg-white/80 backdrop-blur", UI.line)}>
          <div className="mx-auto flex w-[1240px] items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-[#5bbbf3]" />
                <Link
                  href="/calculators"
                  className={cn(
                    "text-[12px] font-semibold hover:underline whitespace-nowrap",
                    UI.ink
                  )}
                >
                  지출레시피 계산기
                </Link>
                {active && (
                  <>
                    <span className="text-xs text-[#C8B79A]">/</span>
                    <span className={cn("text-[12px] font-semibold truncate", UI.ink)}>
                      {active.title}
                    </span>
                  </>
                )}
              </div>
              <div className={cn("mt-0.5 text-xs text-[#7f7f7f] truncate", UI.inkSoft)}>
                {groupMeta.title} · {groupMeta.subtitle}
              </div>
            </div>

            {/* 상단 CTA */}
            <a
              href={jiculHome}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "shrink-0 rounded-[10px] mt-[10px] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm",
                "whitespace-nowrap",
                UI.accentBg
              )}
            >
              지출레시피로 점검하기 →
            </a>
          </div>
        </header>

        {/* Main grid */}
        <div className="mx-auto grid max-w-[1200px]gap-4 px-4  lg:gap-6">
          {/* Content */}
          <main className={cn("min-w-0", "pb-24 lg:pb-6")}>{children}</main>

        </div>

        {/* Mobile sticky CTA */}
        <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
          <div className="mx-auto max-w-[1200px]px-4 pb-3">
            <div className={cn("rounded-2xl border bg-white/95 backdrop-blur shadow-lg", UI.line)}>
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className={cn("text-xs font-semibold", UI.inkSoft)}>계산 결과 → 실행으로</div>
                  <div className={cn("text-[12px] font-extrabold truncate", UI.ink)}>
                    지출레시피 점검으로 이어가기
                  </div>
                </div>

                <a
                  href={jiculChecklist}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "shrink-0 rounded-xl px-3 py-2 text-[12px] font-semibold text-white",
                    "whitespace-nowrap",
                    UI.accentBg
                  )}
                >
                  점검하기 →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-[#e8f8ff] bg-white">
          <div className="mx-auto w-[1240px] px-4 py-6">
            <div className={cn("text-[12px] font-semibold", UI.ink)}>지출레시피</div>
            <p className={cn("mt-1 text-xs leading-relaxed", UI.inkSoft)}>
              계산기는 의사결정을 돕는 도구입니다. 실제 결제·계약·수수료는 각 서비스/금융기관 기준을 확인하세요.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={jiculHome}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-[#e8f8ff] bg-[#f2fbff] px-3 py-1.5 text-xs font-semibold text-[#7f7f7f] hover:border-[#5bbbf3] whitespace-nowrap"
              >
                https://www.jiculrecipe.com/ 방문 →
              </a>
              <Link
                href="/calculators"
                className="rounded-full border border-[#e8f8ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#7f7f7f] hover:border-[#5bbbf3] whitespace-nowrap"
              >
                계산기 목록으로
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

import type { Metadata } from "next";

export const SITE_URL = "https://www.jiculrecipe.com";

type CalculatorSeo = { name: string; description: string; keywords: string[] };

const names: Record<string, string> = {
  "fixed-cost-ratio": "고정비 비율 계산기", "subscription-total": "구독료 계산기", "annual-vs-monthly": "연간 결제와 월간 결제 비교 계산기", "autopay-leak-check": "자동결제 누수 점검 계산기", "mobile-plan-optimizer": "통신비 비교 계산기", "utility-season-compare": "관리비·공과금 비교 계산기", "food-budget-cap": "식비 예산 계산기", "coffee-delivery-accum": "커피·배달 지출 계산기", "transport-compare": "교통비 비교 계산기", "category-deviation-alert": "소비 카테고리 점검 계산기",
  "monthly-budget-split": "월 예산 배분 계산기", "variable-spend-safe": "가변비 안전예산 계산기", "no-spend-goal": "무지출 목표 계산기", "cutback-goal": "지출 절감 목표 계산기", "emergency-fund-timeline": "비상금 목표 기간 계산기", "cashflow-calendar": "현금흐름 캘린더 계산기", "card-billing-date-shift": "카드 결제일 변경 계산기", "bonus-allocation": "상여금 배분 계산기",
  "dsr-lite": "DSR 계산기", "loan-payment": "대출 월 상환액 계산기", "rate-sensitivity": "금리 인상 영향 계산기", "prepayment-fee-breakeven": "중도상환수수료 계산기", "refinance-compare": "대환대출 비교 계산기", "revolving-cost": "카드 리볼빙 비용 계산기", "credit-line-cost": "마이너스통장 이자 계산기",
  "tax-deduction-check": "연말정산 공제 점검 계산기", "net-pay-insurance": "월급 실수령액 계산기", "insurance-ratio-check": "보험료 비율 계산기", "pension-pace": "연금저축 목표 계산기", "fee-accumulator": "수수료 누적 계산기",
  "everyday-money": "생활 금융 계산기",
};

export const calculatorSeo: Record<string, CalculatorSeo> = Object.fromEntries(
  Object.entries(names).map(([slug, name]) => [slug, {
    name,
    description: `${name}로 필요한 금액과 비율을 빠르게 확인해 보세요. 입력한 값에 따른 예상 결과를 참고용으로 제공합니다.`,
    keywords: [name, "금융 계산기", "지출레시피"],
  }]),
);

export const calculatorSlugs = Object.keys(calculatorSeo);

export function getCalculatorMetadata(slug: string): Metadata {
  const item = calculatorSeo[slug];
  const url = `${SITE_URL}/calculators/${slug}`;
  return {
    title: { absolute: `${item.name} | 계산 방법과 결과 확인 - 지출레시피` },
    description: item.description,
    keywords: item.keywords,
    alternates: { canonical: url },
    openGraph: { title: `${item.name} - 지출레시피`, description: item.description, url, siteName: "지출레시피", locale: "ko_KR", type: "website" },
    twitter: { card: "summary_large_image", title: `${item.name} - 지출레시피`, description: item.description },
  };
}

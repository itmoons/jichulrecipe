import type { Metadata } from "next";

export const SITE_URL = "https://www.jiculrecipe.com";

type CalculatorSeo = { name: string; description: string; keywords: string[] };

// 검색 결과와 AI 요약에 쓰이는 설명은 실제 계산기 기능을 평이하게 설명한다.
export const calculatorGuides: Record<string, { question: string; approach: string; caution: string }> = {
  "fixed-cost-ratio": { question: "월급에서 고정비가 차지하는 비율은 얼마일까요?", approach: "월 소득과 주거비·통신비·보험료·구독료를 입력하면 고정비 합계와 소득 대비 비율을 계산합니다.", caution: "비율의 적정선은 소득 안정성, 부양가족, 부채에 따라 달라집니다." },
  "subscription-total": { question: "구독 서비스를 1년 유지하면 얼마를 쓰게 될까요?", approach: "월·연 단위 구독료를 합산해 월평균 부담과 연간 지출을 비교합니다.", caution: "무료 체험 종료일과 할인 기간은 별도로 확인하세요." },
  "annual-vs-monthly": { question: "연간 결제와 월간 결제 중 어느 쪽이 저렴할까요?", approach: "각 요금제의 결제액을 같은 사용 기간으로 환산해 차액을 비교합니다.", caution: "중도 해지와 환불 조건도 함께 확인해야 합니다." },
  "autopay-leak-check": { question: "잊고 있던 자동결제는 1년에 얼마일까요?", approach: "반복 결제 항목을 모아 월간·연간 지출 규모를 살펴봅니다.", caution: "계좌와 카드 명세서의 실제 결제 내역을 대조하세요." },
  "mobile-plan-optimizer": { question: "통신 요금제를 바꾸면 얼마나 절약할 수 있을까요?", approach: "현재 요금과 대안 요금을 비교해 월·연간 차이를 계산합니다.", caution: "약정 위약금, 결합 할인, 데이터 사용량은 별도로 점검하세요." },
  "utility-season-compare": { question: "계절에 따라 공과금이 얼마나 달라질까요?", approach: "기간별 관리비와 공과금을 비교해 증감액을 확인합니다.", caution: "계절 외에 사용량과 요금제 변경도 영향을 줄 수 있습니다." },
  "food-budget-cap": { question: "이번 달 식비를 하루에 얼마까지 쓸 수 있을까요?", approach: "월 식비 예산과 이미 쓴 금액을 바탕으로 남은 기간의 사용 가능액을 계산합니다.", caution: "외식과 장보기 비용을 같은 기준으로 입력하세요." },
  "coffee-delivery-accum": { question: "커피와 배달 지출이 한 달에 얼마나 쌓일까요?", approach: "반복되는 소액 지출의 횟수와 금액을 모아 월·연간 규모를 보여줍니다.", caution: "실제 주문 횟수는 결제 내역으로 확인하세요." },
  "transport-compare": { question: "교통수단별 월 지출은 어떻게 다를까요?", approach: "이용 빈도와 단가를 기준으로 교통비를 비교합니다.", caution: "주차비, 보험료 등 빠진 비용이 있는지 살펴보세요." },
  "category-deviation-alert": { question: "어떤 소비 항목이 예산에서 벗어났을까요?", approach: "카테고리별 목표와 실제 지출을 비교해 차이를 확인합니다.", caution: "한 달의 일시적인 지출만으로 소비 습관을 단정하지 마세요." },
  "monthly-budget-split": { question: "월 소득을 생활비와 저축에 어떻게 나눌까요?", approach: "월 소득과 지출 목표를 입력해 항목별 예산 배분안을 살펴봅니다.", caution: "예상치이므로 필수 지출과 실제 결제일에 맞춰 조정하세요." },
  "variable-spend-safe": { question: "고정비를 낸 뒤 변동비로 얼마를 쓸 수 있을까요?", approach: "월 소득에서 고정 지출과 목표 금액을 고려해 변동비 여력을 계산합니다.", caution: "비정기 지출을 빠뜨리면 사용 가능액이 과대평가됩니다." },
  "no-spend-goal": { question: "무지출 목표를 지키면 얼마를 아낄 수 있을까요?", approach: "무지출 날짜와 평소 지출을 비교해 절감 가능액을 추정합니다.", caution: "필수 지출을 억지로 미루는 방식은 피하세요." },
  "cutback-goal": { question: "목표 금액을 모으려면 지출을 얼마나 줄여야 할까요?", approach: "목표와 기간을 기준으로 필요한 월별 절감액을 역산합니다.", caution: "고정비보다 조정 가능한 항목부터 검토하세요." },
  "emergency-fund-timeline": { question: "비상금을 목표만큼 모으는 데 몇 달이 걸릴까요?", approach: "현재 금액과 월 저축액을 바탕으로 목표 도달 기간을 계산합니다.", caution: "이자와 예상 밖의 인출은 실제 기간을 바꿀 수 있습니다." },
  "cashflow-calendar": { question: "월중 언제 잔액이 부족해질 수 있을까요?", approach: "수입일과 결제일을 달력에 놓고 날짜별 현금흐름을 확인합니다.", caution: "결제일과 입금일은 실제 명세서 기준으로 입력하세요." },
  "card-billing-date-shift": { question: "카드 결제일을 바꾸면 현금흐름이 나아질까요?", approach: "급여일과 결제일의 간격을 비교해 자금 여유를 살펴봅니다.", caution: "카드사별 이용 기간과 결제일 변경 규칙은 확인이 필요합니다." },
  "bonus-allocation": { question: "상여금을 어떻게 나누어 사용할까요?", approach: "일시 수입을 저축·상환·지출 계획에 배분해 금액을 계산합니다.", caution: "세후 실수령액을 기준으로 계획하세요." },
  "dsr-lite": { question: "소득에 비해 대출 상환 부담은 어느 정도일까요?", approach: "연 소득과 연간 원리금 상환액으로 간이 DSR을 확인합니다.", caution: "실제 대출 심사 DSR은 금융기관의 산정 기준과 다를 수 있습니다." },
  "loan-payment": { question: "대출을 받으면 매달 얼마를 갚아야 할까요?", approach: "원금, 금리, 기간, 상환 방식을 입력해 월 상환액과 총이자를 비교합니다.", caution: "실제 금리와 수수료는 계약 조건을 확인하세요." },
  "rate-sensitivity": { question: "금리가 오르면 이자 부담은 얼마나 늘까요?", approach: "현재 금리와 변경 금리를 비교해 상환 부담 변화를 추정합니다.", caution: "변동금리 적용 주기와 우대금리 조건은 별도 확인이 필요합니다." },
  "prepayment-fee-breakeven": { question: "대출을 미리 갚아도 수수료보다 이득일까요?", approach: "중도상환수수료와 예상 이자 절감액을 나란히 비교합니다.", caution: "상환 시점과 금융기관의 수수료 산식에 따라 결과가 달라집니다." },
  "refinance-compare": { question: "대환대출 후 총비용이 줄어들까요?", approach: "기존 대출과 새 대출의 이자 및 전환 비용을 비교합니다.", caution: "중도상환수수료와 새 대출의 부대비용을 빠뜨리지 마세요." },
  "revolving-cost": { question: "카드 리볼빙을 이용하면 비용이 얼마나 늘까요?", approach: "이월 금액과 수수료율을 바탕으로 예상 비용을 확인합니다.", caution: "실제 청구액과 상환 일정은 카드사 약관을 확인하세요." },
  "credit-line-cost": { question: "마이너스통장을 사용한 기간의 이자는 얼마일까요?", approach: "사용 금액, 금리, 기간을 입력해 예상 이자 비용을 계산합니다.", caution: "일별 잔액과 실제 이자 계산 방식에 따라 차이가 납니다." },
  "tax-deduction-check": { question: "연말정산 공제 항목을 빠뜨리지 않았을까요?", approach: "기본 항목을 체크하며 준비할 증빙과 확인 사항을 정리합니다.", caution: "공제 요건과 한도는 해당 과세연도 공식 안내로 재확인하세요." },
  "net-pay-insurance": { question: "월급에서 4대보험료를 빼면 얼마가 남을까요?", approach: "급여와 공제 항목을 입력해 예상 실수령액을 살펴봅니다.", caution: "실제 급여명세서의 세금·수당·보험료와 차이가 있을 수 있습니다." },
  "insurance-ratio-check": { question: "보험료가 월 소득에서 얼마나 차지할까요?", approach: "보험료를 합산해 소득 대비 비율을 확인합니다.", caution: "보장 내용과 중복 가입 여부도 함께 검토하세요." },
  "pension-pace": { question: "연금저축·IRP 납입 목표를 맞추려면 얼마씩 넣어야 할까요?", approach: "현재 납입액과 남은 기간으로 월별 필요한 납입액을 계산합니다.", caution: "세액공제 요건과 한도는 최신 공식 안내를 확인하세요." },
  "fee-accumulator": { question: "작은 수수료가 오래 쌓이면 얼마일까요?", approach: "건별 수수료와 반복 횟수를 이용해 누적 비용을 계산합니다.", caution: "수수료 면제·우대 조건이 있는지 확인하세요." },
  "everyday-money": { question: "생활 속 돈 계산을 어디서 시작할까요?", approach: "지출, 예산, 대출 등 상황에 맞는 계산 도구를 골라보세요.", caution: "결과는 입력값을 바탕으로 한 참고용입니다." },
  "savings-interest": { question: "매월 적금하면 만기에 이자를 얼마나 받을까요?", approach: "월 납입액, 연 이율, 납입 개월 수로 원금과 세전 단리 이자를 계산합니다.", caution: "매월 초 납입을 가정한 추정치이며 실제 상품의 납입일·세금·우대 조건과 다를 수 있습니다." },
  "discount-rate": { question: "이 가격은 실제로 몇 퍼센트 할인된 걸까요?", approach: "정가와 할인 가격의 차액을 정가로 나누어 할인율을 계산합니다.", caution: "배송비와 추가 쿠폰은 포함하지 않습니다." },
  "hourly-wage-converter": { question: "시급을 월급이나 연봉으로 바꾸면 얼마일까요?", approach: "시급, 하루 근무시간, 주당 근무일수로 주급·월급·연봉의 세전 금액을 환산합니다.", caution: "주휴수당·연장수당·세금·4대보험을 제외한 단순 환산입니다." },
};

const names: Record<string, string> = {
  "fixed-cost-ratio": "고정비 비율 계산기", "subscription-total": "구독료 계산기", "annual-vs-monthly": "연간 결제와 월간 결제 비교 계산기", "autopay-leak-check": "자동결제 누수 점검 계산기", "mobile-plan-optimizer": "통신비 비교 계산기", "utility-season-compare": "관리비·공과금 비교 계산기", "food-budget-cap": "식비 예산 계산기", "coffee-delivery-accum": "커피·배달 지출 계산기", "transport-compare": "교통비 비교 계산기", "category-deviation-alert": "소비 카테고리 점검 계산기",
  "monthly-budget-split": "월 예산 배분 계산기", "variable-spend-safe": "가변비 안전예산 계산기", "no-spend-goal": "무지출 목표 계산기", "cutback-goal": "지출 절감 목표 계산기", "emergency-fund-timeline": "비상금 목표 기간 계산기", "cashflow-calendar": "현금흐름 캘린더 계산기", "card-billing-date-shift": "카드 결제일 변경 계산기", "bonus-allocation": "상여금 배분 계산기",
  "dsr-lite": "DSR 계산기", "loan-payment": "대출 월 상환액 계산기", "rate-sensitivity": "금리 인상 영향 계산기", "prepayment-fee-breakeven": "중도상환수수료 계산기", "refinance-compare": "대환대출 비교 계산기", "revolving-cost": "카드 리볼빙 비용 계산기", "credit-line-cost": "마이너스통장 이자 계산기",
  "tax-deduction-check": "연말정산 공제 점검 계산기", "net-pay-insurance": "월급 실수령액 계산기", "insurance-ratio-check": "보험료 비율 계산기", "pension-pace": "연금저축 목표 계산기", "fee-accumulator": "수수료 누적 계산기",
  "everyday-money": "생활 금융 계산기",
  "savings-interest": "적금 이자 계산기", "discount-rate": "할인율 계산기", "hourly-wage-converter": "시급·월급 환산 계산기",
};

export const calculatorSeo: Record<string, CalculatorSeo> = Object.fromEntries(
  Object.entries(names).map(([slug, name]) => [slug, {
    name,
    description: `${calculatorGuides[slug].question} ${calculatorGuides[slug].approach}`,
    keywords: [name, "금융 계산기", "지출레시피"],
  }]),
);

export const calculatorSlugs = Object.keys(calculatorSeo);

export function getRelatedCalculatorSlugs(slug: string): string[] {
  if (slug === "everyday-money") return ["fixed-cost-ratio", "monthly-budget-split", "loan-payment"];
  if (slug === "savings-interest") return ["emergency-fund-timeline", "pension-pace", "monthly-budget-split"];
  if (slug === "discount-rate") return ["annual-vs-monthly", "subscription-total", "cutback-goal"];
  if (slug === "hourly-wage-converter") return ["net-pay-insurance", "monthly-budget-split", "fixed-cost-ratio"];
  const index = calculatorSlugs.indexOf(slug);
  const group = index < 10 ? calculatorSlugs.slice(0, 10)
    : index < 18 ? calculatorSlugs.slice(10, 18)
      : index < 25 ? calculatorSlugs.slice(18, 25) : calculatorSlugs.slice(25, 30);
  const position = group.indexOf(slug);
  return [1, 2, 3].map(offset => group[(position + offset) % group.length]).filter(value => value !== slug);
}

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

import { calculatorSeo, calculatorSlugs } from "@/lib/calculators/seo";

type Stop = { href: string; label: string; tip: string };

const stops: Stop[] = [
  { href: "/", label: "홈", tip: "오늘의 기록부터 시작하고, 달력에서 한 달 흐름을 확인해 보세요." },
  { href: "/dashboard/calendar", label: "레시피 달력", tip: "날짜를 선택하면 그날의 수입·지출·저축을 기록할 수 있어요." },
  { href: "/dashboard", label: "소비 분석", tip: "월별 지출 변화와 많이 쓴 구분을 살펴보세요." },
  { href: "/dashboard/memos", label: "오늘의 메모", tip: "날짜별 메모를 모아보고 수정하거나 삭제할 수 있어요." },
  { href: "/dashboard/gifts", label: "경조사비", tip: "경조사 내역을 정리하고 지출 계획을 세워보세요." },
  { href: "/saving", label: "저축 · 정기관리", tip: "저축 목표와 반복해서 나가는 돈을 함께 관리해 보세요." },
  { href: "/calculators", label: "돈 계산 도구", tip: "관심 있는 금융 계산기를 골라 조건을 바꿔보세요." },
  { href: "/couple-ledger", label: "커플 장부", tip: "함께 쓰는 돈을 기록하고 달력과 분석에서 확인할 수 있어요." },
  { href: "/settings", label: "설정", tip: "계정, 알림, 커플 장부 관련 메뉴를 한곳에서 찾을 수 있어요." },
];

const detail: Record<string, { label: string; back: string; next: string; tip: string }> = {
  "/couple-ledger": { label: "커플 장부", back: "/calculators", next: "/couple-ledger/entry", tip: "함께 쓰는 돈을 먼저 기록해 보세요. 달력과 분석에서 이어서 확인할 수 있어요." },
  "/dashboard/calendar/edit": { label: "오늘의 지출 기록", back: "/dashboard/calendar", next: "/dashboard/memos", tip: "금액을 입력하면 자동 저장됩니다. 오늘의 메모도 화면 아래에서 추가할 수 있어요." },
  "/dashboard/yearly": { label: "연간 소비 분석", back: "/dashboard", next: "/dashboard/memos", tip: "월별 흐름을 이어서 비교해 보세요." },
  "/dashboard/recurring": { label: "정기 지출", back: "/saving", next: "/dashboard", tip: "매달 반복되는 내역을 관리하고 분석에서 비중을 확인해 보세요." },
  "/couple-ledger/entry": { label: "커플 장부 기록", back: "/couple-ledger", next: "/couple-ledger/calendar", tip: "공동 지출을 기록한 뒤 달력에서 확인해 보세요." },
  "/couple-ledger/calendar": { label: "커플 장부 달력", back: "/couple-ledger/entry", next: "/couple-ledger/analytics", tip: "함께 기록한 내역을 날짜별로 살펴보세요." },
  "/couple-ledger/analytics": { label: "커플 장부 분석", back: "/couple-ledger/calendar", next: "/couple-settings", tip: "함께 쓴 금액의 흐름을 살펴보세요." },
  "/couple-settings": { label: "커플 공유 설정", back: "/couple-ledger", next: "/couple-ledger/entry", tip: "공동 장부 공유와 편집 범위를 관리할 수 있어요." },
  "/couple-link": { label: "커플 연결", back: "/couple-ledger", next: "/couple-settings", tip: "연결을 마치면 공유 설정을 확인해 보세요." },
  "/settings/couple": { label: "커플 연결 관리", back: "/settings", next: "/couple-settings", tip: "연결 상태와 공유 설정을 함께 확인할 수 있어요." },
  "/notifications": { label: "알림", back: "/settings", next: "/dashboard/calendar", tip: "최근 알림을 확인하고 달력으로 이어가 보세요." },
  "/privacy": { label: "개인정보처리방침", back: "/settings", next: "/account-delete", tip: "개인정보를 어떻게 다루는지 확인할 수 있어요." },
  "/account-delete": { label: "계정 삭제 안내", back: "/settings", next: "/privacy", tip: "계정 삭제 방법과 데이터 처리 안내를 확인할 수 있어요." },
  "/sign-in": { label: "로그인", back: "/", next: "/sign-up", tip: "로그인하면 이전에 보려던 페이지로 이어서 이동할 수 있어요." },
  "/sign-up": { label: "시작하기", back: "/", next: "/sign-in", tip: "가입 후 첫 지출을 기록해 보세요." },
  "/reset-password": { label: "비밀번호 재설정", back: "/sign-in", next: "/sign-in", tip: "재설정을 마친 뒤 로그인할 수 있어요." },
};

const labelFor = (href: string) => detail[href]?.label ?? stops.find(item => item.href === href)?.label ?? "다음 페이지";

export function getPageJourney(pathname: string) {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const exact = detail[normalized];
  if (exact) return {
    label: exact.label, tip: exact.tip,
    back: { href: exact.back, label: labelFor(exact.back) },
    next: { href: exact.next, label: labelFor(exact.next) },
  };

  if (normalized.startsWith("/calculators/")) {
    const slug = normalized.split("/")[2];
    const index = calculatorSlugs.indexOf(slug);
    if (index >= 0) {
      const nextSlug = calculatorSlugs[index + 1];
      return {
        label: calculatorSeo[slug].name,
        tip: "숫자를 바꿔가며 결과를 확인해 보세요. 계산 결과는 참고용입니다.",
        back: { href: "/calculators", label: "돈 계산 도구" },
        next: nextSlug
          ? { href: `/calculators/${nextSlug}`, label: calculatorSeo[nextSlug].name }
          : { href: "/couple-ledger", label: "커플 장부" },
      };
    }
  }

  const index = stops.findIndex(item => item.href === normalized);
  if (index >= 0) return {
    label: stops[index].label, tip: stops[index].tip,
    back: index ? { href: stops[index - 1].href, label: stops[index - 1].label } : null,
    next: index < stops.length - 1
      ? { href: stops[index + 1].href, label: stops[index + 1].label }
      : { href: "/dashboard/calendar", label: "레시피 달력" },
  };

  const parent = normalized.slice(0, normalized.lastIndexOf("/")) || "/";
  return {
    label: "페이지 안내", tip: "상위 메뉴로 돌아가거나 다음 메뉴를 살펴보세요.",
    back: { href: parent, label: labelFor(parent) },
    next: { href: "/dashboard/calendar", label: "레시피 달력" },
  };
}

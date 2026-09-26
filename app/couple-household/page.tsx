import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/calculators/seo";

export const metadata: Metadata = {
  title: "커플·부부 가계부 | 신혼부부 생활비와 공동 지출 관리 - 지출레시피",
  description: "커플 가계부로 각자 낸 생활비와 공동 지출을 정리하세요. 부부·신혼부부의 식비, 고정비, 저축 계획을 함께 확인할 수 있습니다.",
  alternates: { canonical: `${SITE_URL}/couple-household` },
};
export default function Page() {
  return <main className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6">
    <h1 className="text-3xl font-bold text-slate-900">함께 쓰는 생활비, 커플·부부 가계부로 정리하세요</h1>
    <p className="mt-5 max-w-3xl text-sm leading-8 text-slate-600">신혼부부 생활비를 관리할 때는 지출 총액뿐 아니라 누가 어떤 항목을 부담했는지도 살펴보는 것이 좋습니다. 지출레시피의 커플 가계부에서는 공동 지출을 기록하고 달력과 분석 화면으로 흐름을 확인할 수 있습니다. 개인 기록과 공동 기록을 구분해 관리하고, 월세·식비·구독료처럼 함께 사용하는 비용을 같은 기준으로 정리해보세요. 예를 들어 월 소득 합계가 500만원이고 생활비 목표가 200만원이라면 식비와 고정비 예산을 먼저 나눈 뒤 각자의 부담 기준을 협의할 수 있습니다. 어떤 분담 비율이 정답인지는 두 사람의 소득과 상황에 따라 다릅니다. 아래 계산기로 계획을 비교하고 실제 지출은 가계부에 기록해 월말에 다시 점검하세요.</p>
    <Link href="/sign-in?mode=register&redirect=%2Fcouple-ledger" className="mt-6 inline-flex rounded-lg bg-[#1f7a5b] px-5 py-3 text-sm font-semibold text-white">무료로 공동 생활비 관리하기 →</Link>
    <div className="mt-8 flex flex-wrap gap-3">{[["생활비 예산", "monthly-budget"], ["식비 예산", "food-budget"], ["고정비 비율", "fixed-cost"]].map(([title, slug]) => <Link key={slug} href={`/calculators/${slug}`} className="rounded-lg border border-[#dce5dd] bg-white px-4 py-3 text-sm text-[#176247]">{title} 계산기 →</Link>)}</div>
  </main>;
}

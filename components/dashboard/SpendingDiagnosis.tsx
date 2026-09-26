import Link from "next/link";
import { diagnoseSpending } from "@/lib/spending-diagnosis";

export function SpendingDiagnosis({ days, today }: { days: Parameters<typeof diagnoseSpending>[0]; today: string }) {
  const items = diagnoseSpending(days, today);
  return <section className="mb-5 rounded-lg border border-[#dce5dd] bg-white p-5 sm:p-6">
    <h2 className="text-base font-semibold text-slate-900">이번 달 절약 포인트</h2>
    <p className="mt-2 text-xs leading-6 text-slate-500">오늘까지 기록된 수입·지출·저축을 기준으로 한 단순 점검입니다. 식비 30%, 고정비 50%, 저축률 10%는 참고 기준이며 적정 비율을 보장하지 않습니다. 정기 지출과 주거·통신·보험·대출 분류를 고정비로 추정하므로 누락·오분류가 있을 수 있습니다.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{items.map(item => <Link key={item.label} href={item.href} className="rounded-lg border border-[#dce5dd] p-4 hover:bg-[#f1f8f4]">
      <h3 className="text-xs font-semibold text-slate-600">{item.label}</h3>
      <p className="mt-2 text-lg font-bold text-[#176247]">{item.value === null ? item.label === "구독료" ? `${Math.round(item.amount).toLocaleString("ko-KR")}원` : "소득 입력 필요" : `${item.value.toFixed(1)}%`}</p>
      <p className="mt-2 text-xs leading-5 text-slate-600">{item.message}</p>
      <span className="mt-3 block text-xs font-semibold text-[#176247]">계산기로 계획하기 →</span>
    </Link>)}</div>
  </section>;
}

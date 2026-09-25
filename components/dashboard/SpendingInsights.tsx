import Link from 'next/link';
import { buildInsights, type InsightDay } from '@/lib/dashboard-insights';

type Props = {
  current: InsightDay[];
  previous: InsightDay[];
  range: { firstKey: string; lastKey: string };
  previousRange: { firstKey: string; lastKey: string };
  today: string;
};
const won = (value: number) => `${Math.round(value).toLocaleString('ko-KR')}원`;

export function SpendingInsights(props: Props) {
  const insight = buildInsights(props.current, props.previous, props.range, props.previousRange, props.today);
  const increase = insight.changes.find(c => c.delta > 0);
  return (
    <section aria-labelledby="spending-insights" className="mb-5 rounded-lg border border-[#e2e5e1] bg-white p-5 sm:p-6">
      <h2 id="spending-insights" className="text-base font-semibold text-slate-900">지출이 달라진 이유</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">기록된 금액을 직전 기간의 같은 경과 일수와 비교합니다. 기록이 없는 날은 무지출로 판단하지 않습니다.</p>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-xs font-medium text-slate-500">직전 기간 대비 · {insight.comparableDays}일 기준</h3>
          <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900" aria-live="polite">
            {!insight.canCompare ? '비교할 기록이 부족합니다' : insight.delta === 0 ? '지출 금액이 같습니다' : `${won(Math.abs(insight.delta))} ${insight.delta > 0 ? '더 썼습니다' : '덜 썼습니다'}`}
          </p>
          {insight.canCompare && <p className="mt-2 text-xs text-slate-600">{won(insight.previousTotal)} → {won(insight.currentTotal)}{insight.percent !== null ? ` (${insight.percent > 0 ? '+' : ''}${insight.percent.toFixed(1)}%)` : ' · 직전 지출이 0원이어서 증감률은 표시하지 않습니다.'}</p>}
          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            이번: {props.range.firstKey} ~ {insight.currentEnd ?? '시작 전'} · 기록 {insight.currentRecords}일<br />
            직전: {props.previousRange.firstKey} ~ {insight.previousEnd ?? '시작 전'} · 기록 {insight.previousRecords}일
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">기간 길이가 다르면 짧은 쪽에 맞춥니다. 기록 일수가 다르거나 누락된 지출이 있으면 비교 결과도 달라질 수 있습니다.</p>
          {insight.canCompare && insight.changes.length > 0 && <div className="mt-4 overflow-x-auto">
            <table className="w-full text-right text-xs tabular-nums">
              <caption className="mb-2 text-left text-xs font-semibold text-slate-700">변동 금액이 큰 항목</caption>
              <thead className="border-b border-slate-200 text-slate-500"><tr><th scope="col" className="py-2 text-left font-medium">구분</th><th scope="col" className="px-2 font-medium">직전</th><th scope="col" className="px-2 font-medium">이번</th><th scope="col" className="font-medium">증감</th></tr></thead>
              <tbody>{insight.changes.slice(0, 4).map(c => <tr key={c.category} className="border-b border-slate-100"><th scope="row" className="py-3 text-left font-medium">{c.category}</th><td className="px-2 whitespace-nowrap">{won(c.previous)}</td><td className="px-2 whitespace-nowrap">{won(c.current)}</td><td className={`whitespace-nowrap font-medium ${c.delta > 0 ? 'text-rose-700' : 'text-[#176247]'}`}>{c.delta > 0 ? '+' : '−'}{won(Math.abs(c.delta))}</td></tr>)}</tbody>
            </table>
          </div>}
          {insight.canCompare && increase && <p className="mt-3 text-xs leading-6 text-slate-600">증가 폭이 가장 큰 구분은 <strong>{increase.category}</strong>입니다. {won(increase.delta)} 늘어난 내역이 일회성 구매인지, 반복되는 소비인지 먼저 확인해보세요.</p>}
        </div>
        <div className="border-t border-slate-200 pt-5 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
          <h3 className="text-xs font-medium text-slate-500">선택 기간에 기록된 정기 지출</h3>
          <p className="mt-2 text-xl font-semibold tabular-nums">{won(insight.recurring)} <span className="text-sm font-normal text-slate-500">{insight.total > 0 ? `· 전체 지출의 ${(insight.recurring / insight.total * 100).toFixed(1)}%` : ''}</span></p>
          <p className="mt-2 text-xs leading-5 text-slate-500">정기 규칙으로 생성된 기록만 집계합니다. 수동으로 입력한 고정비와 아직 기록되지 않은 예정 지출은 포함하지 않습니다.</p>
          <Link href="/saving" className="mt-3 inline-block text-xs font-medium text-[#176247] underline underline-offset-4">저축 · 정기관리 확인</Link>
          <h3 className="mt-6 text-sm font-semibold">금액이 큰 지출 {insight.largest.length}건</h3>
          {insight.largest.length > 0 ? <>
            <p className="mt-1 text-xs text-slate-500">전체 지출의 {insight.largestShare.toFixed(1)}%를 차지합니다.</p>
            <ul className="mt-2 divide-y divide-slate-100">{insight.largest.map((item, index) => <li key={`${item.date}-${item.id}-${index}`}>
              <Link href={`/dashboard/calendar/edit?date=${item.date}`} className="flex items-center justify-between gap-3 py-3 text-xs hover:bg-slate-50">
                <span className="min-w-0"><span className="block truncate font-medium">{item.label || item.category || '미분류 지출'}</span><span className="mt-1 block text-slate-500">{item.date} · {item.category || '미분류'}</span></span>
                <span className="shrink-0 font-semibold tabular-nums">{won(item.amount)} →</span>
              </Link>
            </li>)}</ul>
          </> : <p className="mt-2 text-xs text-slate-500">기록된 지출이 없습니다.</p>}
        </div>
      </div>
    </section>
  );
}

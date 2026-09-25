"use client";

import { useMemo, useState } from "react";
import { RecipeShell } from "@/components/calculators/RecipeShell";
import { MoneyInput, NumberInput, PctInput } from "@/components/calculators/Inputs";
import { MetricCard } from "@/components/calculators/Metric";
import { discountRate, hourlyWageConverter, savingsInterest } from "@/lib/calculators/quick-math";

export type QuickMathKind = "savings-interest" | "discount-rate" | "hourly-wage-converter";

const details = {
  "savings-interest": { badge: "저축", title: "적금 이자 계산기", subtitle: "매월 넣는 금액과 기간으로 세전 이자·만기 금액을 미리 확인하세요." },
  "discount-rate": { badge: "쇼핑", title: "할인율 계산기", subtitle: "정가와 할인 가격을 비교해 실제 절약 금액과 할인율을 확인하세요." },
  "hourly-wage-converter": { badge: "급여", title: "시급·월급 환산 계산기", subtitle: "시급과 근무시간으로 주급·월급·연봉의 세전 예상액을 확인하세요." },
} as const;

const number = (value: string) => Number(value.replaceAll(",", "")) || 0;
const won = (value: number) => `${Math.round(value).toLocaleString("ko-KR")}원`;

export function QuickMathTools({ kind }: { kind: QuickMathKind }) {
  const [a, setA] = useState(kind === "savings-interest" ? "300000" : kind === "discount-rate" ? "100000" : "10000");
  const [b, setB] = useState(kind === "savings-interest" ? "3.5" : kind === "discount-rate" ? "75000" : "8");
  const [c, setC] = useState(kind === "savings-interest" ? "12" : "5");
  const detail = details[kind];
  const result = useMemo(() => {
    if (kind === "savings-interest") {
      const value = savingsInterest(number(a), number(b), number(c));
      return { headline: won(value.total), headlineLabel: "예상 만기 수령액 (세전)", metrics: [["총 납입 원금", won(value.principal)], ["예상 이자 (세전)", won(value.interest)]], note: "매월 초에 같은 금액을 납입하고 단리가 적용된다고 가정합니다. 실제 이자는 납입일·우대금리·과세 방식에 따라 달라집니다." };
    }
    if (kind === "discount-rate") {
      const value = discountRate(number(a), number(b));
      return { headline: `${value.rate.toFixed(1)}%`, headlineLabel: "할인율", metrics: [["절약 금액", won(value.saved)], ["결제 가격", won(number(b))]], note: "배송비나 쿠폰 중복 적용 전 가격을 비교한 결과입니다. 할인 가격이 정가보다 높으면 할인율은 음수로 표시됩니다." };
    }
    const value = hourlyWageConverter(number(a), number(b), number(c));
    return { headline: won(value.monthly), headlineLabel: "예상 월급 (세전)", metrics: [["주급", won(value.weekly)], ["연봉", won(value.annual)]], note: "1년을 52주로 환산한 단순 계산입니다. 주휴수당·연장수당·휴가·세금 및 4대보험은 포함하지 않습니다." };
  }, [a, b, c, kind]);

  return (
    <RecipeShell badge={detail.badge} title={detail.title} subtitle={detail.subtitle}>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-[#dce5dd] bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-base font-bold text-slate-900">계산 조건</h2>
          <p className="mt-1 text-sm text-slate-600">값을 바꾸면 오른쪽 결과가 바로 갱신됩니다.</p>
          <div className="mt-6 grid gap-5">
            {kind === "savings-interest" ? <><MoneyInput label="매월 납입액" value={a} setValue={setA} /><PctInput label="연 이율" value={b} setValue={setB} /><NumberInput label="납입 기간" hint="개월" value={c} setValue={setC} /></> : null}
            {kind === "discount-rate" ? <><MoneyInput label="정가" value={a} setValue={setA} /><MoneyInput label="할인 가격" value={b} setValue={setB} /></> : null}
            {kind === "hourly-wage-converter" ? <><MoneyInput label="시급" value={a} setValue={setA} /><NumberInput label="하루 근무시간" hint="시간" value={b} setValue={setB} /><NumberInput label="일주일 근무일수" hint="일" value={c} setValue={setC} /></> : null}
          </div>
        </section>
        <section aria-live="polite" className="rounded-xl border border-[#dce5dd] bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-base font-bold text-slate-900">계산 결과</h2>
          <p className="mt-6 text-sm text-slate-600">{result.headlineLabel}</p>
          <p className="mt-1 break-words text-3xl font-bold tracking-tight text-[#176247] sm:text-4xl">{result.headline}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">{result.metrics.map(([title, value]) => <MetricCard key={title} title={title} value={value} />)}</div>
          <p className="mt-6 rounded-lg bg-[#f7faf8] p-4 text-xs leading-6 text-slate-600">{result.note}</p>
        </section>
      </div>
    </RecipeShell>
  );
}

// src/app/calculators/rate-sensitivity/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { RecipeShell } from "@/components/calculators/RecipeShell";
import { MoneyInput, NumberInput } from "@/components/calculators/Inputs";
import { MetricCard, Row } from "@/components/calculators/Metric";
import { cn, UI, toNumberSafe, formatKRW, clamp } from "@/lib/calculators/utils";

function annuityPayment(P: number, rMonthly: number, n: number) {
  if (n <= 0) return 0;
  if (rMonthly <= 0) return P / n;
  return (P * rMonthly * Math.pow(1 + rMonthly, n)) / (Math.pow(1 + rMonthly, n) - 1);
}

export default function RateSensitivityPage() {
  const [principal, setPrincipal] = useState("30000000");
  const [annualRate, setAnnualRate] = useState("5.0");
  const [termMonths, setTermMonths] = useState("36");

  const calc = useMemo(() => {
    const P = Math.max(0, toNumberSafe(principal));
    const baseRate = Math.max(0, toNumberSafe(annualRate));
    const n = clamp(Math.round(toNumberSafe(termMonths)), 1, 1200);

    const payAt = (ratePct: number) => {
      const r = Math.max(0, ratePct) / 100 / 12;
      const pay = annuityPayment(P, r, n);
      const total = pay * n;
      const interest = Math.max(0, total - P);
      return { pay, total, interest };
    };

    const base = payAt(baseRate);
    const up05 = payAt(baseRate + 0.5);
    const up10 = payAt(baseRate + 1.0);

    return {
      P,
      n,
      baseRate,
      base,
      up05,
      up10,
      diff05: up05.pay - base.pay,
      diff10: up10.pay - base.pay,
      intDiff05: up05.interest - base.interest,
      intDiff10: up10.interest - base.interest,
    };
  }, [principal, annualRate, termMonths]);

  return (
    <RecipeShell
      badge="민감도"
      title="금리 인상 민감도 계산기"
      subtitle={
        <>
          금리가 <span className="font-semibold text-[#ffffff]">+0.5%p / +1.0%p</span> 오를 때 월 부담이 얼마나 늘어나는지 봅니다.
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* 입력 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <div>
            <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
            <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>원리금균등(고정 상환) 기준으로 민감도를 계산합니다.</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MoneyInput label="대출원금" value={principal} setValue={setPrincipal} />
            <NumberInput label="현재 연이율(%)" value={annualRate} setValue={setAnnualRate} hint="예: 5.0" />
            <NumberInput label="남은 기간(개월)" value={termMonths} setValue={setTermMonths} hint="예: 36" />
          </div>
        </section>

        {/* 결과 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricCard title="현재 월상환" value={`${formatKRW(calc.base.pay)}원`} />
            <MetricCard title="+0.5%p 월상환" value={`${formatKRW(calc.up05.pay)}원`} />
            <MetricCard title="+1.0%p 월상환" value={`${formatKRW(calc.up10.pay)}원`} />
            <MetricCard title="기간(개월)" value={`${calc.n}개월`} />
          </div>

          <div className="mt-4 rounded-2xl border border-[#dcefe5] bg-white p-4">
            <div className={cn("text-[12px] font-semibold", UI.ink)}>증가분</div>
            <div className="mt-3 grid gap-2">
              <Row label="+0.5%p 월 증가" value={`${formatKRW(calc.diff05)}원`} tone={calc.diff05 > 0 ? "danger" : "ok"} />
              <Row label="+1.0%p 월 증가" value={`${formatKRW(calc.diff10)}원`} tone={calc.diff10 > 0 ? "danger" : "ok"} />
              <Row label="+0.5%p 총이자 증가" value={`${formatKRW(calc.intDiff05)}원`} tone={calc.intDiff05 > 0 ? "danger" : "ok"} />
              <Row label="+1.0%p 총이자 증가" value={`${formatKRW(calc.intDiff10)}원`} tone={calc.intDiff10 > 0 ? "danger" : "ok"} />
            </div>
            <p className="mt-3 text-xs font-semibold text-[#7f7f7f]">
              ※ 변동금리/중도상환/거치기간 등 조건에 따라 실제와 차이가 날 수 있어요.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/calculators/prepayment-fee-breakeven"
              className="rounded-2xl bg-[#1f7a5b] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
            >
              다음: 중도상환수수료 손익 →
            </Link>
            <Link
              href="/calculators"
              className="rounded-2xl border border-[#dcefe5] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#1f7a5b]"
            >
              계산기 모음으로
            </Link>
          </div>
        </section>
      </div>
    </RecipeShell>
  );
}

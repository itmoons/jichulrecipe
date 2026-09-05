// src/app/calculators/credit-line-cost/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { RecipeShell } from "@/components/calculators/RecipeShell";
import { MoneyInput, NumberInput } from "@/components/calculators/Inputs";
import { MetricCard, Row } from "@/components/calculators/Metric";
import { cn, UI, toNumberSafe, formatKRW, clamp } from "@/lib/calculators/utils";

export default function CreditLineCostPage() {
  const [avgBalance, setAvgBalance] = useState("5000000"); // 평균 사용잔액
  const [annualRate, setAnnualRate] = useState("7.0");     // 연이율(%)
  const [months, setMonths] = useState("3");               // 사용기간(개월)

  const calc = useMemo(() => {
    const B = Math.max(0, toNumberSafe(avgBalance));
    const r = Math.max(0, toNumberSafe(annualRate)) / 100;
    const n = clamp(Math.round(toNumberSafe(months)), 1, 120);

    const monthlyInterest = (B * r) / 12;
    const totalInterest = monthlyInterest * n;

    const status =
      B <= 0
        ? { label: "입력 필요", badge: "bg-[#1f7a5b] text-[#ffffff]" }
        : { label: "점검", badge: "bg-[#1f7a5b] text-white" };

    return { B, r, n, monthlyInterest, totalInterest, status };
  }, [avgBalance, annualRate, months]);

  return (
    <RecipeShell
      badge="마통"
      title="마이너스통장 사용비용 계산기"
      subtitle={
        <>
          평균 사용잔액을 기준으로 <span className="font-semibold text-[#ffffff]">월/기간 이자 비용</span>을 추정합니다.
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* 입력 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>일별 잔액 변동은 단순화하고 평균잔액으로 계산합니다.</p>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", calc.status.badge)}>
              {calc.status.label}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MoneyInput label="평균 사용잔액" value={avgBalance} setValue={setAvgBalance} />
            <NumberInput label="연이율(%)" value={annualRate} setValue={setAnnualRate} />
            <NumberInput label="사용기간(개월)" value={months} setValue={setMonths} />
          </div>

          <div className="mt-4 rounded-2xl border border-[#dcefe5] bg-white p-4">
            <div className="text-[12px] font-semibold text-[#3B2F1E]">입력 팁</div>
            <ul className="mt-2 list-disc pl-5 text-[12px] text-[#6d6d6d]">
              <li>한 달 내내 300만원을 썼다면 평균잔액은 300만원입니다.</li>
              <li>월중 들쭉날쭉하면 “(대략 사용잔액의 중간값)”으로 잡아도 감을 잡을 수 있어요.</li>
            </ul>
          </div>
        </section>

        {/* 결과 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricCard title="월 이자(대략)" value={`${formatKRW(calc.monthlyInterest)}원`} />
            <MetricCard title="기간 총이자(대략)" value={`${formatKRW(calc.totalInterest)}원`} />
            <MetricCard title="연이율" value={`${(calc.r * 100).toFixed(2)}%`} />
            <MetricCard title="기간(개월)" value={`${calc.n}개월`} />
          </div>

          <div className="mt-4 rounded-2xl border border-[#dcefe5] bg-white p-4">
            <div className={cn("text-[12px] font-semibold", UI.ink)}>해석 프레임</div>
            <div className="mt-3 grid gap-2">
              <Row label="평균잔액이 줄면" value="이자 비용은 선형으로 줄어듭니다" tone="ok" />
              <Row label="단기 브릿지 용도" value="기간(개월)을 짧게 잡는 게 비용을 좌우" tone="danger" />
            </div>
            <p className="mt-3 text-xs font-semibold text-[#7f7f7f]">
              ※ 실제는 일할 계산/가산금리/우대금리/한도수수료 등 조건이 붙을 수 있습니다.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/calculators"
              className="rounded-2xl border border-[#dcefe5] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#1f7a5b]"
            >
              계산기 모음으로
            </Link>
            <Link
              href="/"
              className="rounded-2xl bg-[#1f7a5b] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
            >
              지출레시피 홈으로
            </Link>
          </div>
        </section>
      </div>
    </RecipeShell>
  );
}

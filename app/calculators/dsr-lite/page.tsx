// src/app/calculators/dsr-lite/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { RecipeShell } from "@/components/calculators/RecipeShell";
import { MoneyInput } from "@/components/calculators/Inputs";
import { MetricCard, Row } from "@/components/calculators/Metric";
import { cn, UI, formatKRW, toNumberSafe, clamp } from "@/lib/calculators/utils";

export default function DsrLitePage() {
  const [annualIncome, setAnnualIncome] = useState("50000000"); // 연소득
  const [annualDebtService, setAnnualDebtService] = useState("12000000"); // 연간 원리금(합계)

  const calc = useMemo(() => {
    const income = Math.max(0, toNumberSafe(annualIncome));
    const debt = Math.max(0, toNumberSafe(annualDebtService));

    const dsr = income > 0 ? (debt / income) * 100 : 0;
    const monthlyIncome = income / 12;
    const monthlyDebt = debt / 12;

    // 단순 구간 (정책기준/규제판단 아님)
    const grade =
      income <= 0
        ? { label: "입력 필요", badge: "bg-[#1f7a5b] text-white" }
        : dsr < 20
        ? { label: "여유", badge: "bg-[#34D399] text-white" }
        : dsr < 40
        ? { label: "보통", badge: "bg-[#1f7a5b] text-white" }
        : { label: "부담", badge: "bg-[#1f7a5b] text-white" };

    return { income, debt, dsr, monthlyIncome, monthlyDebt, grade };
  }, [annualIncome, annualDebtService]);

  return (
    <RecipeShell
      badge="DSR"
      title="DSR 간이 계산기"
      subtitle={
        <>
          연소득 대비 연간 원리금 상환액 비율을 확인합니다.{" "}
          <span className="font-semibold text-[#ffffff]">규제판단이 아닌 점검용</span>입니다.
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* 입력 */}
        <section className={cn("rounded-xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>여러 대출이면 “연간 원리금 합계”로 넣으세요.</p>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", calc.grade.badge)}>
              {calc.grade.label}
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            <MoneyInput label="연소득" value={annualIncome} setValue={setAnnualIncome} />
            <MoneyInput label="연간 원리금 상환액(합계)" value={annualDebtService} setValue={setAnnualDebtService} />
          </div>

          <div className="mt-4 rounded-lg border border-[#e2e5e1] bg-white p-4">
            <div className="text-[12px] font-semibold text-[#3B2F1E]">입력 팁</div>
            <ul className="mt-2 list-disc pl-5 text-[12px] text-[#6d6d6d]">
              <li>월 상환액을 알고 있으면 “월 상환액 × 12”로 연간 원리금을 만들 수 있습니다.</li>
              <li>원리금이 아닌 “이자만”을 넣으면 DSR이 과소 추정됩니다.</li>
            </ul>
          </div>
        </section>

        {/* 결과 */}
        <section className={cn("rounded-xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricCard title="DSR(간이)" value={`${clamp(calc.dsr, 0, 999).toFixed(1)}%`} />
            <MetricCard title="월 소득(평균)" value={`${formatKRW(calc.monthlyIncome)}원`} />
            <MetricCard title="월 원리금(평균)" value={`${formatKRW(calc.monthlyDebt)}원`} />
            <MetricCard
              title="월 소득 대비"
              value={calc.monthlyIncome > 0 ? `${((calc.monthlyDebt / calc.monthlyIncome) * 100).toFixed(1)}%` : "0.0%"}
            />
          </div>

          <div className="mt-4 rounded-lg border border-[#e2e5e1] bg-white p-4">
            <div className={cn("text-[12px] font-semibold", UI.ink)}>해석 프레임</div>
            <div className="mt-3 grid gap-2">
              <Row
                label="부채 상환 부담(정성)"
                value={calc.grade.label}
                tone={calc.grade.label === "부담" ? "danger" : "ok"}
              />
            </div>
            <p className="mt-3 text-xs font-semibold text-[#7f7f7f]">
              ※ DSR 규제/적용 기준은 금융기관·상품·정책에 따라 달라질 수 있어요. 이 계산기는 “개인 점검”용입니다.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/calculators/loan-payment"
              className="rounded-lg bg-[#1f7a5b] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#176247]"
            >
              다음: 대출 월 상환액 →
            </Link>
            <Link
              href="/calculators"
              className="rounded-lg border border-[#e2e5e1] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#1f7a5b]"
            >
              계산기 모음으로
            </Link>
          </div>
        </section>
      </div>
    </RecipeShell>
  );
}

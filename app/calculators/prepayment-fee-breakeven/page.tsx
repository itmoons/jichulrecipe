// src/app/calculators/prepayment-fee-breakeven/page.tsx
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

export default function PrepaymentFeeBreakevenPage() {
  const [remainingPrincipal, setRemainingPrincipal] = useState("30000000");
  const [annualRate, setAnnualRate] = useState("5.0");
  const [remainingMonths, setRemainingMonths] = useState("36");
  const [prepayFeeRate, setPrepayFeeRate] = useState("1.0"); // % (예: 1%)

  const calc = useMemo(() => {
    const P = Math.max(0, toNumberSafe(remainingPrincipal));
    const r = Math.max(0, toNumberSafe(annualRate)) / 100 / 12;
    const n = clamp(Math.round(toNumberSafe(remainingMonths)), 1, 1200);
    const feeRate = Math.max(0, toNumberSafe(prepayFeeRate)) / 100;

    // 유지 시(원리금균등 가정) 남은 총이자
    const pay = annuityPayment(P, r, n);
    const total = pay * n;
    const interestRemain = Math.max(0, total - P);

    // 지금 상환 시 비용(수수료)
    const fee = P * feeRate;

    // 단순 손익: 이자절감 - 수수료
    const net = interestRemain - fee;

    const verdict =
      P <= 0
        ? { label: "입력 필요", badge: "bg-[#FBBF24] text-[#3B2F1E]" }
        : net > 0
        ? { label: "손익상 유리", badge: "bg-[#34D399] text-white" }
        : net < 0
        ? { label: "손익상 불리", badge: "bg-[#F97316] text-white" }
        : { label: "비슷", badge: "bg-[#FBBF24] text-[#3B2F1E]" };

    return { P, n, pay, interestRemain, fee, net, verdict };
  }, [remainingPrincipal, annualRate, remainingMonths, prepayFeeRate]);

  return (
    <RecipeShell
      badge="중도상환"
      title="중도상환수수료 손익 계산기"
      subtitle={
        <>
          “지금 갚기”의 수수료와 “유지”의 남은 이자를 비교합니다.{" "}
          <span className="font-semibold text-[#F97316]">원리금균등 가정</span>입니다.
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* 입력 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
              <p className={cn("mt-1 text-sm", UI.inkSoft)}>거치/변동금리/부분상환은 단순화했습니다.</p>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-sm font-semibold", calc.verdict.badge)}>
              {calc.verdict.label}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MoneyInput label="남은 원금" value={remainingPrincipal} setValue={setRemainingPrincipal} />
            <NumberInput label="현재 연이율(%)" value={annualRate} setValue={setAnnualRate} />
            <NumberInput label="남은 기간(개월)" value={remainingMonths} setValue={setRemainingMonths} />
            <NumberInput label="중도상환수수료율(%)" value={prepayFeeRate} setValue={setPrepayFeeRate} hint="예: 1.0" />
          </div>
        </section>

        {/* 결과 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricCard title="유지 시 월상환(가정)" value={`${formatKRW(calc.pay)}원`} />
            <MetricCard title="유지 시 남은 총이자" value={`${formatKRW(calc.interestRemain)}원`} />
            <MetricCard title="지금 상환 수수료" value={`${formatKRW(calc.fee)}원`} />
            <MetricCard title="단순 손익(이자-수수료)" value={`${formatKRW(calc.net)}원`} />
          </div>

          <div className="mt-4 rounded-2xl border border-[#F2E4B6] bg-white p-4">
            <div className={cn("text-sm font-semibold", UI.ink)}>해석</div>
            <div className="mt-3 grid gap-2">
              <Row
                label="손익 관점"
                value={calc.net > 0 ? "상환이 유리(단순)" : calc.net < 0 ? "유지가 유리(단순)" : "비슷"}
                tone={calc.net > 0 ? "ok" : calc.net < 0 ? "danger" : "ok"}
              />
            </div>
            <p className="mt-3 text-xs font-semibold text-[#6B5642]">
              ※ 세금/기회비용/현금흐름 여유(버퍼)까지 고려하면 결론이 달라질 수 있습니다.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/calculators/refinance-compare"
              className="rounded-2xl bg-[#F97316] px-4 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#EA580C]"
            >
              다음: 대환 비교 →
            </Link>
            <Link
              href="/calculators"
              className="rounded-2xl border border-[#F2E4B6] bg-white px-4 py-2 text-center text-sm font-semibold text-[#6B5642] hover:border-[#FB923C]"
            >
              계산기 모음으로
            </Link>
          </div>
        </section>
      </div>
    </RecipeShell>
  );
}

// src/app/calculators/revolving-cost/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { RecipeShell } from "@/components/calculators/RecipeShell";
import { MoneyInput, NumberInput } from "@/components/calculators/Inputs";
import { MetricCard, Row } from "@/components/calculators/Metric";
import { cn, UI, toNumberSafe, formatKRW, clamp } from "@/lib/calculators/utils";

export default function RevolvingCostPage() {
  const [balance, setBalance] = useState("1000000");          // 이월금액
  const [annualFeeRate, setAnnualFeeRate] = useState("17.0"); // 연 수수료율(%) 가정
  const [months, setMonths] = useState("6");                  // 기간
  const [monthlyPaydown, setMonthlyPaydown] = useState("0");  // 매달 원금상환(선택)

  const calc = useMemo(() => {
    const B0 = Math.max(0, toNumberSafe(balance));
    const r = Math.max(0, toNumberSafe(annualFeeRate)) / 100 / 12;
    const n = clamp(Math.round(toNumberSafe(months)), 1, 120);
    const paydown = Math.max(0, toNumberSafe(monthlyPaydown));

    let bal = B0;
    let totalFee = 0;

    for (let m = 1; m <= n; m++) {
      const fee = bal * r;
      totalFee += fee;

      // 원금 상환(선택)
      const pd = Math.min(bal, paydown);
      bal -= pd;

      // (단순) 이월 유지: 상환 없으면 원금 그대로, 상환하면 감소
      if (bal <= 0) break;
    }

    const endBal = bal;

    const status =
      B0 <= 0
        ? { label: "입력 필요", badge: "bg-[#1f7a5b] text-white" }
        : { label: "점검", badge: "bg-[#1f7a5b] text-white" };

    return { B0, r, n, paydown, totalFee, endBal, status };
  }, [balance, annualFeeRate, months, monthlyPaydown]);

  return (
    <RecipeShell
      badge="리볼빙"
      title="카드 리볼빙 비용 계산기"
      subtitle={
        <>
          이월금액에 수수료율을 적용해 <span className="font-semibold text-[#ffffff]">기간 누적 비용</span>을 추정합니다.
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* 입력 */}
        <section className={cn("rounded-xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>단순 모델: 매달 수수료 발생 + 선택적 원금상환 반영</p>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", calc.status.badge)}>
              {calc.status.label}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MoneyInput label="이월금액" value={balance} setValue={setBalance} />
            <NumberInput label="연 수수료율(%)" value={annualFeeRate} setValue={setAnnualFeeRate} hint="예: 17.0" />
            <NumberInput label="기간(개월)" value={months} setValue={setMonths} hint="예: 6" />
            <MoneyInput label="월 원금 상환(선택)" value={monthlyPaydown} setValue={setMonthlyPaydown} />
          </div>

          <div className="mt-4 rounded-lg border border-[#e2e5e1] bg-white p-4">
            <div className="text-[12px] font-semibold text-[#3B2F1E]">주의</div>
            <p className="mt-2 text-[12px] text-[#6d6d6d]">
              실제 리볼빙은 최소결제, 이월비율, 결제일별 산정 등 복잡합니다. 여기서는 “비용 감(感)”을 잡는 용도입니다.
            </p>
          </div>
        </section>

        {/* 결과 */}
        <section className={cn("rounded-xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricCard title="월 수수료율(대략)" value={`${(calc.r * 100).toFixed(2)}%`} />
            <MetricCard title="기간 누적 수수료" value={`${formatKRW(calc.totalFee)}원`} />
            <MetricCard title="기간 종료 잔액(가정)" value={`${formatKRW(calc.endBal)}원`} />
            <MetricCard title="기간(개월)" value={`${calc.n}개월`} />
          </div>

          <div className="mt-4 rounded-lg border border-[#e2e5e1] bg-white p-4">
            <div className={cn("text-[12px] font-semibold", UI.ink)}>해석 프레임</div>
            <div className="mt-3 grid gap-2">
              <Row
                label="원금상환이 0이면"
                value="수수료만 누적되고 원금은 그대로 남는 구조"
                tone="danger"
              />
              <Row
                label="월 상환을 늘리면"
                value="수수료(이자성 비용)가 더 빠르게 줄어듭니다"
                tone="ok"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/calculators/credit-line-cost"
              className="rounded-lg bg-[#1f7a5b] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#176247]"
            >
              다음: 마이너스통장 비용 →
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

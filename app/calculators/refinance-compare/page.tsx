// src/app/calculators/refinance-compare/page.tsx
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

export default function RefinanceComparePage() {
  const [principal, setPrincipal] = useState("30000000");
  const [remainMonths, setRemainMonths] = useState("36");

  const [currentRate, setCurrentRate] = useState("5.0");
  const [newRate, setNewRate] = useState("4.2");

  const [refiFee, setRefiFee] = useState("200000"); // 수수료/부대비용(일시)

  const calc = useMemo(() => {
    const P = Math.max(0, toNumberSafe(principal));
    const n = clamp(Math.round(toNumberSafe(remainMonths)), 1, 1200);
    const fee = Math.max(0, toNumberSafe(refiFee));

    const curPay = annuityPayment(P, Math.max(0, toNumberSafe(currentRate)) / 100 / 12, n);
    const curTotal = curPay * n;
    const curInterest = Math.max(0, curTotal - P);

    const newPay = annuityPayment(P, Math.max(0, toNumberSafe(newRate)) / 100 / 12, n);
    const newTotal = newPay * n;
    const newInterest = Math.max(0, newTotal - P);

    const newAllIn = newInterest + fee;
    const saving = curInterest - newAllIn;

    const verdict =
      P <= 0
        ? { label: "입력 필요", badge: "bg-[#ff8a3d] text-[#ffffff]" }
        : saving > 0
        ? { label: "대환 유리(총비용)", badge: "bg-[#34D399] text-white" }
        : saving < 0
        ? { label: "유지 유리(총비용)", badge: "bg-[#ff8a3d] text-white" }
        : { label: "비슷", badge: "bg-[#ff8a3d] text-[#ffffff]" };

    return { P, n, fee, curPay, curInterest, newPay, newInterest, newAllIn, saving, verdict };
  }, [principal, remainMonths, currentRate, newRate, refiFee]);

  return (
    <RecipeShell
      badge="대환"
      title="대환 전후 총이자 비교 계산기"
      subtitle={
        <>
          수수료를 포함해 “총이자(총비용)” 관점에서 대환 손익을 봅니다.{" "}
          <span className="font-semibold text-[#ffffff]">원리금균등 가정</span>입니다.
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* 입력 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>대환 후 기간이 달라지면 해석이 달라질 수 있어요.</p>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", calc.verdict.badge)}>
              {calc.verdict.label}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MoneyInput label="남은 원금" value={principal} setValue={setPrincipal} />
            <NumberInput label="남은 기간(개월)" value={remainMonths} setValue={setRemainMonths} />
            <NumberInput label="현재 연이율(%)" value={currentRate} setValue={setCurrentRate} />
            <NumberInput label="대환 후 연이율(%)" value={newRate} setValue={setNewRate} />
            <MoneyInput label="대환 수수료/부대비용(일시)" value={refiFee} setValue={setRefiFee} />
          </div>
        </section>

        {/* 결과 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricCard title="현재 월상환" value={`${formatKRW(calc.curPay)}원`} />
            <MetricCard title="대환 후 월상환" value={`${formatKRW(calc.newPay)}원`} />
            <MetricCard title="현재 남은 총이자" value={`${formatKRW(calc.curInterest)}원`} />
            <MetricCard title="대환 총비용(이자+수수료)" value={`${formatKRW(calc.newAllIn)}원`} />
          </div>

          <div className="mt-4 rounded-2xl border border-[#ffedd5] bg-white p-4">
            <div className={cn("text-[12px] font-semibold", UI.ink)}>손익</div>
            <div className="mt-3 grid gap-2">
              <Row
                label="총비용 기준 절감액(+) / 추가비용(-)"
                value={`${formatKRW(calc.saving)}원`}
                tone={calc.saving >= 0 ? "ok" : "danger"}
              />
            </div>
            <p className="mt-3 text-xs font-semibold text-[#7f7f7f]">
              ※ 월상환이 줄어도 기간/수수료 때문에 총비용이 늘 수 있습니다(현금흐름 vs 총비용 분리).
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/calculators/revolving-cost"
              className="rounded-2xl bg-[#ff8a3d] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
            >
              다음: 리볼빙 비용 →
            </Link>
            <Link
              href="/calculators"
              className="rounded-2xl border border-[#ffedd5] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#ff8a3d]"
            >
              계산기 모음으로
            </Link>
          </div>
        </section>
      </div>
    </RecipeShell>
  );
}

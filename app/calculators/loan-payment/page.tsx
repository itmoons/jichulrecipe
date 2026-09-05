// src/app/calculators/loan-payment/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { RecipeShell } from "@/components/calculators/RecipeShell";
import { MoneyInput, NumberInput, SelectInput } from "@/components/calculators/Inputs";
import { MetricCard, Row } from "@/components/calculators/Metric";
import { cn, UI, toNumberSafe, formatKRW, clamp } from "@/lib/calculators/utils";

type Method = "원리금균등" | "원금균등";

function annuityPayment(P: number, rMonthly: number, n: number) {
  if (n <= 0) return 0;
  if (rMonthly <= 0) return P / n;
  return (P * rMonthly * Math.pow(1 + rMonthly, n)) / (Math.pow(1 + rMonthly, n) - 1);
}

export default function LoanPaymentPage() {
  const [principal, setPrincipal] = useState("30000000");
  const [annualRate, setAnnualRate] = useState("5.0");
  const [termMonths, setTermMonths] = useState("36");
  const [method, setMethod] = useState<Method>("원리금균등");

  const calc = useMemo(() => {
    const P = Math.max(0, toNumberSafe(principal));
    const r = Math.max(0, toNumberSafe(annualRate)) / 100 / 12;
    const n = clamp(Math.round(toNumberSafe(termMonths)), 1, 1200);

    // 원리금균등
    const payA = annuityPayment(P, r, n);
    const totalA = payA * n;
    const interestA = Math.max(0, totalA - P);

    // 원금균등
    const prinEach = n > 0 ? P / n : 0;
    let totalI = 0;
    let firstPay = 0;
    let lastPay = 0;
    for (let k = 0; k < n; k++) {
      const remain = P - prinEach * k;
      const i = remain * r;
      totalI += i;
      const pay = prinEach + i;
      if (k === 0) firstPay = pay;
      if (k === n - 1) lastPay = pay;
    }
    const totalB = P + totalI;

    // 선택 방식의 “대표 월상환”
    const chosen =
      method === "원리금균등"
        ? { label: "월 상환액(고정)", main: payA, extra: `총이자 ${formatKRW(interestA)}원` }
        : { label: "첫달/막달 상환액", main: firstPay, extra: `막달 ${formatKRW(lastPay)}원` };

    return {
      P,
      r,
      n,
      annuity: { pay: payA, total: totalA, interest: interestA },
      equalPrincipal: { firstPay, lastPay, total: totalB, interest: totalI },
      chosen,
    };
  }, [principal, annualRate, termMonths, method]);

  const interestWinner =
    calc.annuity.interest < calc.equalPrincipal.interest ? "원리금균등" : "원금균등";

  return (
    <RecipeShell
      badge="상환액"
      title="대출 월 상환액 계산기"
      subtitle={
        <>
          <span className="font-semibold text-[#ffffff]">원리금균등 vs 원금균등</span>의 월 부담과 총이자를 비교합니다.
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* 입력 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <div>
            <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
            <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>금리는 연이율(%) 기준, 기간은 개월로 입력하세요.</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MoneyInput label="대출원금" value={principal} setValue={setPrincipal} />
            <NumberInput label="연이율(%)" value={annualRate} setValue={setAnnualRate} hint="예: 5.0" />
            <NumberInput label="기간(개월)" value={termMonths} setValue={setTermMonths} hint="예: 36" />
            <SelectInput
              label="표시 방식"
              value={method}
              onChange={(v) => setMethod(v as Method)}
              options={["원리금균등", "원금균등"]}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-[#dcefe5] bg-white p-4">
            <div className="text-[12px] font-semibold text-[#3B2F1E]">개념</div>
            <ul className="mt-2 list-disc pl-5 text-[12px] text-[#6d6d6d]">
              <li>원리금균등: 매달 상환액이 거의 고정(초기 이자 비중 큼)</li>
              <li>원금균등: 매달 원금은 일정, 이자는 줄어들어 상환액이 점점 감소</li>
            </ul>
          </div>
        </section>

        {/* 결과 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricCard title="원리금균등 월상환" value={`${formatKRW(calc.annuity.pay)}원`} />
            <MetricCard title="원금균등 첫달 상환" value={`${formatKRW(calc.equalPrincipal.firstPay)}원`} />
            <MetricCard title="원금균등 막달 상환" value={`${formatKRW(calc.equalPrincipal.lastPay)}원`} />
            <MetricCard title="총이자(더 적은 쪽)" value={interestWinner} />
          </div>

          <div className="mt-4 rounded-2xl border border-[#dcefe5] bg-white p-4">
            <div className={cn("text-[12px] font-semibold", UI.ink)}>총비용 비교</div>
            <div className="mt-3 grid gap-2">
              <Row
                label="원리금균등 총이자"
                value={`${formatKRW(calc.annuity.interest)}원`}
                tone={interestWinner === "원리금균등" ? "ok" : "danger"}
              />
              <Row
                label="원금균등 총이자"
                value={`${formatKRW(calc.equalPrincipal.interest)}원`}
                tone={interestWinner === "원금균등" ? "ok" : "danger"}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/calculators/rate-sensitivity"
              className="rounded-2xl bg-[#1f7a5b] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
            >
              다음: 금리 인상 민감도 →
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

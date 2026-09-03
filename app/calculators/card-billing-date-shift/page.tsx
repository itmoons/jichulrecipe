// src/app/calculators/card-billing-date-shift/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { RecipeShell } from "@/components/calculators/RecipeShell";
import { MoneyInput, NumberInput, SelectInput, InfoPill } from "@/components/calculators/Inputs";
import { MetricCard, Row } from "@/components/calculators/Metric";
import { cn, UI, clamp, formatKRW, normalizeDay, toNumberSafe } from "@/lib/calculators/utils";

type MonthMode = "30일 고정" | "일수 직접입력";

export default function CardBillingDateShiftPage() {
  const [daysMode, setDaysMode] = useState<MonthMode>("30일 고정");
  const [daysInMonth, setDaysInMonth] = useState("30");

  const [startBalance, setStartBalance] = useState("300000");
  const [salaryDay, setSalaryDay] = useState("25");
  const [salaryAmount, setSalaryAmount] = useState("2800000");

  const [billingAmount, setBillingAmount] = useState("650000");
  const [oldBillingDay, setOldBillingDay] = useState("12");
  const [newBillingDay, setNewBillingDay] = useState("23");

  const [otherFixedOut, setOtherFixedOut] = useState("1160000");
  const [otherOutDay, setOtherOutDay] = useState("5");
  const [safetyBuffer, setSafetyBuffer] = useState("100000");

  const calc = useMemo(() => {
    const dim = daysMode === "30일 고정" ? 30 : clamp(toNumberSafe(daysInMonth), 28, 31);

    const start = Math.max(0, toNumberSafe(startBalance));
    const sDay = normalizeDay(toNumberSafe(salaryDay), dim);
    const sAmt = Math.max(0, toNumberSafe(salaryAmount));

    const bAmt = Math.max(0, toNumberSafe(billingAmount));
    const oldDay = normalizeDay(toNumberSafe(oldBillingDay), dim);
    const newDay = normalizeDay(toNumberSafe(newBillingDay), dim);

    const otherAmt = Math.max(0, toNumberSafe(otherFixedOut));
    const otherDay = normalizeDay(toNumberSafe(otherOutDay), dim);

    const buffer = Math.max(0, toNumberSafe(safetyBuffer));

    const simulate = (billingDay: number) => {
      let bal = start;
      let minBal = Infinity;
      let minDay = 1;
      let deficitDay: number | null = null;
      let lowDays = 0;

      for (let d = 1; d <= dim; d++) {
        if (d === sDay && sAmt > 0) bal += sAmt;
        if (d === otherDay && otherAmt > 0) bal -= otherAmt;
        if (d === billingDay && bAmt > 0) bal -= bAmt;

        if (bal < minBal) {
          minBal = bal;
          minDay = d;
        }
        if (bal < 0 && deficitDay === null) deficitDay = d;
        if (bal <= buffer) lowDays += 1;
      }

      return { minBal, minDay, deficitDay, lowDays, endBal: bal };
    };

    const oldSim = simulate(oldDay);
    const newSim = simulate(newDay);

    const diff = {
      minBal: newSim.minBal - oldSim.minBal,
      lowDays: newSim.lowDays - oldSim.lowDays,
      deficitRemoved: !!oldSim.deficitDay && !newSim.deficitDay,
      deficitCreated: !oldSim.deficitDay && !!newSim.deficitDay,
    };

    const status =
      newSim.deficitDay
        ? { label: "위험", badge: "bg-[#ff8a3d] text-white", msg: `변경 후 첫 적자일: ${newSim.deficitDay}일` }
        : newSim.lowDays > 0
        ? { label: "경고", badge: "bg-[#ff8a3d] text-[#ffffff]", msg: `변경 후 버퍼 이하 ${newSim.lowDays}일` }
        : { label: "안정", badge: "bg-[#34D399] text-white", msg: "변경 후 위험 구간이 거의 없습니다." };

    return { dim, buffer, oldDay, newDay, oldSim, newSim, diff, status };
  }, [
    daysMode,
    daysInMonth,
    startBalance,
    salaryDay,
    salaryAmount,
    billingAmount,
    oldBillingDay,
    newBillingDay,
    otherFixedOut,
    otherOutDay,
    safetyBuffer,
  ]);

  const verdict = useMemo(() => {
    let score = 0;
    if (calc.diff.minBal > 0) score += 1;
    if (calc.diff.lowDays < 0) score += 1;
    if (calc.diff.deficitRemoved) score += 2;
    if (calc.diff.deficitCreated) score -= 2;

    if (score >= 2) return { label: "개선", tone: "good" as const, msg: "결제일 이동이 체감 여유를 키웁니다." };
    if (score <= -2) return { label: "악화", tone: "bad" as const, msg: "결제일 이동이 위험 구간을 키웁니다." };
    return { label: "유사", tone: "mid" as const, msg: "큰 변화가 없을 수 있습니다(월초 잔액/고정비 구조 점검)." };
  }, [calc]);

  return (
    <RecipeShell
      badge="결제일 변경 효과"
      title="카드 결제일 변경 효과 계산기"
      subtitle={
        <>
          결제일을 옮기면 “총지출”보다 <span className="font-semibold text-[#ffffff]">월중 최소 잔액</span>이 바뀝니다.
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* 입력 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                “급여/카드결제/월초 고정비” 날짜만으로도 민감도가 드러납니다.
              </p>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", calc.status.badge)}>
              {calc.status.label}
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectInput
                label="월 기준"
                value={daysMode}
                onChange={(v) => setDaysMode(v as any)}
                options={["30일 고정", "일수 직접입력"]}
              />
              {daysMode === "일수 직접입력" ? (
                <NumberInput label="이번 달 총 일수" value={daysInMonth} setValue={setDaysInMonth} hint="28~31" />
              ) : (
                <InfoPill label="이번 달 총 일수" value="30일(고정)" />
              )}

              <MoneyInput label="월초 잔액(가용)" value={startBalance} setValue={setStartBalance} />
              <MoneyInput label="안전 버퍼" value={safetyBuffer} setValue={setSafetyBuffer} />

              <NumberInput label="급여일" value={salaryDay} setValue={setSalaryDay} hint={`1~${calc.dim}`} />
              <MoneyInput label="급여액" value={salaryAmount} setValue={setSalaryAmount} />

              <MoneyInput label="카드 결제액(대금)" value={billingAmount} setValue={setBillingAmount} />

              <NumberInput label="기존 결제일" value={oldBillingDay} setValue={setOldBillingDay} hint={`1~${calc.dim}`} />
              <NumberInput label="변경 결제일" value={newBillingDay} setValue={setNewBillingDay} hint={`1~${calc.dim}`} />

              <NumberInput label="월초 고정비(대표일)" value={otherOutDay} setValue={setOtherOutDay} hint={`1~${calc.dim}`} />
              <MoneyInput label="월초 고정비 합(월)" value={otherFixedOut} setValue={setOtherFixedOut} hint="주거/보험/구독 등" />
            </div>
          </div>
        </section>

        {/* 결과 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>
          <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>{calc.status.msg}</p>

          <div className="mt-4 rounded-3xl border border-[#ffedd5] bg-white p-5">
            <div className="text-[12px] font-semibold text-[#7f7f7f]">판정</div>
            <div
              className={cn(
                "mt-2 text-4xl font-extrabold",
                verdict.tone === "good"
                  ? "text-[#10B981]"
                  : verdict.tone === "bad"
                  ? "text-[#ffffff]"
                  : "text-[#F59E0B]"
              )}
            >
              {verdict.label}
            </div>
            <div className={cn("mt-2 text-[12px]", UI.inkSoft)}>{verdict.msg}</div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricCard title="기존 최소 잔액" value={`${formatKRW(calc.oldSim.minBal)}원 (약 ${calc.oldSim.minDay}일)`} />
            <MetricCard title="변경 후 최소 잔액" value={`${formatKRW(calc.newSim.minBal)}원 (약 ${calc.newSim.minDay}일)`} />
            <MetricCard title="버퍼 이하 일수(기존 → 변경)" value={`${calc.oldSim.lowDays}일 → ${calc.newSim.lowDays}일`} />
            <MetricCard
              title="적자 여부(기존 → 변경)"
              value={`${calc.oldSim.deficitDay ? `있음(${calc.oldSim.deficitDay}일)` : "없음"} → ${
                calc.newSim.deficitDay ? `있음(${calc.newSim.deficitDay}일)` : "없음"
              }`}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-[#ffedd5] bg-white p-4">
            <div className={cn("text-[12px] font-semibold", UI.ink)}>변화</div>
            <div className="mt-3 grid gap-2">
              <Row
                label="최소 잔액 변화"
                value={`${calc.diff.minBal >= 0 ? "+" : ""}${formatKRW(calc.diff.minBal)}원`}
                tone={calc.diff.minBal >= 0 ? "ok" : "danger"}
              />
              <Row
                label="버퍼 이하 일수 변화"
                value={`${calc.diff.lowDays > 0 ? "+" : ""}${calc.diff.lowDays}일`}
                tone={calc.diff.lowDays <= 0 ? "ok" : "danger"}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/calculators/bonus-allocation"
              className="rounded-2xl bg-[#ff8a3d] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
            >
              다음: 상여/보너스 배분 →
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

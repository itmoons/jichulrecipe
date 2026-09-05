// src/app/calculators/pension-pace/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { RecipeShell } from "@/components/calculators/RecipeShell";
import { MoneyInput, NumberInput, SelectInput } from "@/components/calculators/Inputs";
import { MetricCard, Row } from "@/components/calculators/Metric";
import { cn, UI, toNumberSafe, formatKRW, clamp } from "@/lib/calculators/utils";

type Plan = "연금저축" | "IRP" | "합산";

export default function PensionPacePage() {
  const [plan, setPlan] = useState<Plan>("합산");
  const [targetAnnual, setTargetAnnual] = useState("6000000"); // 목표 연 납입액
  const [alreadyPaid, setAlreadyPaid] = useState("1000000");  // 현재까지 납입액
  const [monthsLeft, setMonthsLeft] = useState("8");          // 남은 개월 수

  const calc = useMemo(() => {
    const target = Math.max(0, toNumberSafe(targetAnnual));
    const paid = Math.max(0, toNumberSafe(alreadyPaid));
    const left = clamp(Math.round(toNumberSafe(monthsLeft)), 1, 12);

    const remain = Math.max(0, target - paid);
    const needPerMonth = remain / left;

    const status =
      target <= 0
        ? { label: "입력 필요", badge: "bg-[#1f7a5b] text-[#ffffff]" }
        : remain === 0
        ? { label: "목표 달성", badge: "bg-[#34D399] text-white" }
        : { label: "페이스 점검", badge: "bg-[#1f7a5b] text-white" };

    // “2주/4주” 납입 옵션 같은 실전 가이드
    const weekly = needPerMonth / 4;
    const biWeekly = needPerMonth / 2;

    return { target, paid, left, remain, needPerMonth, weekly, biWeekly, status };
  }, [targetAnnual, alreadyPaid, monthsLeft]);

  return (
    <RecipeShell
      badge="연금"
      title="연금저축/IRP 납입 페이스 계산기"
      subtitle={
        <>
          목표액 대비 남은 기간에 필요한 <span className="font-semibold text-[#ffffff]">월 납입 페이스</span>를 계산합니다.
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* 입력 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>세액공제 한도/적용은 개인 조건에 따라 달라질 수 있어요.</p>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", calc.status.badge)}>
              {calc.status.label}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SelectInput label="대상" value={plan} onChange={(v) => setPlan(v as any)} options={["연금저축", "IRP", "합산"]} />
            <NumberInput label="남은 개월 수" value={monthsLeft} setValue={setMonthsLeft} hint="1~12" />
            <MoneyInput label="목표 연 납입액" value={targetAnnual} setValue={setTargetAnnual} />
            <MoneyInput label="현재까지 납입액" value={alreadyPaid} setValue={setAlreadyPaid} />
          </div>

          <div className="mt-4 rounded-2xl border border-[#dcefe5] bg-white p-4">
            <div className="text-[12px] font-semibold text-[#3B2F1E]">팁</div>
            <ul className="mt-2 list-disc pl-5 text-[12px] text-[#6d6d6d]">
              <li>월 납입이 부담이면 “주간/격주 자동이체”로 쪼개면 체감이 줄어듭니다.</li>
              <li>목표액은 ‘한도’가 아니라 ‘내가 넣기로 한 금액’으로 잡는 게 지속됩니다.</li>
            </ul>
          </div>
        </section>

        {/* 결과 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricCard title="남은 납입액" value={`${formatKRW(calc.remain)}원`} />
            <MetricCard title="필요 월 납입(평균)" value={`${formatKRW(calc.needPerMonth)}원`} />
            <MetricCard title="주간 페이스(참고)" value={`${formatKRW(calc.weekly)}원/주`} />
            <MetricCard title="격주 페이스(참고)" value={`${formatKRW(calc.biWeekly)}원/2주`} />
          </div>

          <div className="mt-4 rounded-2xl border border-[#dcefe5] bg-white p-4">
            <div className={cn("text-[12px] font-semibold", UI.ink)}>실행 가이드</div>
            <div className="mt-3 grid gap-2">
              <Row label="권장 루틴" value="월급일 다음날 자동이체(또는 주간 분할)" tone="ok" />
              <Row label="체크 포인트" value="남은 개월 수가 줄수록 월 페이스가 급격히 상승" tone="danger" />
            </div>
            <p className="mt-3 text-xs font-semibold text-[#7f7f7f]">
              ※ 세액공제/한도 판단은 별도 기준이 있습니다. 이 계산기는 “납입 페이스”만 제공합니다.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/calculators/fee-accumulator"
              className="rounded-2xl bg-[#1f7a5b] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
            >
              다음: 수수료 누적 →
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

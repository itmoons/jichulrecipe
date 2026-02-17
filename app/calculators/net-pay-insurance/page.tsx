// src/app/calculators/net-pay-insurance/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { RecipeShell } from "@/components/calculators/RecipeShell";
import { MoneyInput } from "@/components/calculators/Inputs";
import { MetricCard, Row } from "@/components/calculators/Metric";
import { cn, UI, toNumberSafe, formatKRW, clamp } from "@/lib/calculators/utils";

export default function NetPayInsurancePage() {
  const [grossMonthly, setGrossMonthly] = useState("3200000");

  // “정확한 보험료율/상하한/과세표준”은 변동 가능 → 단정 금지
  // 대신, 보수적으로 “대략 범위”를 보여주는 방식(유입용 계산기).
  const calc = useMemo(() => {
    const g = Math.max(0, toNumberSafe(grossMonthly));

    // 아주 거친 범위(예: 7~10%)로 표시: 조잡해 보이지 않게 “범위”만 제시
    const lowRate = 0.07;
    const highRate = 0.10;

    const lowDeduct = g * lowRate;
    const highDeduct = g * highRate;

    const netHigh = g - lowDeduct; // 공제 적게 나오는(실수령 많아지는) 쪽
    const netLow = g - highDeduct; // 공제 많이 나오는(실수령 적어지는) 쪽

    const status =
      g <= 0
        ? { label: "입력 필요", badge: "bg-[#FBBF24] text-[#3B2F1E]" }
        : { label: "범위 추정", badge: "bg-[#F97316] text-white" };

    return { g, lowDeduct, highDeduct, netLow, netHigh, status };
  }, [grossMonthly]);

  return (
    <RecipeShell
      badge="실수령"
      title="4대보험 실수령액 계산기"
      subtitle={
        <>
          월급에서 4대보험/공제 등을 고려한 <span className="font-semibold text-[#F97316]">대략 실수령 범위</span>를 봅니다.
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* 입력 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
              <p className={cn("mt-1 text-sm", UI.inkSoft)}>
                정확 계산이 아니라 “현금흐름 계획”을 위한 범위 추정입니다.
              </p>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-sm font-semibold", calc.status.badge)}>
              {calc.status.label}
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            <MoneyInput label="월급(세전)" value={grossMonthly} setValue={setGrossMonthly} />
          </div>

          <div className="mt-4 rounded-2xl border border-[#F2E4B6] bg-white p-4">
            <div className="text-sm font-semibold text-[#3B2F1E]">안내</div>
            <p className="mt-2 text-sm text-[#6B5642]">
              개인별 과세/비과세, 급여항목, 보험료 상한/기준소득월액 등으로 실제 실수령은 달라집니다.
              여기서는 과도한 단정을 피하고 “범위”만 제공합니다.
            </p>
          </div>
        </section>

        {/* 결과 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <h2 className={cn("text-lg font-semibold", UI.ink)}>결과(대략)</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricCard title="세전 월급" value={`${formatKRW(calc.g)}원`} />
            <MetricCard title="공제 범위(대략)" value={`${formatKRW(calc.lowDeduct)}~${formatKRW(calc.highDeduct)}원`} />
            <MetricCard title="실수령 범위(대략)" value={`${formatKRW(calc.netLow)}~${formatKRW(calc.netHigh)}원`} />
            <MetricCard
              title="공제율 범위(대략)"
              value={`7%~10%`}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-[#F2E4B6] bg-white p-4">
            <div className={cn("text-sm font-semibold", UI.ink)}>예산에 쓰는 법</div>
            <div className="mt-3 grid gap-2">
              <Row label="보수적 계획" value="실수령 하단(낮은 값) 기준으로 고정비를 맞추세요" tone="ok" />
              <Row label="안정 버퍼" value="월급의 1~2주치 현금 버퍼가 있으면 결제일 리스크가 줄어요" tone="ok" />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/calculators/insurance-ratio-check"
              className="rounded-2xl bg-[#F97316] px-4 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#EA580C]"
            >
              다음: 보험료 점검 →
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

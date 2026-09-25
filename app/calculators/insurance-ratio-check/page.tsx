// src/app/calculators/insurance-ratio-check/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { RecipeShell } from "@/components/calculators/RecipeShell";
import { MoneyInput } from "@/components/calculators/Inputs";
import { MetricCard, Row } from "@/components/calculators/Metric";
import { cn, UI, toNumberSafe, formatKRW, clamp } from "@/lib/calculators/utils";

export default function InsuranceRatioCheckPage() {
  const [monthlyIncome, setMonthlyIncome] = useState("3000000"); // 월 소득(실수령 또는 가용 기준)
  const [monthlyInsurance, setMonthlyInsurance] = useState("250000"); // 월 보험료 합

  const calc = useMemo(() => {
    const inc = Math.max(0, toNumberSafe(monthlyIncome));
    const ins = Math.max(0, toNumberSafe(monthlyInsurance));

    const ratio = inc > 0 ? (ins / inc) * 100 : 0;

    // 단정 대신 “경보 레벨”만 (보수적/일반적으로 쓰이는 점검 프레임)
    const level =
      inc <= 0
        ? { label: "입력 필요", badge: "bg-[#1f7a5b] text-white" }
        : ratio < 5
        ? { label: "낮음", badge: "bg-[#34D399] text-white" }
        : ratio < 10
        ? { label: "보통", badge: "bg-[#1f7a5b] text-white" }
        : { label: "과다 의심", badge: "bg-[#1f7a5b] text-white" };

    const target5 = inc * 0.05;
    const target8 = inc * 0.08;

    return { inc, ins, ratio, level, target5, target8 };
  }, [monthlyIncome, monthlyInsurance]);

  return (
    <RecipeShell
      badge="보험"
      title="보험료 점검 계산기"
      subtitle={
        <>
          월 소득 대비 보험료 비율을 보고 <span className="font-semibold text-[#ffffff]">과다 가능성</span>을 점검합니다.
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* 입력 */}
        <section className={cn("rounded-xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>실수령(또는 가용 소득) 기준으로 넣어야 체감과 맞습니다.</p>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", calc.level.badge)}>
              {calc.level.label}
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            <MoneyInput label="월 소득(기준)" value={monthlyIncome} setValue={setMonthlyIncome} />
            <MoneyInput label="월 보험료 합계" value={monthlyInsurance} setValue={setMonthlyInsurance} />
          </div>

          <div className="mt-4 rounded-lg border border-[#e2e5e1] bg-white p-4">
            <div className="text-[12px] font-semibold text-[#3B2F1E]">팁</div>
            <ul className="mt-2 list-disc pl-5 text-[12px] text-[#6d6d6d]">
              <li>보장성/저축성/실손 등 성격이 섞이면 ‘합계’만으로도 과다 신호를 볼 수 있습니다.</li>
              <li>보험료가 높으면 “중복 담보/필요보장/갱신형 구조”부터 점검하세요.</li>
            </ul>
          </div>
        </section>

        {/* 결과 */}
        <section className={cn("rounded-xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricCard title="보험료 비율" value={`${clamp(calc.ratio, 0, 999).toFixed(1)}%`} />
            <MetricCard title="월 보험료" value={`${formatKRW(calc.ins)}원`} />
            <MetricCard title="5% 기준(참고)" value={`${formatKRW(calc.target5)}원`} />
            <MetricCard title="8% 기준(참고)" value={`${formatKRW(calc.target8)}원`} />
          </div>

          <div className="mt-4 rounded-lg border border-[#e2e5e1] bg-white p-4">
            <div className={cn("text-[12px] font-semibold", UI.ink)}>점검 포인트</div>
            <div className="mt-3 grid gap-2">
              <Row label="현재 레벨" value={calc.level.label} tone={calc.level.label === "과다 의심" ? "danger" : "ok"} />
              <Row
                label="1차 점검"
                value="중복 담보(실손/입원/수술 등) 여부"
                tone={calc.level.label === "과다 의심" ? "danger" : "ok"}
              />
              <Row
                label="2차 점검"
                value="갱신형(장기) 보험료 상승 리스크"
                tone={calc.level.label === "과다 의심" ? "danger" : "ok"}
              />
            </div>
            <p className="mt-3 text-xs font-semibold text-[#7f7f7f]">
              ※ ‘몇 %가 정답’은 개인 상황에 따라 달라요. 이 계산기는 과다 가능성을 빠르게 잡는 용도입니다.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/calculators/pension-pace"
              className="rounded-lg bg-[#1f7a5b] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#176247]"
            >
              다음: 연금저축/IRP 페이스 →
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

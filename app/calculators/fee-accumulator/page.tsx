// src/app/calculators/fee-accumulator/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { RecipeShell } from "@/components/calculators/RecipeShell";
import { MoneyInput, TextInput } from "@/components/calculators/Inputs";
import { MetricCard, Row } from "@/components/calculators/Metric";
import { cn, UI, toNumberSafe, formatKRW, uid } from "@/lib/calculators/utils";

type FeeItem = { id: string; label: string; monthlyFee: number };

export default function FeeAccumulatorPage() {
  const [items, setItems] = useState<FeeItem[]>([
    { id: uid(), label: "배달 수수료/배달비", monthlyFee: 30000 },
    { id: uid(), label: "플랫폼 이용료", monthlyFee: 15000 },
    { id: uid(), label: "송금/이체 수수료", monthlyFee: 2000 },
    { id: uid(), label: "환전 수수료(평균)", monthlyFee: 5000 },
  ]);

  const calc = useMemo(() => {
    const monthly = items.reduce((a, b) => a + Math.max(0, b.monthlyFee), 0);
    const annual = monthly * 12;
    const biggest = [...items].sort((a, b) => b.monthlyFee - a.monthlyFee)[0];
    return { monthly, annual, biggest };
  }, [items]);

  const addItem = () => setItems((p) => [...p, { id: uid(), label: "수수료 항목", monthlyFee: 0 }]);
  const removeItem = (id: string) => setItems((p) => p.filter((x) => x.id !== id));

  return (
    <RecipeShell
      badge="수수료"
      title="각종 수수료 누적 계산기"
      subtitle={
        <>
          배달/플랫폼/송금/환전 등 <span className="font-semibold text-[#ffffff]">보이지 않는 비용</span>을 월·연 단위로 합산합니다.
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* 입력 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>항목 입력</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>월 기준 평균값으로 넣으면 ‘누적’이 보입니다.</p>
            </div>
            <button
              onClick={addItem}
              className="rounded-full border border-[#dcefe5] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#7f7f7f] hover:border-[#1f7a5b]"
            >
              + 추가
            </button>
          </div>

          <div className="mt-4 grid gap-2">
            {items.map((it) => (
              <div key={it.id} className="rounded-2xl border border-[#dcefe5] bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[12px] font-semibold text-[#3B2F1E]">항목</div>
                  <button
                    onClick={() => removeItem(it.id)}
                    className="rounded-full border border-[#dcefe5] bg-white px-3 py-1 text-xs font-semibold text-[#7f7f7f] hover:border-[#1f7a5b]"
                  >
                    삭제
                  </button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <TextInput
                    label="이름"
                    value={it.label}
                    setValue={(v) => setItems((p) => p.map((x) => (x.id === it.id ? { ...x, label: v } : x)))}
                  />
                  <MoneyInput
                    label="월 수수료(평균)"
                    value={String(it.monthlyFee)}
                    setValue={(v) =>
                      setItems((p) =>
                        p.map((x) =>
                          x.id === it.id ? { ...x, monthlyFee: Math.max(0, toNumberSafe(v)) } : x
                        )
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-[#dcefe5] bg-white p-4">
            <div className="text-[12px] font-semibold text-[#3B2F1E]">팁</div>
            <ul className="mt-2 list-disc pl-5 text-[12px] text-[#6d6d6d]">
              <li>가장 큰 1~2개 항목만 줄여도 체감 절감이 큽니다.</li>
              <li>‘수수료’는 대체로 자동화된 경로에 숨어 있습니다(구독/플랫폼/결제).</li>
            </ul>
          </div>
        </section>

        {/* 결과 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <h2 className={cn("text-lg font-semibold", UI.ink)}>합산 결과</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricCard title="월 수수료 합" value={`${formatKRW(calc.monthly)}원`} />
            <MetricCard title="연 수수료 합" value={`${formatKRW(calc.annual)}원`} />
            <MetricCard
              title="가장 큰 항목"
              value={calc.biggest ? `${calc.biggest.label}` : "-"}
            />
            <MetricCard
              title="큰 항목의 월 비용"
              value={calc.biggest ? `${formatKRW(calc.biggest.monthlyFee)}원` : "0원"}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-[#dcefe5] bg-white p-4">
            <div className={cn("text-[12px] font-semibold", UI.ink)}>개선 포인트</div>
            <div className="mt-3 grid gap-2">
              <Row label="1순위" value="가장 큰 항목부터 ‘빈도/단가/대체재’로 쪼개서 줄이기" tone="ok" />
              <Row label="2순위" value="자잘한 수수료는 자동결제/결제수단 설정에서 줄어드는 경우가 많음" tone="ok" />
            </div>
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

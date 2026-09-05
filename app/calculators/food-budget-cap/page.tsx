// src/app/calculators/food-budget-cap/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/** 레시피북 톤(연노랑 + 주황) */
const UI = {
  paperBg: "bg-[#ffffff]",
  paperDots:
    "bg-[radial-gradient(circle,rgba(251,146,60,0.14)_1px,transparent_1px)] bg-[size:16px_16px] mx-auto w-full max-w-[1320px] px-3 py-4 sm:px-4 sm:py-6",
  ink: "text-[#3B2F1E]",
  inkSoft: "text-[#7f7f7f]",
  card: "bg-[#f1f8f4] border-[#dcefe5]",
};

function toNumberSafe(v: string) {
  const n = Number(String(v).replaceAll(",", "").trim());
  return Number.isFinite(n) ? n : 0;
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function formatKRW(n: number) {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("ko-KR");
}
function pct(n: number) {
  if (!Number.isFinite(n)) return "0.0";
  return n.toFixed(1);
}

type Goal = "절약" | "균형" | "편의";

export default function FoodBudgetCapPage() {
  // 입력
  const [household, setHousehold] = useState("2"); // 가구원 수
  const [goal, setGoal] = useState<Goal>("균형");

  const [eatOutPerWeek, setEatOutPerWeek] = useState("4"); // 외식/배달 주당 횟수(가구 기준)
  const [avgEatOutCost, setAvgEatOutCost] = useState("18000"); // 1회 평균 외식비(가구 기준)

  // 선택 입력: “지금 장보기 예산이 이미 정해져 있다”면 넣고, 없으면 0
  const [groceryBudget, setGroceryBudget] = useState("0");

  // 선택 입력: 현재 월 식비(자기 데이터)
  const [currentFoodSpend, setCurrentFoodSpend] = useState("0");

  const calc = useMemo(() => {
    const n = clamp(Math.floor(toNumberSafe(household)), 1, 10);

    const outings = clamp(toNumberSafe(eatOutPerWeek), 0, 21); // 주 0~21회(하루 3끼 상한 느낌)
    const avgOut = Math.max(0, toNumberSafe(avgEatOutCost));

    const groceryInput = Math.max(0, toNumberSafe(groceryBudget));
    const currentSpend = Math.max(0, toNumberSafe(currentFoodSpend));

    // 1) 목표별 “1인 1일 집밥 기준비(가이드)” (정답 아님, 기준값)
    // - 절약: 9,000원
    // - 균형: 11,000원
    // - 편의: 13,000원
    const basePerPersonPerDay =
      goal === "절약" ? 9000 : goal === "균형" ? 11000 : 13000;

    // 2) 외식이 늘수록 집밥(장보기) 필요액은 일부 감소하나, 완전히 선형으로 줄진 않음(집에 기본 식재료 유지)
    //    -> 집밥 계수: 1 - 0.35 * (외식비중)  (최소 0.65)
    // 외식비중을 ‘주당 외식횟수 / (주당 식사 기회 7*2)’로 잡음(하루 2끼를 가구가 “관리하는 영역”으로 단순화)
    const mealOpsPerWeek = 14; // 가정치
    const outShare = clamp(outings / mealOpsPerWeek, 0, 1);
    const homeFactor = clamp(1 - 0.35 * outShare, 0.65, 1);

    // 3) 권장 집밥(장보기) 상한: 1인1일기준 * 30일 * 가구원 * homeFactor
    const recommendedGrocery = basePerPersonPerDay * 30 * n * homeFactor;

    // 4) 외식/배달 월 추정: 주당횟수 * 4.33주 * 1회평균
    const weeksPerMonth = 4.33;
    const estimatedEatOut = outings * weeksPerMonth * avgOut;

    // 5) 권장 식비 상한(월): 집밥 + 외식
    const recommendedCap = recommendedGrocery + estimatedEatOut;

    // 6) 만약 사용자가 장보기 예산을 입력했다면, “현실형 상한”도 함께 제시
    //    -> 장보기 예산이 권장보다 크게 낮/높으면 안내
    const capWithInputGrocery = groceryInput > 0 ? groceryInput + estimatedEatOut : recommendedCap;

    // 7) 해석
    const capFinal = groceryInput > 0 ? capWithInputGrocery : recommendedCap;

    const gap = currentSpend > 0 ? currentSpend - capFinal : 0;
    const gapRate = capFinal > 0 && currentSpend > 0 ? (gap / capFinal) * 100 : 0;

    const signal =
      currentSpend === 0
        ? {
            label: "가이드 산출",
            badge: "bg-[#1f7a5b] text-[#ffffff]",
            msg: "현재 지출을 입력하면, 가이드 대비 과소/과다를 더 명확히 볼 수 있습니다.",
          }
        : gap <= 0
        ? {
            label: "범위 내",
            badge: "bg-[#34D399] text-white",
            msg: "현재 식비가 가이드 상한선 안쪽입니다. 유지하면서 ‘외식비 변동’만 모니터링해도 충분합니다.",
          }
        : gapRate <= 15
        ? {
            label: "조정 권장",
            badge: "bg-[#1f7a5b] text-[#ffffff]",
            msg: "가이드 상한선을 조금 넘습니다. 외식 횟수나 1회 평균 단가를 먼저 조정하는 게 효과적입니다.",
          }
        : {
            label: "점검 필요",
            badge: "bg-[#1f7a5b] text-white",
            msg: "가이드 상한선을 크게 넘습니다. ‘외식 구조(횟수×단가)’와 ‘장보기 새는 구간(간식/즉석)’을 동시에 점검하세요.",
          };

    // 8) 조정안(가장 쉬운 레버 제안)
    //    - (A) 외식 횟수 1회 줄이면: avgOut * 4.33 절감
    //    - (B) 1회 평균 2,000원 낮추면: outings*4.33*2000 절감
    //    - (C) 장보기 1만원 줄이면: 1만원 절감 (단, 현실적으로 난이도는 개인차)
    const savePerOneLessOuting = avgOut * weeksPerMonth;
    const savePer2000Down = outings * weeksPerMonth * 2000;
    const savePer10000GroceryCut = 10000;

    const levers = [
      { key: "외식 1회 줄이기(주당)", save: savePerOneLessOuting, tip: "‘주 1회’만 줄여도 월 단위로 크게 보입니다." },
      { key: "외식 1회 평균 -2,000원", save: savePer2000Down, tip: "메뉴/음료/배달비를 같이 보세요." },
      { key: "장보기 -10,000원", save: savePer10000GroceryCut, tip: "충동 간식/즉석식품 비중을 먼저 줄이세요." },
    ].sort((a, b) => b.save - a.save);

    return {
      n,
      outShare,
      basePerPersonPerDay,
      homeFactor,
      recommendedGrocery,
      estimatedEatOut,
      recommendedCap,
      capFinal,
      groceryInput,
      currentSpend,
      gap,
      gapRate,
      signal,
      levers,
    };
  }, [household, goal, eatOutPerWeek, avgEatOutCost, groceryBudget, currentFoodSpend]);

  return (
    <div className={cn("min-h-screen", UI.paperBg)}>
      <div className={cn("min-h-screen", UI.paperDots)}>
        <div className="mx-auto px-2 py-2 sm:py-2">
          {/* 상단 네비 */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <Link
              href="/calculators"
              className="rounded-full border border-[#dcefe5] bg-[#f1f8f4] px-3 py-1.5 text-[12px] font-semibold text-[#7f7f7f] hover:border-[#1f7a5b]"
            >
              ← 계산기 모음
            </Link>

            <span className="rounded-full bg-[#1f7a5b] px-3 py-1.5 text-[12px] font-semibold text-[#ffffff]">
              식비 설계
            </span>
          </div>

          {/* 헤더 */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dcefe5] bg-[#f1f8f4] px-3 py-1 text-xs font-medium text-[#7f7f7f] shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#1f7a5b]" />
              Recipe Calculator
            </div>

            <h1 className={cn("mt-3 text-2xl sm:text-3xl font-semibold tracking-tight", UI.ink)}>
              식비 상한선 계산기
            </h1>
            <p className={cn("mt-2 text-[12px] sm:text-base", UI.inkSoft)}>
              가구원 수와 외식 빈도를 바탕으로 <span className="font-semibold text-[#ffffff]">월 식비 상한선(가이드)</span>을 만듭니다.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {/* 입력 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                외식/배달은 “가구 기준”으로 입력하세요.
              </p>

              <div className="mt-4 grid gap-3">
                <NumberInput label="가구원 수" value={household} setValue={setHousehold} hint="1~10명" />
                <SelectInput
                  label="목표"
                  value={goal}
                  onChange={(v) => setGoal(v as Goal)}
                  options={["절약", "균형", "편의"]}
                  hint="기준을 어떻게 잡을지 선택"
                />
                <NumberInput label="외식/배달 주당 횟수(가구 기준)" value={eatOutPerWeek} setValue={setEatOutPerWeek} hint="예: 4" />
                <MoneyInput label="외식/배달 1회 평균 비용(가구 기준)" value={avgEatOutCost} setValue={setAvgEatOutCost} hint="예: 18,000" />

                <div className="rounded-2xl border border-[#dcefe5] bg-white p-4">
                  <div className={cn("text-[12px] font-semibold", UI.ink)}>선택 입력(정확도↑)</div>
                  <div className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                    이미 정해둔 장보기 예산이나 현재 월 식비가 있으면 입력하세요.
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <MoneyInput label="장보기/집밥 월 예산(선택)" value={groceryBudget} setValue={setGroceryBudget} />
                    <MoneyInput label="현재 월 식비(선택)" value={currentFoodSpend} setValue={setCurrentFoodSpend} />
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#dcefe5] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>계산 방식(간단히)</div>
                <ul className={cn("mt-2 list-disc pl-5 text-[12px] leading-relaxed", UI.inkSoft)}>
                  <li>집밥 가이드는 “1인 1일 기준비 × 30일 × 가구원”에 외식 비중을 반영해 조정합니다.</li>
                  <li>외식/배달은 “주당 횟수 × 4.33주 × 1회 평균 비용”으로 월 환산합니다.</li>
                  <li>결과는 ‘정답’이 아니라 본인 기준을 만드는 출발점입니다.</li>
                </ul>
              </div>
            </section>

            {/* 결과 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={cn("text-lg font-semibold", UI.ink)}>가이드 결과</h2>
                  <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                    집밥/외식을 분해해서 상한선을 제시합니다.
                  </p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", calc.signal.badge)}>
                  {calc.signal.label}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricCard title="권장 집밥(장보기) 상한" value={`${formatKRW(calc.recommendedGrocery)}원`} />
                <MetricCard title="외식/배달 월 추정" value={`${formatKRW(calc.estimatedEatOut)}원`} />
              </div>

              <div className="mt-4 rounded-2xl border border-[#dcefe5] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className={cn("text-[12px] font-semibold", UI.ink)}>월 식비 상한선(가이드)</div>
                  <span className="rounded-full bg-[#1f7a5b] px-3 py-1 text-xs font-semibold text-[#ffffff]">
                    목표: {goal}
                  </span>
                </div>

                <div className="mt-2 text-3xl font-bold text-[#ffffff]">
                  {formatKRW(calc.capFinal)}원/월
                </div>

                <div className={cn("mt-2 text-[12px] leading-relaxed", UI.inkSoft)}>
                  {calc.signal.msg}
                </div>

                {toNumberSafe(currentFoodSpend) > 0 && (
                  <div className="mt-3 rounded-xl border border-[#dcefe5] bg-[#1f7a5b] p-3">
                    <div className="text-xs font-semibold text-[#7f7f7f]">현재 지출 대비</div>
                    <div className="mt-1 text-[12px] font-semibold text-[#3B2F1E]">
                      차이:{" "}
                      <span className={cn(calc.gap <= 0 ? "text-[#34D399]" : "text-[#ffffff]")}>
                        {(calc.gap >= 0 ? "+" : "") + formatKRW(calc.gap)}원
                      </span>{" "}
                      <span className="text-xs text-[#7f7f7f]">
                        ({calc.capFinal > 0 ? pct(calc.gapRate) : "0.0"}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 조정 레버 */}
              <div className="mt-4 rounded-2xl border border-[#dcefe5] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>조정 레버(효과 큰 순)</div>
                <div className={cn("mt-1 text-xs", UI.inkSoft)}>
                  입력값 기준으로 “월 절감 가능성”이 큰 조정안을 위에 둡니다.
                </div>

                <div className="mt-3 grid gap-2">
                  {calc.levers.map((x) => (
                    <div
                      key={x.key}
                      className="rounded-xl border border-[#dcefe5] bg-[#1f7a5b] p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[12px] font-semibold text-[#3B2F1E]">{x.key}</div>
                        <div className="text-[12px] font-bold text-[#ffffff]">
                          약 {formatKRW(x.save)}원/월
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-[#7f7f7f]">{x.tip}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/calculators/coffee-delivery-accum"
                  className="rounded-2xl bg-[#1f7a5b] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
                >
                  다음: 커피/배달 누적 계산 →
                </Link>
                <Link
                  href="/calculators"
                  className="rounded-2xl border border-[#dcefe5] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#1f7a5b]"
                >
                  계산기 모음으로
                </Link>
              </div>

              <div className={cn("mt-4 text-xs leading-relaxed", UI.inkSoft)}>
                ※ 가이드는 생활권 물가/식습관에 따라 조정이 필요합니다. “현재 식비”를 입력해 본인 기준으로 보정해 쓰는 것을 권합니다.
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ----------------- UI Components ----------------- */

function NumberInput({
  label,
  value,
  setValue,
  hint,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-end justify-between gap-2">
        <label className="text-[12px] font-semibold text-[#3B2F1E]">{label}</label>
        {hint && <span className="text-xs text-[#7f7f7f]">{hint}</span>}
      </div>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="0"
        className={cn(
          "h-11 w-full rounded-xl border bg-white px-3 text-[12px] outline-none",
          "border-[#dcefe5] focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20"
        )}
      />
    </div>
  );
}

function MoneyInput({
  label,
  value,
  setValue,
  hint,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-end justify-between gap-2">
        <label className="text-[12px] font-semibold text-[#3B2F1E]">{label}</label>
        {hint && <span className="text-xs text-[#7f7f7f]">{hint}</span>}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#9C7A55]">
          ₩
        </span>
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
          className={cn(
            "h-11 w-full rounded-xl border bg-white pl-8 pr-3 text-[12px] outline-none",
            "border-[#dcefe5] focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20"
          )}
        />
      </div>
    </div>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-end justify-between gap-2">
        <label className="text-[12px] font-semibold text-[#3B2F1E]">{label}</label>
        {hint && <span className="text-xs text-[#7f7f7f]">{hint}</span>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-11 w-full rounded-xl border bg-white px-3 text-[12px] outline-none",
          "border-[#dcefe5] focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20"
        )}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#dcefe5] bg-white p-4">
      <div className="text-xs font-semibold text-[#7f7f7f]">{title}</div>
      <div className="mt-1 text-xl font-bold text-[#3B2F1E]">{value}</div>
    </div>
  );
}

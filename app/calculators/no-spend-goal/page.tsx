// src/app/calculators/no-spend-goal/page.tsx
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
    "bg-[radial-gradient(circle,rgba(251,146,60,0.14)_1px,transparent_1px)] bg-[size:16px_16px] mx-auto w-full max-w-[1280px] px-3 py-4 sm:px-4 sm:py-6",
  ink: "text-[#3B2F1E]",
  inkSoft: "text-[#7f7f7f]",
  card: "bg-[#f2fbff] border-[#e8f8ff]",
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

type Mode = "절감액 역산" | "가능 일수 역산";

export default function NoSpendGoalPage() {
  const [mode, setMode] = useState<Mode>("절감액 역산");

  // 공통 입력
  const [daysInMonth, setDaysInMonth] = useState("30");
  const [todayDay, setTodayDay] = useState("17");

  // 가변비(무지출로 줄일 대상) 기준
  const [variableMonthly, setVariableMonthly] = useState("900000"); // 이번달 가변비 예산/예상
  const [alreadySpent, setAlreadySpent] = useState("250000"); // 현재까지 가변비 지출
  const [mustSpend, setMustSpend] = useState("150000"); // 남은 기간 ‘피할 수 없는’ 가변비(최소)

  // 목표
  const [goalNoSpendDays, setGoalNoSpendDays] = useState("10"); // 목표 무지출 일수(남은 기간 중)

  // 옵션
  const [bufferPct, setBufferPct] = useState("10"); // 계획 실패/예외 대비 버퍼(%)

  const calc = useMemo(() => {
    const totalDays = clamp(toNumberSafe(daysInMonth), 28, 31);
    const today = clamp(toNumberSafe(todayDay), 1, totalDays);
    const daysLeft = Math.max(0, totalDays - today + 1); // 오늘 포함 남은 일수

    const V = Math.max(0, toNumberSafe(variableMonthly));
    const spent = Math.max(0, toNumberSafe(alreadySpent));
    const must = Math.max(0, toNumberSafe(mustSpend));

    const buf = clamp(toNumberSafe(bufferPct), 0, 50) / 100;

    // 남은 가변비 ‘기본 여력’
    const remainVar = V - spent;

    // 남은 기간 중, 지출이 발생하는 날(= 지출데이) 수
    // 목표 무지출 일수는 ‘남은 기간’ 안에서만 의미가 있다고 가정
    const goal = clamp(toNumberSafe(goalNoSpendDays), 0, daysLeft);
    const spendDays = Math.max(0, daysLeft - goal);

    // 지출데이에 쓸 수 있는 “1일 평균” 한도(필수지출 must를 먼저 확보)
    // must는 남은 기간에 어쩔 수 없이 나갈 최소 가변비라고 가정
    const remainAfterMust = remainVar - must;

    // 버퍼 적용(보수적으로)
    const safeAfterMust = remainAfterMust * (1 - buf);

    // 목표 달성에 필요한 조건:
    // 1) remainVar >= must (최소지출은 감당 가능)
    // 2) spendDays > 0 이면: (safeAfterMust / spendDays) >= 0
    //    즉 목표 자체는 "지출데이 수"를 줄이는 것이므로,
    //    핵심은 safeAfterMust가 음수로 내려가면 구조적으로 어려움.

    // 목표일수 → 필요 절감액:
    // 목표 no-spend를 달성하려면,
    // “지출데이”에 쓸 수 있는 금액(= remainAfterMust) 안에서
    // 실제 지출이 관리되어야 함.
    //
    // 여기서는 단순하게:
    // - 기본(균등) 모델: 남은 기간을 ‘지출데이’에만 배분할 때의 1일 한도 제시
    // - 추가 절감액: safeAfterMust가 음수면, 0이 되도록(=must+buffer까지 포함) 절감 필요
    const needCutToNonNegative = Math.max(0, -safeAfterMust); // 안전 여력 음수면 그만큼 줄여야 0
    const dailyCapSpendDay = spendDays > 0 ? Math.max(0, safeAfterMust) / spendDays : 0;

    // 반대로, 절감액을 정해두고 “가능한 무지출 일수” 계산(모드2)
    // 입력으로는 ‘목표 절감액’이 필요하므로, mode2에서만 사용
    // (UI에서 값 받음)
    return {
      totalDays,
      today,
      daysLeft,
      V,
      spent,
      must,
      bufPct: buf * 100,
      remainVar,
      goal,
      spendDays,
      remainAfterMust,
      safeAfterMust,
      needCutToNonNegative,
      dailyCapSpendDay,
    };
  }, [daysInMonth, todayDay, variableMonthly, alreadySpent, mustSpend, goalNoSpendDays, bufferPct]);

  // 모드2: 절감액 입력 → 가능 일수 역산
  const [plannedCut, setPlannedCut] = useState("100000"); // 남은 기간 추가로 줄일 금액

  const calc2 = useMemo(() => {
    const cut = Math.max(0, toNumberSafe(plannedCut));
    const daysLeft = calc.daysLeft;

    // 절감액을 반영한 “안전 여력”
    // safeAfterMust = (remainAfterMust) * (1-buf)
    // remainAfterMust = remainVar - must
    // remainVar = V - spent
    //
    // cut을 적용하면 remainVar가 그만큼 늘어난다고(=실지출을 줄인다고) 보는 단순 모델:
    const remainVarAfterCut = (calc.V - calc.spent) + cut;
    const remainAfterMust = remainVarAfterCut - calc.must;
    const safeAfterMust = remainAfterMust * (1 - calc.bufPct / 100);

    // safeAfterMust가 0보다 크면, 지출데이 수를 늘려도 되는 여력이 있다는 뜻.
    // 그런데 “가능 무지출 일수”는 spendDays를 최소화하는 것.
    // 현실적으로는 지출데이를 0으로 만들 수 없으니 최소 1일 지출데이 가정(선택).
    const minSpendDays = 1;

    // 지출데이 1일로 몰아쓰는 극단은 비현실적일 수 있어, 기본값으로 7일 주기(주 1~2회 지출)를 안내하는 편이 낫지만,
    // 계산기는 ‘가능한 최대 무지출 일수’를 보여주면 됨.
    // safeAfterMust가 음수면 목표 무지출은커녕 최소지출도 위험.
    if (daysLeft <= 0) {
      return {
        cut,
        safeAfterMust,
        maxNoSpendDays: 0,
        suggestedSpendDays: 0,
        dailyCapIfSpendWeekly: 0,
        status: {
          label: "입력 필요",
          badge: "bg-[#52a9ff] text-[#ffffff]",
          msg: "남은 일수를 확인하세요.",
        },
      };
    }

    if (safeAfterMust < 0) {
      return {
        cut,
        safeAfterMust,
        maxNoSpendDays: 0,
        suggestedSpendDays: daysLeft,
        dailyCapIfSpendWeekly: 0,
        status: {
          label: "위험",
          badge: "bg-[#5bbbf3] text-white",
          msg: "절감액을 반영해도 ‘최소 가변비’ 충당이 어렵습니다. 확정/최소 지출을 다시 점검하세요.",
        },
      };
    }

    // 최대 무지출 일수 = daysLeft - 최소 지출데이
    const maxNoSpendDays = Math.max(0, daysLeft - minSpendDays);

    // 참고: 주 2회 지출(지출데이 = ceil(daysLeft/3.5))일 때 1일 한도
    const spendDaysWeekly = Math.max(2, Math.ceil(daysLeft / 3.5));
    const dailyCapIfSpendWeekly = safeAfterMust / spendDaysWeekly;

    return {
      cut,
      safeAfterMust,
      maxNoSpendDays,
      suggestedSpendDays: minSpendDays,
      dailyCapIfSpendWeekly,
      status: {
        label: "가능",
        badge: "bg-[#34D399] text-white",
        msg: "절감액을 반영했을 때, 무지출 데이를 늘릴 여력이 있습니다.",
      },
    };
  }, [plannedCut, calc]);

  const status1 =
    calc.daysLeft <= 0
      ? { label: "입력 필요", badge: "bg-[#52a9ff] text-[#ffffff]", msg: "남은 일수를 확인하세요." }
      : calc.remainVar < 0
      ? { label: "초과", badge: "bg-[#5bbbf3] text-white", msg: "가변비 예산 대비 이미 지출이 큽니다. 예산/지출 입력을 점검하세요." }
      : calc.safeAfterMust < 0
      ? {
          label: "위험",
          badge: "bg-[#5bbbf3] text-white",
          msg: "목표 무지출 일수를 적용하면 구조적으로 여력이 부족합니다. ‘필수 최소지출’ 또는 목표 일수를 조정해보세요.",
        }
      : { label: "계산됨", badge: "bg-[#34D399] text-white", msg: "목표 달성을 위한 지출데이 한도를 계산했습니다." };

  return (
    <div className={cn("min-h-screen", UI.paperBg)}>
      <div className={cn("min-h-screen", UI.paperDots)}>
        <div className="mx-auto px-2 py-2 sm:py-2">
          {/* 상단 네비 */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <Link
              href="/calculators"
              className="rounded-full border border-[#e8f8ff] bg-[#f2fbff] px-3 py-1.5 text-[12px] font-semibold text-[#7f7f7f] hover:border-[#5bbbf3]"
            >
              ← 계산기 모음
            </Link>

            <span className="rounded-full bg-[#5bbbf3] px-3 py-1.5 text-[12px] font-semibold text-[#ffffff]">
              무지출 목표
            </span>
          </div>

          {/* 헤더 */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8f8ff] bg-[#f2fbff] px-3 py-1 text-xs font-medium text-[#7f7f7f] shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#5bbbf3]" />
              Recipe Calculator
            </div>

            <h1 className={cn("mt-3 text-2xl sm:text-3xl font-semibold tracking-tight", UI.ink)}>
              무지출 데이 목표 달성 계산기
            </h1>
            <p className={cn("mt-2 text-[12px] sm:text-base", UI.inkSoft)}>
              목표 무지출 일수에 맞추려면, 남은 기간에{" "}
              <span className="font-semibold text-[#ffffff]">얼마나 절감해야 하는지</span>를 역산합니다.
            </p>
          </div>

          {/* 모드 토글 */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => setMode("절감액 역산")}
              className={cn(
                "rounded-2xl px-4 py-2 text-[12px] font-semibold border",
                mode === "절감액 역산"
                  ? "bg-[#5bbbf3] text-white border-[#5bbbf3]"
                  : "bg-white text-[#7f7f7f] border-[#e8f8ff] hover:border-[#5bbbf3]"
              )}
            >
              목표일수 → 필요 절감액
            </button>
            <button
              onClick={() => setMode("가능 일수 역산")}
              className={cn(
                "rounded-2xl px-4 py-2 text-[12px] font-semibold border",
                mode === "가능 일수 역산"
                  ? "bg-[#5bbbf3] text-white border-[#5bbbf3]"
                  : "bg-white text-[#7f7f7f] border-[#e8f8ff] hover:border-[#5bbbf3]"
              )}
            >
              절감액 → 가능 무지출 일수
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {/* 입력 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
                  <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                    무지출로 줄일 대상은 “가변비(식비/카페/배달/쇼핑 등)”로 잡는 게 현실적입니다.
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-[12px] font-semibold",
                    mode === "절감액 역산" ? status1.badge : calc2.status.badge
                  )}
                >
                  {mode === "절감액 역산" ? status1.label : calc2.status.label}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-[#e8f8ff] bg-white p-4">
                  <div className="text-[12px] font-semibold text-[#3B2F1E]">기간</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <NumberInput label="이번 달 총 일수" value={daysInMonth} setValue={setDaysInMonth} hint="28~31" />
                    <NumberInput label="오늘은 몇 일?" value={todayDay} setValue={setTodayDay} hint="1~말일" />
                    <InfoPill label="남은 일수(오늘 포함)" value={`${calc.daysLeft}일`} />
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e8f8ff] bg-white p-4">
                  <div className="text-[12px] font-semibold text-[#3B2F1E]">가변비 기준</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <MoneyInput
                      label="이번 달 가변비 예산(또는 예상)"
                      value={variableMonthly}
                      setValue={setVariableMonthly}
                      hint="식비/카페/배달/쇼핑 등"
                    />
                    <MoneyInput
                      label="현재까지 가변비 지출"
                      value={alreadySpent}
                      setValue={setAlreadySpent}
                      hint="카드/현금 포함"
                    />
                    <MoneyInput
                      label="남은 기간 ‘피할 수 없는’ 최소 가변비"
                      value={mustSpend}
                      setValue={setMustSpend}
                      hint="예: 약속/교통/필수식재"
                    />
                    <PctInput
                      label="안전 버퍼(%)"
                      value={bufferPct}
                      setValue={setBufferPct}
                      hint="예: 10% (계획 실패 대비)"
                    />
                  </div>

                  <div className="mt-3 rounded-xl border border-[#e8f8ff] bg-[#5bbbf3] px-3 py-2 text-xs font-semibold text-[#7f7f7f]">
                    남은 가변비(예산-지출):{" "}
                    <span className="text-[#ffffff]">{formatKRW(calc.remainVar)}원</span>
                  </div>
                </div>

                {mode === "절감액 역산" ? (
                  <div className="rounded-2xl border border-[#e8f8ff] bg-white p-4">
                    <div className="text-[12px] font-semibold text-[#3B2F1E]">목표</div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <NumberInput
                        label="목표 무지출 일수(남은 기간 중)"
                        value={goalNoSpendDays}
                        setValue={setGoalNoSpendDays}
                        hint="0~남은일수"
                      />
                      <InfoPill label="지출데이 수(남은일수-무지출)" value={`${calc.spendDays}일`} />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#e8f8ff] bg-white p-4">
                    <div className="text-[12px] font-semibold text-[#3B2F1E]">절감 계획</div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <MoneyInput
                        label="남은 기간 추가 절감액"
                        value={plannedCut}
                        setValue={setPlannedCut}
                        hint="예: 10만원"
                      />
                      <InfoPill label="적용 후 안전 여력" value={`${formatKRW(calc2.safeAfterMust)}원`} />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>현실 팁(레시피)</div>
                <ul className={cn("mt-2 list-disc pl-5 text-[12px] leading-relaxed", UI.inkSoft)}>
                  <li>무지출은 “완전 0원”보다, 카페/배달/쇼핑 같은 “가변비 차단”으로 정의하면 성공률이 올라갑니다.</li>
                  <li>지출데이는 “몰아서 장보기”처럼 계획형 지출로 운영하세요.</li>
                  <li>버퍼(10% 내외)를 두면 실패해도 월말 목표가 무너지지 않습니다.</li>
                </ul>
              </div>
            </section>

            {/* 결과 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                {mode === "절감액 역산" ? status1.msg : calc2.status.msg}
              </p>

              {mode === "절감액 역산" ? (
                <>
                  {/* 헤드라인 */}
                  <div className="mt-4 rounded-3xl border border-[#e8f8ff] bg-white p-5">
                    <div className="text-[12px] font-semibold text-[#7f7f7f]">
                      목표 {calc.goal}일 무지출을 위한 “지출데이 1일 한도(안전)”
                    </div>
                    <div className="mt-2 text-4xl font-extrabold text-[#ffffff]">
                      {formatKRW(calc.dailyCapSpendDay)}원
                    </div>
                    <div className={cn("mt-2 text-[12px]", UI.inkSoft)}>
                      지출을 “{calc.spendDays}일”에만 하도록 설계했을 때의 1일 평균 한도입니다.
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <MetricCard title="남은 가변비" value={`${formatKRW(calc.remainVar)}원`} />
                    <MetricCard title="최소 가변비(필수)" value={`${formatKRW(calc.must)}원`} />
                    <MetricCard title="버퍼 적용 후 여력" value={`${formatKRW(Math.max(0, calc.safeAfterMust))}원`} />
                    <MetricCard title="지출데이 수" value={`${calc.spendDays}일`} />
                  </div>

                  <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                    <div className={cn("text-[12px] font-semibold", UI.ink)}>필요 절감액(역산)</div>
                    <div className={cn("mt-2 text-[12px]", UI.inkSoft)}>
                      목표 구조에서 안전 여력이 음수라면, 그만큼을 추가로 줄여야 “0 이상”이 됩니다.
                    </div>

                    <div className="mt-3 rounded-xl border border-[#e8f8ff] bg-[#5bbbf3] px-3 py-2">
                      <div className="text-xs font-semibold text-[#7f7f7f]">필요 추가 절감액(최소)</div>
                      <div className="mt-1 text-2xl font-extrabold text-[#ffffff]">
                        {formatKRW(calc.needCutToNonNegative)}원
                      </div>
                    </div>

                    <div className={cn("mt-2 text-xs leading-relaxed", UI.inkSoft)}>
                      ※ 이 값은 “성공 확률을 위해 버퍼까지 반영”한 최소 절감액입니다. 무지출 목표가 높을수록,
                      지출데이에 쓸 수 있는 1일 한도는 더 작아집니다.
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* 헤드라인 */}
                  <div className="mt-4 rounded-3xl border border-[#e8f8ff] bg-white p-5">
                    <div className="text-[12px] font-semibold text-[#7f7f7f]">추가 절감 {formatKRW(calc2.cut)}원일 때</div>
                    <div className="mt-2 text-4xl font-extrabold text-[#ffffff]">
                      최대 무지출 {calc2.maxNoSpendDays}일
                    </div>
                    <div className={cn("mt-2 text-[12px]", UI.inkSoft)}>
                      최소 지출데이 1일을 가정한 “이론상 최대치”입니다. 현실적 운영은 주 1~2회 지출데이가 보통입니다.
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                    <div className={cn("text-[12px] font-semibold", UI.ink)}>현실 운영 예시(주 2회 지출)</div>
                    <div className="mt-3 rounded-xl border border-[#e8f8ff] bg-[#5bbbf3] px-3 py-2">
                      <div className="text-xs font-semibold text-[#7f7f7f]">지출데이 1일 한도(주 2회 가정)</div>
                      <div className="mt-1 text-2xl font-extrabold text-[#ffffff]">
                        {formatKRW(calc2.dailyCapIfSpendWeekly)}원
                      </div>
                    </div>
                    <div className={cn("mt-2 text-xs leading-relaxed", UI.inkSoft)}>
                      * 남은 기간을 기준으로 주 2회 정도 지출한다고 가정해, 지출데이 수를 대략적으로 잡았습니다.
                    </div>
                  </div>
                </>
              )}

              {/* CTA */}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/calculators/cutback-goal"
                  className="rounded-2xl bg-[#5bbbf3] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
                >
                  다음: 지출 컷 목표 역산 →
                </Link>
                <Link
                  href="/calculators"
                  className="rounded-2xl border border-[#e8f8ff] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#5bbbf3]"
                >
                  계산기 모음으로
                </Link>
              </div>

              <div className={cn("mt-4 text-xs leading-relaxed", UI.inkSoft)}>
                ※ 본 계산기는 금융상품/대출을 추천하지 않습니다. 무지출 목표를 “금액/일수”로 바꿔 계획 가능하게 만드는 도구입니다.
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ----------------- UI Components ----------------- */

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
            "border-[#e8f8ff] focus:border-[#5bbbf3] focus:ring-2 focus:ring-[#5bbbf3]/20"
          )}
        />
      </div>
    </div>
  );
}

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
          "border-[#e8f8ff] focus:border-[#5bbbf3] focus:ring-2 focus:ring-[#5bbbf3]/20"
        )}
      />
    </div>
  );
}

function PctInput({
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
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
          className={cn(
            "h-11 w-full rounded-xl border bg-white px-3 pr-10 text-[12px] outline-none",
            "border-[#e8f8ff] focus:border-[#5bbbf3] focus:ring-2 focus:ring-[#5bbbf3]/20"
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#9C7A55]">
          %
        </span>
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e8f8ff] bg-white p-4">
      <div className="text-xs font-semibold text-[#7f7f7f]">{title}</div>
      <div className="mt-1 text-xl font-bold text-[#3B2F1E]">{value}</div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1.5">
      <div className="text-[12px] font-semibold text-[#3B2F1E]">{label}</div>
      <div className="rounded-xl border border-[#e8f8ff] bg-[#5bbbf3] px-3 py-2 text-[12px] font-bold text-[#7f7f7f]">
        {value}
      </div>
    </div>
  );
}

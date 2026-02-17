// src/app/calculators/variable-spend-safe/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/** 레시피북 톤(연노랑 + 주황) */
const UI = {
  paperBg: "bg-[#FFFFFF]",
  paperDots:
    "bg-[radial-gradient(circle,rgba(251,146,60,0.14)_1px,transparent_1px)] bg-[size:16px_16px]",
  ink: "text-[#3B2F1E]",
  inkSoft: "text-[#6B5642]",
  card: "bg-[#FFF9F2] border-[#F2E4B6]",
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

type WeekMode = "이번 주만" | "남은 기간 균등";
type MonthMode = "30일 고정" | "일수 직접입력";

export default function VariableSpendSafePage() {
  // 입력값
  const [currentBalance, setCurrentBalance] = useState("850000"); // 현재 통장 잔액(가용)
  const [targetEndBalance, setTargetEndBalance] = useState("300000"); // 월말 목표 잔액(남기고 싶은 돈)

  const [daysLeftMode, setDaysLeftMode] = useState<MonthMode>("30일 고정");
  const [daysInMonth, setDaysInMonth] = useState("30");
  const [todayDay, setTodayDay] = useState("17"); // 오늘이 몇 일(1~말일)

  const [knownUpcoming, setKnownUpcoming] = useState("250000"); // 남은 기간 확정지출(결제 예정/회비 등)
  const [bufferPct, setBufferPct] = useState("10"); // 안전 버퍼(%)

  const [weekMode, setWeekMode] = useState<WeekMode>("이번 주만");
  const [daysThisWeek, setDaysThisWeek] = useState("7"); // 이번 주 남은 일수(기본 7)
  const [spentThisWeek, setSpentThisWeek] = useState("0"); // 이번 주 이미 쓴 가변비(선택)

  const calc = useMemo(() => {
    const bal = Math.max(0, toNumberSafe(currentBalance));
    const target = Math.max(0, toNumberSafe(targetEndBalance));
    const upcoming = Math.max(0, toNumberSafe(knownUpcoming));

    const buf = clamp(toNumberSafe(bufferPct), 0, 50) / 100; // 0~50%

    // 남은 일수 계산
    let totalDays = 30;
    let today = clamp(toNumberSafe(todayDay), 1, 31);

    if (daysLeftMode === "일수 직접입력") {
      totalDays = clamp(toNumberSafe(daysInMonth), 28, 31);
    } else {
      totalDays = 30;
    }

    today = clamp(today, 1, totalDays);
    const daysLeft = Math.max(0, totalDays - today + 1); // 오늘 포함 남은 일수

    // 남은 기간 가변비로 쓸 수 있는 총액(= 잔액 - 월말목표 - 확정지출)
    const rawAvailable = bal - target - upcoming;

    // 안전 버퍼 적용
    const safeAvailable = rawAvailable * (1 - buf);

    // 일 단위
    const daily = daysLeft > 0 ? safeAvailable / daysLeft : 0;

    // 이번 주 계산
    const wDays = clamp(toNumberSafe(daysThisWeek), 1, 14);
    const spentW = Math.max(0, toNumberSafe(spentThisWeek));

    let weeklyCap = 0;
    let note = "";

    if (weekMode === "남은 기간 균등") {
      weeklyCap = daily * wDays;
      note = "남은 기간을 균등 분배한 ‘오늘 기준 주간 한도’입니다.";
    } else {
      // 이번 주만: (이번 주 남은 일수)×(일 예산) - 이번 주 이미 쓴 돈
      weeklyCap = daily * wDays - spentW;
      note = "이번 주 이미 쓴 금액을 반영해 ‘이번 주 남은 한도’를 계산합니다.";
    }

    const status =
      rawAvailable < 0
        ? {
            label: "위험",
            badge: "bg-[#F97316] text-white",
            msg: "현재 잔액으로는 월말 목표/확정지출을 감당하기 어렵습니다. 목표 잔액 또는 확정지출 입력을 우선 점검하세요.",
          }
        : safeAvailable < 0
        ? {
            label: "경고",
            badge: "bg-[#FBBF24] text-[#3B2F1E]",
            msg: "안전 버퍼를 적용하면 가변비 여력이 거의 없습니다. 버퍼를 낮추거나 지출 계획을 더 보수적으로 잡으세요.",
          }
        : daily <= 0
        ? {
            label: "타이트",
            badge: "bg-[#FBBF24] text-[#3B2F1E]",
            msg: "일 예산이 0원에 가깝습니다. 남은 기간에 가변비를 거의 쓰기 어려운 상태입니다.",
          }
        : {
            label: "안전",
            badge: "bg-[#34D399] text-white",
            msg: "현재 가정 하에, 남은 기간 동안의 가변비 한도를 계산했습니다.",
          };

    // 음수 캡 보정(표시는 0으로)
    const weeklyCapShown = Math.max(0, weeklyCap);
    const dailyShown = Math.max(0, daily);
    const safeAvailableShown = Math.max(0, safeAvailable);

    // ‘이번 주 쓸 수 있는 돈’ 강조
    const headline = weeklyCapShown;

    return {
      bal,
      target,
      upcoming,
      bufPct: buf * 100,
      totalDays,
      today,
      daysLeft,
      rawAvailable,
      safeAvailable,
      safeAvailableShown,
      daily,
      dailyShown,
      wDays,
      spentW,
      weeklyCap,
      weeklyCapShown,
      headline,
      note,
      status,
    };
  }, [
    currentBalance,
    targetEndBalance,
    knownUpcoming,
    bufferPct,
    daysLeftMode,
    daysInMonth,
    todayDay,
    weekMode,
    daysThisWeek,
    spentThisWeek,
  ]);

  return (
    <div className={cn("min-h-screen", UI.paperBg)}>
      <div className={cn("min-h-screen", UI.paperDots)}>
        <div className="mx-auto max-w-6xl px-4 py-7 sm:py-10">
          {/* 상단 네비 */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <Link
              href="/calculators"
              className="rounded-full border border-[#F2E4B6] bg-[#FFF9F2] px-3 py-1.5 text-sm font-semibold text-[#6B5642] hover:border-[#FB923C]"
            >
              ← 계산기 모음
            </Link>

            <span className="rounded-full bg-[#FFE4C7] px-3 py-1.5 text-sm font-semibold text-[#F97316]">
              가변비 안전예산
            </span>
          </div>

          {/* 헤더 */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F2E4B6] bg-[#FFF9F2] px-3 py-1 text-xs font-medium text-[#6B5642] shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#FB923C]" />
              Recipe Calculator
            </div>

            <h1 className={cn("mt-3 text-2xl sm:text-3xl font-semibold tracking-tight", UI.ink)}>
              가변비 안전예산 계산기
            </h1>
            <p className={cn("mt-2 text-sm sm:text-base", UI.inkSoft)}>
              월말 목표 잔액을 남기면서, <span className="font-semibold text-[#F97316]">“이번 주 쓸 수 있는 돈”</span>을 계산합니다.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {/* 입력 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
                  <p className={cn("mt-1 text-sm", UI.inkSoft)}>
                    핵심은 “현재 잔액”에서 “월말 목표 잔액”과 “확정지출”을 먼저 빼는 것입니다.
                  </p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-sm font-semibold", calc.status.badge)}>
                  {calc.status.label}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                <MoneyInput
                  label="현재 통장 잔액(가용)"
                  value={currentBalance}
                  setValue={setCurrentBalance}
                  hint="결제 대기/묶인 돈은 제외"
                />
                <MoneyInput
                  label="월말 목표 잔액(남길 돈)"
                  value={targetEndBalance}
                  setValue={setTargetEndBalance}
                  hint="예: 30만원"
                />

                <MoneyInput
                  label="남은 기간 확정지출(결제 예정/회비 등)"
                  value={knownUpcoming}
                  setValue={setKnownUpcoming}
                  hint="예: 카드결제일, 정기회비, 공과금"
                />

                <div className="rounded-2xl border border-[#F2E4B6] bg-white p-4">
                  <div className="text-sm font-semibold text-[#3B2F1E]">기간 설정</div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <SelectInput
                      label="월 기준"
                      value={daysLeftMode}
                      onChange={(v) => setDaysLeftMode(v as MonthMode)}
                      options={["30일 고정", "일수 직접입력"]}
                    />
                    {daysLeftMode === "일수 직접입력" ? (
                      <NumberInput
                        label="이번 달 총 일수"
                        value={daysInMonth}
                        setValue={setDaysInMonth}
                        hint="28~31"
                      />
                    ) : (
                      <InfoPill label="이번 달 총 일수" value="30일(고정)" />
                    )}

                    <NumberInput label="오늘은 몇 일?" value={todayDay} setValue={setTodayDay} hint="1~말일" />

                    <SelectInput
                      label="주간 계산 방식"
                      value={weekMode}
                      onChange={(v) => setWeekMode(v as WeekMode)}
                      options={["이번 주만", "남은 기간 균등"]}
                    />
                    <NumberInput
                      label="이번 주 남은 일수"
                      value={daysThisWeek}
                      setValue={setDaysThisWeek}
                      hint="기본 7"
                    />
                    <MoneyInput
                      label="이번 주 이미 쓴 가변비(선택)"
                      value={spentThisWeek}
                      setValue={setSpentThisWeek}
                      hint="‘이번 주만’일 때 반영"
                    />
                  </div>
                </div>

                <PctInput
                  label="안전 버퍼(%)"
                  value={bufferPct}
                  setValue={setBufferPct}
                  hint="예: 10% (예기치 못한 지출 대비)"
                />
              </div>

              <div className="mt-5 rounded-2xl border border-[#F2E4B6] bg-white p-4">
                <div className={cn("text-sm font-semibold", UI.ink)}>해석 팁</div>
                <ul className={cn("mt-2 list-disc pl-5 text-sm leading-relaxed", UI.inkSoft)}>
                  <li>확정지출은 “미리 아는 카드결제/회비/공과금”만 넣고, 변동은 버퍼로 흡수하세요.</li>
                  <li>주간 한도가 음수면, 이번 주는 “지출 정지 모드”로 보는 게 합리적입니다.</li>
                  <li>총액이 촘촘할수록, “남은 기간 균등”이 계획을 안정화합니다.</li>
                </ul>
              </div>
            </section>

            {/* 결과 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>
              <p className={cn("mt-1 text-sm", UI.inkSoft)}>{calc.status.msg}</p>

              {/* 헤드라인 */}
              <div className="mt-4 rounded-3xl border border-[#F2E4B6] bg-white p-5">
                <div className="text-sm font-semibold text-[#6B5642]">이번 주 쓸 수 있는 돈</div>
                <div className="mt-2 text-4xl font-extrabold text-[#F97316]">
                  {formatKRW(calc.headline)}원
                </div>
                <div className={cn("mt-2 text-sm", UI.inkSoft)}>{calc.note}</div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricCard title="남은 기간 가변비 총액(안전)" value={`${formatKRW(calc.safeAvailableShown)}원`} />
                <MetricCard title="일 예산(안전)" value={`${formatKRW(calc.dailyShown)}원/일`} />
                <MetricCard title="남은 일수(오늘 포함)" value={`${calc.daysLeft}일`} />
                <MetricCard title="안전 버퍼" value={`${calc.bufPct.toFixed(0)}%`} />
              </div>

              {/* 분해 */}
              <div className="mt-4 rounded-2xl border border-[#F2E4B6] bg-white p-4">
                <div className={cn("text-sm font-semibold", UI.ink)}>계산식(분해)</div>
                <div className="mt-3 grid gap-2">
                  <Row label="현재 잔액" value={`${formatKRW(calc.bal)}원`} />
                  <Row label="(-) 월말 목표 잔액" value={`${formatKRW(calc.target)}원`} />
                  <Row label="(-) 확정지출" value={`${formatKRW(calc.upcoming)}원`} />
                  <Row
                    label="= 남은 기간 가변비 여력(원)"
                    value={`${formatKRW(calc.rawAvailable)}원`}
                    tone={calc.rawAvailable < 0 ? "danger" : "ok"}
                  />
                  <Row
                    label={`안전 버퍼 적용(${calc.bufPct.toFixed(0)}%)`}
                    value={`${formatKRW(calc.safeAvailable)}원`}
                    tone={calc.safeAvailable < 0 ? "danger" : "ok"}
                  />
                </div>
              </div>

              {/* CTA */}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/calculators/no-spend-goal"
                  className="rounded-2xl bg-[#F97316] px-4 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#EA580C]"
                >
                  다음: 무지출 데이 목표 →
                </Link>
                <Link
                  href="/calculators"
                  className="rounded-2xl border border-[#F2E4B6] bg-white px-4 py-2 text-center text-sm font-semibold text-[#6B5642] hover:border-[#FB923C]"
                >
                  계산기 모음으로
                </Link>
              </div>

              <div className={cn("mt-4 text-xs leading-relaxed", UI.inkSoft)}>
                ※ 본 계산기는 금융상품/대출을 추천하지 않습니다. “지출 가능한 한도”를 보수적으로 산정하는 프레임입니다.
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
        <label className="text-sm font-semibold text-[#3B2F1E]">{label}</label>
        {hint && <span className="text-xs text-[#6B5642]">{hint}</span>}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#9C7A55]">
          ₩
        </span>
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
          className={cn(
            "h-11 w-full rounded-xl border bg-white pl-8 pr-3 text-sm outline-none",
            "border-[#F2E4B6] focus:border-[#FB923C] focus:ring-2 focus:ring-[#FB923C]/20"
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
        <label className="text-sm font-semibold text-[#3B2F1E]">{label}</label>
        {hint && <span className="text-xs text-[#6B5642]">{hint}</span>}
      </div>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="0"
        className={cn(
          "h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none",
          "border-[#F2E4B6] focus:border-[#FB923C] focus:ring-2 focus:ring-[#FB923C]/20"
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
        <label className="text-sm font-semibold text-[#3B2F1E]">{label}</label>
        {hint && <span className="text-xs text-[#6B5642]">{hint}</span>}
      </div>
      <div className="relative">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
          className={cn(
            "h-11 w-full rounded-xl border bg-white px-3 pr-10 text-sm outline-none",
            "border-[#F2E4B6] focus:border-[#FB923C] focus:ring-2 focus:ring-[#FB923C]/20"
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#9C7A55]">
          %
        </span>
      </div>
    </div>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-semibold text-[#3B2F1E]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none",
          "border-[#F2E4B6] focus:border-[#FB923C] focus:ring-2 focus:ring-[#FB923C]/20"
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
    <div className="rounded-2xl border border-[#F2E4B6] bg-white p-4">
      <div className="text-xs font-semibold text-[#6B5642]">{title}</div>
      <div className="mt-1 text-xl font-bold text-[#3B2F1E]">{value}</div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1.5">
      <div className="text-sm font-semibold text-[#3B2F1E]">{label}</div>
      <div className="rounded-xl border border-[#F2E4B6] bg-[#FFFFFF] px-3 py-2 text-sm font-bold text-[#6B5642]">
        {value}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "danger";
}) {
  const vCls = tone === "danger" ? "text-[#F97316]" : tone === "ok" ? "text-[#6B5642]" : "text-[#6B5642]";
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#F2E4B6] bg-[#FFFFFF] px-3 py-2">
      <span className="text-sm font-semibold text-[#3B2F1E]">{label}</span>
      <span className={cn("text-sm font-bold", vCls)}>{value}</span>
    </div>
  );
}

// src/app/calculators/monthly-budget-split/page.tsx
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
    "bg-[radial-gradient(circle,rgba(251,146,60,0.14)_1px,transparent_1px)] bg-[size:16px_16px] mx-auto w-full max-w-[1340px] px-3 py-4 sm:px-4 sm:py-6",
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
function pct(n: number) {
  if (!Number.isFinite(n)) return "0.0";
  return n.toFixed(1);
}

type SplitKey = "need" | "want" | "save";

type Preset = {
  key: string;
  label: string;
  desc: string;
  need: number;
  want: number;
  save: number;
};

const PRESETS: Preset[] = [
  { key: "50-30-20", label: "50/30/20", desc: "기본형(필수/선택/저축)", need: 50, want: 30, save: 20 },
  { key: "60-25-15", label: "60/25/15", desc: "고정비 높은 달에", need: 60, want: 25, save: 15 },
  { key: "55-25-20", label: "55/25/20", desc: "필수 조금 더 안전하게", need: 55, want: 25, save: 20 },
  { key: "45-25-30", label: "45/25/30", desc: "저축 가속(여력 있을 때)", need: 45, want: 25, save: 30 },
];

function roundTo100(need: number, want: number, save: number) {
  // 소수점 반올림 후 합 100 맞추기(마지막 항목에 잔차 반영)
  const n = Math.round(need);
  const w = Math.round(want);
  let s = Math.round(save);
  const sum = n + w + s;
  if (sum !== 100) s = s + (100 - sum);
  return { need: n, want: w, save: s };
}

export default function MonthlyBudgetSplitPage() {
  const [income, setIncome] = useState("3200000"); // 월 가용 예산(실수령 기준 권장)
  const [fixedFirst, setFixedFirst] = useState(true); // 고정비 먼저 입력 → 필수 최소치 보정
  const [fixedCost, setFixedCost] = useState("1200000"); // 월 고정비(주거/통신/보험/구독 등)

  // 비율(커스터마이즈)
  const [needPct, setNeedPct] = useState("50");
  const [wantPct, setWantPct] = useState("30");
  const [savePct, setSavePct] = useState("20");

  // 선택: 저축 항목 쪼개기(비상금/장기/투자) - 추천이 아니라 배분 틀
  const [splitSaving, setSplitSaving] = useState(true);
  const [emgPct, setEmgPct] = useState("30"); // 저축 내 비상금 %
  const [longPct, setLongPct] = useState("40"); // 저축 내 장기 %
  const [investPct, setInvestPct] = useState("30"); // 저축 내 투자 %

  const calc = useMemo(() => {
    const I = Math.max(0, toNumberSafe(income));
    const fixed = Math.max(0, toNumberSafe(fixedCost));

    let n = clamp(toNumberSafe(needPct), 0, 100);
    let w = clamp(toNumberSafe(wantPct), 0, 100);
    let s = clamp(toNumberSafe(savePct), 0, 100);

    // 합 100 보정(가독성 위해 마지막 save에 잔차 반영)
    const sum = n + w + s;
    if (sum !== 100 && sum > 0) {
      // 사용자가 세 값을 다 넣었을 때: 비율을 비례 스케일링 후 반올림
      const scale = 100 / sum;
      n = n * scale;
      w = w * scale;
      s = s * scale;
    }
    const rounded = roundTo100(n, w, s);

    // 1차 배분
    const needAmt0 = (I * rounded.need) / 100;
    const wantAmt0 = (I * rounded.want) / 100;
    const saveAmt0 = (I * rounded.save) / 100;

    // 고정비 먼저: 필수 예산이 고정비보다 작으면 필수 예산을 고정비로 끌어올리고,
    // 그 차액은 선택→저축 순으로 줄이는 “안전장치”만 제공(강제 아님)
    let needAmt = needAmt0;
    let wantAmt = wantAmt0;
    let saveAmt = saveAmt0;

    let adjusted = false;
    let adjustNote = "";

    if (fixedFirst && I > 0 && fixed > 0 && needAmt0 < fixed) {
      adjusted = true;
      const gap = fixed - needAmt0; // 필수 부족분
      needAmt = fixed;

      // 먼저 선택에서 차감
      const takeFromWant = Math.min(wantAmt, gap);
      wantAmt = wantAmt - takeFromWant;

      // 부족하면 저축에서 차감
      const remain = gap - takeFromWant;
      const takeFromSave = Math.min(saveAmt, remain);
      saveAmt = saveAmt - takeFromSave;

      // 그래도 부족하면(고정비가 너무 큰 경우) 총액 부족 안내
      const still = remain - takeFromSave;
      if (still > 0) {
        adjustNote =
          "고정비가 월 예산 대비 너무 큽니다. ‘총액(실수령)’ 또는 ‘고정비 입력’을 다시 점검하세요.";
      } else {
        adjustNote =
          "필수 예산이 고정비보다 작아, 필수=고정비로 보정했습니다(선택→저축 순으로 차감).";
      }
    }

    const totalAllocated = needAmt + wantAmt + saveAmt;

    // 저축 쪼개기
    let emgAmt = 0,
      longAmt = 0,
      investAmt = 0;

    let emg = clamp(toNumberSafe(emgPct), 0, 100);
    let lng = clamp(toNumberSafe(longPct), 0, 100);
    let inv = clamp(toNumberSafe(investPct), 0, 100);
    const ssum = emg + lng + inv;

    if (splitSaving && saveAmt > 0) {
      if (ssum <= 0) {
        emg = 0;
        lng = 0;
        inv = 0;
      } else {
        const scale2 = 100 / ssum;
        emg = emg * scale2;
        lng = lng * scale2;
        inv = inv * scale2;
      }
      const rr = roundTo100(emg, lng, inv);
      emgAmt = (saveAmt * rr.need) / 100; // rr.need = emg
      longAmt = (saveAmt * rr.want) / 100; // rr.want = long
      investAmt = (saveAmt * rr.save) / 100; // rr.save = invest
    }

    // 신호: 선택이 지나치게 작거나 저축이 0에 가까우면 경보
    const signal =
      I <= 0
        ? { label: "입력 필요", badge: "bg-[#52a9ff] text-[#ffffff]", msg: "월 예산(실수령)을 입력하세요." }
        : rounded.save < 5
        ? { label: "저축 낮음", badge: "bg-[#5bbbf3] text-white", msg: "저축 비율이 매우 낮습니다. 단기 목표가 아니라면 점검 권장." }
        : rounded.want < 10
        ? { label: "선택 낮음", badge: "bg-[#60A5FA] text-white", msg: "선택(여유) 예산이 낮습니다. 지속 가능성을 확인하세요." }
        : { label: "균형", badge: "bg-[#34D399] text-white", msg: "현재 비율은 일반적으로 균형 범위입니다." };

    // 주간 가이드(선택/가변비 중심) — 4.33주로 환산
    const weeklyWant = wantAmt / 4.33;
    const weeklyNeedVar = Math.max(0, needAmt - fixed) / 4.33; // 필수 중 변동분(대략)

    return {
      I,
      fixed,
      rounded,
      needAmt,
      wantAmt,
      saveAmt,
      totalAllocated,
      adjusted,
      adjustNote,
      signal,
      splitSaving,
      emgAmt,
      longAmt,
      investAmt,
      weeklyWant,
      weeklyNeedVar,
    };
  }, [
    income,
    fixedCost,
    fixedFirst,
    needPct,
    wantPct,
    savePct,
    splitSaving,
    emgPct,
    longPct,
    investPct,
  ]);

  const applyPreset = (p: Preset) => {
    setNeedPct(String(p.need));
    setWantPct(String(p.want));
    setSavePct(String(p.save));
  };

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
              예산 배분
            </span>
          </div>

          {/* 헤더 */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8f8ff] bg-[#f2fbff] px-3 py-1 text-xs font-medium text-[#7f7f7f] shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#5bbbf3]" />
              Recipe Calculator
            </div>

            <h1 className={cn("mt-3 text-2xl sm:text-3xl font-semibold tracking-tight", UI.ink)}>
              월 예산 자동 배분 계산기
            </h1>
            <p className={cn("mt-2 text-[12px] sm:text-base", UI.inkSoft)}>
              필수/선택/저축 비율을 커스터마이즈해 월 예산을 자동 배분합니다. (추천이 아니라 “배분 틀”입니다.)
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {/* 입력 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
                  <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                    월 예산은 “실수령(가용)” 기준이 가장 안정적입니다.
                  </p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", calc.signal.badge)}>
                  {calc.signal.label}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                <MoneyInput label="월 예산(실수령/가용)" value={income} setValue={setIncome} />

                <div className="rounded-2xl border border-[#e8f8ff] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[12px] font-semibold text-[#3B2F1E]">고정비(선택 입력)</div>
                      <div className="mt-1 text-xs text-[#7f7f7f]">
                        주거/관리비/통신/보험/구독 등 “매달 빠져나가는 돈” 합계
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#7f7f7f]">
                      <input
                        type="checkbox"
                        checked={fixedFirst}
                        onChange={(e) => setFixedFirst(e.target.checked)}
                        className="h-4 w-4 rounded border-[#e8f8ff]"
                      />
                      고정비 먼저 보정
                    </label>
                  </div>

                  <div className="mt-3">
                    <MoneyInput label="월 고정비 합계" value={fixedCost} setValue={setFixedCost} />
                    <div className="mt-2 text-xs text-[#7f7f7f]">
                      “고정비 먼저 보정”을 켜면, 필수 예산이 고정비보다 작을 때 자동으로 필수=고정비로 맞춥니다.
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e8f8ff] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[12px] font-semibold text-[#3B2F1E]">비율 프리셋</div>
                      <div className="mt-1 text-xs text-[#7f7f7f]">클릭하면 비율이 자동 입력됩니다.</div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p.key}
                        onClick={() => applyPreset(p)}
                        className="rounded-2xl border border-[#e8f8ff] bg-[#5bbbf3] px-3 py-3 text-left hover:border-[#5bbbf3]"
                      >
                        <div className="text-[12px] font-semibold text-[#3B2F1E]">{p.label}</div>
                        <div className="mt-0.5 text-xs text-[#7f7f7f]">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e8f8ff] bg-white p-4">
                  <div className="text-[12px] font-semibold text-[#3B2F1E]">비율 커스터마이즈(합 100% 자동 보정)</div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <PctInput label="필수(Need) %" value={needPct} setValue={setNeedPct} />
                    <PctInput label="선택(Want) %" value={wantPct} setValue={setWantPct} />
                    <PctInput label="저축(Save) %" value={savePct} setValue={setSavePct} />
                  </div>

                  <div className="mt-3 rounded-xl border border-[#e8f8ff] bg-[#5bbbf3] px-3 py-2 text-xs font-semibold text-[#7f7f7f]">
                    적용 비율:{" "}
                    <span className="text-[#ffffff]">
                      필수 {calc.rounded.need}% · 선택 {calc.rounded.want}% · 저축 {calc.rounded.save}%
                    </span>
                    <span className="ml-2 text-[#7f7f7f]">(합 100%)</span>
                  </div>

                  {calc.adjusted && (
                    <div className="mt-3 rounded-xl border border-[#e8f8ff] bg-white px-3 py-2 text-xs font-semibold text-[#7f7f7f]">
                      <span className="text-[#ffffff]">보정 적용:</span> {calc.adjustNote}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-[#e8f8ff] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[12px] font-semibold text-[#3B2F1E]">저축 쪼개기(선택)</div>
                      <div className="mt-1 text-xs text-[#7f7f7f]">
                        저축 예산을 비상금/장기/투자로 나눠 “계좌 분리”에 바로 쓰세요.
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#7f7f7f]">
                      <input
                        type="checkbox"
                        checked={splitSaving}
                        onChange={(e) => setSplitSaving(e.target.checked)}
                        className="h-4 w-4 rounded border-[#e8f8ff]"
                      />
                      사용
                    </label>
                  </div>

                  {splitSaving && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <PctInput label="비상금 %" value={emgPct} setValue={setEmgPct} />
                      <PctInput label="장기목표 %" value={longPct} setValue={setLongPct} />
                      <PctInput label="투자/기타 %" value={investPct} setValue={setInvestPct} />
                      <div className="sm:col-span-3 text-xs text-[#7f7f7f]">
                        합 100% 자동 보정(비례 스케일링)됩니다.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 결과 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>배분 결과</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>{calc.signal.msg}</p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricCard title="필수(Need)" value={`${formatKRW(calc.needAmt)}원`} accent="need" />
                <MetricCard title="선택(Want)" value={`${formatKRW(calc.wantAmt)}원`} accent="want" />
                <MetricCard title="저축(Save)" value={`${formatKRW(calc.saveAmt)}원`} accent="save" />
                <MetricCard title="배분 합계" value={`${formatKRW(calc.totalAllocated)}원`} />
              </div>

              <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>주간 가이드(지속 가능성 체크)</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <InfoPill
                    label="선택 예산(주간)"
                    value={`${formatKRW(calc.weeklyWant)}원/주`}
                    tone="want"
                  />
                  <InfoPill
                    label="필수 중 변동분(주간, 대략)"
                    value={`${formatKRW(calc.weeklyNeedVar)}원/주`}
                    tone="need"
                  />
                </div>
                <div className={cn("mt-2 text-xs leading-relaxed", UI.inkSoft)}>
                  * 주간 환산은 4.33주 기준입니다. 필수 중 변동분은 (필수-고정비)로 단순 추정합니다.
                </div>
              </div>

              {splitSaving && (
                <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                  <div className={cn("text-[12px] font-semibold", UI.ink)}>저축 쪼개기 결과</div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <MiniCard title="비상금" value={`${formatKRW(calc.emgAmt)}원`} />
                    <MiniCard title="장기목표" value={`${formatKRW(calc.longAmt)}원`} />
                    <MiniCard title="투자/기타" value={`${formatKRW(calc.investAmt)}원`} />
                  </div>
                  <div className={cn("mt-2 text-xs leading-relaxed", UI.inkSoft)}>
                    ※ 이 분해는 “추천”이 아니라, 계좌/통장 분리용 ‘그릇’입니다.
                  </div>
                </div>
              )}

              {/* 레시피 체크리스트 */}
              <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>레시피 체크(3개)</div>
                <ul className={cn("mt-2 list-disc pl-5 text-[12px] leading-relaxed", UI.inkSoft)}>
                  <li>필수(Need)는 “고정비+생활 필수”를 커버하는가?</li>
                  <li>선택(Want)이 너무 낮아 지치지 않는가(지속 가능성)?</li>
                  <li>저축(Save)은 ‘목표’가 명확한가(비상금/단기/장기)?</li>
                </ul>
              </div>

              {/* CTA */}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/calculators/variable-spend-safe"
                  className="rounded-2xl bg-[#5bbbf3] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
                >
                  다음: 가변비 안전예산 →
                </Link>
                <Link
                  href="/calculators"
                  className="rounded-2xl border border-[#e8f8ff] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#5bbbf3]"
                >
                  계산기 모음으로
                </Link>
              </div>

              <div className={cn("mt-4 text-xs leading-relaxed", UI.inkSoft)}>
                ※ 본 계산기는 금융상품/투자/대출을 추천하지 않습니다. 예산을 “배분”하는 판단 프레임을 제공합니다.
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
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-[12px] font-semibold text-[#3B2F1E]">{label}</label>
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

function PctInput({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-[12px] font-semibold text-[#3B2F1E]">{label}</label>
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

function MetricCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: string;
  accent?: "need" | "want" | "save";
}) {
  const cls =
    accent === "need"
      ? "border-[#F59E0B] bg-[#5bbbf3]"
      : accent === "want"
      ? "border-[#5bbbf3] bg-[#5bbbf3]"
      : accent === "save"
      ? "border-[#34D399] bg-[#ECFDF5]"
      : "border-[#e8f8ff] bg-white";

  const titleCls =
    accent === "save" ? "text-[#059669]" : accent ? "text-[#ffffff]" : "text-[#7f7f7f]";

  return (
    <div className={cn("rounded-2xl border p-4", cls)}>
      <div className={cn("text-xs font-semibold", titleCls)}>{title}</div>
      <div className={cn("mt-1 text-xl font-bold", UI.ink)}>{value}</div>
    </div>
  );
}

function MiniCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e8f8ff] bg-[#f2fbff] p-4">
      <div className="text-xs font-semibold text-[#7f7f7f]">{title}</div>
      <div className="mt-1 text-lg font-bold text-[#3B2F1E]">{value}</div>
    </div>
  );
}

function InfoPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "need" | "want";
}) {
  const cls = tone === "want" ? "text-[#ffffff]" : tone === "need" ? "text-[#B45309]" : "text-[#7f7f7f]";
  return (
    <div className="rounded-xl border border-[#e8f8ff] bg-[#5bbbf3] px-3 py-2">
      <div className="text-xs font-semibold text-[#7f7f7f]">{label}</div>
      <div className={cn("mt-1 text-[12px] font-bold", cls)}>{value}</div>
    </div>
  );
}

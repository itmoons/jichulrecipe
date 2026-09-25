// src/app/calculators/cutback-goal/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/** 레시피북 톤(연노랑 + 주황) */
const UI = {
  paperBg: "bg-transparent",
  paperDots: "w-full",
  ink: "text-slate-900",
  inkSoft: "text-slate-600",
  card: "bg-white border-[#dce5dd]",
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

type RowType = {
  key: string; // 카테고리
  base: string; // 기준 지출(전월/평균)
  priority: "낮음" | "보통" | "높음"; // 보호 우선순위(높음이면 덜 자름)
  capPct: string; // 최대 절감 가능 비율(%) (현실적 상한)
};

type Strategy = "비례 절감" | "우선순위 반영" | "상한 먼저 적용";

function priorityWeight(p: RowType["priority"]) {
  // 높음(보호)일수록 weight 작게 → 덜 줄이기
  if (p === "높음") return 0.6;
  if (p === "보통") return 1.0;
  return 1.3; // 낮음(덜 중요) → 더 줄이기
}

export default function CutbackGoalPage() {
  const [targetPct, setTargetPct] = useState("10"); // 이번 달 -10%
  const [strategy, setStrategy] = useState<Strategy>("우선순위 반영");

  const [rows, setRows] = useState<RowType[]>([
    { key: "식비", base: "520000", priority: "보통", capPct: "20" },
    { key: "커피/간식", base: "180000", priority: "낮음", capPct: "40" },
    { key: "배달", base: "160000", priority: "낮음", capPct: "50" },
    { key: "쇼핑", base: "240000", priority: "낮음", capPct: "50" },
    { key: "여가/문화", base: "120000", priority: "보통", capPct: "30" },
    { key: "교통", base: "130000", priority: "보통", capPct: "15" },
    { key: "통신", base: "65000", priority: "높음", capPct: "10" },
    { key: "구독/멤버십", base: "54000", priority: "보통", capPct: "30" },
    { key: "보험/건강", base: "210000", priority: "높음", capPct: "5" },
    { key: "기타", base: "60000", priority: "보통", capPct: "20" },
  ]);

  const updateRow = (idx: number, patch: Partial<RowType>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { key: "새 카테고리", base: "0", priority: "보통", capPct: "20" },
    ]);
  const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const calc = useMemo(() => {
    const t = clamp(toNumberSafe(targetPct), 0, 80); // 0~80%로 제한
    const targetRate = t / 100;

    const parsed = rows.map((r) => {
      const base = Math.max(0, toNumberSafe(r.base));
      const cap = clamp(toNumberSafe(r.capPct), 0, 100) / 100;
      const w = priorityWeight(r.priority);
      const maxCut = base * cap;
      return { ...r, base, cap, w, maxCut };
    });

    const baseTotal = parsed.reduce((a, b) => a + b.base, 0);
    const targetCut = baseTotal * targetRate;

    const totalMaxCut = parsed.reduce((a, b) => a + b.maxCut, 0);

    const list = parsed.map((p) => ({ ...p, cut: 0 }));

    // 재배분(상한 때문에 여러 번 분배)
    const redistribute = (weights: number[], capLeft: number[], remaining: number) => {
      let rem = remaining;
      const cutAdd = new Array(weights.length).fill(0);

      for (let iter = 0; iter < 12; iter++) {
        if (rem <= 1e-6) break;

        const activeIdx: number[] = [];
        let wSum = 0;

        for (let i = 0; i < weights.length; i++) {
          if (capLeft[i] > 1e-6) {
            activeIdx.push(i);
            wSum += weights[i];
          }
        }
        if (activeIdx.length === 0 || wSum <= 0) break;

        let distributed = 0;
        for (const i of activeIdx) {
          const share = (rem * weights[i]) / wSum;
          const add = Math.min(share, capLeft[i]);
          cutAdd[i] += add;
          capLeft[i] -= add;
          distributed += add;
        }

        rem -= distributed;
        if (distributed <= 1e-6) break;
      }
      return { cutAdd, rem };
    };

    // weights 설정
    let weights: number[] = [];
    if (strategy === "비례 절감") {
      weights = list.map((x) => x.base);
    } else if (strategy === "우선순위 반영") {
      weights = list.map((x) => x.base * x.w);
    }

    let remaining = targetCut;

    if (strategy !== "상한 먼저 적용") {
      const capLeft = list.map((x) => x.maxCut);
      const { cutAdd, rem } = redistribute(weights, capLeft, remaining);
      remaining = rem;
      for (let i = 0; i < list.length; i++) list[i].cut = cutAdd[i];
    } else {
      // “덜 중요한 + 상한 큰” 순
      const idx = list
        .map((x, i) => ({
          i,
          score: (x.priority === "낮음" ? 3 : x.priority === "보통" ? 2 : 1) * (1 + x.cap),
        }))
        .sort((a, b) => b.score - a.score)
        .map((x) => x.i);

      let rem = remaining;
      for (const i of idx) {
        if (rem <= 1e-6) break;
        const add = Math.min(list[i].maxCut, rem);
        list[i].cut = add;
        rem -= add;
      }
      remaining = rem;
    }

    const achievedCut = targetCut - remaining;
    const achievedRate = baseTotal > 0 ? achievedCut / baseTotal : 0;

    const result = list
      .map((x) => {
        const after = x.base - x.cut;
        const cutPct = x.base > 0 ? (x.cut / x.base) * 100 : 0;
        return { ...x, after, cutPct };
      })
      .sort((a, b) => b.cut - a.cut);

    const status =
      baseTotal <= 0
        ? {
            label: "입력 필요",
            badge: "bg-[#1f7a5b] text-white",
            msg: "카테고리 기준 지출(전월/평균)을 입력하세요.",
          }
        : targetCut > totalMaxCut
        ? {
            label: "불충분",
            badge: "bg-[#1f7a5b] text-white",
            msg: "입력한 ‘최대 절감 상한’ 기준으로는 목표 절감액이 과도합니다. 목표 %를 낮추거나 상한을 재점검하세요.",
          }
        : remaining > 1
        ? {
            label: "부분 달성",
            badge: "bg-[#1f7a5b] text-white",
            msg: "일부 카테고리 상한 때문에 목표를 전부 채우지 못했습니다. 상한/우선순위를 조정해보세요.",
          }
        : {
            label: "달성 가능",
            badge: "bg-[#34D399] text-white",
            msg: "입력 조건(상한/우선순위) 내에서 목표 절감액 배분이 가능합니다.",
          };

    const top3 = result.filter((x) => x.cut > 0).slice(0, 3);

    return {
      t,
      baseTotal,
      targetCut,
      totalMaxCut,
      achievedCut,
      achievedRate,
      remaining,
      result,
      top3,
      status,
    };
  }, [rows, targetPct, strategy]);

  return (
    <div className={cn("min-h-screen break-keep", UI.paperBg)}>
      <div className={cn("min-h-screen break-keep", UI.paperDots)}>
        <div className="mx-auto px-2 py-2 sm:py-2">
          {/* 상단 네비 */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <Link
              href="/calculators"
              className="rounded-full border border-[#e2e5e1] bg-[#f1f8f4] px-3 py-1.5 text-[12px] font-semibold text-[#7f7f7f] hover:border-[#1f7a5b] whitespace-nowrap break-keep"
            >
              ← 계산기 모음
            </Link>

            <span className="rounded-full bg-[#1f7a5b] px-3 py-1.5 text-[12px] font-semibold text-white whitespace-nowrap break-keep">
              절감 목표 역산
            </span>
          </div>

          {/* 헤더 */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e2e5e1] bg-[#f1f8f4] px-3 py-1 text-xs font-medium text-[#7f7f7f] shadow-sm whitespace-nowrap break-keep">
              <span className="inline-block h-2 w-2 rounded-full bg-[#1f7a5b]" />
              Recipe Calculator
            </div>

            <h1 className={cn("mt-3 text-2xl sm:text-3xl font-semibold tracking-tight", UI.ink)}>
              지출 컷(절감) 목표 역산 계산기
            </h1>
            <p className={cn("mt-2 text-[12px] sm:text-base", UI.inkSoft)}>
              이번 달 <span className="font-semibold text-[#ffffff]">-{pct(calc.t)}%</span> 목표를 잡으면,
              카테고리별로 “어디서 얼마를 줄일지”를 우선순위/상한 기준으로 배분합니다.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {/* 입력 */}
            <section className={cn("rounded-xl border p-4 sm:p-6 shadow-sm break-keep", UI.card)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
                  <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                    기준 지출(전월/평균) + 최대 절감 상한(현실적)을 잡아야 결과가 유용합니다.
                  </p>
                </div>

                {/* ✅ 배지 깨짐 방지 */}
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-[12px] font-semibold shrink-0 min-w-fit",
                    "whitespace-nowrap break-keep leading-none",
                    calc.status.badge
                  )}
                >
                  {calc.status.label}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                <PctInput label="이번 달 절감 목표(%)" value={targetPct} setValue={setTargetPct} hint="예: 10" />

                <SelectInput
                  label="배분 방식"
                  value={strategy}
                  onChange={(v) => setStrategy(v as Strategy)}
                  options={["우선순위 반영", "비례 절감", "상한 먼저 적용"]}
                  hint="우선순위 ‘높음’은 보호(덜 줄임)"
                />

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={addRow}
                    className="rounded-lg border border-[#e2e5e1] bg-white px-4 py-2 text-[12px] font-semibold text-[#7f7f7f] hover:border-[#1f7a5b] whitespace-nowrap break-keep"
                  >
                    + 카테고리 추가
                  </button>
                  <div className="text-xs text-[#7f7f7f]">
                    기준합:{" "}
                    <span className="font-semibold text-[#ffffff]">{formatKRW(calc.baseTotal)}원</span>
                  </div>
                </div>

                <div className="rounded-lg border border-[#e2e5e1] bg-white p-4">
                  <div className="text-[12px] font-semibold text-[#3B2F1E]">카테고리 입력</div>
                  <div className="mt-2 text-xs text-[#7f7f7f]">
                    우선순위 “높음”은 보호 카테고리(덜 자름)입니다. 상한은 “현실적으로 줄일 수 있는 최대치”를 적으세요.
                  </div>

                  <div className="mt-3 grid gap-2">
                    {rows.map((r, idx) => (
                      <div key={`${r.key}-${idx}`} className="rounded-xl border border-[#e2e5e1] bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <TextInput
                              label="카테고리명"
                              value={r.key}
                              setValue={(v) => updateRow(idx, { key: v })}
                            />
                          </div>

                          {/* ✅ 삭제 버튼 깨짐/줄바꿈 방지 */}
                          <button
                            onClick={() => removeRow(idx)}
                            className="rounded-full border border-[#e2e5e1] bg-white px-3 py-1 text-xs font-semibold text-[#7f7f7f] hover:border-[#1f7a5b]
                                       whitespace-nowrap break-keep shrink-0 min-w-[56px]"
                          >
                            삭제
                          </button>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <MoneyInput label="기준 지출(원)" value={r.base} setValue={(v) => updateRow(idx, { base: v })} />
                          <SelectInput
                            label="우선순위"
                            value={r.priority}
                            onChange={(v) => updateRow(idx, { priority: v as RowType["priority"] })}
                            options={["낮음", "보통", "높음"]}
                          />
                          <PctInput
                            label="최대 절감 상한(%)"
                            value={r.capPct}
                            setValue={(v) => updateRow(idx, { capPct: v })}
                            hint="예: 30"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-[#e2e5e1] bg-white p-4">
                  <div className={cn("text-[12px] font-semibold", UI.ink)}>해석 팁</div>
                  <ul className={cn("mt-2 list-disc pl-5 text-[12px] leading-relaxed", UI.inkSoft)}>
                    <li>상한이 너무 높으면 “실행 불가한 계획”이 됩니다. 너무 낮으면 목표 달성이 어려워져요.</li>
                    <li>우선순위는 건강/업무/유지 비용을 보호하기 위한 장치입니다.</li>
                    <li>대부분의 -10%는 ‘낮음’(커피/배달/쇼핑 등)에서 먼저 나옵니다.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 결과 */}
            <section className={cn("rounded-xl border p-4 sm:p-6 shadow-sm break-keep", UI.card)}>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>{calc.status.msg}</p>

              {/* 요약 카드 */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricCard title="기준 지출 합계" value={`${formatKRW(calc.baseTotal)}원`} />
                <MetricCard title="목표 절감액" value={`${formatKRW(calc.targetCut)}원`} accent />
                <MetricCard
                  title="달성 예상"
                  value={`${formatKRW(calc.achievedCut)}원 (${pct(calc.achievedRate * 100)}%)`}
                />
                <MetricCard title="상한 기준 최대 절감" value={`${formatKRW(calc.totalMaxCut)}원`} />
              </div>

              {/* 부족분 */}
              {calc.remaining > 1 && (
                <div className="mt-3 rounded-lg border border-[#e2e5e1] bg-white p-4">
                  <div className="text-[12px] font-semibold text-[#3B2F1E]">부족분</div>
                  <div className="mt-1 text-2xl font-bold text-[#ffffff]">
                    {formatKRW(calc.remaining)}원
                  </div>
                  <p className="mt-1 text-[12px] text-[#6d6d6d]">
                    목표 %를 낮추거나, 일부 카테고리 상한/우선순위를 현실에 맞게 재설정하세요.
                  </p>
                </div>
              )}

              {/* TOP 3 */}
              <div className="mt-4 rounded-lg border border-[#e2e5e1] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>어디서 줄이나요? (TOP 3)</div>
                <div className="mt-3 grid gap-2">
                  {calc.top3.length === 0 ? (
                    <EmptyNote text="절감 배분이 없습니다. 목표 % 또는 기준 지출/상한을 확인하세요." />
                  ) : (
                    calc.top3.map((x) => (
                      <TopRow key={x.key} label={x.key} cut={x.cut} cutPct={x.cutPct} />
                    ))
                  )}
                </div>
                <div className={cn("mt-2 text-xs leading-relaxed", UI.inkSoft)}>
                  * TOP 3는 “절감액 기준”입니다. 실제 실행은 “빈도(몇 번 줄일지)”로 번역해 운영하세요.
                </div>
              </div>

              {/* 전체 테이블 */}
              <div className="mt-4 rounded-lg border border-[#e2e5e1] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>카테고리별 권장 컷</div>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-[720px] w-full text-[12px]">
                    <thead>
                      <tr className="text-left text-xs text-[#7f7f7f]">
                        <th className="py-2 pr-3">카테고리</th>
                        <th className="py-2 pr-3">기준</th>
                        <th className="py-2 pr-3">절감</th>
                        <th className="py-2 pr-3">절감률</th>
                        <th className="py-2 pr-3">이후</th>
                        <th className="py-2 pr-3">우선</th>
                        <th className="py-2 pr-3">상한</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calc.result.map((x) => (
                        <tr key={x.key} className="border-t border-[#e2e5e1]">
                          <td className="py-2 pr-3 font-semibold text-[#3B2F1E]">{x.key}</td>
                          <td className="py-2 pr-3 text-[#7f7f7f]">{formatKRW(x.base)}원</td>
                          <td className="py-2 pr-3 font-bold text-[#ffffff]">-{formatKRW(x.cut)}원</td>
                          <td className="py-2 pr-3 text-[#7f7f7f]">{pct(x.cutPct)}%</td>
                          <td className="py-2 pr-3 text-[#3B2F1E]">{formatKRW(x.after)}원</td>
                          <td className="py-2 pr-3 text-[#7f7f7f]">{x.priority}</td>
                          <td className="py-2 pr-3 text-[#7f7f7f]">{pct(x.cap * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/calculators/emergency-fund-timeline"
                  className="rounded-lg bg-[#1f7a5b] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#176247] whitespace-nowrap break-keep"
                >
                  다음: 비상금 목표 기간 →
                </Link>
                <Link
                  href="/calculators"
                  className="rounded-lg border border-[#e2e5e1] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#1f7a5b] whitespace-nowrap break-keep"
                >
                  계산기 모음으로
                </Link>
              </div>

              <div className={cn("mt-4 text-xs leading-relaxed", UI.inkSoft)}>
                ※ 이 도구는 “무조건 아껴라”가 아니라, 목표를 숫자로 만들고 실행 가능하게 “쪼개는” 계산기입니다.
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
      <label className="text-[12px] font-semibold text-[#3B2F1E] whitespace-nowrap break-keep">
        {label}
      </label>
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
            "border-[#e2e5e1] focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20"
          )}
        />
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <div className="grid gap-1.5 w-full">
      <label className="text-xs font-semibold text-[#7f7f7f] whitespace-nowrap break-keep">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn(
          "h-10 w-full rounded-xl border bg-white px-3 text-[12px] font-semibold outline-none",
          "border-[#e2e5e1] focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20"
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
        <label className="text-[12px] font-semibold text-[#3B2F1E] whitespace-nowrap break-keep">
          {label}
        </label>
        {hint && <span className="text-xs text-[#7f7f7f] whitespace-nowrap break-keep">{hint}</span>}
      </div>
      <div className="relative">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
          className={cn(
            "h-11 w-full rounded-xl border bg-white px-3 pr-10 text-[12px] outline-none",
            "border-[#e2e5e1] focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20"
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#9C7A55]">
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
        <label className="text-[12px] font-semibold text-[#3B2F1E] whitespace-nowrap break-keep">
          {label}
        </label>
        {hint && <span className="text-xs text-[#7f7f7f] whitespace-nowrap break-keep">{hint}</span>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-11 w-full rounded-xl border bg-white px-3 text-[12px] outline-none",
          "border-[#e2e5e1] focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20"
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

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-[#e2e5e1] bg-white px-3 py-2 text-[12px] font-semibold text-[#7f7f7f] break-keep">
      {text}
    </div>
  );
}

function TopRow({ label, cut, cutPct }: { label: string; cut: number; cutPct: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#e2e5e1] bg-white px-3 py-2">
      <span className="text-[12px] font-semibold text-[#3B2F1E] break-keep">{label}</span>
      <span className="text-[12px] font-bold text-[#ffffff] whitespace-nowrap break-keep">
        -{formatKRW(cut)}원 ({pct(cutPct)}%)
      </span>
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
  accent?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border border-[#e2e5e1] bg-white p-4", accent && "bg-[#FFF7D6]")}>
      <div className="text-xs font-semibold text-[#7f7f7f] break-keep">{title}</div>
      <div
        className={cn(
          "mt-1 text-lg sm:text-xl font-bold",
          accent ? "text-[#ffffff]" : "text-[#3B2F1E]"
        )}
      >
        {value}
      </div>
    </div>
  );
}

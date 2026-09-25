// src/app/calculators/emergency-fund-timeline/page.tsx
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

function monthsToText(m: number) {
  if (!Number.isFinite(m) || m <= 0) return "0개월";
  const months = Math.ceil(m);
  const y = Math.floor(months / 12);
  const r = months % 12;
  if (y <= 0) return `${months}개월`;
  if (r === 0) return `${y}년`;
  return `${y}년 ${r}개월`;
}

export default function EmergencyFundTimelinePage() {
  // 입력
  const [targetAmount, setTargetAmount] = useState("3000000"); // 목표 비상금
  const [currentAmount, setCurrentAmount] = useState("300000"); // 현재 비상금(있다면)
  const [monthlySave, setMonthlySave] = useState("250000"); // 월 저축 가능액(비상금에 넣을 금액)
  const [expectedReturnPct, setExpectedReturnPct] = useState("0"); // (선택) 월별 이자/수익률 가정 (보수적으로 0 권장)

  // 옵션
  const [includeBuffer, setIncludeBuffer] = useState(true); // 목표액에 안전버퍼 추가
  const [bufferPct, setBufferPct] = useState("10"); // 10% 버퍼
  const [roundingMode, setRoundingMode] = useState<"올림" | "반올림" | "내림">("올림");

  const calc = useMemo(() => {
    const target = Math.max(0, toNumberSafe(targetAmount));
    const current = Math.max(0, toNumberSafe(currentAmount));
    const save = Math.max(0, toNumberSafe(monthlySave));

    const buf = includeBuffer ? clamp(toNumberSafe(bufferPct), 0, 50) / 100 : 0; // 0~50%
    const targetWithBuffer = target * (1 + buf);

    // 월 수익률(선택) — 과도한 가정 방지 위해 -5%~+5%로 클램프
    const r = clamp(toNumberSafe(expectedReturnPct), -5, 5) / 100;

    const gap = Math.max(0, targetWithBuffer - current);

    // 기간 계산
    // r=0이면 단순 gap/save
    // r!=0이면 등비수열: FV = current*(1+r)^n + save*((1+r)^n - 1)/r
    // 목표FV >= targetWithBuffer를 만족하는 최소 n 탐색(안전하게 이분/선형)
    let months = 0;
    if (gap <= 0) {
      months = 0;
    } else if (save <= 0 && r <= 0) {
      months = Infinity;
    } else if (r === 0) {
      months = gap / Math.max(1, save); // save=0이면 위에서 처리
    } else {
      // 단조 증가 조건: (save>0) 또는 (current>0 && r>0)
      // 간단히 n을 0~600(50년)까지 선형 탐색(입력 크기 작아 충분)
      let n = 0;
      const maxN = 600;
      for (; n <= maxN; n++) {
        const growth = Math.pow(1 + r, n);
        const fv = current * growth + save * ((growth - 1) / r);
        if (fv >= targetWithBuffer - 1e-6) break;
      }
      months = n > maxN ? Infinity : n;
    }

    let monthsOut = months;
    if (Number.isFinite(monthsOut)) {
      if (roundingMode === "올림") monthsOut = Math.ceil(monthsOut);
      else if (roundingMode === "내림") monthsOut = Math.floor(monthsOut);
      else monthsOut = Math.round(monthsOut);
    }

    // 월 저축 필요액 역산(목표 기간을 입력하지 않았으니, 참고용으로 ‘12개월 내’ 제안 정도만)
    const oneYearNeeded = targetWithBuffer > current ? (targetWithBuffer - current) / 12 : 0;

    const status =
      target <= 0
        ? { label: "입력 필요", badge: "bg-[#1f7a5b] text-white", msg: "목표 비상금(원)을 입력하세요." }
        : gap <= 0
        ? { label: "달성", badge: "bg-[#34D399] text-white", msg: "현재 금액이 목표(버퍼 포함)를 충족합니다." }
        : !Number.isFinite(monthsOut)
        ? {
            label: "불가",
            badge: "bg-[#1f7a5b] text-white",
            msg: "월 저축 가능액이 0이고 수익률 가정도 비우호적이면 기간을 산정할 수 없습니다.",
          }
        : save <= 0
        ? {
            label: "경고",
            badge: "bg-[#1f7a5b] text-white",
            msg: "월 저축 가능액이 0에 가깝습니다. 기간이 매우 길어지거나 달성 불가입니다.",
          }
        : { label: "계산됨", badge: "bg-[#34D399] text-white", msg: "목표까지의 예상 기간을 계산했습니다." };

    return {
      target,
      current,
      save,
      bufPct: buf * 100,
      targetWithBuffer,
      gap,
      rPct: r * 100,
      monthsRaw: months,
      monthsOut,
      oneYearNeeded,
      status,
    };
  }, [
    targetAmount,
    currentAmount,
    monthlySave,
    expectedReturnPct,
    includeBuffer,
    bufferPct,
    roundingMode,
  ]);

  return (
    <div className={cn("min-h-screen", UI.paperBg)}>
      <div className={cn("min-h-screen", UI.paperDots)}>
        <div className="mx-auto px-2 py-2 sm:py-2">
          {/* 상단 네비 */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <Link
              href="/calculators"
              className="rounded-full border border-[#e2e5e1] bg-[#f1f8f4] px-3 py-1.5 text-[12px] font-semibold text-[#7f7f7f] hover:border-[#1f7a5b]"
            >
              ← 계산기 모음
            </Link>

            <span className="rounded-full bg-[#1f7a5b] px-3 py-1.5 text-[12px] font-semibold text-white">
              비상금 기간
            </span>
          </div>

          {/* 헤더 */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e2e5e1] bg-[#f1f8f4] px-3 py-1 text-xs font-medium text-[#7f7f7f] shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#1f7a5b]" />
              Recipe Calculator
            </div>

            <h1 className={cn("mt-3 text-2xl sm:text-3xl font-semibold tracking-tight", UI.ink)}>
              비상금 목표 기간 계산기
            </h1>
            <p className={cn("mt-2 text-[12px] sm:text-base", UI.inkSoft)}>
              목표액과 월 저축 가능액으로, 목표까지{" "}
              <span className="font-semibold text-[#ffffff]">얼마나 걸리는지</span> 계산합니다.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {/* 입력 */}
            <section className={cn("rounded-xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
                  <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                    비상금은 “수익률”보다 “접근성/안정성”이 핵심입니다. 수익률 가정은 선택 옵션입니다.
                  </p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", calc.status.badge)}>
                  {calc.status.label}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                <MoneyInput label="목표 비상금(원)" value={targetAmount} setValue={setTargetAmount} hint="예: 300만원" />
                <MoneyInput
                  label="현재 비상금(원)"
                  value={currentAmount}
                  setValue={setCurrentAmount}
                  hint="없으면 0"
                />
                <MoneyInput
                  label="월 저축 가능액(비상금으로)"
                  value={monthlySave}
                  setValue={setMonthlySave}
                  hint="예: 25만원"
                />

                <div className="rounded-lg border border-[#e2e5e1] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[12px] font-semibold text-[#3B2F1E]">안전 버퍼(선택)</div>
                      <div className="mt-1 text-xs text-[#7f7f7f]">
                        예상치 못한 지출/기간 변동을 감안해 목표액을 조금 올립니다.
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#7f7f7f]">
                      <input
                        type="checkbox"
                        checked={includeBuffer}
                        onChange={(e) => setIncludeBuffer(e.target.checked)}
                        className="h-4 w-4 rounded border-[#e2e5e1]"
                      />
                      적용
                    </label>
                  </div>

                  {includeBuffer && (
                    <div className="mt-3">
                      <PctInput
                        label="버퍼(%)"
                        value={bufferPct}
                        setValue={setBufferPct}
                        hint="보수적으로 5~15% 정도"
                      />
                    </div>
                  )}

                  <div className="mt-3 rounded-xl border border-[#e2e5e1] bg-[#1f7a5b] px-3 py-2 text-xs font-semibold text-white">
                    버퍼 포함 목표액:{" "}
                    <span className="text-[#ffffff]">{formatKRW(calc.targetWithBuffer)}원</span>
                  </div>
                </div>

                <div className="rounded-lg border border-[#e2e5e1] bg-white p-4">
                  <div className="text-[12px] font-semibold text-[#3B2F1E]">수익률 가정(선택)</div>
                  <div className="mt-1 text-xs text-[#7f7f7f]">월 단위(%)로 입력합니다. 보수적으로 0을 권장합니다.</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <PctInput
                      label="월 수익률(%)"
                      value={expectedReturnPct}
                      setValue={setExpectedReturnPct}
                      hint="기본 0"
                    />
                    <SelectInput
                      label="기간 반올림"
                      value={roundingMode}
                      onChange={(v) => setRoundingMode(v as any)}
                      options={["올림", "반올림", "내림"]}
                    />
                  </div>
                </div>

                <div className="mt-1 rounded-lg border border-[#e2e5e1] bg-white p-4">
                  <div className={cn("text-[12px] font-semibold", UI.ink)}>해석 팁</div>
                  <ul className={cn("mt-2 list-disc pl-5 text-[12px] leading-relaxed", UI.inkSoft)}>
                    <li>비상금은 “내가 버틸 수 있는 기간(월)”을 숫자로 만드는 것이 핵심입니다.</li>
                    <li>월 저축 가능액이 작아도 괜찮습니다. 대신 자동이체로 ‘지속’이 되게 만드세요.</li>
                    <li>버퍼는 계획이 흔들릴 때(경조사/수리비/의료비)에 목표를 보호합니다.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 결과 */}
            <section className={cn("rounded-xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>{calc.status.msg}</p>

              {/* 헤드라인 */}
              <div className="mt-4 rounded-xl border border-[#e2e5e1] bg-white p-5">
                <div className="text-[12px] font-semibold text-[#7f7f7f]">목표까지 예상 소요기간</div>
                <div className="mt-2 text-4xl font-bold text-[#ffffff]">
                  {Number.isFinite(calc.monthsOut) ? monthsToText(calc.monthsOut) : "산정 불가"}
                </div>
                <div className={cn("mt-2 text-[12px]", UI.inkSoft)}>
                  남은 필요 금액: <span className="font-semibold text-[#3B2F1E]">{formatKRW(calc.gap)}원</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricCard title="버퍼 포함 목표액" value={`${formatKRW(calc.targetWithBuffer)}원`} />
                <MetricCard title="현재 비상금" value={`${formatKRW(calc.current)}원`} />
                <MetricCard title="월 저축 가능액" value={`${formatKRW(calc.save)}원`} />
                <MetricCard title="월 수익률 가정" value={`${calc.rPct.toFixed(2)}%`} />
              </div>

              {/* 분해 */}
              <div className="mt-4 rounded-lg border border-[#e2e5e1] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>계산식(분해)</div>
                <div className="mt-3 grid gap-2">
                  <Row label="버퍼 포함 목표" value={`${formatKRW(calc.targetWithBuffer)}원`} />
                  <Row label="(-) 현재 비상금" value={`${formatKRW(calc.current)}원`} />
                  <Row label="= 남은 필요 금액" value={`${formatKRW(calc.gap)}원`} />
                  <Row
                    label="월 저축 가능액"
                    value={`${formatKRW(calc.save)}원`}
                    tone={calc.save <= 0 ? "danger" : "ok"}
                  />
                </div>
                <div className={cn("mt-2 text-xs leading-relaxed", UI.inkSoft)}>
                  * 수익률 가정이 0이면 “남은 필요 금액 ÷ 월 저축”으로 단순 계산합니다.
                </div>
              </div>

              {/* 참고: 12개월 내 달성하려면 */}
              {calc.gap > 0 && (
                <div className="mt-4 rounded-lg border border-[#e2e5e1] bg-white p-4">
                  <div className={cn("text-[12px] font-semibold", UI.ink)}>참고(12개월 안에 달성하려면)</div>
                  <div className="mt-3 rounded-xl border border-[#e2e5e1] bg-[#1f7a5b] px-3 py-2">
                    <div className="text-xs font-semibold text-[#7f7f7f]">필요 월 저축액(대략)</div>
                    <div className="mt-1 text-2xl font-bold text-[#ffffff]">
                      {formatKRW(calc.oneYearNeeded)}원/월
                    </div>
                  </div>
                  <div className={cn("mt-2 text-xs leading-relaxed", UI.inkSoft)}>
                    ※ 추천이 아니라 “페이스” 점검용입니다. 현실이 어렵다면 기간을 늘리고 자동이체를 유지하는 편이 안정적입니다.
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/calculators/cashflow-calendar"
                  className="rounded-lg bg-[#1f7a5b] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#176247]"
                >
                  다음: 현금흐름 캘린더 →
                </Link>
                <Link
                  href="/calculators"
                  className="rounded-lg border border-[#e2e5e1] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#1f7a5b]"
                >
                  계산기 모음으로
                </Link>
              </div>

              <div className={cn("mt-4 text-xs leading-relaxed", UI.inkSoft)}>
                ※ 본 계산기는 금융상품/투자/대출을 추천하지 않습니다. 목표를 “기간”으로 바꿔 실행 가능하게 만드는 도구입니다.
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
            "border-[#e2e5e1] focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20"
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-[12px] font-semibold text-[#3B2F1E]">{label}</label>
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

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#e2e5e1] bg-white p-4">
      <div className="text-xs font-semibold text-[#7f7f7f]">{title}</div>
      <div className="mt-1 text-xl font-bold text-[#3B2F1E]">{value}</div>
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
  const vCls =
    tone === "danger" ? "text-[#ffffff]" : tone === "ok" ? "text-[#7f7f7f]" : "text-[#7f7f7f]";
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#e2e5e1] bg-[#f1f8f4] px-3 py-2">
      <span className="text-[12px] font-semibold text-[#3B2F1E]">{label}</span>
      <span className={cn("text-[12px] font-bold", vCls)}>{value}</span>
    </div>
  );
}

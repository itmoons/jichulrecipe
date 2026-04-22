// src/app/calculators/annual-vs-monthly/page.tsx
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
  card: "bg-[#f2fbff] border-[#e8f8ff]",
};

function toNumberSafe(v: string) {
  const n = Number(String(v).replaceAll(",", "").trim());
  return Number.isFinite(n) ? n : 0;
}

function formatKRW(n: number) {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("ko-KR");
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pct(n: number) {
  if (!Number.isFinite(n)) return "0.0";
  return n.toFixed(1);
}

type Mode = "price" | "discount"; // 연간 가격 직접 입력 vs 할인율 입력

export default function AnnualVsMonthlyPage() {
  // 입력
  const [serviceName, setServiceName] = useState("예: 넷플릭스/클라우드/멤버십");
  const [monthlyPrice, setMonthlyPrice] = useState("14900");

  const [mode, setMode] = useState<Mode>("discount");

  // 모드1: 연간 결제 가격 직접 입력
  const [annualPrice, setAnnualPrice] = useState("149000");

  // 모드2: 할인율 입력
  const [discountPct, setDiscountPct] = useState("15");

  // “얼마나 쓸 건지” 체감용(선택)
  const [expectedMonths, setExpectedMonths] = useState("12");

  const calc = useMemo(() => {
    const m = toNumberSafe(monthlyPrice);
    const months = Math.max(0, Math.floor(toNumberSafe(expectedMonths)));

    const annualFromMonthly = m * 12;

    const disc = clamp(toNumberSafe(discountPct), 0, 80);
    const annualByDiscount = annualFromMonthly * (1 - disc / 100);

    const annual = mode === "price" ? Math.max(0, toNumberSafe(annualPrice)) : annualByDiscount;

    const save = annualFromMonthly - annual; // 연간 결제가 더 싸면 +
    const saveRate = annualFromMonthly > 0 ? (save / annualFromMonthly) * 100 : 0;

    const monthlyEquivalent = annual / 12;

    // 손익분기: 월간으로 x개월 낼 금액 >= 연간 선결제 금액이면 연간이 유리
    // x >= annual / monthly
    const breakevenMonths = m > 0 ? Math.ceil(annual / m) : 0;

    // 예상 사용기간 기준 비교
    const costIfMonthly = m * months;
    const costIfAnnual = months === 0 ? 0 : annual; // 보통 연간은 1년치 선결제(=12개월 사용 가정)
    // 하지만 사용개월이 12 미만이면 "손해 체감"을 보여주기 위해,
    // (환불/부분정산이 없다고 가정) 연간은 그대로 annual을 지불한 것으로 계산
    const diffByMonths = costIfMonthly - costIfAnnual; // +면 월간이 더 비쌈(연간이 유리)

    // 메시지
    const verdict =
      save > 0
        ? "연간 결제가 더 유리합니다."
        : save < 0
        ? "월간 결제가 더 유리합니다."
        : "두 방식이 동일합니다.";

    const caution =
      breakevenMonths > 0 && breakevenMonths <= 12
        ? `손익분기점은 약 ${breakevenMonths}개월입니다. 그 이상 사용할 가능성이 높으면 연간이 유리할 확률이 큽니다.`
        : breakevenMonths > 12
        ? `손익분기점이 12개월을 넘습니다(약 ${breakevenMonths}개월). 이 경우 연간은 할인 효과가 약하거나, 연간 가격이 높을 수 있어요.`
        : "월 요금이 0이면 손익분기를 계산할 수 없습니다.";

    return {
      m,
      months,
      annualFromMonthly,
      annual,
      disc,
      save,
      saveRate,
      monthlyEquivalent,
      breakevenMonths,
      costIfMonthly,
      costIfAnnual,
      diffByMonths,
      verdict,
      caution,
    };
  }, [monthlyPrice, expectedMonths, mode, annualPrice, discountPct]);

  return (
    <div className={cn("min-h-screen", UI.paperBg)}>
      <div className={cn("min-h-screen", UI.paperDots)}>
        <div className="mx-auto w-[1320px] px-4 py-7 sm:py-10">
          {/* 상단 네비 */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <Link
              href="/calculators"
              className="rounded-full border border-[#e8f8ff] bg-[#f2fbff] px-3 py-1.5 text-[12px] font-semibold text-[#7f7f7f] hover:border-[#5bbbf3]"
            >
              ← 계산기 모음
            </Link>

            <span className="rounded-full bg-[#5bbbf3] px-3 py-1.5 text-[12px] font-semibold text-[#ffffff]">
              결제 비교
            </span>
          </div>

          {/* 헤더 */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8f8ff] bg-[#f2fbff] px-3 py-1 text-xs font-medium text-[#7f7f7f] shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#5bbbf3]" />
              Recipe Calculator
            </div>

            <h1 className={cn("mt-3 text-2xl sm:text-3xl font-semibold tracking-tight", UI.ink)}>
              연간 결제 vs 월간 결제 손익 계산기
            </h1>
            <p className={cn("mt-2 text-[12px] sm:text-base", UI.inkSoft)}>
              월간 요금과 연간 결제(가격 또는 할인율)를 입력하면{" "}
              <span className="font-semibold text-[#ffffff]">절감액·절감률·손익분기점</span>을 계산합니다.
            </p>
          </div>

          {/* 본문 */}
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {/* 입력 카드 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                연간 결제는 “연간 가격 직접 입력” 또는 “할인율 입력” 중 하나로 계산할 수 있습니다.
              </p>

              <div className="mt-4 grid gap-3">
                <TextInput
                  label="서비스/구독 이름(선택)"
                  value={serviceName}
                  setValue={setServiceName}
                  placeholder="예: 유튜브 프리미엄"
                />

                <MoneyInput label="월간 요금" value={monthlyPrice} setValue={setMonthlyPrice} />

                <div className="rounded-2xl border border-[#e8f8ff] bg-white p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className={cn("text-[12px] font-semibold", UI.ink)}>연간 결제 입력 방식</div>
                      <div className={cn("text-xs", UI.inkSoft)}>
                        실제 가격을 알고 있으면 “연간 가격”, 할인만 알면 “할인율”이 편합니다.
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setMode("discount")}
                        className={cn(
                          "rounded-full border px-3 py-2 text-[12px] font-semibold transition",
                          mode === "discount"
                            ? "border-[#5bbbf3] bg-[#5bbbf3] text-white"
                            : "border-[#e8f8ff] bg-[#f2fbff] text-[#7f7f7f] hover:border-[#5bbbf3]"
                        )}
                      >
                        할인율
                      </button>
                      <button
                        onClick={() => setMode("price")}
                        className={cn(
                          "rounded-full border px-3 py-2 text-[12px] font-semibold transition",
                          mode === "price"
                            ? "border-[#5bbbf3] bg-[#5bbbf3] text-white"
                            : "border-[#e8f8ff] bg-[#f2fbff] text-[#7f7f7f] hover:border-[#5bbbf3]"
                        )}
                      >
                        연간 가격
                      </button>
                    </div>
                  </div>

                  {mode === "discount" ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:items-end">
                      <NumberInput
                        label="연간 결제 할인율(%)"
                        value={discountPct}
                        setValue={setDiscountPct}
                        hint="0~80% 범위 자동 제한"
                        placeholder="예: 15"
                      />
                      <div className="rounded-2xl bg-[#5bbbf3] p-3">
                        <div className="text-xs font-semibold text-[#7f7f7f]">할인 적용 연간 가격</div>
                        <div className="mt-1 text-lg font-bold text-[#ffffff]">
                          {formatKRW(calc.annual)}원
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <MoneyInput label="연간 결제 가격(12개월 선결제)" value={annualPrice} setValue={setAnnualPrice} />
                    </div>
                  )}
                </div>

                <NumberInput
                  label="예상 사용 기간(개월, 선택)"
                  value={expectedMonths}
                  setValue={setExpectedMonths}
                  hint="부분환불이 없다고 가정하면, 12개월 미만 사용 시 연간이 불리해질 수 있습니다."
                  placeholder="예: 6"
                />
              </div>

              <div className="mt-5 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>해석 팁</div>
                <ul className={cn("mt-2 list-disc pl-5 text-[12px] leading-relaxed", UI.inkSoft)}>
                  <li>연간 결제는 “할인”보다 “중간 해지 가능성”이 변수입니다.</li>
                  <li>손익분기점(개월)이 짧을수록 연간 결제가 합리적일 가능성이 큽니다.</li>
                  <li>가격이 아니라 “사용 습관”이 결론을 좌우합니다.</li>
                </ul>
              </div>
            </section>

            {/* 결과 카드 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>
                  <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                    월간(12개월) 대비 연간 결제의 손익을 요약합니다.
                  </p>
                </div>

                <span className="rounded-full bg-[#5bbbf3] px-3 py-1 text-[12px] font-semibold text-[#ffffff]">
                  {serviceName?.trim() ? serviceName.trim() : "구독"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricCard title="월간 12개월 총액" value={`${formatKRW(calc.annualFromMonthly)}원`} />
                <MetricCard title="연간 결제 가격" value={`${formatKRW(calc.annual)}원`} />
              </div>

              <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className={cn("text-[12px] font-semibold", UI.ink)}>핵심 손익</div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[12px] font-semibold",
                      calc.save > 0
                        ? "bg-[#34D399] text-white"
                        : calc.save < 0
                        ? "bg-[#5bbbf3] text-white"
                        : "bg-[#52a9ff] text-[#ffffff]"
                    )}
                  >
                    {calc.verdict}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <MiniCard
                    title="연간 절감액(+) / 추가비용(-)"
                    value={`${(calc.save >= 0 ? "+" : "") + formatKRW(calc.save)}원`}
                    accent={calc.save > 0}
                  />
                  <MiniCard
                    title="절감률(월간 12개월 대비)"
                    value={`${pct(calc.saveRate)}%`}
                    accent={calc.saveRate > 0}
                  />
                </div>

                <div className={cn("mt-3 text-[12px] font-semibold", UI.ink)}>
                  손익분기점: 약 {calc.breakevenMonths || 0}개월
                </div>
                <div className={cn("mt-1 text-[12px] leading-relaxed", UI.inkSoft)}>{calc.caution}</div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>체감 월 환산(연간 결제 기준)</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={cn("text-[12px]", UI.inkSoft)}>연간 결제를 월로 환산하면</span>
                  <span className="text-lg font-bold text-[#ffffff]">
                    {formatKRW(calc.monthlyEquivalent)}원/월
                  </span>
                </div>

                <div className="mt-3 rounded-xl border border-[#e8f8ff] bg-[#5bbbf3] p-3">
                  <div className="text-xs font-semibold text-[#7f7f7f]">예상 사용기간({calc.months}개월) 기준 비교</div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <SmallLine title="월간으로 {months}개월" value={`${formatKRW(calc.costIfMonthly)}원`} />
                    <SmallLine title="연간 선결제(환불없음 가정)" value={`${formatKRW(calc.costIfAnnual)}원`} />
                  </div>

                  <div className="mt-2 text-[12px] font-semibold text-[#3B2F1E]">
                    차이:{" "}
                    <span className={cn(calc.diffByMonths >= 0 ? "text-[#ffffff]" : "text-[#7f7f7f]")}>
                      {(calc.diffByMonths >= 0 ? "+" : "") + formatKRW(calc.diffByMonths)}원
                    </span>
                    <span className="text-xs text-[#7f7f7f]"> (＋면 연간이 유리)</span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/calculators/subscription-total"
                  className="rounded-2xl bg-[#5bbbf3] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
                >
                  이전: 구독 총액 계산기 ←
                </Link>
                <Link
                  href="/calculators"
                  className="rounded-2xl border border-[#e8f8ff] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#5bbbf3]"
                >
                  계산기 모음으로
                </Link>
              </div>

              <div className={cn("mt-4 text-xs leading-relaxed", UI.inkSoft)}>
                ※ 본 계산기는 단순 비교 도구입니다. 실제는 환불정책, 프로모션, 공유플랜, 중간 해지 가능성에 따라 달라질 수 있습니다.
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ----------------- UI Components ----------------- */

function TextInput({
  label,
  value,
  setValue,
  placeholder,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-[12px] font-semibold text-[#3B2F1E]">{label}</label>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-11 w-full rounded-xl border bg-white px-3 text-[12px] outline-none",
          "border-[#e8f8ff] focus:border-[#5bbbf3] focus:ring-2 focus:ring-[#5bbbf3]/20"
        )}
      />
    </div>
  );
}

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

function NumberInput({
  label,
  value,
  setValue,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  hint?: string;
  placeholder?: string;
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
        placeholder={placeholder}
        className={cn(
          "h-11 w-full rounded-xl border bg-white px-3 text-[12px] outline-none",
          "border-[#e8f8ff] focus:border-[#5bbbf3] focus:ring-2 focus:ring-[#5bbbf3]/20"
        )}
      />
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

function MiniCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        accent ? "border-[#5bbbf3] bg-[#5bbbf3]" : "border-[#e8f8ff] bg-white"
      )}
    >
      <div className={cn("text-xs font-semibold", accent ? "text-[#ffffff]" : "text-[#7f7f7f]")}>
        {title}
      </div>
      <div className={cn("mt-1 text-lg font-bold", accent ? "text-[#ffffff]" : "text-[#3B2F1E]")}>
        {value}
      </div>
    </div>
  );
}

function SmallLine({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#e8f8ff] bg-white px-3 py-2">
      <span className="text-xs font-semibold text-[#7f7f7f]">{title}</span>
      <span className="text-[12px] font-bold text-[#3B2F1E]">{value}</span>
    </div>
  );
}

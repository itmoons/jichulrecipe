// src/app/calculators/mobile-plan-optimizer/page.tsx
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

type Plan = {
  planFee: string; // 요금제 월정액
  bundleDiscount: string; // 결합/약정/프로모션 할인(월)
  deviceInstallment: string; // 단말 할부(월)
  deviceInsurance: string; // 단말 보험(월)
  other: string; // 기타(부가서비스 등)
};

function sumPlan(p: Plan) {
  const fee = Math.max(0, toNumberSafe(p.planFee));
  const disc = clamp(toNumberSafe(p.bundleDiscount), 0, 999999999); // 할인은 +로 입력(차감)
  const inst = Math.max(0, toNumberSafe(p.deviceInstallment));
  const ins = Math.max(0, toNumberSafe(p.deviceInsurance));
  const oth = Math.max(0, toNumberSafe(p.other));

  const total = Math.max(0, fee - disc) + inst + ins + oth;

  return { fee, disc, inst, ins, oth, total };
}

export default function MobilePlanOptimizerPage() {
  const [current, setCurrent] = useState<Plan>({
    planFee: "69000",
    bundleDiscount: "10000",
    deviceInstallment: "0",
    deviceInsurance: "0",
    other: "0",
  });

  const [next, setNext] = useState<Plan>({
    planFee: "55000",
    bundleDiscount: "5000",
    deviceInstallment: "0",
    deviceInsurance: "0",
    other: "0",
  });

  const calc = useMemo(() => {
    const c = sumPlan(current);
    const n = sumPlan(next);

    const monthlySave = c.total - n.total; // +면 절감
    const yearlySave = monthlySave * 12;
    const saveRate = c.total > 0 ? (monthlySave / c.total) * 100 : 0;

    // 어디서 절감/증가했는지 분해(변경 후 - 현재)
    const delta = {
      planFee: n.fee - c.fee,
      discount: n.disc - c.disc, // 할인은 커질수록 유리인데, 여기서는 값 자체가 +이므로 주의
      installment: n.inst - c.inst,
      insurance: n.ins - c.ins,
      other: n.oth - c.oth,
    };

    // 해석용: 할인 변화는 “총액”에 반대로 작용(할인 증가 => 총액 감소)
    const effect = {
      planFee: delta.planFee,
      discount: -(delta.discount), // 할인 증가(+)는 총액에 (-)효과
      installment: delta.installment,
      insurance: delta.insurance,
      other: delta.other,
    };

    const driver = Object.entries(effect)
      .map(([k, v]) => ({ k, v }))
      .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
      .slice(0, 3);

    const verdict =
      monthlySave > 0
        ? { label: "절감", badge: "bg-[#34D399] text-white", msg: "변경 시 월 통신비가 줄어듭니다." }
        : monthlySave < 0
        ? { label: "증가", badge: "bg-[#5bbbf3] text-white", msg: "변경 시 월 통신비가 늘어납니다." }
        : { label: "동일", badge: "bg-[#52a9ff] text-[#ffffff]", msg: "두 요금제의 월 부담이 동일합니다." };

    return { c, n, monthlySave, yearlySave, saveRate, delta, effect, driver, verdict };
  }, [current, next]);

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
              통신비 점검
            </span>
          </div>

          {/* 헤더 */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8f8ff] bg-[#f2fbff] px-3 py-1 text-xs font-medium text-[#7f7f7f] shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#5bbbf3]" />
              Recipe Calculator
            </div>

            <h1 className={cn("mt-3 text-2xl sm:text-3xl font-semibold tracking-tight", UI.ink)}>
              통신비 최적화 계산기
            </h1>
            <p className={cn("mt-2 text-[12px] sm:text-base", UI.inkSoft)}>
              요금제 변경 전/후를 입력하면 <span className="font-semibold text-[#ffffff]">월 절감액·연 절감액</span>을 계산합니다.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {/* 입력: 현재/변경 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                할인은 “월 할인 금액”을 양수로 입력하세요. (총액에서 자동 차감)
              </p>

              <div className="mt-4 grid gap-4">
                <PlanBox
                  title="현재(변경 전)"
                  plan={current}
                  onChange={setCurrent}
                  chip="현재"
                />

                <div className="h-px bg-[#e8f8ff]" />

                <PlanBox
                  title="변경 후"
                  plan={next}
                  onChange={setNext}
                  chip="변경"
                />
              </div>

              <div className="mt-5 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>현실 체크</div>
                <ul className={cn("mt-2 list-disc pl-5 text-[12px] leading-relaxed", UI.inkSoft)}>
                  <li>결합할인/약정할인은 변경 시 깨질 수 있습니다. 할인 조건을 먼저 확인하세요.</li>
                  <li>부가서비스(컬러링, 데이터부가팩 등)가 “기타”에 숨어있는 경우가 많습니다.</li>
                  <li>단말 할부가 남아있다면, 요금제만 내려도 체감 절감이 작을 수 있어요.</li>
                </ul>
              </div>
            </section>

            {/* 결과 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>
                  <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                    총액 기준으로 절감/증가를 계산합니다.
                  </p>
                </div>

                <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", calc.verdict.badge)}>
                  {calc.verdict.label}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricCard title="현재 월 총액" value={`${formatKRW(calc.c.total)}원`} />
                <MetricCard title="변경 후 월 총액" value={`${formatKRW(calc.n.total)}원`} />
              </div>

              <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className={cn("text-[12px] font-semibold", UI.ink)}>월 절감액</div>
                  <span className="rounded-full bg-[#5bbbf3] px-3 py-1 text-xs font-semibold text-[#ffffff]">
                    절감률 {pct(calc.saveRate)}%
                  </span>
                </div>

                <div className="mt-2 text-3xl font-bold text-[#ffffff]">
                  {(calc.monthlySave >= 0 ? "+" : "") + formatKRW(calc.monthlySave)}원/월
                </div>

                <div className={cn("mt-1 text-[12px]", UI.inkSoft)}>{calc.verdict.msg}</div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <MiniCard title="연 절감액(×12)" value={`${(calc.yearlySave >= 0 ? "+" : "") + formatKRW(calc.yearlySave)}원`} accent={calc.yearlySave > 0} />
                  <MiniCard
                    title="연간 기준 체감"
                    value={
                      calc.yearlySave > 0
                        ? "연간 지출을 줄이는 방향"
                        : calc.yearlySave < 0
                        ? "연간 지출이 늘어나는 방향"
                        : "변화 없음"
                    }
                  />
                </div>
              </div>

              {/* 요인 분해 */}
              <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>변경 요인(어디서 변했나)</div>
                <div className={cn("mt-1 text-xs", UI.inkSoft)}>
                  ‘변경 후 - 현재’ 기준입니다. (할인 증가는 총액에 감소 효과)
                </div>

                <div className="mt-3 grid gap-2">
                  <DeltaRow label="요금제 월정액" delta={calc.effect.planFee} />
                  <DeltaRow label="할인(결합/약정 등)" delta={calc.effect.discount} />
                  <DeltaRow label="단말 할부" delta={calc.effect.installment} />
                  <DeltaRow label="단말 보험" delta={calc.effect.insurance} />
                  <DeltaRow label="기타(부가서비스)" delta={calc.effect.other} />
                </div>

                <div className="mt-3 rounded-xl border border-[#e8f8ff] bg-[#5bbbf3] p-3">
                  <div className="text-xs font-semibold text-[#7f7f7f]">가장 큰 변화 TOP 3</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {calc.driver.map((d) => (
                      <span
                        key={d.k}
                        className="rounded-full border border-[#e8f8ff] bg-white px-3 py-1 text-xs font-semibold text-[#7f7f7f]"
                      >
                        {d.k === "planFee"
                          ? "요금제"
                          : d.k === "discount"
                          ? "할인"
                          : d.k === "installment"
                          ? "할부"
                          : d.k === "insurance"
                          ? "보험"
                          : "기타"}{" "}
                        {d.v >= 0 ? "↑" : "↓"}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/calculators/fixed-cost-ratio"
                  className="rounded-2xl bg-[#5bbbf3] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
                >
                  다음: 고정비 비율 점검 →
                </Link>
                <Link
                  href="/calculators"
                  className="rounded-2xl border border-[#e8f8ff] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#5bbbf3]"
                >
                  계산기 모음으로
                </Link>
              </div>

              <div className={cn("mt-4 text-xs leading-relaxed", UI.inkSoft)}>
                ※ 본 계산기는 입력값 기반의 비교 도구입니다. 실제 청구액은 부가세, 프로모션 조건, 결합 해지/유지 여부에 따라 달라질 수 있습니다.
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ----------------- UI Components ----------------- */

function PlanBox({
  title,
  chip,
  plan,
  onChange,
}: {
  title: string;
  chip: string;
  plan: Plan;
  onChange: (p: Plan) => void;
}) {
  const patch = (k: keyof Plan, v: string) => onChange({ ...plan, [k]: v });

  return (
    <div className="rounded-2xl border border-[#e8f8ff] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold text-[#3B2F1E]">{title}</div>
          <div className="mt-1 text-xs text-[#7f7f7f]">월 기준 총액을 비교합니다.</div>
        </div>
        <span className="rounded-full bg-[#5bbbf3] px-3 py-1 text-xs font-semibold text-[#ffffff]">
          {chip}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MoneyInput label="요금제 월정액" value={plan.planFee} setValue={(v) => patch("planFee", v)} />
        <MoneyInput label="할인(월)" value={plan.bundleDiscount} setValue={(v) => patch("bundleDiscount", v)} hint="결합/약정/프로모션" />
        <MoneyInput label="단말 할부(월)" value={plan.deviceInstallment} setValue={(v) => patch("deviceInstallment", v)} hint="없으면 0" />
        <MoneyInput label="단말 보험(월)" value={plan.deviceInsurance} setValue={(v) => patch("deviceInsurance", v)} hint="없으면 0" />
        <MoneyInput label="기타(월)" value={plan.other} setValue={(v) => patch("other", v)} hint="부가서비스 등" />
      </div>
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
            "border-[#e8f8ff] focus:border-[#5bbbf3] focus:ring-2 focus:ring-[#5bbbf3]/20"
          )}
        />
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
    <div className={cn("rounded-2xl border p-4", accent ? "border-[#5bbbf3] bg-[#5bbbf3]" : "border-[#e8f8ff] bg-white")}>
      <div className={cn("text-xs font-semibold", accent ? "text-[#ffffff]" : "text-[#7f7f7f]")}>
        {title}
      </div>
      <div className={cn("mt-1 text-lg font-bold", accent ? "text-[#ffffff]" : "text-[#3B2F1E]")}>
        {value}
      </div>
    </div>
  );
}

function DeltaRow({ label, delta }: { label: string; delta: number }) {
  const sign = delta >= 0 ? "+" : "";
  const tone =
    delta < 0
      ? "text-[#34D399]" // 총액 감소 요인
      : delta > 0
      ? "text-[#ffffff]" // 총액 증가 요인
      : "text-[#7f7f7f]";

  return (
    <div className="flex items-center justify-between rounded-xl border border-[#e8f8ff] bg-[#f2fbff] px-3 py-2">
      <span className="text-[12px] font-semibold text-[#3B2F1E]">{label}</span>
      <span className={cn("text-[12px] font-bold", tone)}>
        {sign}
        {formatKRW(delta)}원
      </span>
    </div>
  );
}

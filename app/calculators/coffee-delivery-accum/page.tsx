// src/app/calculators/coffee-delivery-accum/page.tsx
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
  card: "bg-[#fff7ed] border-[#ffedd5]",
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

const WEEKS_PER_MONTH = 4.33;

type Bucket = {
  perWeek: string; // 주당 횟수
  avgCost: string; // 1회 평균
};

function bucketCost(b: Bucket) {
  const perWeek = clamp(toNumberSafe(b.perWeek), 0, 50);
  const avg = Math.max(0, toNumberSafe(b.avgCost));
  const monthly = perWeek * WEEKS_PER_MONTH * avg;
  const yearly = monthly * 12;
  return { perWeek, avg, monthly, yearly };
}

export default function CoffeeDeliveryAccumPage() {
  const [coffee, setCoffee] = useState<Bucket>({ perWeek: "5", avgCost: "4500" });
  const [delivery, setDelivery] = useState<Bucket>({ perWeek: "2", avgCost: "22000" });

  const calc = useMemo(() => {
    const c = bucketCost(coffee);
    const d = bucketCost(delivery);

    const monthlyTotal = c.monthly + d.monthly;
    const yearlyTotal = c.yearly + d.yearly;

    const coffeeShare = monthlyTotal > 0 ? (c.monthly / monthlyTotal) * 100 : 0;
    const deliveryShare = monthlyTotal > 0 ? (d.monthly / monthlyTotal) * 100 : 0;

    // 시나리오: 주당 -1회
    const c_less1 = bucketCost({ perWeek: String(Math.max(0, c.perWeek - 1)), avgCost: String(c.avg) });
    const d_less1 = bucketCost({ perWeek: String(Math.max(0, d.perWeek - 1)), avgCost: String(d.avg) });

    const save_weekMinus1 =
      (c.monthly - c_less1.monthly) + (d.monthly - d_less1.monthly);

    // 시나리오: 평균 -1,000원
    const c_avgMinus1000 = bucketCost({ perWeek: String(c.perWeek), avgCost: String(Math.max(0, c.avg - 1000)) });
    const d_avgMinus1000 = bucketCost({ perWeek: String(d.perWeek), avgCost: String(Math.max(0, d.avg - 1000)) });

    const save_avgMinus1000 =
      (c.monthly - c_avgMinus1000.monthly) + (d.monthly - d_avgMinus1000.monthly);

    const signal =
      monthlyTotal <= 100000
        ? {
            label: "가벼움",
            badge: "bg-[#34D399] text-white",
            msg: "월 누적이 크지 않습니다. 유지하면서 ‘배달’만 관리해도 충분할 수 있어요.",
          }
        : monthlyTotal <= 200000
        ? {
            label: "주의",
            badge: "bg-[#ff8a3d] text-[#ffffff]",
            msg: "월 누적이 눈에 띕니다. 횟수/단가 중 하나만 조정해도 체감이 큽니다.",
          }
        : {
            label: "점검 필요",
            badge: "bg-[#ff8a3d] text-white",
            msg: "월 누적이 큽니다. 특히 배달은 ‘횟수×단가’가 동시에 커지기 쉬워 우선순위를 두고 줄여보세요.",
          };

    return {
      c,
      d,
      monthlyTotal,
      yearlyTotal,
      coffeeShare,
      deliveryShare,
      save_weekMinus1,
      save_avgMinus1000,
      signal,
    };
  }, [coffee, delivery]);

  return (
    <div className={cn("min-h-screen", UI.paperBg)}>
      <div className={cn("min-h-screen", UI.paperDots)}>
        <div className="mx-auto px-2 py-2 sm:py-2">
          {/* 상단 네비 */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <Link
              href="/calculators"
              className="rounded-full border border-[#ffedd5] bg-[#fff7ed] px-3 py-1.5 text-[12px] font-semibold text-[#7f7f7f] hover:border-[#ff8a3d]"
            >
              ← 계산기 모음
            </Link>

            <span className="rounded-full bg-[#ff8a3d] px-3 py-1.5 text-[12px] font-semibold text-[#ffffff]">
              누적 점검
            </span>
          </div>

          {/* 헤더 */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ffedd5] bg-[#fff7ed] px-3 py-1 text-xs font-medium text-[#7f7f7f] shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#ff8a3d]" />
              Recipe Calculator
            </div>

            <h1 className={cn("mt-3 text-2xl sm:text-3xl font-semibold tracking-tight", UI.ink)}>
              커피/배달 지출 누적 계산기
            </h1>
            <p className={cn("mt-2 text-[12px] sm:text-base", UI.inkSoft)}>
              주당 횟수를 월/연으로 환산해, “작은 지출의 누적”을 숫자로 보이게 합니다.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {/* 입력 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                커피/배달을 각각 입력하면 월/연 누적이 자동 계산됩니다.
              </p>

              <div className="mt-4 grid gap-4">
                <BucketBox
                  title="커피"
                  subtitle="카페·편의점·테이크아웃 포함"
                  chip="Coffee"
                  bucket={coffee}
                  onChange={setCoffee}
                />
                <BucketBox
                  title="배달"
                  subtitle="배달앱·포장·야식 포함"
                  chip="Delivery"
                  bucket={delivery}
                  onChange={setDelivery}
                />
              </div>

              <div className="mt-5 rounded-2xl border border-[#ffedd5] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>빠른 해석</div>
                <ul className={cn("mt-2 list-disc pl-5 text-[12px] leading-relaxed", UI.inkSoft)}>
                  <li>주당 1회 차이는 월로 환산하면 생각보다 큽니다(4.33주).</li>
                  <li>배달은 단가가 높아 “횟수 1회” 조정 효과가 더 크게 나타나기 쉽습니다.</li>
                  <li>단가는 “음료/사이드/배달비”를 분리하면 줄일 구멍이 보입니다.</li>
                </ul>
              </div>
            </section>

            {/* 결과 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={cn("text-lg font-semibold", UI.ink)}>누적 결과</h2>
                  <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                    월/연으로 환산한 총액과 비중을 확인하세요.
                  </p>
                </div>

                <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", calc.signal.badge)}>
                  {calc.signal.label}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricCard title="월 누적(커피)" value={`${formatKRW(calc.c.monthly)}원`} />
                <MetricCard title="월 누적(배달)" value={`${formatKRW(calc.d.monthly)}원`} />
                <MetricCard title="월 누적(합계)" value={`${formatKRW(calc.monthlyTotal)}원`} accent />
                <MetricCard title="연 누적(합계)" value={`${formatKRW(calc.yearlyTotal)}원`} />
              </div>

              <div className="mt-4 rounded-2xl border border-[#ffedd5] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className={cn("text-[12px] font-semibold", UI.ink)}>비중(월 기준)</div>
                  <div className="text-xs text-[#7f7f7f]">커피 vs 배달</div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#7f7f7f]">
                    <span>커피 {pct(calc.coffeeShare)}%</span>
                    <span>배달 {pct(calc.deliveryShare)}%</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full border border-[#ffedd5] bg-[#ff8a3d]">
                    <div
                      className="h-full bg-[#ff8a3d]"
                      style={{ width: `${clamp(calc.coffeeShare, 0, 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-[#7f7f7f]">
                    남은 구간은 배달 비중입니다.
                  </div>
                </div>

                <div className={cn("mt-3 text-[12px] leading-relaxed", UI.inkSoft)}>
                  {calc.signal.msg}
                </div>
              </div>

              {/* 시나리오 */}
              <div className="mt-4 rounded-2xl border border-[#ffedd5] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>시나리오(이번 달만 조정하면)</div>

                <div className="mt-3 grid gap-2">
                  <ScenarioRow
                    label="커피·배달 주당 1회씩 줄이기"
                    value={`약 ${formatKRW(calc.save_weekMinus1)}원/월`}
                    sub="둘 다 1회씩만 줄여도 월 단위로 체감이 큽니다."
                  />
                  <ScenarioRow
                    label="커피·배달 평균단가 -1,000원"
                    value={`약 ${formatKRW(calc.save_avgMinus1000)}원/월`}
                    sub="음료/사이드/배달비를 분리하면 단가를 내리기 쉽습니다."
                  />
                </div>
              </div>

              {/* CTA */}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/calculators/transport-compare"
                  className="rounded-2xl bg-[#ff8a3d] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
                >
                  다음: 교통비 비교 →
                </Link>
                <Link
                  href="/calculators"
                  className="rounded-2xl border border-[#ffedd5] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#ff8a3d]"
                >
                  계산기 모음으로
                </Link>
              </div>

              <div className={cn("mt-4 text-xs leading-relaxed", UI.inkSoft)}>
                ※ 환산은 평균 월 4.33주를 사용합니다. 개인별 월별 변동(명절/휴가/연말)에 따라 실제 지출은 달라질 수 있습니다.
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ----------------- UI Components ----------------- */

function BucketBox({
  title,
  subtitle,
  chip,
  bucket,
  onChange,
}: {
  title: string;
  subtitle: string;
  chip: string;
  bucket: Bucket;
  onChange: (b: Bucket) => void;
}) {
  const patch = (k: keyof Bucket, v: string) => onChange({ ...bucket, [k]: v });

  return (
    <div className="rounded-2xl border border-[#ffedd5] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold text-[#3B2F1E]">{title}</div>
          <div className="mt-1 text-xs text-[#7f7f7f]">{subtitle}</div>
        </div>
        <span className="rounded-full bg-[#ff8a3d] px-3 py-1 text-xs font-semibold text-[#ffffff]">
          {chip}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <NumberInput label="주당 횟수" value={bucket.perWeek} setValue={(v) => patch("perWeek", v)} hint="예: 5" />
        <MoneyInput label="1회 평균 금액" value={bucket.avgCost} setValue={(v) => patch("avgCost", v)} hint="예: 4,500" />
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
          "border-[#ffedd5] focus:border-[#ff8a3d] focus:ring-2 focus:ring-[#ff8a3d]/20"
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
            "border-[#ffedd5] focus:border-[#ff8a3d] focus:ring-2 focus:ring-[#ff8a3d]/20"
          )}
        />
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
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        accent ? "border-[#ff8a3d] bg-[#ff8a3d]" : "border-[#ffedd5] bg-white"
      )}
    >
      <div className={cn("text-xs font-semibold", accent ? "text-[#ffffff]" : "text-[#7f7f7f]")}>
        {title}
      </div>
      <div className={cn("mt-1 text-xl font-bold", accent ? "text-[#ffffff]" : "text-[#3B2F1E]")}>
        {value}
      </div>
    </div>
  );
}

function ScenarioRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-[#ffedd5] bg-[#ff8a3d] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-[#3B2F1E]">{label}</div>
          {sub && <div className="mt-1 text-xs text-[#7f7f7f]}">{sub}</div>}
        </div>
        <div className="shrink-0 text-[12px] font-bold text-[#ffffff]">{value}</div>
      </div>
    </div>
  );
}

// src/app/calculators/utility-season-compare/page.tsx
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

type MonthBlock = {
  label: string; // 이번 달 / 전월 / 전년동월
  electricity: string;
  gas: string;
  water: string;
  maintenance: string;
  etc: string;
};

function toNumberSafe(v: string) {
  const n = Number(String(v).replaceAll(",", "").trim());
  return Number.isFinite(n) ? n : 0;
}

function formatKRW(n: number) {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("ko-KR");
}

function pct(n: number) {
  if (!Number.isFinite(n)) return "0.0";
  return n.toFixed(1);
}

function sumBlock(b: MonthBlock) {
  const e = Math.max(0, toNumberSafe(b.electricity));
  const g = Math.max(0, toNumberSafe(b.gas));
  const w = Math.max(0, toNumberSafe(b.water));
  const m = Math.max(0, toNumberSafe(b.maintenance));
  const etc = Math.max(0, toNumberSafe(b.etc));
  const total = e + g + w + m + etc;
  return { e, g, w, m, etc, total };
}

function deltaPct(curr: number, base: number) {
  if (base <= 0) return 0;
  return ((curr - base) / base) * 100;
}

function signalFrom(momPct: number, yoyPct: number) {
  // “계절요인”은 YoY를 더 우선 (기저효과/계절성 반영)
  // MoM은 생활패턴/일시 이벤트(여행/추위/폭염/요금제 변경)의 영향이 큼
  const absYoY = Math.abs(yoyPct);
  const absMoM = Math.abs(momPct);

  // 간단 신호등
  if (absYoY <= 10 && absMoM <= 15) {
    return {
      label: "정상 범위",
      badge: "bg-[#34D399] text-white",
      msg: "전월·전년동월 대비 변동이 과도하지 않습니다. 계절요인 수준의 변동일 가능성이 큽니다.",
    };
  }
  if (absYoY <= 20 && absMoM <= 30) {
    return {
      label: "주의",
      badge: "bg-[#52a9ff] text-[#ffffff]",
      msg: "변동이 눈에 띕니다. YoY가 크면 요금/사용량 변화, MoM이 크면 단기 이벤트(폭염/한파/여행/시설수리) 가능성을 점검하세요.",
    };
  }
  return {
    label: "점검 필요",
    badge: "bg-[#5bbbf3] text-white",
    msg: "변동이 큽니다. 고지서 내역(사용량/단가/할인)과 관리비 항목(수선충당금/공용전기 등)을 분해해서 확인하는 게 좋습니다.",
  };
}

export default function UtilitySeasonComparePage() {
  // 기본 예시 값
  const [current, setCurrent] = useState<MonthBlock>({
    label: "이번 달(기준)",
    electricity: "68000",
    gas: "72000",
    water: "12000",
    maintenance: "160000",
    etc: "0",
  });

  const [prev, setPrev] = useState<MonthBlock>({
    label: "전월",
    electricity: "52000",
    gas: "61000",
    water: "11000",
    maintenance: "160000",
    etc: "0",
  });

  const [lastYear, setLastYear] = useState<MonthBlock>({
    label: "전년동월",
    electricity: "60000",
    gas: "64000",
    water: "12000",
    maintenance: "155000",
    etc: "0",
  });

  const calc = useMemo(() => {
    const c = sumBlock(current);
    const p = sumBlock(prev);
    const y = sumBlock(lastYear);

    const momDiff = c.total - p.total;
    const yoyDiff = c.total - y.total;

    const momPct = deltaPct(c.total, p.total);
    const yoyPct = deltaPct(c.total, y.total);

    const signal = signalFrom(momPct, yoyPct);

    // 항목별 기여도(증감액)
    const contrib = [
      { key: "전기", curr: c.e, baseMoM: p.e, baseYoY: y.e },
      { key: "가스", curr: c.g, baseMoM: p.g, baseYoY: y.g },
      { key: "수도", curr: c.w, baseMoM: p.w, baseYoY: y.w },
      { key: "관리비", curr: c.m, baseMoM: p.m, baseYoY: y.m },
      { key: "기타", curr: c.etc, baseMoM: p.etc, baseYoY: y.etc },
    ].map((r) => ({
      ...r,
      mom: r.curr - r.baseMoM,
      yoy: r.curr - r.baseYoY,
    }));

    const topMoM = [...contrib].sort((a, b) => Math.abs(b.mom) - Math.abs(a.mom)).slice(0, 3);
    const topYoY = [...contrib].sort((a, b) => Math.abs(b.yoy) - Math.abs(a.yoy)).slice(0, 3);

    return {
      c,
      p,
      y,
      momDiff,
      yoyDiff,
      momPct,
      yoyPct,
      signal,
      contrib,
      topMoM,
      topYoY,
    };
  }, [current, prev, lastYear]);

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
              공과금 점검
            </span>
          </div>

          {/* 헤더 */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8f8ff] bg-[#f2fbff] px-3 py-1 text-xs font-medium text-[#7f7f7f] shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#5bbbf3]" />
              Recipe Calculator
            </div>

            <h1 className={cn("mt-3 text-2xl sm:text-3xl font-semibold tracking-tight", UI.ink)}>
              관리비·공과금 계절요인 비교 계산기
            </h1>
            <p className={cn("mt-2 text-[12px] sm:text-base", UI.inkSoft)}>
              이번 달을 기준으로 <span className="font-semibold text-[#ffffff]">전월(MoM)</span>·
              <span className="font-semibold text-[#ffffff]">전년동월(YoY)</span> 증감을 계산합니다.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {/* 입력 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                고지서 금액 기준으로 입력하세요. 관리비는 총액 기준으로 넣어도 됩니다.
              </p>

              <div className="mt-4 grid gap-4">
                <MonthBox title="이번 달(기준)" block={current} onChange={setCurrent} chip="기준" />
                <div className="h-px bg-[#e8f8ff]" />
                <MonthBox title="전월" block={prev} onChange={setPrev} chip="MoM" />
                <div className="h-px bg-[#e8f8ff]" />
                <MonthBox title="전년동월" block={lastYear} onChange={setLastYear} chip="YoY" />
              </div>

              <div className="mt-5 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>해석 가이드</div>
                <ul className={cn("mt-2 list-disc pl-5 text-[12px] leading-relaxed", UI.inkSoft)}>
                  <li><b>YoY</b>는 계절성/기저효과를 어느 정도 제거해 “구조적 변화(요금/사용량)”를 보기 좋습니다.</li>
                  <li><b>MoM</b>은 단기 이벤트(폭염/한파, 여행, 공용시설 수리 등) 영향이 큽니다.</li>
                  <li>관리비는 항목(수선충당금, 경비/청소, 공용전기 등) 변화가 잦아 분해 확인이 중요합니다.</li>
                </ul>
              </div>
            </section>

            {/* 결과 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>
                  <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                    전월(MoM)·전년동월(YoY) 기준으로 증감액/증감률을 요약합니다.
                  </p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", calc.signal.badge)}>
                  {calc.signal.label}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricCard title="이번 달 총액" value={`${formatKRW(calc.c.total)}원`} />
                <MetricCard title="전월 총액" value={`${formatKRW(calc.p.total)}원`} />
                <MetricCard title="전년동월 총액" value={`${formatKRW(calc.y.total)}원`} />
                <MetricCard
                  title="요약"
                  value={`MoM ${calc.momDiff >= 0 ? "+" : ""}${formatKRW(calc.momDiff)} / YoY ${calc.yoyDiff >= 0 ? "+" : ""}${formatKRW(calc.yoyDiff)}`}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>증감(핵심)</div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DeltaCard
                    title="전월 대비(MoM)"
                    diff={calc.momDiff}
                    pctValue={calc.momPct}
                  />
                  <DeltaCard
                    title="전년동월 대비(YoY)"
                    diff={calc.yoyDiff}
                    pctValue={calc.yoyPct}
                  />
                </div>

                <div className={cn("mt-3 text-[12px] leading-relaxed", UI.inkSoft)}>
                  {calc.signal.msg}
                </div>
              </div>

              {/* 항목별 기여 */}
              <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className={cn("text-[12px] font-semibold", UI.ink)}>항목별 기여도(증감액)</div>
                  <div className={cn("text-xs", UI.inkSoft)}>MoM / YoY</div>
                </div>

                <div className="mt-3 grid gap-2">
                  {calc.contrib.map((r) => (
                    <ContribRow key={r.key} label={r.key} mom={r.mom} yoy={r.yoy} />
                  ))}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <TopBox title="MoM 영향 TOP 3" rows={calc.topMoM.map((x) => ({ k: x.key, v: x.mom }))} />
                  <TopBox title="YoY 영향 TOP 3" rows={calc.topYoY.map((x) => ({ k: x.key, v: x.yoy }))} />
                </div>
              </div>

              {/* CTA */}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/calculators/food-budget-cap"
                  className="rounded-2xl bg-[#5bbbf3] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
                >
                  다음: 식비 상한선 계산기 →
                </Link>
                <Link
                  href="/calculators"
                  className="rounded-2xl border border-[#e8f8ff] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#5bbbf3]"
                >
                  계산기 모음으로
                </Link>
              </div>

              <div className={cn("mt-4 text-xs leading-relaxed", UI.inkSoft)}>
                ※ 본 계산기는 “금액 변화”만 비교합니다. 실제 원인은 사용량(㎾h/㎥), 단가, 할인, 관리비 항목 변경 등으로 분해해 확인해야 합니다.
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ----------------- Components ----------------- */

function MonthBox({
  title,
  chip,
  block,
  onChange,
}: {
  title: string;
  chip: string;
  block: MonthBlock;
  onChange: (b: MonthBlock) => void;
}) {
  const patch = (k: keyof MonthBlock, v: string) => onChange({ ...block, [k]: v });

  return (
    <div className="rounded-2xl border border-[#e8f8ff] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold text-[#3B2F1E]">{title}</div>
          <div className="mt-1 text-xs text-[#7f7f7f]">전기/가스/수도/관리비/기타</div>
        </div>
        <span className="rounded-full bg-[#5bbbf3] px-3 py-1 text-xs font-semibold text-[#ffffff]">
          {chip}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MoneyInput label="전기" value={block.electricity} setValue={(v) => patch("electricity", v)} />
        <MoneyInput label="가스" value={block.gas} setValue={(v) => patch("gas", v)} />
        <MoneyInput label="수도" value={block.water} setValue={(v) => patch("water", v)} />
        <MoneyInput label="관리비" value={block.maintenance} setValue={(v) => patch("maintenance", v)} />
        <MoneyInput label="기타" value={block.etc} setValue={(v) => patch("etc", v)} hint="난방비/공용시설 등" />
      </div>

      <div className="mt-3 rounded-xl border border-[#e8f8ff] bg-[#5bbbf3] px-3 py-2 text-xs font-semibold text-[#7f7f7f]">
        합계(미리보기):{" "}
        <span className="text-[#ffffff]">
          {formatKRW(sumBlock(block).total)}원
        </span>
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

function DeltaCard({
  title,
  diff,
  pctValue,
}: {
  title: string;
  diff: number;
  pctValue: number;
}) {
  const up = diff > 0;
  const down = diff < 0;

  const badge = up ? "bg-[#5bbbf3] text-white" : down ? "bg-[#34D399] text-white" : "bg-[#52a9ff] text-[#ffffff]";
  const sign = diff >= 0 ? "+" : "";

  return (
    <div className="rounded-2xl border border-[#e8f8ff] bg-[#f2fbff] p-4">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold text-[#3B2F1E]">{title}</div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", badge)}>
          {pctValue >= 0 ? "+" : ""}
          {pct(pctValue)}%
        </span>
      </div>

      <div className="mt-2 text-2xl font-bold text-[#3B2F1E]">
        {sign}
        {formatKRW(diff)}원
      </div>
      <div className="mt-1 text-xs text-[#7f7f7f]">
        {down ? "감소(절감)" : up ? "증가" : "변화 없음"}
      </div>
    </div>
  );
}

function ContribRow({ label, mom, yoy }: { label: string; mom: number; yoy: number }) {
  const momTone = mom < 0 ? "text-[#34D399]" : mom > 0 ? "text-[#ffffff]" : "text-[#7f7f7f]";
  const yoyTone = yoy < 0 ? "text-[#34D399]" : yoy > 0 ? "text-[#ffffff]" : "text-[#7f7f7f]";
  const momSign = mom >= 0 ? "+" : "";
  const yoySign = yoy >= 0 ? "+" : "";

  return (
    <div className="flex items-center justify-between rounded-xl border border-[#e8f8ff] bg-[#f2fbff] px-3 py-2">
      <span className="text-[12px] font-semibold text-[#3B2F1E]">{label}</span>
      <div className="flex items-center gap-3 text-[12px] font-semibold">
        <span className={cn("min-w-[110px] text-right", momTone)}>
          MoM {momSign}
          {formatKRW(mom)}원
        </span>
        <span className={cn("min-w-[110px] text-right", yoyTone)}>
          YoY {yoySign}
          {formatKRW(yoy)}원
        </span>
      </div>
    </div>
  );
}

function TopBox({ title, rows }: { title: string; rows: Array<{ k: string; v: number }> }) {
  return (
    <div className="rounded-2xl border border-[#e8f8ff] bg-[#f2fbff] p-4">
      <div className="text-[12px] font-semibold text-[#3B2F1E]">{title}</div>
      <div className="mt-2 grid gap-2">
        {rows.map((r) => {
          const tone = r.v < 0 ? "text-[#34D399]" : r.v > 0 ? "text-[#ffffff]" : "text-[#7f7f7f]";
          const sign = r.v >= 0 ? "+" : "";
          return (
            <div
              key={r.k}
              className="flex items-center justify-between rounded-xl border border-[#e8f8ff] bg-white px-3 py-2"
            >
              <span className="text-xs font-semibold text-[#7f7f7f]">{r.k}</span>
              <span className={cn("text-[12px] font-bold", tone)}>
                {sign}
                {formatKRW(r.v)}원
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// src/app/calculators/cashflow-calendar/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { RecipeShell } from "@/components/calculators/RecipeShell";
import { MoneyInput, NumberInput, SelectInput, TextInput } from "@/components/calculators/Inputs";
import { LegendChip, MetricCard } from "@/components/calculators/Metric";
import { cn, UI, clamp, formatKRW, normalizeDay, toNumberSafe, uid } from "@/lib/calculators/utils";

type EventType = "급여" | "결제" | "기타";
type CashEvent = {
  id: string;
  day: number;
  label: string;
  type: EventType;
  amount: number; // +유입, -유출
};

export default function CashflowCalendarPage() {
  const [daysInMonth, setDaysInMonth] = useState("30");
  const [startBalance, setStartBalance] = useState("300000");
  const [safetyBuffer, setSafetyBuffer] = useState("100000");
  const [viewMode, setViewMode] = useState<"달력" | "리스트">("달력");

  const [paydays, setPaydays] = useState<CashEvent[]>([
    { id: uid(), day: 25, label: "급여", type: "급여", amount: 2800000 },
  ]);

  const [billings, setBillings] = useState<CashEvent[]>([
    { id: uid(), day: 12, label: "카드결제", type: "결제", amount: -650000 },
    { id: uid(), day: 5, label: "고정비(주거/관리)", type: "결제", amount: -900000 },
    { id: uid(), day: 20, label: "통신/구독/보험", type: "결제", amount: -260000 },
  ]);

  const calc = useMemo(() => {
    const dim = clamp(toNumberSafe(daysInMonth), 28, 31);
    const start = Math.max(0, toNumberSafe(startBalance));
    const buffer = Math.max(0, toNumberSafe(safetyBuffer));

    const all = [
      ...paydays.map((e) => ({ ...e, day: normalizeDay(e.day, dim) })),
      ...billings.map((e) => ({ ...e, day: normalizeDay(e.day, dim) })),
    ];

    const byDay: { [d: number]: CashEvent[] } = {};
    for (let d = 1; d <= dim; d++) byDay[d] = [];
    for (const e of all) byDay[e.day].push(e);

    let bal = start;
    const timeline: Array<{
      day: number;
      inflow: number;
      outflow: number;
      endBal: number;
      flags: Array<"적자" | "버퍼하회">;
      events: CashEvent[];
    }> = [];

    for (let d = 1; d <= dim; d++) {
      const ev = byDay[d] ?? [];
      const inflow = ev.filter((x) => x.amount > 0).reduce((a, b) => a + b.amount, 0);
      const outflowAbs = ev.filter((x) => x.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0);
      const net = inflow - outflowAbs;

      bal = bal + net;

      const flags: Array<"적자" | "버퍼하회"> = [];
      if (bal < 0) flags.push("적자");
      if (bal <= buffer) flags.push("버퍼하회");

      timeline.push({ day: d, inflow, outflow: outflowAbs, endBal: bal, flags, events: ev });
    }

    const dangerDays = timeline.filter((t) => t.flags.length > 0).map((t) => t.day);
    const firstDeficit = timeline.find((t) => t.endBal < 0)?.day ?? null;

    const totalInflow = all.filter((x) => x.amount > 0).reduce((a, b) => a + b.amount, 0);
    const totalOutflow = all.filter((x) => x.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0);

    const status =
      dangerDays.length === 0
        ? { label: "안정", badge: "bg-[#34D399] text-white", msg: "위험일(적자/버퍼하회)이 없습니다." }
        : firstDeficit
        ? { label: "위험", badge: "bg-[#5bbbf3] text-white", msg: `첫 적자 발생일: ${firstDeficit}일` }
        : { label: "경고", badge: "bg-[#52a9ff] text-[#ffffff]", msg: "버퍼 이하 위험일이 있습니다." };

    return {
      dim,
      buffer,
      timeline,
      dangerDays,
      firstDeficit,
      totalInflow,
      totalOutflow,
      endOfMonthBalance: timeline[timeline.length - 1]?.endBal ?? start,
      status,
    };
  }, [daysInMonth, startBalance, safetyBuffer, paydays, billings]);

  const addPayday = () =>
    setPaydays((p) => [...p, { id: uid(), day: 25, label: "급여", type: "급여", amount: 0 }]);
  const removePayday = (id: string) => setPaydays((p) => p.filter((x) => x.id !== id));

  const addBilling = () =>
    setBillings((p) => [...p, { id: uid(), day: 10, label: "결제", type: "결제", amount: -0 }]);
  const removeBilling = (id: string) => setBillings((p) => p.filter((x) => x.id !== id));

  return (
    <RecipeShell
      badge="현금흐름 캘린더"
      title="현금흐름 캘린더 계산기"
      subtitle={
        <>
          급여일·결제일을 입력하면 <span className="font-semibold text-[#ffffff]">위험일</span>을 표시합니다.
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* 입력 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                큰 덩어리(급여/카드/고정비)만 넣어도 위험 구간은 잡힙니다.
              </p>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", calc.status.badge)}>
              {calc.status.label}
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberInput label="이번 달 총 일수" value={daysInMonth} setValue={setDaysInMonth} hint="28~31" />
              <MoneyInput label="월초 잔액(가용)" value={startBalance} setValue={setStartBalance} />
              <MoneyInput label="안전 버퍼" value={safetyBuffer} setValue={setSafetyBuffer} />
              <SelectInput
                label="보기"
                value={viewMode}
                onChange={(v) => setViewMode(v as any)}
                options={["달력", "리스트"]}
              />
            </div>

            <div className="rounded-2xl border border-[#e8f8ff] bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-semibold text-[#3B2F1E]">급여/유입</div>
                <button
                  onClick={addPayday}
                  className="rounded-full border border-[#e8f8ff] bg-white px-3 py-1 text-xs font-semibold text-[#7f7f7f] hover:border-[#5bbbf3]"
                >
                  + 추가
                </button>
              </div>

              <div className="mt-3 grid gap-2">
                {paydays.map((e, idx) => (
                  <EventRow
                    key={e.id}
                    title={`유입 ${idx + 1}`}
                    event={e}
                    dim={calc.dim}
                    type="in"
                    onChange={(patch) =>
                      setPaydays((p) => p.map((x) => (x.id === e.id ? { ...x, ...patch } : x)))
                    }
                    onRemove={() => removePayday(e.id)}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e8f8ff] bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-semibold text-[#3B2F1E]">결제/유출</div>
                <button
                  onClick={addBilling}
                  className="rounded-full border border-[#e8f8ff] bg-white px-3 py-1 text-xs font-semibold text-[#7f7f7f] hover:border-[#5bbbf3]"
                >
                  + 추가
                </button>
              </div>

              <div className="mt-3 grid gap-2">
                {billings.map((e, idx) => (
                  <EventRow
                    key={e.id}
                    title={`유출 ${idx + 1}`}
                    event={e}
                    dim={calc.dim}
                    type="out"
                    onChange={(patch) =>
                      setBillings((p) => p.map((x) => (x.id === e.id ? { ...x, ...patch } : x)))
                    }
                    onRemove={() => removeBilling(e.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 결과 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>
          <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>{calc.status.msg}</p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricCard title="총 유입" value={`${formatKRW(calc.totalInflow)}원`} />
            <MetricCard title="총 유출" value={`${formatKRW(calc.totalOutflow)}원`} />
            <MetricCard title="월말 잔액(예상)" value={`${formatKRW(calc.endOfMonthBalance)}원`} />
            <MetricCard title="위험일" value={`${calc.dangerDays.length}일`} />
          </div>

          <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div className={cn("text-[12px] font-semibold", UI.ink)}>월 캘린더</div>
              <div className="flex items-center gap-2">
                <LegendChip label="버퍼하회" tone="low" />
                <LegendChip label="적자" tone="def" />
              </div>
            </div>

            {viewMode === "달력" ? (
              <div className="mt-3 grid grid-cols-7 gap-2">
                {Array.from({ length: calc.dim }, (_, i) => i + 1).map((d) => {
                  const t = calc.timeline[d - 1];
                  const isDef = t.flags.includes("적자");
                  const isLow = t.flags.includes("버퍼하회") && !isDef;

                  const bg = isDef
                    ? "bg-[#5bbbf3] text-white border-[#5bbbf3]"
                    : isLow
                    ? "bg-[#5bbbf3] text-[#3B2F1E] border-[#5bbbf3]"
                    : "bg-[#5bbbf3] text-[#3B2F1E] border-[#e8f8ff]";

                  return (
                    <div key={d} className={cn("rounded-2xl border p-2", bg)}>
                      <div className="text-[12px] font-extrabold">{d}</div>
                      <div className="mt-1 text-[11px] font-semibold opacity-90">
                        {formatKRW(t.endBal)}원
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 grid gap-2">
                {calc.timeline.map((t) => (
                  <div
                    key={t.day}
                    className={cn(
                      "rounded-2xl border px-3 py-2",
                      t.flags.includes("적자")
                        ? "border-[#5bbbf3] bg-[#FFF1EA]"
                        : t.flags.includes("버퍼하회")
                        ? "border-[#5bbbf3] bg-[#5bbbf3]"
                        : "border-[#e8f8ff] bg-[#f2fbff]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[12px] font-extrabold text-[#3B2F1E]">{t.day}일</div>
                      <div className="text-[12px] font-bold text-[#ffffff]">{formatKRW(t.endBal)}원</div>
                    </div>
                    <div className="mt-1 text-xs text-[#7f7f7f]">
                      유입 {formatKRW(t.inflow)}원 · 유출 {formatKRW(t.outflow)}원
                      {t.flags.length > 0 && (
                        <span className="ml-2 font-semibold text-[#ffffff]">[{t.flags.join(", ")}]</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/calculators/card-billing-date-shift"
              className="rounded-2xl bg-[#5bbbf3] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
            >
              다음: 카드 결제일 변경 효과 →
            </Link>
            <Link
              href="/calculators"
              className="rounded-2xl border border-[#e8f8ff] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#5bbbf3]"
            >
              계산기 모음으로
            </Link>
          </div>
        </section>
      </div>
    </RecipeShell>
  );
}

function EventRow({
  title,
  event,
  onChange,
  onRemove,
  dim,
  type,
}: {
  title: string;
  event: CashEvent;
  onChange: (patch: Partial<CashEvent>) => void;
  onRemove: () => void;
  dim: number;
  type: "in" | "out";
}) {
  return (
    <div className="rounded-xl border border-[#e8f8ff] bg-[#5bbbf3] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-extrabold text-[#7f7f7f]">{title}</div>
        <button
          onClick={onRemove}
          className="rounded-full border border-[#e8f8ff] bg-white px-3 py-1 text-xs font-semibold text-[#7f7f7f] hover:border-[#5bbbf3]"
        >
          삭제
        </button>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <NumberInput
          label="일"
          value={String(event.day)}
          setValue={(v) => onChange({ day: normalizeDay(toNumberSafe(v), dim) })}
          hint={`1~${dim}`}
        />
        <TextInput label="항목" value={event.label} setValue={(v) => onChange({ label: v })} />
        <MoneyInput
          label={type === "in" ? "금액(유입)" : "금액(유출)"}
          value={String(event.amount)}
          setValue={(v) => {
            const n = toNumberSafe(v);
            onChange({ amount: type === "in" ? Math.abs(n) : -Math.abs(n) });
          }}
        />
      </div>
    </div>
  );
}

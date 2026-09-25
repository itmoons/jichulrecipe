// src/app/calculators/bonus-allocation/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { RecipeShell } from "@/components/calculators/RecipeShell";
import { MoneyInput, PctInput } from "@/components/calculators/Inputs";
import { cn, UI, clamp, formatKRW, pct, toNumberSafe } from "@/lib/calculators/utils";

type Mode = "비율로 배분" | "우선순위 룰(추천 아님)";

export default function BonusAllocationPage() {
  const [mode, setMode] = useState<Mode>("비율로 배분");
  const [bonus, setBonus] = useState("1000000");

  // 비율 모드
  const [savePct, setSavePct] = useState("50");
  const [debtPct, setDebtPct] = useState("30");
  const [spendPct, setSpendPct] = useState("20");

  // 룰 모드
  const [needEmergencyGap, setNeedEmergencyGap] = useState("700000");
  const [debtBalance, setDebtBalance] = useState("1200000");
  const [spendCap, setSpendCap] = useState("200000");

  const calc = useMemo(() => {
    const B = Math.max(0, toNumberSafe(bonus));

    if (mode === "비율로 배분") {
      const s = clamp(toNumberSafe(savePct), 0, 100);
      const d = clamp(toNumberSafe(debtPct), 0, 100);
      const p = clamp(toNumberSafe(spendPct), 0, 100);
      const sum = s + d + p;

      const ns = sum > 0 ? s / sum : 0;
      const nd = sum > 0 ? d / sum : 0;
      const np = sum > 0 ? p / sum : 0;

      const items = [
        { label: "저축", pct: ns * 100, amt: B * ns, color: "text-[#10B981]" },
        { label: "부채상환", pct: nd * 100, amt: B * nd, color: "text-[#1E40AF]" },
        { label: "소비", pct: np * 100, amt: B * np, color: "text-[#ffffff]" },
      ];

      const status =
        B <= 0
          ? { label: "입력 필요", badge: "bg-[#1f7a5b] text-white", msg: "보너스 금액을 입력하세요." }
          : sum === 100
          ? { label: "정상", badge: "bg-[#34D399] text-white", msg: "입력한 비율대로 배분합니다." }
          : { label: "정규화", badge: "bg-[#1f7a5b] text-white", msg: "비율 합이 100이 아니라 자동 정규화했습니다." };

      return { B, items, status, note: "비율 합이 100이 아니면 자동 정규화됩니다." };
    }

    const gap = Math.max(0, toNumberSafe(needEmergencyGap));
    const debt = Math.max(0, toNumberSafe(debtBalance));
    const cap = Math.max(0, toNumberSafe(spendCap));

    let rem = B;

    const toEmergency = Math.min(rem, gap);
    rem -= toEmergency;

    const toDebt = Math.min(rem, debt);
    rem -= toDebt;

    const toSpend = Math.min(rem, cap);
    rem -= toSpend;

    const toSave = rem;

    const items = [
      { label: "비상금 보강", pct: B > 0 ? (toEmergency / B) * 100 : 0, amt: toEmergency, color: "text-[#10B981]" },
      { label: "부채상환", pct: B > 0 ? (toDebt / B) * 100 : 0, amt: toDebt, color: "text-[#1E40AF]" },
      { label: "소비(상한)", pct: B > 0 ? (toSpend / B) * 100 : 0, amt: toSpend, color: "text-[#ffffff]" },
      { label: "저축(잔여)", pct: B > 0 ? (toSave / B) * 100 : 0, amt: toSave, color: "text-[#7f7f7f]" },
    ];

    const status =
      B <= 0
        ? { label: "입력 필요", badge: "bg-[#1f7a5b] text-white", msg: "보너스 금액을 입력하세요." }
        : { label: "분배됨", badge: "bg-[#34D399] text-white", msg: "우선순위 룰로 한 번에 분배했습니다." };

    const note =
      "룰은 ‘추천’이 아니라 프레임입니다. 비상금/부채/소비 상한을 숫자로 두면 보너스 유실을 줄입니다.";

    return { B, items, status, note };
  }, [mode, bonus, savePct, debtPct, spendPct, needEmergencyGap, debtBalance, spendCap]);

  return (
    <RecipeShell
      badge="보너스 배분"
      title="상여/보너스 배분 계산기"
      subtitle={
        <>
          보너스를 저축·부채·소비로 <span className="font-semibold text-[#ffffff]">‘한 번에’</span> 분배합니다.
        </>
      }
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={() => setMode("비율로 배분")}
          className={cn(
            "rounded-lg px-4 py-2 text-[12px] font-semibold border",
            mode === "비율로 배분"
              ? "bg-[#1f7a5b] text-white border-[#1f7a5b]"
              : "bg-white text-[#7f7f7f] border-[#e2e5e1] hover:border-[#1f7a5b]"
          )}
        >
          비율로 배분
        </button>
        <button
          onClick={() => setMode("우선순위 룰(추천 아님)")}
          className={cn(
            "rounded-lg px-4 py-2 text-[12px] font-semibold border",
            mode === "우선순위 룰(추천 아님)"
              ? "bg-[#1f7a5b] text-white border-[#1f7a5b]"
              : "bg-white text-[#7f7f7f] border-[#e2e5e1] hover:border-[#1f7a5b]"
          )}
        >
          우선순위 룰(프레임)
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* 입력 */}
        <section className={cn("rounded-xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>보너스는 ‘라벨링’하면 남습니다.</p>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", calc.status.badge)}>
              {calc.status.label}
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            <MoneyInput label="보너스 금액" value={bonus} setValue={setBonus} />

            {mode === "비율로 배분" ? (
              <div className="rounded-lg border border-[#e2e5e1] bg-white p-4">
                <div className="text-[12px] font-semibold text-[#3B2F1E]">비율 입력(합 100 권장)</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <PctInput label="저축(%)" value={savePct} setValue={setSavePct} />
                  <PctInput label="부채(%)" value={debtPct} setValue={setDebtPct} />
                  <PctInput label="소비(%)" value={spendPct} setValue={setSpendPct} />
                </div>
                <div className="mt-3 text-xs font-semibold text-[#7f7f7f]">{calc.note}</div>
              </div>
            ) : (
              <div className="rounded-lg border border-[#e2e5e1] bg-white p-4">
                <div className="text-[12px] font-semibold text-[#3B2F1E]">우선순위 룰 입력</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <MoneyInput label="비상금 부족분" value={needEmergencyGap} setValue={setNeedEmergencyGap} />
                  <MoneyInput label="상환할 부채" value={debtBalance} setValue={setDebtBalance} />
                  <MoneyInput label="소비 상한" value={spendCap} setValue={setSpendCap} />
                </div>
                <div className="mt-3 text-xs font-semibold text-[#7f7f7f]">{calc.note}</div>
              </div>
            )}
          </div>
        </section>

        {/* 결과 */}
        <section className={cn("rounded-xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>
          <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>{calc.status.msg}</p>

          <div className="mt-4 rounded-xl border border-[#e2e5e1] bg-white p-5">
            <div className="text-[12px] font-semibold text-[#7f7f7f]">보너스 총액</div>
            <div className="mt-2 text-4xl font-bold text-[#ffffff]">{formatKRW(calc.B)}원</div>
          </div>

          <div className="mt-4 rounded-lg border border-[#e2e5e1] bg-white p-4">
            <div className={cn("text-[12px] font-semibold", UI.ink)}>배분 결과</div>
            <div className="mt-3 grid gap-2">
              {calc.items.map((it) => (
                <div key={it.label} className="rounded-xl border border-[#e2e5e1] bg-[#1f7a5b] px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] font-bold text-[#3B2F1E]">{it.label}</div>
                    <div className={cn("text-[12px] font-bold", it.color)}>{formatKRW(it.amt)}원</div>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[#7f7f7f]">비중: {pct(it.pct)}%</div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#e2e5e1]">
                    <div
                      className="h-full rounded-full bg-[#1f7a5b]"
                      style={{ width: `${clamp(it.pct, 0, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/calculators"
              className="rounded-lg border border-[#e2e5e1] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#1f7a5b]"
            >
              계산기 모음으로
            </Link>
            <Link
              href="/"
              className="rounded-lg bg-[#1f7a5b] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#176247]"
            >
              지출레시피 홈으로
            </Link>
          </div>
        </section>
      </div>
    </RecipeShell>
  );
}

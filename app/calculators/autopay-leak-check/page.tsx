// src/app/calculators/autopay-leak-check/page.tsx
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

type Intention = "유지" | "보류" | "해지 고려";

type AutoPayItem = {
  id: string;
  name: string;
  monthly: string; // input string
  usage3m: string; // 0~30 (최근 3개월 사용 횟수)
  intention: Intention;
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

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

/**
 * ✅ 누수 점수(Leak Score)
 * - 사용이 적을수록 커짐
 * - 금액이 클수록 커짐
 * - 해지 고려/보류는 가중치 부여
 * 점수는 "정답"이 아니라 정리 우선순위 제안용.
 */
function leakScore(monthly: number, usage3m: number, intention: Intention) {
  // usage3m: 0~30, 사용률(0~1)
  const usageRate = clamp(usage3m / 30, 0, 1);

  // 미사용 정도: 1(전혀 안 씀) ~ 0(자주 씀)
  const underUse = 1 - usageRate;

  // 의향 가중치
  const w = intention === "해지 고려" ? 1.25 : intention === "보류" ? 1.1 : 1.0;

  // 금액 스케일: 1만원 기준
  const priceScale = Math.sqrt(Math.max(monthly, 0) / 10000);

  // 최종 점수
  return underUse * w * priceScale;
}

/**
 * ✅ 누수 추정액(Leak Amount)
 * - 최근 3개월 사용이 0~3회: 거의 안씀(100% 누수)
 * - 4~10회: 일부 사용(60% 누수)
 * - 11~20회: 보통 사용(30% 누수)
 * - 21~30회: 자주 사용(10% 누수)
 * (실제 체감과 맞추기 위한 휴리스틱)
 */
function leakRateByUsage(usage3m: number) {
  if (usage3m <= 3) return 1.0;
  if (usage3m <= 10) return 0.6;
  if (usage3m <= 20) return 0.3;
  return 0.1;
}

export default function AutoPayLeakCheckPage() {
  const [items, setItems] = useState<AutoPayItem[]>([
    { id: uid(), name: "사용 안 하는 OTT", monthly: "13500", usage3m: "1", intention: "해지 고려" },
    { id: uid(), name: "앱 멤버십", monthly: "7900", usage3m: "4", intention: "보류" },
    { id: uid(), name: "클라우드", monthly: "2900", usage3m: "18", intention: "유지" },
  ]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: uid(), name: "", monthly: "", usage3m: "0", intention: "보류" },
    ]);
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((x) => x.id !== id));

  const updateItem = (id: string, patch: Partial<AutoPayItem>) =>
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const calc = useMemo(() => {
    const rows = items.map((it) => {
      const monthly = Math.max(0, toNumberSafe(it.monthly));
      const usage3m = clamp(Math.floor(toNumberSafe(it.usage3m)), 0, 30);
      const leakRate = leakRateByUsage(usage3m);

      // 의향이 '유지'면 누수 추정액을 조금 낮춤(현실 반영)
      const intentionAdj = it.intention === "유지" ? 0.6 : it.intention === "보류" ? 1.0 : 1.1;

      const leakMonthly = monthly * leakRate * intentionAdj;
      const score = leakScore(monthly, usage3m, it.intention);

      return {
        ...it,
        monthlyNum: monthly,
        usage3mNum: usage3m,
        leakRate,
        leakMonthly,
        score,
      };
    });

    const monthlyTotal = rows.reduce((acc, r) => acc + r.monthlyNum, 0);
    const leakMonthlyTotal = rows.reduce((acc, r) => acc + r.leakMonthly, 0);

    // 최근 3개월 누수 추정: 월 누수 × 3
    const leak3m = leakMonthlyTotal * 3;

    // 누수 후보 TOP: score 기준
    const top = [...rows]
      .sort((a, b) => b.score - a.score)
      .filter((r) => r.monthlyNum > 0)
      .slice(0, 6);

    // 위험 신호
    const leakRatio = monthlyTotal > 0 ? (leakMonthlyTotal / monthlyTotal) * 100 : 0;

    const signal =
      leakRatio <= 20
        ? {
            label: "양호",
            badge: "bg-[#34D399] text-white",
            msg: "누수 비중이 낮은 편입니다. 그래도 ‘0~3회 사용’ 항목은 한 번만 정리해도 효과가 큽니다.",
          }
        : leakRatio <= 40
        ? {
            label: "주의",
            badge: "bg-[#ff8a3d] text-[#ffffff]",
            msg: "누수 비중이 꽤 있습니다. ‘금액 큰데 사용 적은’ 항목부터 정리해 보세요.",
          }
        : {
            label: "경계",
            badge: "bg-[#ff8a3d] text-white",
            msg: "누수가 크고 자동결제 관리가 필요합니다. 결제수단(카드/앱스토어)별 구독 목록부터 싹 점검하세요.",
          };

    return {
      rows,
      monthlyTotal,
      leakMonthlyTotal,
      leak3m,
      leakRatio,
      top,
      signal,
    };
  }, [items]);

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
              자동결제 점검
            </span>
          </div>

          {/* 헤더 */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ffedd5] bg-[#fff7ed] px-3 py-1 text-xs font-medium text-[#7f7f7f] shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#ff8a3d]" />
              Recipe Calculator
            </div>

            <h1 className={cn("mt-3 text-2xl sm:text-3xl font-semibold tracking-tight", UI.ink)}>
              자동결제 누수 점검 계산기
            </h1>
            <p className={cn("mt-2 text-[12px] sm:text-base", UI.inkSoft)}>
              최근 3개월 사용 빈도를 바탕으로 “안 쓰는 결제” 누수를 추정하고, 정리 우선순위를 뽑아줍니다.
            </p>
          </div>

          {/* 본문 */}
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {/* 입력 카드 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={cn("text-lg font-semibold", UI.ink)}>자동결제 항목 입력</h2>
                  <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                    최근 3개월 사용 횟수(대략)만 넣어도 충분합니다.
                  </p>
                </div>

                <button
                  onClick={addItem}
                  className="rounded-2xl bg-[#ff8a3d] px-3 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
                >
                  + 추가
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {items.map((it) => (
                  <div key={it.id} className="rounded-2xl border border-[#ffedd5] bg-white p-4">
                    <div className="grid gap-3 sm:grid-cols-12 sm:items-end">
                      <div className="sm:col-span-5">
                        <label className="text-[12px] font-semibold text-[#3B2F1E]">항목 이름</label>
                        <input
                          value={it.name}
                          onChange={(e) => updateItem(it.id, { name: e.target.value })}
                          placeholder="예: 안 보는 OTT, 안 쓰는 앱 멤버십"
                          className={cn(
                            "mt-1 h-11 w-full rounded-xl border bg-white px-3 text-[12px] outline-none",
                            "border-[#ffedd5] focus:border-[#ff8a3d] focus:ring-2 focus:ring-[#ff8a3d]/20"
                          )}
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="text-[12px] font-semibold text-[#3B2F1E]">월 금액</label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#9C7A55]">
                            ₩
                          </span>
                          <input
                            inputMode="numeric"
                            value={it.monthly}
                            onChange={(e) => updateItem(it.id, { monthly: e.target.value })}
                            placeholder="0"
                            className={cn(
                              "h-11 w-full rounded-xl border bg-white pl-8 pr-3 text-[12px] outline-none",
                              "border-[#ffedd5] focus:border-[#ff8a3d] focus:ring-2 focus:ring-[#ff8a3d]/20"
                            )}
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[12px] font-semibold text-[#3B2F1E]">최근 3개월 사용</label>
                        <input
                          inputMode="numeric"
                          value={it.usage3m}
                          onChange={(e) => updateItem(it.id, { usage3m: e.target.value })}
                          placeholder="0"
                          className={cn(
                            "mt-1 h-11 w-full rounded-xl border bg-white px-3 text-[12px] outline-none",
                            "border-[#ffedd5] focus:border-[#ff8a3d] focus:ring-2 focus:ring-[#ff8a3d]/20"
                          )}
                        />
                        <div className="mt-1 text-[11px] text-[#7f7f7f]">0~30회</div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[12px] font-semibold text-[#3B2F1E]">의향</label>
                        <select
                          value={it.intention}
                          onChange={(e) => updateItem(it.id, { intention: e.target.value as Intention })}
                          className={cn(
                            "mt-1 h-11 w-full rounded-xl border bg-white px-3 text-[12px] outline-none",
                            "border-[#ffedd5] focus:border-[#ff8a3d] focus:ring-2 focus:ring-[#ff8a3d]/20"
                          )}
                        >
                          <option value="유지">유지</option>
                          <option value="보류">보류</option>
                          <option value="해지 고려">해지 고려</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-[#7f7f7f]">
                        사용이 적을수록 누수로 간주됩니다.
                      </span>
                      <button
                        onClick={() => removeItem(it.id)}
                        className="rounded-xl border border-[#ffedd5] bg-[#ff8a3d] px-3 py-1.5 text-xs font-semibold text-[#7f7f7f] hover:border-[#ff8a3d]"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-[#ffedd5] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>해지 전 체크리스트</div>
                <ul className={cn("mt-2 list-disc pl-5 text-[12px] leading-relaxed", UI.inkSoft)}>
                  <li>환불/부분환불 조건(다음 결제일 이전 해지 여부)</li>
                  <li>가족 공유/팀 플랜 사용 중인지</li>
                  <li>앱스토어/구글플레이 결제는 스토어에서 해지해야 하는지</li>
                  <li>무료체험 종료일/자동 갱신 설정 여부</li>
                </ul>
              </div>
            </section>

            {/* 결과 카드 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={cn("text-lg font-semibold", UI.ink)}>누수 추정 결과</h2>
                  <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                    “사용 빈도 + 금액 + 의향”을 반영해 누수 후보를 정렬합니다.
                  </p>
                </div>

                <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", calc.signal.badge)}>
                  {calc.signal.label}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricCard title="월 자동결제 총액" value={`${formatKRW(calc.monthlyTotal)}원`} />
                <MetricCard title="월 누수 추정액" value={`${formatKRW(calc.leakMonthlyTotal)}원`} accent />
              </div>

              <div className="mt-3 rounded-2xl border border-[#ffedd5] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className={cn("text-[12px] font-semibold", UI.ink)}>최근 3개월 누수 추정</div>
                  <span className="rounded-full bg-[#ff8a3d] px-3 py-1 text-xs font-semibold text-[#ffffff]">
                    누수 비중 {calc.monthlyTotal > 0 ? ((calc.leakMonthlyTotal / calc.monthlyTotal) * 100).toFixed(1) : "0.0"}%
                  </span>
                </div>
                <div className="mt-2 text-2xl font-bold text-[#ffffff]">{formatKRW(calc.leak3m)}원</div>
                <div className={cn("mt-2 text-[12px] leading-relaxed", UI.inkSoft)}>{calc.signal.msg}</div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#ffedd5] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className={cn("text-[12px] font-semibold", UI.ink)}>누수 후보 TOP</div>
                  <div className={cn("text-xs", UI.inkSoft)}>정리 우선순위</div>
                </div>

                {calc.top.length === 0 ? (
                  <div className={cn("mt-3 text-[12px]", UI.inkSoft)}>입력된 항목이 없습니다.</div>
                ) : (
                  <ol className="mt-3 space-y-2">
                    {calc.top.map((t, idx) => (
                      <li
                        key={t.id}
                        className="rounded-xl border border-[#ffedd5] bg-[#ff8a3d] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#ff8a3d] text-xs font-bold text-[#ffffff]">
                                {idx + 1}
                              </span>
                              <div className={cn("truncate text-[12px] font-semibold", UI.ink)}>
                                {t.name?.trim() ? t.name.trim() : "이름 미입력"}
                              </div>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                  t.intention === "해지 고려"
                                    ? "bg-[#ff8a3d] text-white"
                                    : t.intention === "보류"
                                    ? "bg-[#ff8a3d] text-[#ffffff]"
                                    : "bg-[#34D399] text-white"
                                )}
                              >
                                {t.intention}
                              </span>
                            </div>

                            <div className={cn("mt-1 text-xs", UI.inkSoft)}>
                              최근 3개월 사용 {t.usage3mNum}회 · 누수율(가정) {(t.leakRate * 100).toFixed(0)}%
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <div className={cn("text-[12px] font-semibold", UI.ink)}>
                              {formatKRW(t.monthlyNum)}원/월
                            </div>
                            <div className="text-xs font-semibold text-[#ffffff]">
                              누수 {formatKRW(t.leakMonthly)}원/월
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* CTA */}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/calculators/subscription-total"
                  className="rounded-2xl bg-[#ff8a3d] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
                >
                  다음: 구독 총액 합산 →
                </Link>
                <Link
                  href="/calculators"
                  className="rounded-2xl border border-[#ffedd5] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#ff8a3d]"
                >
                  계산기 모음으로
                </Link>
              </div>

              <div className={cn("mt-4 text-xs leading-relaxed", UI.inkSoft)}>
                ※ 누수 추정은 “사용 빈도”를 기반으로 한 휴리스틱입니다. 실제 만족도/대체 가능성/공유 여부에 따라 판단이 달라질 수 있습니다.
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ----------------- UI Components ----------------- */

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

// src/app/calculators/subscription-total/page.tsx
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

type SubItem = {
  id: string;
  name: string;
  category: "OTT" | "음원" | "클라우드" | "멤버십" | "기타";
  monthly: string; // string for input UX
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

function pct(n: number) {
  if (!Number.isFinite(n)) return "0.0";
  return n.toFixed(1);
}

export default function SubscriptionTotalPage() {
  // 기본 예시(사용자가 바로 감 잡게)
  const [items, setItems] = useState<SubItem[]>([
    { id: uid(), name: "넷플릭스", category: "OTT", monthly: "13500" },
    { id: uid(), name: "유튜브 프리미엄", category: "멤버십", monthly: "14900" },
    { id: uid(), name: "멜론/스포티파이", category: "음원", monthly: "10900" },
    { id: uid(), name: "iCloud/Google One", category: "클라우드", monthly: "2900" },
  ]);

  // 연간 결제 할인율(선택)
  const [annualDiscountPct, setAnnualDiscountPct] = useState("0"); // 예: 15 => 15%

  const calc = useMemo(() => {
    const rows = items.map((it) => ({
      ...it,
      monthlyNum: toNumberSafe(it.monthly),
    }));

    const monthlyTotal = rows.reduce((acc, r) => acc + r.monthlyNum, 0);
    const yearlyTotal = monthlyTotal * 12;

    // 카테고리별 합
    const byCat = rows.reduce(
      (acc, r) => {
        acc[r.category] += r.monthlyNum;
        return acc;
      },
      { OTT: 0, 음원: 0, 클라우드: 0, 멤버십: 0, 기타: 0 } as Record<SubItem["category"], number>
    );

    // 비중
    const share = (x: number) => (monthlyTotal > 0 ? (x / monthlyTotal) * 100 : 0);

    // 연간 할인(선택)
    const disc = clamp(toNumberSafe(annualDiscountPct), 0, 80);
    const yearlyIfAnnual = yearlyTotal * (1 - disc / 100);
    const yearlySave = yearlyTotal - yearlyIfAnnual;

    // TOP 5 (누수 후보는 “금액 큰 것” + “이름 없는 것”이 아니라, 그냥 큰 것 우선)
    const top = [...rows].sort((a, b) => b.monthlyNum - a.monthlyNum).filter((r) => r.monthlyNum > 0).slice(0, 5);

    return {
      rows,
      monthlyTotal,
      yearlyTotal,
      byCat,
      shares: {
        OTT: share(byCat.OTT),
        음원: share(byCat.음원),
        클라우드: share(byCat.클라우드),
        멤버십: share(byCat.멤버십),
        기타: share(byCat.기타),
      },
      discount: { disc, yearlyIfAnnual, yearlySave },
      top,
    };
  }, [items, annualDiscountPct]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: uid(), name: "", category: "기타", monthly: "" },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const updateItem = (id: string, patch: Partial<SubItem>) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

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
              구독 점검
            </span>
          </div>

          {/* 헤더 */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e2e5e1] bg-[#f1f8f4] px-3 py-1 text-xs font-medium text-[#7f7f7f] shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#1f7a5b]" />
              Recipe Calculator
            </div>

            <h1 className={cn("mt-3 text-2xl sm:text-3xl font-semibold tracking-tight", UI.ink)}>
              구독 총액 계산기
            </h1>
            <p className={cn("mt-2 text-[12px] sm:text-base", UI.inkSoft)}>
              OTT·음원·클라우드·멤버십 등 정기 결제를 합산해 <span className="font-semibold text-[#ffffff]">월/연 지출</span>을 한 번에 확인합니다.
            </p>
          </div>

          {/* 본문 */}
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {/* 입력 카드 */}
            <section className={cn("rounded-xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={cn("text-lg font-semibold", UI.ink)}>구독 항목 입력</h2>
                  <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                    월 결제 금액 기준으로 입력하세요. (연간 결제라도 월 환산 입력 가능)
                  </p>
                </div>

                <button
                  onClick={addItem}
                  className="rounded-lg bg-[#1f7a5b] px-3 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-[#176247]"
                >
                  + 추가
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="rounded-lg border border-[#e2e5e1] bg-white p-4"
                  >
                    <div className="grid gap-3 sm:grid-cols-12 sm:items-end">
                      <div className="sm:col-span-5">
                        <label className="text-[12px] font-semibold text-[#3B2F1E]">이름</label>
                        <input
                          value={it.name}
                          onChange={(e) => updateItem(it.id, { name: e.target.value })}
                          placeholder="예: 넷플릭스"
                          className={cn(
                            "mt-1 h-11 w-full rounded-xl border bg-white px-3 text-[12px] outline-none",
                            "border-[#e2e5e1] focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20"
                          )}
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="text-[12px] font-semibold text-[#3B2F1E]">분류</label>
                        <select
                          value={it.category}
                          onChange={(e) =>
                            updateItem(it.id, { category: e.target.value as SubItem["category"] })
                          }
                          className={cn(
                            "mt-1 h-11 w-full rounded-xl border bg-white px-3 text-[12px] outline-none",
                            "border-[#e2e5e1] focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20"
                          )}
                        >
                          <option value="OTT">OTT</option>
                          <option value="음원">음원</option>
                          <option value="클라우드">클라우드</option>
                          <option value="멤버십">멤버십</option>
                          <option value="기타">기타</option>
                        </select>
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
                              "border-[#e2e5e1] focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20"
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-[#7f7f7f]">
                        {it.name?.trim() ? `"${it.name.trim()}"` : "이름 미입력"} · {it.category}
                      </span>

                      <button
                        onClick={() => removeItem(it.id)}
                        className="rounded-xl border border-[#e2e5e1] bg-[#1f7a5b] px-3 py-1.5 text-xs font-semibold text-white hover:border-[#1f7a5b]"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 연간 할인 옵션 */}
              <div className="mt-5 rounded-lg border border-[#e2e5e1] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={cn("text-[12px] font-semibold", UI.ink)}>연간 결제 할인(선택)</div>
                    <div className={cn("mt-1 text-[12px] leading-relaxed", UI.inkSoft)}>
                      “연간 결제 시 평균 할인율”이 있다면 입력해, 연간 총액 기준 절감액을 추정합니다.
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:items-end">
                  <div>
                    <label className="text-[12px] font-semibold text-[#3B2F1E]">할인율(%)</label>
                    <input
                      inputMode="numeric"
                      value={annualDiscountPct}
                      onChange={(e) => setAnnualDiscountPct(e.target.value)}
                      placeholder="예: 15"
                      className={cn(
                        "mt-1 h-11 w-full rounded-xl border bg-white px-3 text-[12px] outline-none",
                        "border-[#e2e5e1] focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/20"
                      )}
                    />
                    <div className="mt-1 text-xs text-[#7f7f7f]">0~80% 범위로 자동 제한됩니다.</div>
                  </div>

                  <div className="rounded-lg bg-[#1f7a5b] p-3">
                    <div className="text-xs font-semibold text-[#7f7f7f]">연간 절감 추정</div>
                    <div className="mt-1 text-lg font-bold text-[#ffffff]">
                      {formatKRW(calc.discount.yearlySave)}원
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 결과 카드 */}
            <section className={cn("rounded-xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>요약</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                월/연 구독 총액과 카테고리별 비중을 확인하세요.
              </p>

              {/* 핵심 지표 */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricCard title="월 구독 총액" value={`${formatKRW(calc.monthlyTotal)}원`} />
                <MetricCard title="연 구독 총액(×12)" value={`${formatKRW(calc.yearlyTotal)}원`} />
              </div>

              {/* 할인 적용 시 */}
              <div className="mt-4 rounded-lg border border-[#e2e5e1] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className={cn("text-[12px] font-semibold", UI.ink)}>연간 결제 가정(선택)</div>
                  <span className="rounded-full bg-[#1f7a5b] px-3 py-1 text-xs font-semibold text-white">
                    할인 {pct(calc.discount.disc)}%
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <MiniCard title="할인 적용 연간 총액" value={`${formatKRW(calc.discount.yearlyIfAnnual)}원`} />
                  <MiniCard title="연간 절감 추정" value={`${formatKRW(calc.discount.yearlySave)}원`} accent />
                </div>

                <div className={cn("mt-2 text-xs", UI.inkSoft)}>
                  ※ 할인율은 평균값 가정입니다. 실제 상품별 할인 구조에 따라 달라질 수 있어요.
                </div>
              </div>

              {/* 카테고리 비중 */}
              <div className="mt-4 rounded-lg border border-[#e2e5e1] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>카테고리별 비중(월 기준)</div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <ShareRow label="OTT" value={calc.byCat.OTT} pctValue={calc.shares.OTT} total={calc.monthlyTotal} />
                  <ShareRow label="음원" value={calc.byCat.음원} pctValue={calc.shares.음원} total={calc.monthlyTotal} />
                  <ShareRow label="클라우드" value={calc.byCat.클라우드} pctValue={calc.shares.클라우드} total={calc.monthlyTotal} />
                  <ShareRow label="멤버십" value={calc.byCat.멤버십} pctValue={calc.shares.멤버십} total={calc.monthlyTotal} />
                  <ShareRow label="기타" value={calc.byCat.기타} pctValue={calc.shares.기타} total={calc.monthlyTotal} />
                </div>
              </div>

              {/* TOP 항목 */}
              <div className="mt-4 rounded-lg border border-[#e2e5e1] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className={cn("text-[12px] font-semibold", UI.ink)}>월 지출 큰 항목 TOP</div>
                  <div className={cn("text-xs", UI.inkSoft)}>정리 우선순위 힌트</div>
                </div>

                {calc.top.length === 0 ? (
                  <div className={cn("mt-3 text-[12px]", UI.inkSoft)}>입력된 항목이 없습니다.</div>
                ) : (
                  <ol className="mt-3 space-y-2">
                    {calc.top.map((t, idx) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between rounded-xl border border-[#e2e5e1] bg-[#f1f8f4] px-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#1f7a5b] text-xs font-bold text-white">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className={cn("truncate text-[12px] font-semibold", UI.ink)}>
                              {t.name?.trim() ? t.name.trim() : "이름 미입력"}
                            </div>
                            <div className={cn("text-xs", UI.inkSoft)}>{t.category}</div>
                          </div>
                        </div>
                        <span className={cn("text-[12px] font-semibold", UI.ink)}>
                          {formatKRW(t.monthlyNum)}원
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* CTA */}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/calculators/annual-vs-monthly"
                  className="rounded-lg bg-[#1f7a5b] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#176247]"
                >
                  다음: 연간 vs 월간 비교 →
                </Link>
                <Link
                  href="/calculators"
                  className="rounded-lg border border-[#e2e5e1] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#1f7a5b]"
                >
                  계산기 모음으로
                </Link>
              </div>

              <div className={cn("mt-4 text-xs leading-relaxed", UI.inkSoft)}>
                ※ 본 계산기는 입력값 기반의 합산 도구입니다. 결제 주기(월/연), 환불/프로모션, 가족공유 여부 등에 따라 실제 지출은 달라질 수 있습니다.
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ----------------- UI Components ----------------- */

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#e2e5e1] bg-white p-4">
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
    <div className={cn("rounded-lg border p-4", accent ? "border-[#1f7a5b] bg-[#1f7a5b]" : "border-[#e2e5e1] bg-white")}>
      <div className={cn("text-xs font-semibold", accent ? "text-[#ffffff]" : "text-[#7f7f7f]")}>{title}</div>
      <div className={cn("mt-1 text-lg font-bold", accent ? "text-[#ffffff]" : "text-[#3B2F1E]")}>{value}</div>
    </div>
  );
}

function ShareRow({
  label,
  value,
  pctValue,
  total,
}: {
  label: string;
  value: number;
  pctValue: number;
  total: number;
}) {
  const bar = clamp(pctValue, 0, 100);
  return (
    <div className="rounded-xl border border-[#e2e5e1] bg-[#f1f8f4] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-[#3B2F1E]">{label}</span>
        <span className="text-xs font-semibold text-[#7f7f7f]">
          {formatKRW(value)}원 · <span className="text-[#ffffff]">{pct(pctValue)}%</span>
        </span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-[#1f7a5b]">
        <div className="h-2 rounded-full bg-[#1f7a5b]" style={{ width: `${bar}%` }} />
      </div>
      {total === 0 && <div className="mt-1 text-xs text-[#7f7f7f]">총액이 0이면 비중이 계산되지 않습니다.</div>}
    </div>
  );
}

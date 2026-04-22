// src/app/calculators/category-deviation-alert/page.tsx
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

type Row = {
  key: string;
  basePct: string; // 자기 기준 비율(%)
  actual: string; // 이번 달 실제 지출(원)
};

type Level = "정상" | "주의" | "과다" | "과소";

/** ✅ 반환 타입을 Level로 고정 (string 확장 방지) */
function levelFrom(deltaPctPoint: number): Level {
  const a = Math.abs(deltaPctPoint);
  if (a < 2) return "정상";
  if (a < 5) return "주의";
  return deltaPctPoint > 0 ? "과다" : "과소";
}

function levelBadge(level: Level) {
  if (level === "정상") return "bg-[#34D399] text-white";
  if (level === "주의") return "bg-[#52a9ff] text-[#ffffff]";
  if (level === "과다") return "bg-[#5bbbf3] text-white";
  return "bg-[#60A5FA] text-white"; // 과소는 파랑 계열로 분리
}

export default function CategoryDeviationAlertPage() {
  // 총액(이번달 지출 or 예산)
  const [total, setTotal] = useState("2500000");

  // 기준(자기 비율) + 실제 지출
  const [rows, setRows] = useState<Row[]>([
    { key: "주거/관리비", basePct: "25", actual: "620000" },
    { key: "식비", basePct: "15", actual: "520000" },
    { key: "교통", basePct: "6", actual: "130000" },
    { key: "통신", basePct: "3", actual: "65000" },
    { key: "구독/멤버십", basePct: "3", actual: "54000" },
    { key: "쇼핑", basePct: "8", actual: "240000" },
    { key: "여가/문화", basePct: "7", actual: "120000" },
    { key: "건강/보험", basePct: "10", actual: "210000" },
    { key: "저축/투자", basePct: "18", actual: "300000" },
    { key: "기타", basePct: "5", actual: "60000" },
  ]);

  const calc = useMemo(() => {
    const T = Math.max(0, toNumberSafe(total));

    const parsed = rows.map((r) => {
      const bp = clamp(toNumberSafe(r.basePct), 0, 100);
      const act = Math.max(0, toNumberSafe(r.actual));
      const baseAmt = (T * bp) / 100;
      const deltaAmt = act - baseAmt;
      const actPct = T > 0 ? (act / T) * 100 : 0;
      const deltaPp = actPct - bp; // percentage point

      /** ✅ 여기서도 Level로 고정해두면 더 안전 */
      const level: Level = levelFrom(deltaPp);

      return {
        ...r,
        bp,
        act,
        baseAmt,
        deltaAmt,
        actPct,
        deltaPp,
        level,
      };
    });

    const sumBasePct = parsed.reduce((a, b) => a + b.bp, 0);
    const sumActual = parsed.reduce((a, b) => a + b.act, 0);

    const overs = parsed
      .filter((x) => x.deltaAmt > 0)
      .sort((a, b) => b.deltaAmt - a.deltaAmt)
      .slice(0, 3);

    const unders = parsed
      .filter((x) => x.deltaAmt < 0)
      .sort((a, b) => a.deltaAmt - b.deltaAmt) // 음수 더 작은(절대값 큰) 순
      .slice(0, 3);

    // 시나리오: 과다 TOP1을 줄여서 과소 TOP1에 “이동”하면?
    const topOver = overs[0];
    const topUnder = unders[0];

    const moveSuggestion =
      topOver && topUnder
        ? {
            from: topOver.key,
            to: topUnder.key,
            amount: Math.min(topOver.deltaAmt, Math.abs(topUnder.deltaAmt)),
            note:
              "‘추천’이 아니라, 기준 복원을 위한 이동 시나리오입니다. 실제 의사결정은 본인의 우선순위(가치/필수/건강)에 맞춰 조정하세요.",
          }
        : null;

    const overall =
      sumActual > T * 1.05
        ? {
            label: "총액 초과",
            badge: "bg-[#5bbbf3] text-white",
            msg: "입력한 총액 대비 실제 합계가 큽니다. 총액(예산/지출)을 다시 확인하거나 ‘기타/누락’ 항목을 점검하세요.",
          }
        : sumActual < T * 0.95
        ? {
            label: "총액 미달",
            badge: "bg-[#52a9ff] text-[#ffffff]",
            msg: "입력한 총액 대비 실제 합계가 작습니다. 총액이 ‘예산’인지 ‘실지출’인지 확인하세요.",
          }
        : {
            label: "정합",
            badge: "bg-[#34D399] text-white",
            msg: "총액과 카테고리 합계가 대체로 맞습니다. 이제 ‘편차’가 핵심입니다.",
          };

    return {
      T,
      parsed,
      sumBasePct,
      sumActual,
      overs,
      unders,
      moveSuggestion,
      overall,
    };
  }, [rows, total]);

  const updateRow = (idx: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { key: "새 카테고리", basePct: "0", actual: "0" }]);
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const normalizeBasePct = () => {
    // 현재 basePct 합을 100으로 스케일링 (편의 기능)
    const sum = rows.reduce((a, r) => a + clamp(toNumberSafe(r.basePct), 0, 100), 0);
    if (sum <= 0) return;
    setRows((prev) =>
      prev.map((r) => {
        const bp = clamp(toNumberSafe(r.basePct), 0, 100);
        const scaled = (bp / sum) * 100;
        return { ...r, basePct: scaled.toFixed(1) };
      })
    );
  };

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
              편차 경보
            </span>
          </div>

          {/* 헤더 */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8f8ff] bg-[#f2fbff] px-3 py-1 text-xs font-medium text-[#7f7f7f] shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#5bbbf3]" />
              Recipe Calculator
            </div>

            <h1 className={cn("mt-3 text-2xl sm:text-3xl font-semibold tracking-tight", UI.ink)}>
              소비 카테고리 과소·과다 경보 계산기
            </h1>
            <p className={cn("mt-2 text-[12px] sm:text-base", UI.inkSoft)}>
              ‘내 기준(비율)’ 대비 이번 달 지출이 얼마나 벗어났는지 편차를 계산합니다.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {/* 입력 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                총액은 “이번 달 지출 총액” 또는 “예산 총액” 중 하나로 통일해서 입력하세요.
              </p>

              <div className="mt-4 grid gap-3">
                <MoneyInput label="총액(이번달 지출/예산)" value={total} setValue={setTotal} />

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={addRow}
                    className="rounded-2xl border border-[#e8f8ff] bg-white px-4 py-2 text-[12px] font-semibold text-[#7f7f7f] hover:border-[#5bbbf3]"
                  >
                    + 카테고리 추가
                  </button>
                  <button
                    onClick={normalizeBasePct}
                    className="rounded-2xl bg-[#5bbbf3] px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
                  >
                    기준비율 합 100%로 정규화
                  </button>
                </div>

                <div className="rounded-2xl border border-[#e8f8ff] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[12px] font-semibold text-[#3B2F1E]">카테고리 입력</div>
                      <div className="mt-1 text-xs text-[#7f7f7f]">
                        기준비율은 “내가 생각하는 정상 상태”입니다. 실제 지출과 비교해 편차만 봅니다.
                      </div>
                    </div>
                    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", calc.overall.badge)}>
                      {calc.overall.label}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2">
                    {calc.parsed.map((r, idx) => (
                      <div
                        key={`${r.key}-${idx}`}
                        className="rounded-xl border border-[#e8f8ff] bg-[#5bbbf3] p-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-2">
                            <input
                              value={r.key}
                              onChange={(e) => updateRow(idx, { key: e.target.value })}
                              className={cn(
                                "h-10 w-full rounded-xl border bg-white px-3 text-[12px] font-semibold outline-none",
                                "border-[#e8f8ff] focus:border-[#5bbbf3] focus:ring-2 focus:ring-[#5bbbf3]/20"
                              )}
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", levelBadge(r.level))}>
                              {r.level}
                            </span>
                            <button
                              onClick={() => removeRow(idx)}
                              className="rounded-full border border-[#e8f8ff] bg-white px-3 py-1 text-xs font-semibold text-[#7f7f7f] hover:border-[#5bbbf3]"
                            >
                              삭제
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <PctInput
                            label="내 기준 비율(%)"
                            value={String(r.basePct)}
                            setValue={(v) => updateRow(idx, { basePct: v })}
                          />
                          <MoneyInput
                            label="이번 달 실제(원)"
                            value={String(r.actual)}
                            setValue={(v) => updateRow(idx, { actual: v })}
                          />
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <InfoPill label="기준금액" value={`${formatKRW(r.baseAmt)}원`} />
                          <InfoPill
                            label="편차(실제-기준)"
                            value={`${(r.deltaAmt >= 0 ? "+" : "") + formatKRW(r.deltaAmt)}원 / ${
                              (r.deltaPp >= 0 ? "+" : "") + pct(r.deltaPp)
                            }%p`}
                            tone={r.deltaAmt > 0 ? "over" : r.deltaAmt < 0 ? "under" : "neutral"}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-xl border border-[#e8f8ff] bg-white px-3 py-2 text-xs font-semibold text-[#7f7f7f]">
                    기준비율 합계: <span className="text-[#ffffff]">{pct(calc.sumBasePct)}%</span> · 실제 합계:{" "}
                    <span className="text-[#ffffff]">{formatKRW(calc.sumActual)}원</span>
                  </div>

                  <div className={cn("mt-3 text-xs leading-relaxed", UI.inkSoft)}>{calc.overall.msg}</div>
                </div>
              </div>
            </section>

            {/* 결과 요약 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>요약</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                편차가 큰 카테고리부터 보면, 조정 포인트가 빠르게 보입니다.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricCard title="총액" value={`${formatKRW(calc.T)}원`} />
                <MetricCard title="실제 합계" value={`${formatKRW(calc.sumActual)}원`} />
              </div>

              <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>과다 TOP 3</div>
                <div className="mt-3 grid gap-2">
                  {calc.overs.length === 0 ? (
                    <EmptyNote text="과다 편차가 없습니다." />
                  ) : (
                    calc.overs.map((r) => (
                      <TopRow key={r.key} label={r.key} amt={r.deltaAmt} pp={r.deltaPp} kind="over" />
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>과소 TOP 3</div>
                <div className="mt-3 grid gap-2">
                  {calc.unders.length === 0 ? (
                    <EmptyNote text="과소 편차가 없습니다." />
                  ) : (
                    calc.unders.map((r) => (
                      <TopRow key={r.key} label={r.key} amt={r.deltaAmt} pp={r.deltaPp} kind="under" />
                    ))
                  )}
                </div>
              </div>

              {calc.moveSuggestion && (
                <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                  <div className={cn("text-[12px] font-semibold", UI.ink)}>이동 시나리오(균형 복원)</div>
                  <div className={cn("mt-2 text-[12px]", UI.inkSoft)}>
                    {calc.moveSuggestion.from}에서{" "}
                    <span className="font-semibold text-[#ffffff]">
                      {formatKRW(calc.moveSuggestion.amount)}원
                    </span>{" "}
                    정도를 줄여 {calc.moveSuggestion.to}로 “이동”하면, 기준에 가까워집니다.
                  </div>
                  <div className={cn("mt-2 text-xs leading-relaxed", UI.inkSoft)}>{calc.moveSuggestion.note}</div>
                </div>
              )}

              {/* CTA */}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/calculators/monthly-budget-split"
                  className="rounded-2xl bg-[#5bbbf3] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
                >
                  다음: 월 예산 자동 배분 →
                </Link>
                <Link
                  href="/calculators"
                  className="rounded-2xl border border-[#e8f8ff] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#5bbbf3]"
                >
                  계산기 모음으로
                </Link>
              </div>

              <div className={cn("mt-4 text-xs leading-relaxed", UI.inkSoft)}>
                ※ 이 도구는 “지출이 많다/적다”의 가치판단이 아니라, 내가 정한 기준 대비 편차를 빠르게 보여주는 경보판입니다.
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

function PctInput({
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
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
          className={cn(
            "h-11 w-full rounded-xl border bg-white px-3 pr-10 text-[12px] outline-none",
            "border-[#e8f8ff] focus:border-[#5bbbf3] focus:ring-2 focus:ring-[#5bbbf3]/20"
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#9C7A55]">
          %
        </span>
      </div>
    </div>
  );
}

function InfoPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "over" | "under" | "neutral";
}) {
  const cls =
    tone === "over"
      ? "text-[#ffffff]"
      : tone === "under"
      ? "text-[#2563EB]"
      : "text-[#7f7f7f]";

  return (
    <div className="rounded-xl border border-[#e8f8ff] bg-white px-3 py-2">
      <div className="text-xs font-semibold text-[#7f7f7f]">{label}</div>
      <div className={cn("mt-1 text-[12px] font-bold", cls)}>{value}</div>
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

function TopRow({
  label,
  amt,
  pp,
  kind,
}: {
  label: string;
  amt: number;
  pp: number;
  kind: "over" | "under";
}) {
  const tone = kind === "over" ? "text-[#ffffff]" : "text-[#2563EB]";
  const signA = amt >= 0 ? "+" : "";
  const signP = pp >= 0 ? "+" : "";
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#e8f8ff] bg-[#f2fbff] px-3 py-2">
      <span className="text-[12px] font-semibold text-[#3B2F1E]">{label}</span>
      <span className={cn("text-[12px] font-bold", tone)}>
        {signA}
        {formatKRW(amt)}원 / {signP}
        {pct(pp)}%p
      </span>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-[#e8f8ff] bg-[#5bbbf3] px-3 py-2 text-[12px] font-semibold text-[#7f7f7f]">
      {text}
    </div>
  );
}

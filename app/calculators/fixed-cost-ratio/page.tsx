// src/app/calculators/fixed-cost-ratio/page.tsx
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
    "bg-[radial-gradient(circle,rgba(251,146,60,0.14)_1px,transparent_1px)] bg-[size:16px_16px] mx-auto w-full max-w-[1340px] px-3 py-4 sm:px-4 sm:py-6",
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

/**
 * ✅ 기준선(가이드)
 * - 정답이 아니라 "점검용 신호등"
 * - 고정비는 조정 난이도가 높으므로 과도하면 현금흐름 리스크가 커짐
 */
function ratioStatus(ratio: number) {
  // ratio: 0~100
  if (ratio <= 35) {
    return {
      label: "안전",
      badge: "bg-[#34D399] text-white", // 민트(가독성)
      title: "고정비 부담이 비교적 안정적입니다.",
      desc: "단, 저축/비상금이 0에 가까우면 체감은 달라질 수 있어요. ‘가변비’와 ‘저축 페이스’도 함께 점검하세요.",
    };
  }
  if (ratio <= 50) {
    return {
      label: "주의",
      badge: "bg-[#52a9ff] text-[#ffffff]", // 옐로
      title: "고정비가 소득 대비 꽤 큰 편입니다.",
      desc: "통신·구독·보험처럼 ‘작게 여러 개’ 쌓인 항목부터 정리하면 효과가 빠릅니다. 결제일/자동결제도 같이 확인하세요.",
    };
  }
  return {
    label: "경계",
    badge: "bg-[#5bbbf3] text-white", // 주황(브랜드)
    title: "현금흐름 압박 가능성이 큽니다.",
    desc: "주거비·대출상환·보험 등 ‘큰 항목’이 비중을 차지하는지 먼저 보세요. 결제일 분산, 상환구조 점검이 필요할 수 있습니다.",
  };
}

export default function FixedCostRatioPage() {
  // 입력(문자열로 받아서 UX 좋게)
  const [income, setIncome] = useState("3000000");

  const [housing, setHousing] = useState("900000"); // 월세/관리비/대출이자 등
  const [telecom, setTelecom] = useState("90000");
  const [insurance, setInsurance] = useState("120000");
  const [subs, setSubs] = useState("45000");
  const [etc, setEtc] = useState("0");

  const calc = useMemo(() => {
    const inc = toNumberSafe(income);
    const h = toNumberSafe(housing);
    const t = toNumberSafe(telecom);
    const ins = toNumberSafe(insurance);
    const s = toNumberSafe(subs);
    const e = toNumberSafe(etc);

    const fixedTotal = h + t + ins + s + e;
    const ratio = inc > 0 ? (fixedTotal / inc) * 100 : 0;

    const share = (x: number) => (fixedTotal > 0 ? (x / fixedTotal) * 100 : 0);

    // 막대바(0~100) 과도한 값도 시각화 깨지지 않게
    const bar = clamp(ratio, 0, 100);

    const status = ratioStatus(ratio);

    // 어떤 항목이 큰지 TOP 3
    const parts = [
      { key: "주거/대출/관리", label: "주거/대출/관리", value: h },
      { key: "통신", label: "통신", value: t },
      { key: "보험", label: "보험", value: ins },
      { key: "구독", label: "구독", value: s },
      { key: "기타", label: "기타", value: e },
    ]
      .sort((a, b) => b.value - a.value)
      .filter((p) => p.value > 0);

    return {
      inc,
      fixedTotal,
      ratio,
      bar,
      status,
      shares: {
        housing: share(h),
        telecom: share(t),
        insurance: share(ins),
        subs: share(s),
        etc: share(e),
      },
      top3: parts.slice(0, 3),
    };
  }, [income, housing, telecom, insurance, subs, etc]);

  return (
    <div className={cn("min-h-screen", UI.paperBg)}>
      <div className={cn("min-h-screen", UI.paperDots)}>
        <div className="mx-auto px-2 py-2 sm:py-2">
          {/* 상단 네비 */}
          <div className="mb-5 flex items-center justify-between">
            <Link
              href="/calculators"
              className="rounded-full border border-[#e8f8ff] bg-[#f2fbff] px-3 py-1.5 text-[12px] font-semibold text-[#7f7f7f] hover:border-[#5bbbf3]"
            >
              ← 계산기 모음
            </Link>

            <span className="rounded-full bg-[#5bbbf3] px-3 py-1.5 text-[12px] font-semibold text-[#ffffff]">
              고정비 점검
            </span>
          </div>

          {/* 헤더 */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8f8ff] bg-[#f2fbff] px-3 py-1 text-xs font-medium text-[#7f7f7f] shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[#5bbbf3]" />
              Recipe Calculator
            </div>

            <h1 className={cn("mt-3 text-2xl sm:text-3xl font-semibold tracking-tight", UI.ink)}>
              월 고정비 비율 계산기
            </h1>
            <p className={cn("mt-2 text-[12px] sm:text-base", UI.inkSoft)}>
              고정비(주거/통신/보험/구독/기타) 합계를 월수입으로 나눠, 고정비 부담 수준을 한 번에 확인합니다.
            </p>
          </div>

          {/* 본문: 입력 / 결과 */}
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {/* 입력 카드 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>입력</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                금액은 월 기준으로 입력하세요. (예: 월세 80만, 관리비 15만 → 95만)
              </p>

              <div className="mt-4 grid gap-3">
                <MoneyInput
                  label="월수입(세후/실수령)"
                  value={income}
                  setValue={setIncome}
                  hint="급여 + 고정적으로 들어오는 수입"
                />

                <div className="h-px bg-[#e8f8ff]" />

                <MoneyInput
                  label="주거/대출/관리"
                  value={housing}
                  setValue={setHousing}
                  hint="월세·관리비·주택대출 이자/상환 등"
                />
                <MoneyInput label="통신" value={telecom} setValue={setTelecom} hint="휴대폰+인터넷 등" />
                <MoneyInput label="보험" value={insurance} setValue={setInsurance} hint="실손/자동차/보장성 등" />
                <MoneyInput label="구독" value={subs} setValue={setSubs} hint="OTT·음원·클라우드·멤버십" />
                <MoneyInput label="기타 고정비" value={etc} setValue={setEtc} hint="정기후원/정액서비스 등" />
              </div>

              <div className="mt-5 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>빠른 팁</div>
                <ul className={cn("mt-2 list-disc pl-5 text-[12px] leading-relaxed", UI.inkSoft)}>
                  <li>고정비는 한 번 늘면 줄이기 어렵습니다. “자동결제·결제일”부터 점검하세요.</li>
                  <li>주거/상환이 크면, 통신·구독·보험처럼 작은 항목을 먼저 정리하는 게 현실적입니다.</li>
                </ul>
              </div>
            </section>

            {/* 결과 카드 */}
            <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={cn("text-lg font-semibold", UI.ink)}>결과</h2>
                  <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>
                    고정비 합계와 월수입 대비 비율을 보여줍니다.
                  </p>
                </div>

                <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", calc.status.badge)}>
                  {calc.status.label}
                </span>
              </div>

              {/* 핵심 수치 */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricCard title="월 고정비 합계" value={`${formatKRW(calc.fixedTotal)}원`} />
                <MetricCard title="고정비 비율" value={`${calc.ratio.toFixed(1)}%`} />
              </div>

              {/* 바(시각화) */}
              <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className={cn("text-[12px] font-semibold", UI.ink)}>고정비 비율 게이지</div>
                  <div className={cn("text-xs", UI.inkSoft)}>0% ~ 100% (100% 초과는 100%로 표시)</div>
                </div>

                <div className="mt-3 h-3 w-full rounded-full bg-[#f2fbff]">
                  <div
                    className="h-3 rounded-full bg-[#5bbbf3]"
                    style={{ width: `${calc.bar}%` }}
                    aria-label="fixed cost ratio bar"
                  />
                </div>

                <div className={cn("mt-3 text-[12px] font-semibold", UI.ink)}>{calc.status.title}</div>
                <div className={cn("mt-1 text-[12px] leading-relaxed", UI.inkSoft)}>{calc.status.desc}</div>
              </div>

              {/* 구성 비중 */}
              <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className={cn("text-[12px] font-semibold", UI.ink)}>고정비 구성 비중(%)</div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <ShareRow label="주거/대출/관리" pct={calc.shares.housing} />
                  <ShareRow label="통신" pct={calc.shares.telecom} />
                  <ShareRow label="보험" pct={calc.shares.insurance} />
                  <ShareRow label="구독" pct={calc.shares.subs} />
                  <ShareRow label="기타" pct={calc.shares.etc} />
                </div>
              </div>

              {/* TOP 3 */}
              <div className="mt-4 rounded-2xl border border-[#e8f8ff] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className={cn("text-[12px] font-semibold", UI.ink)}>비중이 큰 항목 TOP 3</div>
                  <div className={cn("text-xs", UI.inkSoft)}>정리 우선순위 힌트</div>
                </div>

                {calc.top3.length === 0 ? (
                  <div className={cn("mt-3 text-[12px]", UI.inkSoft)}>입력된 고정비가 없습니다.</div>
                ) : (
                  <ol className="mt-3 space-y-2">
                    {calc.top3.map((p, idx) => (
                      <li
                        key={p.key}
                        className="flex items-center justify-between rounded-xl border border-[#e8f8ff] bg-[#f2fbff] px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#5bbbf3] text-xs font-bold text-[#ffffff]">
                            {idx + 1}
                          </span>
                          <span className={cn("text-[12px] font-semibold", UI.ink)}>{p.label}</span>
                        </div>
                        <span className={cn("text-[12px] font-semibold", UI.ink)}>{formatKRW(p.value)}원</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* CTA */}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/calculators/subscription-total"
                  className="rounded-2xl bg-[#5bbbf3] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
                >
                  다음: 구독 총액 계산기 →
                </Link>
                <Link
                  href="/"
                  className="rounded-2xl border border-[#e8f8ff] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#5bbbf3]"
                >
                  지출레시피 홈으로
                </Link>
              </div>

              {/* 면책/설명 */}
              <div className={cn("mt-4 text-xs leading-relaxed", UI.inkSoft)}>
                ※ 본 계산기는 입력값 기반의 점검용 도구입니다. 개인의 상황(부양가족, 지역/주거형태, 변동수입 등)에 따라
                해석이 달라질 수 있습니다.
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

function ShareRow({ label, pct }: { label: string; pct: number }) {
  const bar = clamp(pct, 0, 100);
  return (
    <div className="rounded-xl border border-[#e8f8ff] bg-[#f2fbff] p-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-[#3B2F1E]">{label}</span>
        <span className="text-[12px] font-semibold text-[#ffffff]">{pct.toFixed(1)}%</span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-[#5bbbf3]">
        <div className="h-2 rounded-full bg-[#5bbbf3]" style={{ width: `${bar}%` }} />
      </div>
    </div>
  );
}

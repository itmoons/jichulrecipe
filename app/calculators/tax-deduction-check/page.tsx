// src/app/calculators/tax-deduction-check/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { RecipeShell } from "@/components/calculators/RecipeShell";
import { MoneyInput, SelectInput } from "@/components/calculators/Inputs";
import { MetricCard, Row } from "@/components/calculators/Metric";
import { cn, UI, toNumberSafe, formatKRW, clamp } from "@/lib/calculators/utils";

type YesNo = "예" | "아니오";

export default function TaxDeductionCheckPage() {
  // “예상 공제액” 산출이 아니라, 체크 흐름 + 누락 위험 신호를 주는 형태
  const [grossAnnual, setGrossAnnual] = useState("50000000"); // 연 총급여(대략)
  const [cardSpend, setCardSpend] = useState("0"); // 카드/현금영수증 등 (대략)
  const [medicalSpend, setMedicalSpend] = useState("0"); // 의료비 (대략)
  const [eduSpend, setEduSpend] = useState("0"); // 교육비 (대략)
  const [donation, setDonation] = useState("0"); // 기부금 (대략)

  const [hasHomeLoan, setHasHomeLoan] = useState<YesNo>("아니오");
  const [hasRent, setHasRent] = useState<YesNo>("아니오");
  const [hasPension, setHasPension] = useState<YesNo>("예"); // 연금저축/IRP 납입 여부
  const [hasKids, setHasKids] = useState<YesNo>("아니오");
  const [hasDependent, setHasDependent] = useState<YesNo>("아니오");

  const calc = useMemo(() => {
    const income = Math.max(0, toNumberSafe(grossAnnual));
    const c = Math.max(0, toNumberSafe(cardSpend));
    const m = Math.max(0, toNumberSafe(medicalSpend));
    const e = Math.max(0, toNumberSafe(eduSpend));
    const d = Math.max(0, toNumberSafe(donation));

    const flags: string[] = [];

    // 너무 단정적인 수치 대신 “체크 우선순위/누락 가능성”만 제시
    if (income <= 0) flags.push("연 총급여(대략) 입력 필요");
    if (hasPension === "아니오") flags.push("연금저축/IRP 납입 내역 누락 여부 확인");
    if (hasRent === "예") flags.push("월세 세액공제(요건/증빙) 체크");
    if (hasHomeLoan === "예") flags.push("주택자금(대출/이자/원리금) 공제 증빙 체크");
    if (hasKids === "예" || hasDependent === "예") flags.push("인적공제(부양가족) 요건/소득기준 체크");
    if (c === 0) flags.push("카드/현금영수증 사용액 입력(또는 조회) 권장");
    if (m > 0) flags.push("의료비(영수증/간소화 누락분) 확인");
    if (e > 0) flags.push("교육비(본인/자녀) 확인");
    if (d > 0) flags.push("기부금(영수증) 확인");

    const priority = [
      hasPension === "예" ? "연금저축/IRP 납입 확인" : "연금저축/IRP 미납(해당없음 확인)",
      "신용/체크/현금영수증 사용액 확인",
      hasRent === "예" ? "월세 세액공제(요건·증빙) 확인" : "월세(해당없음 확인)",
      hasHomeLoan === "예" ? "주택자금 공제(이자/원리금) 확인" : "주택자금(해당없음 확인)",
      (hasKids === "예" || hasDependent === "예") ? "인적공제(부양가족) 요건 확인" : "인적공제(해당없음 확인)",
      "의료비/교육비/기부금(간소화 누락분 포함) 확인",
    ];

    const completeness =
      priority.filter((x) => x.includes("해당없음") === false).length +
      (income > 0 ? 1 : 0);

    const status =
      income <= 0
        ? { label: "입력 필요", badge: "bg-[#ff8a3d] text-[#ffffff]" }
        : flags.length <= 3
        ? { label: "양호", badge: "bg-[#34D399] text-white" }
        : { label: "체크 필요", badge: "bg-[#ff8a3d] text-white" };

    return { income, c, m, e, d, flags, priority, completeness, status };
  }, [
    grossAnnual,
    cardSpend,
    medicalSpend,
    eduSpend,
    donation,
    hasHomeLoan,
    hasRent,
    hasPension,
    hasKids,
    hasDependent,
  ]);

  return (
    <RecipeShell
      badge="연말정산"
      title="연말정산 공제 항목 체크 계산기"
      subtitle={
        <>
          숫자를 “맞추는 계산기”가 아니라, <span className="font-semibold text-[#ffffff]">누락을 줄이는 체크 흐름</span>입니다.
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* 입력 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={cn("text-lg font-semibold", UI.ink)}>간단 입력</h2>
              <p className={cn("mt-1 text-[12px]", UI.inkSoft)}>아는 것만 넣어도 체크 우선순위가 잡힙니다.</p>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", calc.status.badge)}>
              {calc.status.label}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MoneyInput label="연 총급여(대략)" value={grossAnnual} setValue={setGrossAnnual} />
            <MoneyInput label="카드/현금영수증 사용액(대략)" value={cardSpend} setValue={setCardSpend} />

            <MoneyInput label="의료비(대략)" value={medicalSpend} setValue={setMedicalSpend} />
            <MoneyInput label="교육비(대략)" value={eduSpend} setValue={setEduSpend} />

            <MoneyInput label="기부금(대략)" value={donation} setValue={setDonation} />

            <SelectInput label="연금저축/IRP 납입" value={hasPension} onChange={(v) => setHasPension(v as any)} options={["예", "아니오"]} />
            <SelectInput label="월세 지출" value={hasRent} onChange={(v) => setHasRent(v as any)} options={["예", "아니오"]} />
            <SelectInput label="주택자금(대출 등)" value={hasHomeLoan} onChange={(v) => setHasHomeLoan(v as any)} options={["예", "아니오"]} />
            <SelectInput label="자녀 있음" value={hasKids} onChange={(v) => setHasKids(v as any)} options={["예", "아니오"]} />
            <SelectInput label="부양가족 있음" value={hasDependent} onChange={(v) => setHasDependent(v as any)} options={["예", "아니오"]} />
          </div>

          <div className="mt-4 rounded-2xl border border-[#ffedd5] bg-white p-4">
            <div className="text-[12px] font-semibold text-[#3B2F1E]">주의</div>
            <p className="mt-2 text-[12px] text-[#6d6d6d]">
              이 페이지는 “예상 환급액”을 단정하지 않습니다. 대신, 공제 항목별 증빙/요건 체크 순서를 제공합니다.
            </p>
          </div>
        </section>

        {/* 결과 */}
        <section className={cn("rounded-3xl border p-4 sm:p-6 shadow-sm", UI.card)}>
          <h2 className={cn("text-lg font-semibold", UI.ink)}>체크 결과</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricCard title="연 총급여(대략)" value={`${formatKRW(calc.income)}원`} />
            <MetricCard title="체크 알림" value={`${calc.flags.length}개`} />
          </div>

          <div className="mt-4 rounded-2xl border border-[#ffedd5] bg-white p-4">
            <div className={cn("text-[12px] font-semibold", UI.ink)}>우선순위(추천 흐름)</div>
            <div className="mt-3 grid gap-2">
              {calc.priority.map((p, idx) => (
                <div key={idx} className="rounded-xl border border-[#ffedd5] bg-[#ff8a3d] px-3 py-2">
                  <div className="text-[12px] font-semibold text-[#3B2F1E]">
                    {idx + 1}. {p}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {calc.flags.length > 0 && (
            <div className="mt-4 rounded-2xl border border-[#ffedd5] bg-white p-4">
              <div className={cn("text-[12px] font-semibold", UI.ink)}>누락/점검 포인트</div>
              <div className="mt-3 grid gap-2">
                {calc.flags.map((f, idx) => (
                  <Row key={idx} label={`체크 ${idx + 1}`} value={f} tone="danger" />
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/calculators/net-pay-insurance"
              className="rounded-2xl bg-[#ff8a3d] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-[#EA580C]"
            >
              다음: 4대보험 실수령액 →
            </Link>
            <Link
              href="/calculators"
              className="rounded-2xl border border-[#ffedd5] bg-white px-4 py-2 text-center text-[12px] font-semibold text-[#7f7f7f] hover:border-[#ff8a3d]"
            >
              계산기 모음으로
            </Link>
          </div>
        </section>
      </div>
    </RecipeShell>
  );
}

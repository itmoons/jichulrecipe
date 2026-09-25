"use client";

import { useEffect, useMemo, useState } from "react";
import { RecipeShell } from "@/components/calculators/RecipeShell";

type Tool = "raise" | "severance" | "salary" | "housing" | "margin" | "compound" | "return";

const tools: Array<{ id: Tool; title: string; description: string; icon: string }> = [
  { id: "raise", title: "연봉 인상률", description: "인상 후 연봉과 월 증가액", icon: "↗" },
  { id: "severance", title: "퇴직금", description: "근속연수 기준 예상 퇴직금", icon: "₩" },
  { id: "salary", title: "월급 → 연봉", description: "상여금을 포함한 연봉 환산", icon: "◎" },
  { id: "housing", title: "전월세 전환", description: "보증금을 월세로 간편 환산", icon: "⌂" },
  { id: "margin", title: "마진율", description: "판매가와 원가의 수익성", icon: "%" },
  { id: "compound", title: "복리", description: "매월 적립하는 미래 자산", icon: "◌" },
  { id: "return", title: "투자 수익률", description: "기간별 예상 수익과 평가액", icon: "⌁" },
];

function num(value: string) {
  return Math.max(0, Number(value.replaceAll(",", "")) || 0);
}

function won(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function Field({ label, value, onChange, suffix = "원" }: { label: string; value: string; onChange: (value: string) => void; suffix?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <div className="flex h-11 overflow-hidden rounded-lg border border-[#dce5dd] bg-white transition focus-within:border-[#1f7a5b] focus-within:ring-2 focus-within:ring-[#1f7a5b]/20">
        <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))} className="min-w-0 flex-1 px-4 text-right text-sm font-semibold text-slate-900 outline-none" />
        <span className="flex items-center border-l border-slate-100 bg-slate-50 px-3 text-sm font-medium text-slate-500">{suffix}</span>
      </div>
    </label>
  );
}

export default function EverydayMoneyPage() {
  const [tool, setTool] = useState<Tool>("raise");
  const [a, setA] = useState("50000000");
  const [b, setB] = useState("5");
  const [c, setC] = useState("0");

  const activateTool = (next: Tool) => {
    setTool(next);
    const presets: Record<Tool, [string, string, string]> = {
      raise: ["50000000", "5", "0"],
      severance: ["3000000", "3", "0"],
      salary: ["3000000", "5000000", "0"],
      housing: ["100000000", "4", "0"],
      margin: ["10000", "15000", "0"],
      compound: ["300000", "4", "10"],
      return: ["10000000", "7", "5"],
    };
    const [nextA, nextB, nextC] = presets[next];
    setA(nextA); setB(nextB); setC(nextC);
  };

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tool") as Tool | null;
    if (!tools.some((item) => item.id === requested)) return;
    const timer = window.setTimeout(() => activateTool(requested!), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const result = useMemo(() => {
    const first = num(a); const second = num(b); const third = num(c);
    if (tool === "raise") {
      const next = first * (1 + second / 100);
      return { headline: won(next), label: "인상 후 예상 연봉", rows: [["연봉 증가액", won(next - first)], ["월 기준 증가액(세전)", won((next - first) / 12)], ["인상률", `${second.toFixed(1)}%`]] };
    }
    if (tool === "severance") {
      const amount = first * second;
      return { headline: won(amount), label: "예상 퇴직금", rows: [["1년 기준", won(first)], ["근속기간", `${second.toFixed(1)}년`], ["계산 기준", "평균임금 × 근속연수"]] };
    }
    if (tool === "salary") {
      const annual = first * 12 + second;
      return { headline: won(annual), label: "예상 세전 연봉", rows: [["월급 12개월", won(first * 12)], ["상여금", won(second)], ["월 평균 환산", won(annual / 12)]] };
    }
    if (tool === "housing") {
      const monthly = first * (second / 100) / 12;
      return { headline: won(monthly), label: "보증금의 월세 환산액", rows: [["보증금", won(first)], ["전환율", `${second.toFixed(2)}%`], ["연 환산액", won(monthly * 12)]] };
    }
    if (tool === "margin") {
      const profit = second - first;
      const margin = second ? profit / second * 100 : 0;
      return { headline: `${margin.toFixed(1)}%`, label: "매출총이익률", rows: [["판매 이익", won(profit)], ["원가 대비 마크업", `${(first ? profit / first * 100 : 0).toFixed(1)}%`], ["판매가", won(second)]] };
    }
    if (tool === "compound") {
      const months = Math.round(third * 12); const rate = second / 100 / 12;
      const future = rate ? first * (1 + rate) ** months + first * (((1 + rate) ** months - 1) / rate) : first * (months + 1);
      const paid = first * (months + 1);
      return { headline: won(future), label: "복리 적용 예상 자산", rows: [["총 납입액", won(paid)], ["예상 이자", won(future - paid)], ["기간", `${third}년`]] };
    }
    const months = Math.round(third * 12); const rate = second / 100 / 12;
    const future = first * (1 + rate) ** months;
    return { headline: won(future), label: "예상 평가금액", rows: [["원금", won(first)], ["예상 수익", won(future - first)], ["연 수익률", `${second.toFixed(1)}%`]] };
  }, [a, b, c, tool]);

  const fields: Record<Tool, Array<{ label: string; setter: (value: string) => void; value: string; suffix?: string }>> = {
    raise: [{ label: "현재 연봉(세전)", value: a, setter: setA }, { label: "인상률", value: b, setter: setB, suffix: "%" }],
    severance: [{ label: "최근 3개월 평균 월급", value: a, setter: setA }, { label: "근속기간", value: b, setter: setB, suffix: "년" }],
    salary: [{ label: "월급(세전)", value: a, setter: setA }, { label: "연간 상여금", value: b, setter: setB }],
    housing: [{ label: "보증금", value: a, setter: setA }, { label: "전월세 전환율", value: b, setter: setB, suffix: "%" }],
    margin: [{ label: "상품 원가", value: a, setter: setA }, { label: "판매가", value: b, setter: setB }],
    compound: [{ label: "매월 적립액", value: a, setter: setA }, { label: "연 이율", value: b, setter: setB, suffix: "%" }, { label: "적립 기간", value: c || "10", setter: setC, suffix: "년" }],
    return: [{ label: "투자 원금", value: a, setter: setA }, { label: "기대 연 수익률", value: b, setter: setB, suffix: "%" }, { label: "투자 기간", value: c || "5", setter: setC, suffix: "년" }],
  };

  return (
    <RecipeShell badge="생활 금융" title="생활 금융 빠른 계산" subtitle="연봉·퇴직금·전월세·마진율 등 필요한 계산을 골라 숫자를 입력하세요.">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-[#dce5dd] bg-white p-5 shadow-sm sm:p-7">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {tools.map((item) => <button key={item.id} onClick={() => activateTool(item.id)} className={`rounded-lg border p-4 text-left transition ${tool === item.id ? "border-[#1f7a5b] bg-[#1f7a5b] text-white shadow-sm" : "border-[#dce5dd] bg-white text-slate-700 hover:border-[#1f7a5b] hover:bg-[#f7faf8]"}`}><span className="text-xl font-bold">{item.icon}</span><span className="mt-3 block text-sm font-bold">{item.title}</span><span className={`mt-1 block text-xs leading-5 ${tool === item.id ? "text-white/85" : "text-slate-500"}`}>{item.description}</span></button>)}
            </div>
            <div className="mt-7 space-y-5">{fields[tool].map((field) => <Field key={field.label} {...field} onChange={field.setter} />)}</div>
          </section>

          <aside className="rounded-xl border border-[#dce5dd] bg-white p-6 text-slate-900 shadow-sm sm:p-8">
            <p className="text-sm font-semibold text-[#176247]">계산 결과</p>
            <div className="mt-4 border-b border-[#dce5dd] pb-6"><p className="text-sm text-slate-600">{result.label}</p><p className="mt-2 break-words text-3xl font-bold tracking-tight sm:text-4xl">{result.headline}</p></div>
            <dl className="mt-6 space-y-4">{result.rows.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 text-sm"><dt className="text-slate-600">{label}</dt><dd className="font-bold text-slate-900">{value}</dd></div>)}</dl>
            <div className="mt-8 rounded-lg border border-[#e2e5e1] bg-white p-4 text-sm leading-6 text-slate-600">계산 결과를 기준으로 예산을 세울 때는, 실수령액과 고정비를 먼저 반영하면 더 안전합니다.</div>
          </aside>
        </div>
    </RecipeShell>
  );
}

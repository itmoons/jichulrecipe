// src/app/dashboard/page.tsx
"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PageContainer } from "@/components/layout/PageContainer";
import { supabase } from "@/lib/supabaseClient";

type DetailKey =
  | "saving" // 적금
  | "card" // 신용카드 납부비
  | "transport" // 교통비
  | "mobile" // 통신비
  | "internet" // 인터넷요금
  | "insurance" // 보험비
  | "events" // 경조사비
  | "birthday" // 생일선물비
  | "clothes" // 의류구매비
  | "groceries"; // 식료품비

type DetailMap = Record<DetailKey, number>;

type ExtraItem = {
  id: string;
  label: string;
  amount: number;
};

type MonthlySetup = {
  netIncome: number;
  rent: number;
  loanPayment: number;
  details: DetailMap;
  extraItems: ExtraItem[];
};

type MonthlyStore = {
  [yearMonth: string]: MonthlySetup;
};

const LS_KEY_MONTHLY = "jichulrecipe_setup_monthly_v1";

const BRAND_ORANGE = "#FF8A3D";
const BRAND_GREEN = "#4CAF50";

const DETAIL_LABELS: Record<DetailKey, { label: string; emoji: string }> = {
  saving: { label: "적금", emoji: "💰" },
  card: { label: "신용카드 납부비", emoji: "💳" },
  transport: { label: "교통비", emoji: "🚌" },
  mobile: { label: "통신비", emoji: "📱" },
  internet: { label: "인터넷요금", emoji: "🌐" },
  insurance: { label: "보험비", emoji: "🩺" },
  events: { label: "경조사비", emoji: "🎎" },
  birthday: { label: "생일선물비", emoji: "🎁" },
  clothes: { label: "의류구매비", emoji: "👕" },
  groceries: { label: "식료품비", emoji: "🥦" },
};

function getYearMonth(date = new Date()) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`;
}

function ymToText(ym: string) {
  const [y, m] = ym.split("-");
  return `${y}년 ${Number(m)}월`;
}

/** YYYY-MM을 기준으로 delta개월 이동한 YYYY-MM 반환 */
function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-");
  const year = Number(y);
  const monthIdx = Number(m) - 1;

  const d = new Date(year, monthIdx + delta, 1);
  const yy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${yy}-${mm}`;
}

function DashboardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const monthParam = searchParams.get("month") || getYearMonth();

  const [store, setStore] = useState<MonthlyStore | null>(null);
  const [data, setData] = useState<MonthlySetup | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (typeof window === "undefined") return;

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (authError) {
        console.warn("Supabase auth error in dashboard:", authError.message);
      }

      // 로그인 안 되어 있으면 → localStorage 정리 + /sign-in으로 이동
      if (!user) {
        try {
          window.localStorage.removeItem(LS_KEY_MONTHLY);
        } catch {
          // ignore
        }

        setStore({});
        setData(null);

        router.replace(`/sign-in?redirect=/dashboard?month=${monthParam}`);
        return;
      }

      // Supabase에서 해당 월 데이터 조회
      let monthlyFromDb: MonthlySetup | null = null;

      try {
        const { data: row, error: dbError } = await supabase
          .from("monthly_recipes")
          .select(
            "net_income, rent, loan_payment, details, extra_items, year_month"
          )
          .eq("user_id", user.id)
          .eq("year_month", monthParam)
          .maybeSingle();

        if (!mounted) return;

        if (dbError) {
          console.warn("Supabase monthly_recipes 조회 오류:", dbError.message);
        } else if (row) {
          monthlyFromDb = {
            netIncome: row.net_income ?? 0,
            rent: row.rent ?? 0,
            loanPayment: row.loan_payment ?? 0,
            details: (row.details ?? {}) as DetailMap,
            extraItems: (row.extra_items ?? []) as ExtraItem[],
          };
        }
      } catch (err) {
        console.error("Supabase monthly_recipes 처리 중 오류:", err);
      }

      // localStorage에서 store 조회
      let parsedStore: MonthlyStore = {};
      try {
        const raw = window.localStorage.getItem(LS_KEY_MONTHLY);
        if (raw) {
          parsedStore = JSON.parse(raw) as MonthlyStore;
        }
      } catch {
        parsedStore = {};
      }
      setStore(parsedStore);

      // Supabase 우선, 없으면 localStorage
      if (monthlyFromDb) {
        setData(monthlyFromDb);
      } else {
        setData(parsedStore[monthParam] ?? null);
      }

      setCheckingAuth(false);
    };

    init();
    return () => {
      mounted = false;
    };
  }, [monthParam, router]);

  const summary = useMemo(() => {
    if (!data) return null;

    const net = data.netIncome || 0;
    const rent = data.rent || 0;
    const loan = data.loanPayment || 0;

    const detailTotal = (Object.keys(data.details || {}) as DetailKey[]).reduce(
      (sum, k) => sum + (data.details?.[k] || 0),
      0
    );
    const extraTotal = (data.extraItems || []).reduce(
      (sum, item) => sum + (item.amount || 0),
      0
    );

    const totalPlanned = rent + loan + detailTotal + extraTotal;
    const remain = net - totalPlanned;
    const fixedRatio = net > 0 ? (totalPlanned / net) * 100 : 0;

    const saving = data.details?.saving || 0;
    const consumption =
      (data.details.card || 0) +
      (data.details.groceries || 0) +
      (data.details.clothes || 0) +
      (data.details.events || 0) +
      (data.details.birthday || 0);

    const housingAndLoanRatio =
      net > 0 ? ((rent + loan) / net) * 100 : 0;
    const savingRatio = net > 0 ? (saving / net) * 100 : 0;
    const consumptionRatio = net > 0 ? (consumption / net) * 100 : 0;

    return {
      net,
      rent,
      loan,
      detailTotal,
      extraTotal,
      totalPlanned,
      remain,
      fixedRatio,
      saving,
      consumption,
      housingAndLoanRatio,
      savingRatio,
      consumptionRatio,
    };
  }, [data]);

  const categoryRows = useMemo(() => {
    if (!data || !summary) return [];

    const rows: {
      key: string;
      label: string;
      emoji: string;
      amount: number;
    }[] = [];

    rows.push({
      key: "rent",
      label: "월세 + 관리비",
      emoji: "🏠",
      amount: summary.rent,
    });

    rows.push({
      key: "loan",
      label: "대출 상환액",
      emoji: "💸",
      amount: summary.loan,
    });

    (Object.keys(data.details || {}) as DetailKey[]).forEach((k) => {
      rows.push({
        key: k,
        label: DETAIL_LABELS[k]?.label ?? k,
        emoji: DETAIL_LABELS[k]?.emoji ?? "•",
        amount: data.details?.[k] || 0,
      });
    });

    (data.extraItems || []).forEach((item) => {
      rows.push({
        key: item.id,
        label: item.label || "추가 항목",
        emoji: "🍽",
        amount: item.amount || 0,
      });
    });

    return rows;
  }, [data, summary]);

  const handleGoSetup = () => {
    router.push(`/setup?month=${monthParam}`);
  };

  const handleMoveMonth = (delta: number) => {
    const next = shiftMonth(monthParam, delta);
    router.push(`/dashboard?month=${next}`);
  };

  // 도넛 그래프용 수치
  const donutRatio =
    summary && summary.net > 0
      ? Math.max(0, Math.min(summary.fixedRatio, 100))
      : 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  if (checkingAuth) {
    return (
      <PageContainer title="이 달의 지출 레시피 대시보드">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#FFF8EC] via-[#FFFDFC] to-[#F7FAFF]" />
        <div className="pointer-events-none fixed left-[-80px] top-[40%] -z-10 h-52 w-52 rounded-full bg-[rgba(255,184,108,0.25)] blur-3xl" />
        <div className="pointer-events-none fixed right-[-60px] bottom-[8%] -z-10 h-52 w-52 rounded-full bg-[rgba(86,115,231,0.18)] blur-3xl" />

        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-xs text-slate-500">
            이 달의 레시피를 불러오고 있어요...
          </p>
        </div>
      </PageContainer>
    );
  }

  if (!data || !summary) {
    return (
      <PageContainer title="이 달의 지출 레시피 대시보드">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#FFF8EC] via-[#FFFDFC] to-[#F7FAFF]" />
        <div className="pointer-events-none fixed left-[-80px] top-[40%] -z-10 h-52 w-52 rounded-full bg-[rgba(255,184,108,0.25)] blur-3xl" />
        <div className="pointer-events-none fixed right-[-60px] bottom-[8%] -z-10 h-52 w-52 rounded-full bg-[rgba(86,115,231,0.18)] blur-3xl" />

        <div className="mx-auto max-w-xl rounded-2xl bg-white/95 p-6 text-center shadow-sm shadow-orange-50 border border-orange-50">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-50/80 px-3 py-1 text-[11px] font-medium text-slate-600">
            <span className="text-sm">📖</span>
            <span>{ymToText(monthParam)} 레시피 표지가 아직 비어 있어요</span>
          </div>

          <div className="mb-3 flex items-center justify-center gap-3 text-sm font-semibold text-slate-900">
            <button
              type="button"
              onClick={() => handleMoveMonth(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50"
            >
              ←
            </button>
            <span>{ymToText(monthParam)}</span>
            <button
              type="button"
              onClick={() => handleMoveMonth(1)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50"
            >
              →
            </button>
          </div>

          <h2 className="mb-2 text-base font-semibold text-slate-900">
            {ymToText(monthParam)} 기본 지출 레시피를 먼저 적어볼까요?
          </h2>
          <p className="mb-4 text-sm text-slate-600">
            세후 월급과 고정비·생활비·저축을 입력하면,
            <br />
            이 화면에서 자동으로 “레시피 요약표”를 만들어 드립니다.
          </p>
          <button
            type="button"
            onClick={handleGoSetup}
            className="inline-flex items-center justify-center rounded-xl bg-[color:var(--brand-orange)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 hover:bg-[#f27422] transition"
            style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
          >
            🍽 {ymToText(monthParam)} 레시피 쓰러 가기
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="이 달의 지출 레시피 대시보드">
      {/* 공통 배경 */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#FFF8EC] via-[#FFFDFC] to-[#F7FAFF]" />
      <div className="pointer-events-none fixed left-[-80px] top-[40%] -z-10 h-52 w-52 rounded-full bg-[rgba(255,184,108,0.22)] blur-3xl" />
      <div className="pointer-events-none fixed right-[-60px] bottom-[8%] -z-10 h-52 w-52 rounded-full bg-[rgba(86,115,231,0.16)] blur-3xl" />

      {/* 1. 레시피 표지 영역 */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mb-6"
      >
        <div className="mx-auto flex flex-col gap-4 rounded-3xl border border-orange-50 bg-white/95 p-4 shadow-sm shadow-orange-50 md:flex-row md:items-center md:justify-between">
          {/* 왼쪽: 타이틀 + 설명 */}
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-50/80 px-3 py-1 text-[11px] font-medium text-slate-700">
              <span>📖</span>
              <span>{ymToText(monthParam)} 지출 레시피</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">
              {ymToText(monthParam)}{" "}
              <span
                className="text-[color:var(--brand-orange)]"
                style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
              >
                예산 레시피
              </span>
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              세후 월급 {summary.net.toLocaleString()}원을 기준으로,
              <br className="hidden md:block" />
              집세·대출·저축·생활비를{" "}
              <span className="font-semibold">레시피처럼 분해</span>해서
              보여주는 페이지입니다.
            </p>
          </div>

          {/* 오른쪽: 월 이동 + 스냅샷 + 설정 버튼 */}
          <div className="flex flex-col items-end gap-2 text-[11px] text-slate-500">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm">
              <button
                type="button"
                onClick={() => handleMoveMonth(-1)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-slate-600 hover:bg-slate-50"
              >
                ←
              </button>
              <span className="px-1 text-xs font-semibold text-slate-800">
                {ymToText(monthParam)}
              </span>
              <button
                type="button"
                onClick={() => handleMoveMonth(1)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-slate-600 hover:bg-slate-50"
              >
                →
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 px-3 py-2 text-right shadow-inner">
              <p className="text-[11px] font-semibold text-slate-800">
                계획 지출{" "}
                <span className="text-[color:var(--brand-orange)]">
                  {summary.totalPlanned.toLocaleString()}원
                </span>{" "}
                ({summary.fixedRatio.toFixed(1)}%)
              </p>
              <p className="text-[10px] text-slate-500">
                남는 금액{" "}
                <span
                  className="font-semibold text-[color:var(--brand-green)]"
                  style={{ ["--brand-green" as any]: BRAND_GREEN }}
                >
                  {summary.remain.toLocaleString()}원
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoSetup}
              className="mt-1 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50"
            >
              ✏️ 기본 레시피 수정하기
            </button>
          </div>
        </div>
      </motion.section>

      {/* 2. 기본 재료 카드 + 중앙 도넛 + 비율 카드 */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.9fr_0.9fr]"
      >
        {/* 왼쪽: 기본 재료 카드 */}
        <div className="rounded-3xl border border-slate-100 bg-white/95 p-4 shadow-sm shadow-orange-50">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              기본 재료표
            </h2>
            <span className="text-[11px] text-slate-500">
              세후 월급 기준 핵심 항목입니다
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* 세후 월급 */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-[11px] font-semibold text-slate-700">
                세후 월급
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {summary.net.toLocaleString()}원
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                이번 달 레시피의 총 예산입니다.
              </p>
            </div>

            {/* 주거비 */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-[11px] font-semibold text-slate-700">
                주거비 (월세+대출)
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {(summary.rent + summary.loan).toLocaleString()}원
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                월급의{" "}
                <span className="font-semibold">
                  {summary.housingAndLoanRatio.toFixed(1)}%
                </span>{" "}
                를 차지합니다.
              </p>
            </div>

            {/* 저축 */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-[11px] font-semibold text-slate-700">
                적금 · 저축
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {summary.saving.toLocaleString()}원
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                저축률{" "}
                <span className="font-semibold">
                  {summary.savingRatio.toFixed(1)}%
                </span>
                입니다.
              </p>
            </div>

            {/* 소비성 지출 */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-[11px] font-semibold text-slate-700">
                소비성 지출 (카드·식비·의류·경조사)
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {summary.consumption.toLocaleString()}원
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                월급의{" "}
                <span className="font-semibold">
                  {summary.consumptionRatio.toFixed(1)}%
                </span>{" "}
                수준입니다.
              </p>
            </div>
          </div>
        </div>

        {/* 중앙: 도넛 그래프 (레시피 그릇 느낌) */}
        <div className="flex items-center justify-center rounded-3xl border border-slate-100 bg-white/95 p-4 shadow-sm shadow-orange-50">
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-sm font-semibold text-slate-900">
              그릇 위 지출 비율
            </h2>
            <p className="text-[11px] text-slate-500 mb-1">
              월급이라는 그릇에서 어느 정도를 사용하기로 했는지 보여줍니다.
            </p>
            <div className="relative h-44 w-44">
              <svg viewBox="0 0 140 140" className="h-full w-full">
                {/* 바닥 원 (그릇) */}
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  className="fill-none stroke-slate-100"
                  strokeWidth="12"
                />
                {/* 사용 비율 */}
                <motion.circle
                  cx="70"
                  cy="70"
                  r={radius}
                  className="fill-none"
                  stroke="url(#grad-main)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{
                    strokeDashoffset:
                      circumference * (1 - donutRatio / 100),
                  }}
                  transition={{ duration: 0.85, delay: 0.1, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient
                    id="grad-main"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#FFB86C" />
                    <stop offset="100%" stopColor="#FF8A3D" />
                  </linearGradient>
                </defs>
              </svg>

              {/* 중앙 텍스트 */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-[11px] text-slate-500">지출 비율</p>
                <p className="text-2xl font-bold text-slate-900">
                  {summary.fixedRatio.toFixed(1)}%
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  남는 금액 {summary.remain.toLocaleString()}원
                </p>
              </div>
            </div>

            <div className="mt-1 flex flex-col gap-1 text-[10px] text-slate-500">
              <p>
                ● 지출 계획{" "}
                <span className="font-semibold text-slate-800">
                  {summary.totalPlanned.toLocaleString()}원
                </span>
              </p>
              <p>
                ○ 남는 금액{" "}
                <span
                  className="font-semibold text-[color:var(--brand-green)]"
                  style={{ ["--brand-green" as any]: BRAND_GREEN }}
                >
                  {summary.remain.toLocaleString()}원
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* 오른쪽: 비율 카드 */}
        <div className="rounded-3xl border border-slate-100 bg-white/95 p-4 shadow-sm shadow-orange-50">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              레시피 비율
            </h2>
            <span className="text-[11px] text-slate-500">
              직관적인 비율 바 형태로 정리했어요
            </span>
          </div>

          <div className="space-y-3 text-[11px]">
            {/* 전체 지출 비율 */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold text-slate-700">
                  전체 지출 비율
                </span>
                <span className="text-slate-500">
                  {summary.fixedRatio.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(100, Math.max(0, summary.fixedRatio))}%`,
                  }}
                  transition={{ duration: 0.6 }}
                  className="h-full rounded-full bg-gradient-to-r from-[#FFB86C] via-[#FF8A3D] to-[#FF6B3D]"
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-500">
                세후 월급 대비, 이번 달에{" "}
                <span className="font-semibold">
                  {summary.totalPlanned.toLocaleString()}원
                </span>
                을 사용할 계획입니다.
              </p>
            </div>

            {/* 주거비 비율 */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold text-slate-700">
                  주거비 비율 (월세+대출)
                </span>
                <span className="text-slate-500">
                  {summary.housingAndLoanRatio.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(
                      100,
                      Math.max(0, summary.housingAndLoanRatio)
                    )}%`,
                  }}
                  transition={{ duration: 0.6, delay: 0.05 }}
                  className="h-full rounded-full bg-[#FFCD6C]"
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-500">
                주거비가 월급에서 차지하는 비중입니다.{" "}
                <span className="font-semibold">30% 전후</span>가 일반적인
                권장선입니다.
              </p>
            </div>

            {/* 저축 비율 */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold text-slate-700">
                  저축 비율
                </span>
                <span className="text-slate-500">
                  {summary.savingRatio.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(
                      100,
                      Math.max(0, summary.savingRatio)
                    )}%`,
                  }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="h-full rounded-full bg-[#7FD1AE]"
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-500">
                미래 준비를 위한 비율입니다. 본인이 목표로 삼는{" "}
                <span className="font-semibold">저축률 기준</span>과 비교해
                보세요.
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 3. 상세 재료 리스트 + 셰프 노트 */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]"
      >
        {/* 상세 재료 리스트 */}
        <div className="rounded-3xl border border-slate-100 bg-white/95 p-4 shadow-sm shadow-orange-50">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              상세 재료 리스트
            </h2>
            <span className="text-[11px] text-slate-500">
              항목별 금액과 비율을 재료처럼 나열했어요
            </span>
          </div>

          <div className="max-h-[420px] space-y-1.5 overflow-auto pr-1 text-xs">
            <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_72px] gap-2 rounded-lg bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-600">
              <div>재료</div>
              <div className="text-right">금액</div>
              <div className="text-right">월급대비</div>
            </div>

            {categoryRows.map((row) => {
              const ratio =
                summary.net > 0 ? (row.amount / summary.net) * 100 : 0;
              const width = Math.max(
                4,
                Math.min(100, Math.round(ratio))
              );

              return (
                <div
                  key={row.key}
                  className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_72px] items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] hover:bg-slate-50"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5">{row.emoji}</span>
                    <div className="flex-1">
                      <p className="text-slate-800">{row.label}</p>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${width}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full rounded-full bg-gradient-to-r from-[#FFB86C] via-[#FF8A3D] to-[#FF6B3D]"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-slate-800">
                    {row.amount ? row.amount.toLocaleString() : 0}원
                  </div>
                  <div className="text-right text-slate-500">
                    {ratio.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 셰프(회계사) 노트 */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-100 bg-white/95 p-4 shadow-sm shadow-orange-50">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-lg">👨‍🍳</span>
              <h2 className="text-sm font-semibold text-slate-900">
                이번 달 셰프 노트
              </h2>
            </div>

            <ul className="space-y-1.5 text-[11px] leading-relaxed text-slate-700">
              <li>
                • 전체 지출이 세후 월급의{" "}
                <span className="font-semibold">
                  {summary.fixedRatio.toFixed(1)}%
                </span>{" "}
                입니다.
              </li>
              <li>
                • 주거비(월세+대출)는{" "}
                <span className="font-semibold">
                  {summary.housingAndLoanRatio.toFixed(1)}%
                </span>{" "}
                수준으로, 본인이 생각하는 적정선과 비교해 보세요.
              </li>
              <li>
                • 적금(저축)은{" "}
                <span className="font-semibold">
                  {summary.saving.toLocaleString()}원
                </span>{" "}
                으로, 저축률은{" "}
                <span className="font-semibold">
                  {summary.savingRatio.toFixed(1)}%
                </span>
                입니다.
              </li>
              <li>
                • 카드·식비·의류·경조사 등 소비성 지출 합계는{" "}
                <span className="font-semibold">
                  {summary.consumption.toLocaleString()}원
                </span>
                입니다.
              </li>
              <li>
                • 남는 금액{" "}
                <span
                  className="font-semibold text-[color:var(--brand-green)]"
                  style={{ ["--brand-green" as any]: BRAND_GREEN }}
                >
                  {summary.remain.toLocaleString()}원
                </span>{" "}
                은 비상자금·투자·여행 등에 어떻게 배분할지 미리 정해두면
                좋습니다.
              </li>
            </ul>
          </div>

          <div className="rounded-3xl bg-gradient-to-r from-[#FFF7EB] to-[#FFF4E5] p-4 text-[11px] leading-relaxed text-slate-700 shadow-sm shadow-orange-50">
            <p className="mb-2">
              🧂 <strong>셰프 TIP.</strong> 실제 한 달을 살아본 뒤, 카드 사용액과
              식비가 계획보다 많이 나갔다면,
              <br />
              다음 달에는 해당 재료(지출)를 조금 줄이고 저축이나 여유자금으로
              다시 배치해 보세요.
            </p>
            <p className="text-[10px] text-slate-500">
              이 화면은 입력한 “예산 계획” 기준 분석이며, 나중에 실제 지출
              데이터(카드·가계부)를 연동하면
              <br />
              계획 vs 실제를 비교하는 정교한 회계 리포트로 확장할 수 있습니다.
            </p>
          </div>
        </div>
      </motion.section>
    </PageContainer>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <PageContainer title="이 달의 지출 레시피 대시보드">
          <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#FFF8EC] via-[#FFFDFC] to-[#F7FAFF]" />
          <div className="pointer-events-none fixed left-[-80px] top-[40%] -z-10 h-52 w-52 rounded-full bg-[rgba(255,184,108,0.25)] blur-3xl" />
          <div className="pointer-events-none fixed right-[-60px] bottom-[8%] -z-10 h-52 w-52 rounded-full bg-[rgba(86,115,231,0.18)] blur-3xl" />

          <div className="flex min-h-[60vh] items-center justify-center">
            <p className="text-xs text-slate-500">
              이 달의 지출 레시피 대시보드를 준비하고 있어요...
            </p>
          </div>
        </PageContainer>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}

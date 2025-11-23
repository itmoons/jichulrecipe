// src/app/dashboard/page.tsx
"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  let year = Number(y);
  let monthIdx = Number(m) - 1; // 0-based

  const d = new Date(year, monthIdx + delta, 1);
  const yy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${yy}-${mm}`;
}

/**
 * 실제 대시보드 로직 (useSearchParams 사용)
 */
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

      // 1) 로그인 유저 확인
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (authError) {
        console.warn("Supabase auth error in dashboard:", authError.message);
      }

      // 2) 로그인 안 되어 있으면 → localStorage 정리 + /sign-in으로 이동
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

      // 3) 로그인 되어 있으면: Supabase에서 해당 월 데이터 우선 조회
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
          // DB → MonthlySetup 형태로 매핑
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

      // 4) localStorage에서 전체 store 로딩 (캐시/폴백용)
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

      // 5) 이 월에 대한 데이터 결정: Supabase 우선, 없으면 localStorage
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

  // 파생 값들 계산
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

    return {
      net,
      rent,
      loan,
      detailTotal,
      extraTotal,
      totalPlanned,
      remain,
      fixedRatio,
    };
  }, [data]);

  // 카테고리 리스트 (표용)
  const categoryRows = useMemo(() => {
    if (!data || !summary) return [];

    const rows: {
      key: string;
      label: string;
      emoji: string;
      amount: number;
    }[] = [];

    // 월세+관리비
    rows.push({
      key: "rent",
      label: "월세 + 관리비",
      emoji: "🏠",
      amount: summary.rent,
    });

    // 대출 상환
    rows.push({
      key: "loan",
      label: "대출 상환액",
      emoji: "💸",
      amount: summary.loan,
    });

    // 상세 항목
    (Object.keys(data.details || {}) as DetailKey[]).forEach((k) => {
      rows.push({
        key: k,
        label: DETAIL_LABELS[k]?.label ?? k,
        emoji: DETAIL_LABELS[k]?.emoji ?? "•",
        amount: data.details?.[k] || 0,
      });
    });

    // 추가 항목
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

  /** 이전달 / 다음달 이동 */
  const handleMoveMonth = (delta: number) => {
    const next = shiftMonth(monthParam, delta);
    router.push(`/dashboard?month=${next}`);
  };

  // 인증/데이터 로딩 중
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
    // 해당 월에 기본 레시피가 없을 때
    return (
      <PageContainer title="이 달의 지출 레시피 대시보드">
        {/* 배경 */}
        <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#FFF8EC] via-[#FFFDFC] to-[#F7FAFF]" />
        <div className="pointer-events-none fixed left-[-80px] top-[40%] -z-10 h-52 w-52 rounded-full bg-[rgba(255,184,108,0.25)] blur-3xl" />
        <div className="pointer-events-none fixed right-[-60px] bottom-[8%] -z-10 h-52 w-52 rounded-full bg-[rgba(86,115,231,0.18)] blur-3xl" />

        <div className="mx-auto max-w-xl rounded-2xl bg-white/95 p-6 text-center shadow-sm shadow-orange-50">
          <div className="mb-3 flex items-center justify-center gap-3 text-sm font-semibold text-slate-900">
            {/* 월 이동 컨트롤 */}
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
            {ymToText(monthParam)} 기본 레시피가 아직 없어요
          </h2>
          <p className="mb-4 text-sm text-slate-600">
            먼저 기본 레시피 페이지에서 이 달의 세후 월급과 지출 항목을 입력해
            주세요.
            <br />
            그러면 여기에서 지출 구조를 레시피처럼 분석해서 보여 드릴게요.
          </p>
          <button
            type="button"
            onClick={handleGoSetup}
            className="inline-flex items-center justify-center rounded-xl bg-[color:var(--brand-orange)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 hover:bg-[#f27422] transition"
            style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
          >
            🍽 {ymToText(monthParam)} 기본 레시피 만들러 가기
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="이 달의 지출 레시피 대시보드">
      {/* 배경 */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#FFF8EC] via-[#FFFDFC] to-[#F7FAFF]" />
      <div className="pointer-events-none fixed left-[-80px] top-[40%] -z-10 h-52 w-52 rounded-full bg-[rgba(255,184,108,0.25)] blur-3xl" />
      <div className="pointer-events-none fixed right-[-60px] bottom-[8%] -z-10 h-52 w-52 rounded-full bg-[rgba(86,115,231,0.18)] blur-3xl" />

      {/* 헤더 영역 */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
      >
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: BRAND_ORANGE }}
            />
            <span>{ymToText(monthParam)} · 지출 레시피 분석</span>
          </div>
          <h2 className="mt-2 text-xl font-semibold text-slate-900 md:text-2xl">
            {ymToText(monthParam)}{" "}
            <span
              className="text-[color:var(--brand-orange)]"
              style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
            >
              예산 레시피
            </span>{" "}
            요약
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            기본 레시피에 입력한 값을 바탕으로, 한 달 지출 구조를
            <br className="hidden md:block" />
            고정비·저축·소비 항목별로 나눠서 보여줍니다.
          </p>
        </div>

        {/* 우측: 월 이동 + 설정 버튼 */}
        <div className="flex flex-col items-end gap-2 text-[11px] text-slate-500">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-2 py-1 shadow-sm">
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

          <button
            type="button"
            onClick={handleGoSetup}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50"
          >
            ✏️ 기본 레시피 수정하기
          </button>
        </div>
      </motion.section>

      {/* 상단 요약 카드 */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mb-4 grid gap-4 md:grid-cols-3"
      >
        {/* 세후 월급 */}
        <div className="rounded-2xl bg-white/95 p-4 shadow-sm shadow-orange-50">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              세후 월급
            </span>
            <span className="text-[11px] text-slate-400">Income</span>
          </div>
          <p className="text-lg font-bold text-slate-900">
            {summary.net.toLocaleString()}원
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            한 달에 실제로 통장에 들어오는 금액입니다.
          </p>
        </div>

        {/* 계획 지출 합계 */}
        <div className="rounded-2xl bg-white/95 p-4 shadow-sm shadow-orange-50">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              계획된 지출 총합
            </span>
            <span className="text-[11px] text-slate-400">Planned Outflow</span>
          </div>
          <p className="text-lg font-bold text-slate-900">
            {summary.totalPlanned.toLocaleString()}원
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            월세·대출·각 항목·추가 지출까지 모두 더한 금액입니다.
          </p>
        </div>

        {/* 남는 금액 & 비율 */}
        <div className="rounded-2xl bg-white/95 p-4 shadow-sm shadow-orange-50">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              남는 금액 · 지출 비율
            </span>
            <span className="text-[11px] text-slate-400">Balance</span>
          </div>
          <p
            className="text-lg font-bold text-[color:var(--brand-green)]"
            style={{ ["--brand-green" as any]: BRAND_GREEN }}
          >
            {summary.remain.toLocaleString()}원
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            총 지출이 세후 월급의{" "}
            <span className="font-semibold text-slate-800">
              {summary.fixedRatio.toFixed(1)}%
            </span>
            를 차지합니다.
          </p>
        </div>
      </motion.section>

      {/* 하단: 카테고리별 표 + 간단 분석 */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]"
      >
        {/* 카테고리 테이블 */}
        <div className="rounded-2xl bg-white/95 p-4 shadow-sm shadow-orange-50">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              카테고리별 지출 레시피
            </h3>
            <span className="text-[11px] text-slate-500">
              세후 월급 대비 비율 기준
            </span>
          </div>

          <div className="max-h-[420px] space-y-1 overflow-auto pr-1 text-xs">
            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_60px] gap-2 rounded-lg bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-600">
              <div>항목</div>
              <div className="text-right">금액</div>
              <div className="text-right">비율</div>
            </div>

            {categoryRows.map((row) => {
              const ratio =
                summary.net > 0 ? (row.amount / summary.net) * 100 : 0;
              return (
                <div
                  key={row.key}
                  className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_60px] items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <span>{row.emoji}</span>
                    <span className="text-slate-800">{row.label}</span>
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

        {/* 간단 분석 카드 */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white/95 p-4 shadow-sm shadow-orange-50">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">
              이 달 레시피 한 줄 요약
            </h3>
            <ul className="space-y-1.5 text-[11px] leading-relaxed text-slate-700">
              <li>
                • 전체 지출이 세후 월급의{" "}
                <span className="font-semibold">
                  {summary.fixedRatio.toFixed(1)}%
                </span>
                를 차지하고 있습니다.
              </li>
              <li>
                • 월세+관리비와 대출 상환액이 합쳐서{" "}
                <span className="font-semibold">
                  {summary.net > 0
                    ? (
                        ((summary.rent + summary.loan) / summary.net) *
                        100
                      ).toFixed(1)
                    : "0.0"}
                  %
                </span>{" "}
                수준입니다.
              </li>
              <li>
                • 적금(저축) 항목은{" "}
                <span className="font-semibold">
                  {(data.details.saving || 0).toLocaleString()}원
                </span>
                으로, 세후 월급의{" "}
                <span className="font-semibold">
                  {summary.net > 0
                    ? (
                        ((data.details.saving || 0) / summary.net) *
                        100
                      ).toFixed(1)
                    : "0.0"}
                  %
                </span>
                입니다.
              </li>
              <li>
                • 카드·식비·의류·경조사 등 소비성 지출은 합산 시{" "}
                <span className="font-semibold">
                  {(
                    (data.details.card || 0) +
                    (data.details.groceries || 0) +
                    (data.details.clothes || 0) +
                    (data.details.events || 0) +
                    (data.details.birthday || 0)
                  ).toLocaleString()}
                  원
                </span>{" "}
                수준입니다.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl bg-gradient-to-r from-[#FFF7EB] to-[#FFF4E5] p-4 text-[11px] leading-relaxed text-slate-700 shadow-sm shadow-orange-50">
            <p className="mb-2">
              👨‍🍳 <strong>TIP.</strong> 이번 달을 실제로 살아보면서, 카드 사용액과
              식비가 예상보다 많이 나간다면 다음 달 기본 레시피에서
              <br />
              해당 항목 금액을 조금 줄이고, 적금이나 여유자금으로 돌려 보는
              식으로 점진적으로 레시피를 조정해 보세요.
            </p>
            <p className="text-[10px] text-slate-500">
              이 화면은 입력한 “예산 계획” 기준 분석이며, 나중에 실제 지출 데이터
              (카드·가계부)를 연동하면
              <br />
              계획 vs 실제를 비교하는 통계 대시보드로 확장할 수 있습니다.
            </p>
          </div>
        </div>
      </motion.section>
    </PageContainer>
  );
}

/**
 * Suspense 래퍼: DashboardInner를 감싸서 useSearchParams 경고 제거
 */
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

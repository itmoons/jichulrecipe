// src/app/dashboard/yearly/YearlyDashboardClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  [yearMonth: string]: MonthlySetup; // "YYYY-MM"
};

const LS_KEY_MONTHLY = "jichulrecipe_setup_monthly_v1";

const BRAND_blue = "#1f7a5b";
const BRAND_GREEN = "#4CAF50";

const DETAIL_LABELS: Record<
  DetailKey,
  { label: string; emoji: string; group: "saving" | "living" | "consumption" }
> = {
  saving: {
    label: "적금",
    emoji: "💰",
    group: "saving",
  },
  card: {
    label: "신용카드 납부비",
    emoji: "💳",
    group: "consumption",
  },
  transport: {
    label: "교통비",
    emoji: "🚌",
    group: "living",
  },
  mobile: {
    label: "통신비",
    emoji: "📱",
    group: "living",
  },
  internet: {
    label: "인터넷요금",
    emoji: "🌐",
    group: "living",
  },
  insurance: {
    label: "보험비",
    emoji: "🩺",
    group: "living",
  },
  events: {
    label: "경조사비",
    emoji: "🎎",
    group: "consumption",
  },
  birthday: {
    label: "생일선물비",
    emoji: "🎁",
    group: "consumption",
  },
  clothes: {
    label: "의류구매비",
    emoji: "👕",
    group: "consumption",
  },
  groceries: {
    label: "식료품비",
    emoji: "🥦",
    group: "living",
  },
};

function ymToText(ym: string) {
  const [y, m] = ym.split("-");
  return `${y}년 ${Number(m)}월`;
}

/** 해당 연도의 "YYYY-MM" 리스트 (1~12월) */
function getYearMonths(year: number): string[] {
  const arr: string[] = [];
  for (let m = 1; m <= 12; m++) {
    const mm = `${m}`.padStart(2, "0");
    arr.push(`${year}-${mm}`);
  }
  return arr;
}

/**
 * 실제 연간 대시보드 로직 (클라이언트 컴포넌트)
 */
export default function YearlyDashboardClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialYear =
    Number(searchParams.get("year")) || new Date().getFullYear();
  const [currentYear, setCurrentYear] = useState<number>(initialYear);
  const [store, setStore] = useState<MonthlyStore>({});
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Supabase 로그인 + DB + localStorage 로딩
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (typeof window === "undefined") return;

      // 1) 로그인 확인
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (authError) {
        console.warn(
          "Supabase auth error in yearly dashboard:",
          authError.message
        );
      }

      // 2) 로그인 안 되어 있으면: localStorage 정리 + /sign-in으로 리다이렉트
      if (!user) {
        try {
          window.localStorage.removeItem(LS_KEY_MONTHLY);
        } catch {
          // ignore
        }

        setStore({});
        setCheckingAuth(false);

        router.replace(
          `/sign-in?redirect=/dashboard/yearly?year=${currentYear}`
        );
        return;
      }

      // 3) localStorage에서 기존 스토어 로딩 (캐시/폴백용)
      let lsStore: MonthlyStore = {};
      try {
        const raw = window.localStorage.getItem(LS_KEY_MONTHLY);
        if (raw) {
          lsStore = JSON.parse(raw) as MonthlyStore;
        }
      } catch {
        lsStore = {};
      }

      // 4) Supabase에서 해당 연도 월별 레시피 조회
      let dbStore: MonthlyStore = {};

      try {
        const { data: rows, error: dbError } = await supabase
          .from("monthly_recipes")
          .select(
            "year_month, net_income, rent, loan_payment, details, extra_items"
          )
          .eq("user_id", user.id)
          .gte("year_month", `${currentYear}-01`)
          .lte("year_month", `${currentYear}-12`);

        if (!mounted) return;

        if (dbError) {
          console.warn(
            "Supabase monthly_recipes 연간 조회 오류:",
            dbError.message
          );
        } else if (rows && rows.length > 0) {
          rows.forEach((row: any) => {
            const ym = row.year_month as string;
            dbStore[ym] = {
              netIncome: row.net_income ?? 0,
              rent: row.rent ?? 0,
              loanPayment: row.loan_payment ?? 0,
              details: (row.details ?? {}) as DetailMap,
              extraItems: (row.extra_items ?? []) as ExtraItem[],
            };
          });
        }
      } catch (err) {
        console.error("Supabase yearly monthly_recipes 처리 중 오류:", err);
      }

      // 5) DB 우선, 그 외 월은 localStorage 값 사용
      const combined: MonthlyStore = {
        ...lsStore,
        ...dbStore,
      };

      setStore(combined);
      setCheckingAuth(false);
    };

    init();

    return () => {
      mounted = false;
    };
  }, [currentYear, router]);

  const yearMonths = useMemo(() => getYearMonths(currentYear), [currentYear]);

  // 해당 연도에 대해 월별 데이터 추출
  const monthlyList = useMemo(() => {
    const list: { ym: string; data: MonthlySetup }[] = [];
    yearMonths.forEach((ym) => {
      const data = store[ym];
      if (data) list.push({ ym, data });
    });
    return list;
  }, [store, yearMonths]);

  // 연간 집계
  const yearlySummary = useMemo(() => {
    if (monthlyList.length === 0) return null;

    let totalNet = 0;
    let totalRent = 0;
    let totalLoan = 0;
    let totalDetails: Record<DetailKey, number> = {
      saving: 0,
      card: 0,
      transport: 0,
      mobile: 0,
      internet: 0,
      insurance: 0,
      events: 0,
      birthday: 0,
      clothes: 0,
      groceries: 0,
    };
    let totalExtra = 0;

    monthlyList.forEach(({ data }) => {
      totalNet += data.netIncome || 0;
      totalRent += data.rent || 0;
      totalLoan += data.loanPayment || 0;

      (Object.keys(totalDetails) as DetailKey[]).forEach((k) => {
        totalDetails[k] += data.details?.[k] || 0;
      });

      totalExtra += (data.extraItems || []).reduce(
        (sum, item) => sum + (item.amount || 0),
        0
      );
    });

    const monthsCount = monthlyList.length;

    const totalPlanned =
      totalRent +
      totalLoan +
      (Object.values(totalDetails).reduce((a, b) => a + b, 0) || 0) +
      totalExtra;

    const avgNet = monthsCount > 0 ? totalNet / monthsCount : 0;
    const avgPlanned = monthsCount > 0 ? totalPlanned / monthsCount : 0;

    const savingYear = totalDetails.saving || 0;
    const avgSaving = monthsCount > 0 ? savingYear / monthsCount : 0;

    const fixedRatio = totalNet > 0 ? (totalPlanned / totalNet) * 100 : 0;
    const savingRatio = totalNet > 0 ? (savingYear / totalNet) * 100 : 0;

    return {
      monthsCount,
      totalNet,
      totalRent,
      totalLoan,
      totalDetails,
      totalExtra,
      totalPlanned,
      avgNet,
      avgPlanned,
      savingYear,
      avgSaving,
      fixedRatio,
      savingRatio,
    };
  }, [monthlyList]);

  // 카테고리별 연간 테이블용
  const categoryRows = useMemo(() => {
    if (!yearlySummary) return [];

    const rows: {
      key: string;
      label: string;
      emoji: string;
      annual: number;
      monthly: number;
      ratio: number; // 연간 세후 소득 대비 비율
    }[] = [];

    const {
      totalNet,
      monthsCount,
      totalRent,
      totalLoan,
      totalDetails,
      totalExtra,
    } = yearlySummary;

    const pushRow = (
      key: string,
      label: string,
      emoji: string,
      annualAmount: number
    ) => {
      const monthly = monthsCount > 0 ? annualAmount / monthsCount : 0;
      const ratio = totalNet > 0 ? (annualAmount / totalNet) * 100 : 0;
      rows.push({
        key,
        label,
        emoji,
        annual: annualAmount,
        monthly,
        ratio,
      });
    };

    // 월세 + 관리비
    pushRow("rent", "월세 + 관리비", "🏠", totalRent);
    // 대출 상환
    pushRow("loan", "대출 상환액", "💸", totalLoan);

    // 상세 항목
    (Object.keys(totalDetails) as DetailKey[]).forEach((k) => {
      const meta = DETAIL_LABELS[k];
      pushRow(k, meta.label, meta.emoji, totalDetails[k]);
    });

    // 추가 항목 전체
    pushRow("extra", "추가 지출 항목 합계", "🍽", totalExtra);

    return rows;
  }, [yearlySummary]);

  const handleChangeYear = (delta: number) => {
    const nextYear = currentYear + delta;
    setCurrentYear(nextYear);
    // URL 쿼리도 같이 변경 (뒤로가기 시 일관성 유지용)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("year", String(nextYear));
      router.push(`/dashboard/yearly?${params.toString()}`);
    } else {
      router.push(`/dashboard/yearly?year=${nextYear}`);
    }
  };

  const handleGoSetup = () => {
    router.push("/setup");
  };

  // 인증/로딩 중
  if (checkingAuth) {
    return (
      <PageContainer title="연간 지출 레시피 대시보드">
        <div className="pointer-events-none fixed inset-0 -z-10 landing-surface" />
        <div className="pointer-events-none fixed left-[-80px] top-[40%] -z-10 h-52 w-52 rounded-full bg-[rgba(255,184,108,0.25)] blur-3xl" />
        <div className="pointer-events-none fixed right-[-60px] bottom-[8%] -z-10 h-52 w-52 rounded-full bg-[rgba(255,193,130,0.22)] blur-3xl" />

        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-xs text-slate-500">
            {currentYear}년 연간 레시피를 불러오고 있어요...
          </p>
        </div>
      </PageContainer>
    );
  }

  if (!yearlySummary) {
    // 해당 연도에 저장된 레시피가 하나도 없을 때
    return (
      <PageContainer title="연간 지출 레시피 대시보드">
        {/* 배경 */}
        <div className="pointer-events-none fixed inset-0 -z-10 landing-surface" />
        <div className="pointer-events-none fixed left-[-80px] top-[40%] -z-10 h-52 w-52 rounded-full bg-[rgba(255,184,108,0.25)] blur-3xl" />
        <div className="pointer-events-none fixed right-[-60px] bottom-[8%] -z-10 h-52 w-52 rounded-full bg-[rgba(255,193,130,0.22)] blur-3xl" />

        <div className="mx-auto max-w-xl rounded-2xl bg-white/95 p-6 text-center shadow-sm shadow-blue-50">
          {/* 연도 네비 */}
          <div className="mb-3 flex items-center justify-center gap-3 text-[12px] font-semibold text-slate-900">
            <button
              type="button"
              onClick={() => handleChangeYear(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50"
            >
              ←
            </button>
            <span>{currentYear}년 연간 레시피</span>
            <button
              type="button"
              onClick={() => handleChangeYear(1)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50"
            >
              →
            </button>
          </div>

          <h2 className="mb-2 text-base font-semibold text-slate-900">
            {currentYear}년에는 저장된 월별 레시피가 아직 없어요
          </h2>
          <p className="mb-4 text-[12px] text-slate-600">
            먼저 기본 레시피에서 월별 예산을 몇 개만이라도 입력해 두면,
            <br />
            이 화면에서 연간 합계와 평균, 적금 비율 등을 한 번에 볼 수 있습니다.
          </p>
          <button
            type="button"
            onClick={handleGoSetup}
            className="inline-flex items-center justify-center rounded-xl bg-[color:var(--brand-blue)] px-4 py-2.5 text-[12px] font-semibold text-slate-900 shadow-md shadow-orange-100 hover:bg-[#348f6c] transition"
            style={{ ["--brand-blue" as any]: BRAND_blue }}
          >
            🍽 기본 레시피 입력하러 가기
          </button>
        </div>
      </PageContainer>
    );
  }

  const {
    monthsCount,
    totalNet,
    totalPlanned,
    avgNet,
    avgPlanned,
    savingYear,
    avgSaving,
    fixedRatio,
    savingRatio,
  } = yearlySummary;

  return (
    <PageContainer title="연간 지출 레시피 대시보드">
      {/* 배경 */}
      <div className="pointer-events-none fixed inset-0 -z-10 landing-surface" />
      <div className="pointer-events-none fixed left-[-80px] top-[40%] -z-10 h-52 w-52 rounded-full bg-[rgba(255,184,108,0.25)] blur-3xl" />
      <div className="pointer-events-none fixed right-[-60px] bottom-[8%] -z-10 h-52 w-52 rounded-full bg-[rgba(255,193,130,0.22)] blur-3xl" />

      {/* 헤더 */}
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
              style={{ backgroundColor: BRAND_blue }}
            />
            <span>{currentYear}년 · 1년치 지출 레시피 분석</span>
          </div>
          <h2 className="mt-2 text-xl font-semibold text-slate-900 md:text-2xl">
            {currentYear}년{" "}
            <span
              className="text-[color:var(--brand-blue)]"
              style={{ ["--brand-blue" as any]: BRAND_blue }}
            >
              연간 예산 레시피
            </span>{" "}
            요약
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            월별 기본 레시피에 입력한 값들을 모아, 한 해 전체의 지출 구조를
            <br className="hidden md:block" />
            합계·평균·비율로 정리해서 보여줍니다.
          </p>
        </div>

        {/* 우측: 연도 네비 + 안내 */}
        <div className="flex flex-col items-end gap-2 text-[11px] text-slate-500">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-2 py-1 shadow-sm">
            <button
              type="button"
              onClick={() => handleChangeYear(-1)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-slate-600 hover:bg-slate-50"
            >
              ←
            </button>
            <span className="px-1 text-xs font-semibold text-slate-800">
              {currentYear}년
            </span>
            <button
              type="button"
              onClick={() => handleChangeYear(1)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-slate-600 hover:bg-slate-50"
            >
              →
            </button>
          </div>
          <span>
            이 연도에 기본 레시피가 있는 월:{" "}
            <strong className="text-slate-800">{monthsCount}개</strong>
          </span>
        </div>
      </motion.section>

      {/* 상단 요약 카드 (연간/월평균/비율) */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mb-4 grid gap-4 md:grid-cols-3"
      >
        {/* 연간 세후 소득 합계 & 평균 */}
        <div className="rounded-2xl bg-white/95 p-4 shadow-sm shadow-blue-50">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              연간 세후 소득 합계
            </span>
            <span className="text-[11px] text-slate-400">Total Income</span>
          </div>
          <p className="text-lg font-bold text-slate-900">
            {totalNet.toLocaleString()}원
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            월별 세후 월급을 합산한 값입니다. 기준 월 수: {monthsCount}개월
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            월 평균 세후 소득:{" "}
            <span className="font-semibold text-slate-800">
              {avgNet.toFixed(0).toLocaleString()}원
            </span>
          </p>
        </div>

        {/* 연간 계획 지출 합계 & 평균 */}
        <div className="rounded-2xl bg-white/95 p-4 shadow-sm shadow-blue-50">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              연간 계획 지출 합계
            </span>
            <span className="text-[11px] text-slate-400">
              Total Planned Outflow
            </span>
          </div>
          <p className="text-lg font-bold text-slate-900">
            {totalPlanned.toLocaleString()}원
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            월세·대출·각 항목·추가 지출까지 모두 더한 연간 기준입니다.
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            월 평균 계획 지출:{" "}
            <span className="font-semibold text-slate-800">
              {avgPlanned.toFixed(0).toLocaleString()}원
            </span>
          </p>
        </div>

        {/* 연간 저축(적금) & 비율 */}
        <div className="rounded-2xl bg-white/95 p-4 shadow-sm shadow-blue-50">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              연간 적금(저축) 합계
            </span>
            <span className="text-[11px] text-slate-400">
              Saving · Saving Ratio
            </span>
          </div>
          <p
            className="text-lg font-bold text-[color:var(--brand-green)]"
            style={{ ["--brand-green" as any]: BRAND_GREEN }}
          >
            {savingYear.toLocaleString()}원
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            월 평균 적금:{" "}
            <span className="font-semibold text-slate-800">
              {avgSaving.toFixed(0).toLocaleString()}원
            </span>
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            연간 세후 소득 대비 저축 비율:{" "}
            <span className="font-semibold text-slate-800">
              {savingRatio.toFixed(1)}%
            </span>
          </p>
        </div>
      </motion.section>

      {/* 중단: 연간 지출 비율 요약 */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="mb-4 rounded-2xl bg-white/95 p-4 shadow-sm shadow-blue-50"
      >
        <h3 className="mb-2 text-[12px] font-semibold text-slate-900">
          연간 지출 비율 한 눈에 보기
        </h3>
        <p className="mb-3 text-[11px] text-slate-600">
          연간 계획 지출이 연간 세후 소득의{" "}
          <span className="font-semibold text-slate-800">
            {fixedRatio.toFixed(1)}%
          </span>
          를 차지하고 있고, 이 중 적금(저축)은{" "}
          <span className="font-semibold text-slate-800">
            {savingRatio.toFixed(1)}%
          </span>
          입니다.
        </p>

        {/* 간단한 막대 그래프 느낌의 바 */}
        <div className="space-y-2 text-[11px]">
          <div className="flex items-center justify-between text-slate-700">
            <span>지출 비율 (세후 소득 대비)</span>
            <span>{fixedRatio.toFixed(1)}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-[color:var(--brand-blue)]"
              style={{
                ["--brand-blue" as any]: BRAND_blue,
                width: `${Math.min(fixedRatio, 100)}%`,
              }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-slate-700">
            <span>저축(적금) 비율 (세후 소득 대비)</span>
            <span>{savingRatio.toFixed(1)}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-[color:var(--brand-green)]"
              style={{
                ["--brand-green" as any]: BRAND_GREEN,
                width: `${Math.min(savingRatio, 100)}%`,
              }}
            />
          </div>
        </div>
      </motion.section>

      {/* 하단: 카테고리별 연간 테이블 + 해석 */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]"
      >
        {/* 카테고리 테이블 */}
        <div className="rounded-2xl bg-white/95 p-4 shadow-sm shadow-blue-50">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[12px] font-semibold text-slate-900">
              카테고리별 연간 지출 레시피
            </h3>
            <span className="text-[11px] text-slate-500">
              연간 금액 / 월 평균 / 세후 소득 대비 비율
            </span>
          </div>

          <div className="max-h-[420px] space-y-1 overflow-auto pr-1 text-xs">
            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_60px] gap-2 rounded-lg bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-600">
              <div>항목</div>
              <div className="text-right">연간 금액</div>
              <div className="text-right">월 평균</div>
              <div className="text-right">비율</div>
            </div>

            {categoryRows.map((row) => (
              <div
                key={row.key}
                className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_60px] items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <span>{row.emoji}</span>
                  <span className="text-slate-800">{row.label}</span>
                </div>
                <div className="text-right text-slate-800">
                  {row.annual.toLocaleString()}원
                </div>
                <div className="text-right text-slate-800">
                  {row.monthly.toFixed(0).toLocaleString()}원
                </div>
                <div className="text-right text-slate-500">
                  {row.ratio.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 해석/코멘트 카드 */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white/95 p-4 shadow-sm shadow-blue-50">
            <h3 className="mb-2 text-[12px] font-semibold text-slate-900">
              {currentYear}년 레시피 한 줄 정리
            </h3>
            <ul className="space-y-1.5 text-[11px] leading-relaxed text-slate-700">
              <li>
                • 연간 기준으로 볼 때, 전체 지출이 세후 소득의{" "}
                <span className="font-semibold">
                  {fixedRatio.toFixed(1)}%
                </span>
                를 차지하고 있습니다.
              </li>
              <li>
                • 한 달 평균으로는{" "}
                <span className="font-semibold">
                  {avgNet.toFixed(0).toLocaleString()}원
                </span>{" "}
                벌어서{" "}
                <span className="font-semibold">
                  {avgPlanned.toFixed(0).toLocaleString()}원
                </span>{" "}
                쓰는 구조입니다.
              </li>
              <li>
                • 적금(저축) 항목은 연간{" "}
                <span className="font-semibold">
                  {savingYear.toLocaleString()}원
                </span>
                으로, 세후 소득 대비{" "}
                <span className="font-semibold">
                  {savingRatio.toFixed(1)}%
                </span>
                입니다.
              </li>
              <li>
                • 월세·대출·통신·식비 같은{" "}
                <span className="font-semibold">반복 지출</span>이
                <br />
                전체 지출에서 어느 정도 비중을 차지하는지 확인해 보세요.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl bg-gradient-to-r from-[#FFF7EB] to-[#FFF4E5] p-4 text-[11px] leading-relaxed text-slate-700 shadow-sm shadow-blue-50">
            <p className="mb-2">
              👨‍🍳 <strong>TIP.</strong> 연간 레벨에서 보면 월별로 조금씩 조정한
              결과가 얼마나 누적되는지 보입니다.
              <br />
              예를 들어, 식비를 매달 5만 원씩만 줄여도 1년이면 60만 원의 여유
              자금이 생깁니다.
            </p>
            <p className="text-[10px] text-slate-500">
              이후에는 실제 카드·가계부 데이터를 연동해서, 계획 vs 실제를
              비교하는 연간 통계 페이지로 확장할 수 있습니다.
            </p>
          </div>
        </div>
      </motion.section>
    </PageContainer>
  );
}

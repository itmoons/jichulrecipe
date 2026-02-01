// src/app/dashboard/page.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PageContainer } from "@/components/layout/PageContainer";
import { supabase } from "@/lib/supabaseClient";

const BRAND_ORANGE = "#FF8A3D";
const BRAND_GREEN = "#22C55E";

/** ✅ edit 페이지와 맞추는 타입 (category/subcategory 추가) */
type MoneyItem = {
  id: string;
  label: string; // 메모(선택)
  amount: number;
  category?: string; // 구분(대분류)
  subcategory?: string; // 세부(소분류)

  // 정기 메타(있어도 대시보드에서는 그냥 참고용)
  source?: "recurring" | "manual";
  rule_id?: number;
};

type DailyRecipeNew = {
  incomeItems?: MoneyItem[];
  expenseItems?: MoneyItem[];
  savingItems?: MoneyItem[];
  incomeTotal?: number;
  expenseTotal?: number;
  savingTotal?: number;
  createdAt?: string;
  updatedAt?: string;
};

type DailyRecipeLegacy = {
  incomeAmount?: number;
  incomeMemo?: string;
  expenseAmount?: number;
  expenseMemo?: string;
  savingAmount?: number;
  savingMemo?: string;
  createdAt?: string;
  updatedAt?: string;
};

type DailyStore = {
  [date: string]: DailyRecipeNew | DailyRecipeLegacy | any;
};

type NormalizedDaily = {
  date: string; // YYYY-MM-DD
  incomeItems: MoneyItem[];
  expenseItems: MoneyItem[];
  savingItems: MoneyItem[];
  incomeTotal: number;
  expenseTotal: number;
  savingTotal: number;
  createdAt?: string;
  updatedAt?: string;
};

type MonthStats = {
  days: NormalizedDaily[];
  totalIncome: number;
  totalExpense: number;
  totalSaving: number;
  daysWithExpense: number;
  daysWithSaving: number;
  firstDate?: string;
  lastDate?: string;
  maxExpenseDay?: { date: string; amount: number };
  avgExpensePerSpendingDay: number;
  avgSavingPerSavingDay: number;
};

type HealthLevel = "no-data" | "no-income" | "excellent" | "moderate" | "warning";

function getYearMonth(date = new Date()) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`;
}

function ymToText(ym: string) {
  const [y, m] = ym.split("-");
  return `${y}년 ${Number(m)}월`;
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-");
  const year = Number(y);
  const monthIdx = Number(m) - 1;
  const d = new Date(year, monthIdx + delta, 1);
  const yy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${yy}-${mm}`;
}

function getMonthRangeKeys(ym: string) {
  const [y, m] = ym.split("-");
  const year = Number(y);
  const monthIdx = Number(m) - 1;
  const first = new Date(year, monthIdx, 1);
  const last = new Date(year, monthIdx + 1, 0);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(
      2,
      "0"
    )}`;

  return {
    firstKey: fmt(first),
    lastKey: fmt(last),
  };
}

/** ✅ KST 기준 오늘(YYYY-MM-DD) */
function getTodayKeyKST() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC+9
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function compareDateKey(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** 하루 데이터 정규화 */
function normalizeDaily(date: string, entry: any): NormalizedDaily | null {
  if (!entry) return null;

  // 새 구조 (camelCase)
  if (entry.incomeItems || entry.expenseItems || entry.savingItems) {
    const incomeItems: MoneyItem[] = (entry.incomeItems ?? []).map((i: any) => ({
      id: i.id ?? `inc-${date}-${Math.random().toString(36).slice(2, 7)}`,
      label: (i.label ?? "").toString(),
      amount: Number(i.amount ?? 0),
      category: (i.category ?? "").toString(),
      subcategory: (i.subcategory ?? "").toString(),
      source: i.source,
      rule_id: i.rule_id,
    }));
    const expenseItems: MoneyItem[] = (entry.expenseItems ?? []).map((i: any) => ({
      id: i.id ?? `exp-${date}-${Math.random().toString(36).slice(2, 7)}`,
      label: (i.label ?? "").toString(),
      amount: Number(i.amount ?? 0),
      category: (i.category ?? "").toString(),
      subcategory: (i.subcategory ?? "").toString(),
      source: i.source,
      rule_id: i.rule_id,
    }));
    const savingItems: MoneyItem[] = (entry.savingItems ?? []).map((i: any) => ({
      id: i.id ?? `sav-${date}-${Math.random().toString(36).slice(2, 7)}`,
      label: (i.label ?? "").toString(),
      amount: Number(i.amount ?? 0),
      category: (i.category ?? "").toString(),
      subcategory: (i.subcategory ?? "").toString(),
      source: i.source,
      rule_id: i.rule_id,
    }));

    const incomeTotal =
      typeof entry.incomeTotal === "number" ? entry.incomeTotal : incomeItems.reduce((s, i) => s + (i.amount || 0), 0);
    const expenseTotal =
      typeof entry.expenseTotal === "number"
        ? entry.expenseTotal
        : expenseItems.reduce((s, i) => s + (i.amount || 0), 0);
    const savingTotal =
      typeof entry.savingTotal === "number" ? entry.savingTotal : savingItems.reduce((s, i) => s + (i.amount || 0), 0);

    if (!incomeTotal && !expenseTotal && !savingTotal) return null;

    return {
      date,
      incomeItems,
      expenseItems,
      savingItems,
      incomeTotal,
      expenseTotal,
      savingTotal,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  // 구 구조 → 단일 항목으로 변환
  const legacy = entry as DailyRecipeLegacy;
  const incomeItem: MoneyItem[] =
    legacy.incomeAmount || legacy.incomeMemo
      ? [
          {
            id: `legacy-inc-${date}`,
            label: legacy.incomeMemo ?? "",
            amount: Number(legacy.incomeAmount ?? 0),
            category: "",
            subcategory: "",
          },
        ]
      : [];
  const expenseItem: MoneyItem[] =
    legacy.expenseAmount || legacy.expenseMemo
      ? [
          {
            id: `legacy-exp-${date}`,
            label: legacy.expenseMemo ?? "",
            amount: Number(legacy.expenseAmount ?? 0),
            category: "",
            subcategory: "",
          },
        ]
      : [];
  const savingItem: MoneyItem[] =
    legacy.savingAmount || legacy.savingMemo
      ? [
          {
            id: `legacy-sav-${date}`,
            label: legacy.savingMemo ?? "",
            amount: Number(legacy.savingAmount ?? 0),
            category: "",
            subcategory: "",
          },
        ]
      : [];

  const incomeTotal = incomeItem.reduce((s, i) => s + (i.amount || 0), 0);
  const expenseTotal = expenseItem.reduce((s, i) => s + (i.amount || 0), 0);
  const savingTotal = savingItem.reduce((s, i) => s + (i.amount || 0), 0);

  if (!incomeTotal && !expenseTotal && !savingTotal) return null;

  return {
    date,
    incomeItems: incomeItem,
    expenseItems: expenseItem,
    savingItems: savingItem,
    incomeTotal,
    expenseTotal,
    savingTotal,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
  };
}

function buildMonthStats(store: DailyStore, ym: string): MonthStats | null {
  const entries = Object.entries(store).filter(([date]) => date.startsWith(ym));
  if (entries.length === 0) return null;

  const normalized: NormalizedDaily[] = [];
  for (const [date, entry] of entries) {
    const n = normalizeDaily(date, entry);
    if (n) normalized.push(n);
  }
  if (normalized.length === 0) return null;

  normalized.sort((a, b) => compareDateKey(a.date, b.date));

  let totalIncome = 0;
  let totalExpense = 0;
  let totalSaving = 0;
  let daysWithExpense = 0;
  let daysWithSaving = 0;
  let maxExpenseDay: { date: string; amount: number } | undefined;

  for (const d of normalized) {
    totalIncome += d.incomeTotal;
    totalExpense += d.expenseTotal;
    totalSaving += d.savingTotal;

    if (d.expenseTotal > 0) {
      daysWithExpense += 1;
      if (!maxExpenseDay || d.expenseTotal > maxExpenseDay.amount) {
        maxExpenseDay = { date: d.date, amount: d.expenseTotal };
      }
    }
    if (d.savingTotal > 0) {
      daysWithSaving += 1;
    }
  }

  const avgExpensePerSpendingDay = daysWithExpense > 0 ? Math.round(totalExpense / daysWithExpense) : 0;
  const avgSavingPerSavingDay = daysWithSaving > 0 ? Math.round(totalSaving / daysWithSaving) : 0;

  const firstDate = normalized[0]?.date;
  const lastDate = normalized[normalized.length - 1]?.date;

  return {
    days: normalized,
    totalIncome,
    totalExpense,
    totalSaving,
    daysWithExpense,
    daysWithSaving,
    firstDate,
    lastDate,
    maxExpenseDay,
    avgExpensePerSpendingDay,
    avgSavingPerSavingDay,
  };
}

function getHealthStatus(stats: MonthStats | null): {
  level: HealthLevel;
  title: string;
  emoji: string;
  subtitle: string;
} {
  if (!stats) {
    return {
      level: "no-data",
      title: "이번 달 데이터 없음",
      emoji: "📄",
      subtitle: "달력에서 하루 레시피를 몇 일만 적어도 패턴이 보이기 시작합니다.",
    };
  }

  const { totalIncome, totalExpense, totalSaving } = stats;

  if (!totalIncome && !totalExpense && !totalSaving) {
    return {
      level: "no-data",
      title: "기록이 아직 적어요",
      emoji: "🌱",
      subtitle: "3~5일 정도만 꾸준히 기록해 보면 숫자가 말해주기 시작해요.",
    };
  }

  if (!totalIncome) {
    return {
      level: "no-income",
      title: "수입 미입력 상태",
      emoji: "⚪",
      subtitle:
        "소득을 입력하지 않은 상태라 ‘건강도’ 평가는 생략하고, 단순 지출·저축 흐름만 보여줍니다.",
    };
  }

  const expenseRatio = totalExpense / totalIncome;
  const savingRatio = totalSaving / totalIncome;

  if (expenseRatio < 0.4 && savingRatio >= 0.2) {
    return {
      level: "excellent",
      title: "아주 건강한 소비",
      emoji: "🟢",
      subtitle: "지출이 낮고 저축 비중이 충분합니다. 현재 패턴을 유지해도 좋겠습니다.",
    };
  } else if (expenseRatio <= 0.7) {
    return {
      level: "moderate",
      title: "무난한 소비 패턴",
      emoji: "🟡",
      subtitle: "대체로 안정적입니다. 다만 특정 카테고리가 유난히 크다면, 한 번 조정해 볼 만합니다.",
    };
  } else {
    return {
      level: "warning",
      title: "주의가 필요한 소비",
      emoji: "🟠",
      subtitle: "소득 대비 지출 비중이 높은 편입니다. 다음 달에는 1~2개 항목만 줄이는 실험을 해보세요.",
    };
  }
}

function formatKoreanDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}

/** ✅ 구분(category) 기준 Top-N */
function getTopExpenseItemsByCategory(stats: MonthStats | null, topN = 6) {
  if (!stats) return [];
  const map = new Map<string, number>();

  for (const day of stats.days) {
    for (const item of day.expenseItems) {
      const key = (item.category || "").trim() || "미분류";
      map.set(key, (map.get(key) ?? 0) + (item.amount || 0));
    }
  }

  const entries = Array.from(map.entries())
    .map(([label, amount]) => ({ label, amount }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const top = entries.slice(0, topN);
  const others = entries.slice(topN);
  const othersSum = others.reduce((s, r) => s + r.amount, 0);
  if (othersSum > 0) {
    top.push({ label: "기타", amount: othersSum });
  }

  return top;
}

function getDailySeries(stats: MonthStats | null) {
  if (!stats) return [];
  const sorted = [...stats.days].sort((a, b) => compareDateKey(a.date, b.date));
  return sorted.map((d) => ({
    date: d.date,
    expense: d.expenseTotal,
    income: d.incomeTotal,
    saving: d.savingTotal,
  }));
}

function safeNum(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/* ========================
 *  메인 대시보드
 * ======================== */

function DashboardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const monthParam = searchParams.get("month") || getYearMonth();

  const [dailyStore, setDailyStore] = useState<DailyStore>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchMonth = async () => {
      setLoading(true);
      setLoadError(null);
      setDailyStore({});

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (authError) {
          console.warn("Supabase auth error (dashboard):", authError.message);
          setLoadError("로그인 정보를 불러오지 못했어요.");
          setLoading(false);
          return;
        }

        if (!user) {
          setDailyStore({});
          setLoading(false);
          return;
        }

        const { firstKey, lastKey } = getMonthRangeKeys(monthParam);

        /** ✅ 오늘 포함, 오늘 이후 미래는 제외 */
        const todayKey = getTodayKeyKST();
        const cutoffKey = todayKey < lastKey ? todayKey : lastKey;

        const { data, error } = await supabase
          .from("daily_recipes")
          .select(
            `
            date,
            income_items,
            expense_items,
            saving_items,
            income_total,
            expense_total,
            saving_total,
            created_at,
            updated_at
          `
          )
          .eq("user_id", user.id)
          .gte("date", firstKey)
          .lte("date", cutoffKey);

        if (!mounted) return;

        if (error) {
          console.error("daily_recipes 조회 실패 (dashboard):", error.message);
          setLoadError("이 달의 레시피를 불러오는 중 문제가 발생했어요.");
          setDailyStore({});
          setLoading(false);
          return;
        }

        const mapRowItems = (arr: any[] | null): MoneyItem[] =>
          (arr ?? []).map((i) => ({
            id: i?.id ?? crypto.randomUUID(),
            label: (i?.label ?? "").toString(),
            amount: safeNum(i?.amount),
            category: (i?.category ?? "").toString(),
            subcategory: (i?.subcategory ?? "").toString(),
            source: i?.source,
            rule_id: i?.rule_id,
          }));

        const store: DailyStore = {};
        (data || []).forEach((row: any) => {
          const dateKey = row.date as string;

          // ✅ 안전장치: 혹시라도 섞이면 미래 날짜 제외
          if (dateKey > todayKey) return;

          store[dateKey] = {
            incomeItems: mapRowItems(row.income_items),
            expenseItems: mapRowItems(row.expense_items),
            savingItems: mapRowItems(row.saving_items),
            incomeTotal: typeof row.income_total === "number" ? row.income_total : undefined,
            expenseTotal: typeof row.expense_total === "number" ? row.expense_total : undefined,
            savingTotal: typeof row.saving_total === "number" ? row.saving_total : undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          } satisfies DailyRecipeNew;
        });

        setDailyStore(store);
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        console.error("dashboard daily_recipes 로딩 중 오류:", err);
        setLoadError("이 달의 레시피를 불러오는 중 오류가 발생했어요.");
        setDailyStore({});
        setLoading(false);
      }
    };

    fetchMonth();
    return () => {
      mounted = false;
    };
  }, [monthParam]);

  const stats = useMemo(() => buildMonthStats(dailyStore, monthParam), [dailyStore, monthParam]);
  const health = useMemo(() => getHealthStatus(stats), [stats]);
  const dailySeries = useMemo(() => getDailySeries(stats), [stats]);

  /** ✅ 지출 Top-N은 구분(category) 기준 */
  const topExpenseItems = useMemo(() => getTopExpenseItemsByCategory(stats), [stats]);

  const totalIncome = stats?.totalIncome ?? 0;
  const totalExpense = stats?.totalExpense ?? 0;
  const totalSaving = stats?.totalSaving ?? 0;
  const baseIncome = totalIncome > 0 ? totalIncome : undefined;

  const expenseRatio = baseIncome && totalExpense > 0 ? (totalExpense / baseIncome) * 100 : 0;
  const savingRatio = baseIncome && totalSaving > 0 ? (totalSaving / baseIncome) * 100 : 0;

  const handleMoveMonth = (delta: number) => {
    const next = shiftMonth(monthParam, delta);
    router.push(`/dashboard?month=${next}`);
  };

  if (loading) {
    return (
      <PageContainer title="">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#FFF7EB] via-[#FFFDFC] to-[#F3F4FF]" />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-xs text-slate-500">달력에서 기록한 하루 레시피를 불러오고 있어요...</p>
        </div>
      </PageContainer>
    );
  }

  if (!stats) {
    return (
      <PageContainer title="">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#FFF7EB] via-[#FFFDFC] to-[#F3F4FF]" />
        <main className="min-h-[70vh] flex items-center justify-center px-4">
          <div className="w-full max-w-xl rounded-3xl bg-white/95 border border-amber-100 px-5 py-6 shadow-lg shadow-amber-100/70">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">📅</span>
                <span className="text-xs font-medium text-slate-700">{ymToText(monthParam)} 레시피 없음</span>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] text-amber-700 border border-amber-100">
                <button
                  type="button"
                  onClick={() => handleMoveMonth(-1)}
                  className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-amber-100"
                >
                  ←
                </button>
                <span>{ymToText(monthParam)}</span>
                <button
                  type="button"
                  onClick={() => handleMoveMonth(1)}
                  className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-amber-100"
                >
                  →
                </button>
              </div>
            </div>

            {loadError && <p className="mb-2 text-[11px] text-red-500">{loadError}</p>}

            <h2 className="mb-2 text-sm font-semibold text-slate-900">{ymToText(monthParam)} 하루 지출 레시피부터 적어볼까요?</h2>
            <p className="mb-4 text-[11px] text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-900">레시피 달력</span>에서 날짜별로 수입·지출·저축을 입력하면,
              <br />
              이 화면에서 한 달 전체가 <span className="font-semibold text-amber-700">분석 리포트</span>로 정리됩니다.
            </p>

            <button
              type="button"
              onClick={() => router.push(`/dashboard/calendar?month=${monthParam}`)}
              className="inline-flex items-center justify-center rounded-xl bg-[color:var(--brand-orange)] px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-200 hover:bg-[#f97316] transition"
              style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
            >
              🍳 {ymToText(monthParam)} 달력 레시피 쓰러 가기
            </button>
          </div>
        </main>
      </PageContainer>
    );
  }

  const summaryChips = [
    {
      label: "이번 달 수입 합계",
      value: `${totalIncome.toLocaleString()}원`,
      sub:
        baseIncome && (totalIncome > 0 || totalExpense > 0 || totalSaving > 0)
          ? `지출 ${expenseRatio.toFixed(1)}% · 저축 ${savingRatio.toFixed(1)}%`
          : "소득 미입력 시 단순 지출 통계만 표시됩니다.",
    },
    {
      label: "지출 + 저축",
      value: `${(totalExpense + totalSaving).toLocaleString()}원`,
      sub: `지출 ${totalExpense.toLocaleString()}원 · 저축 ${totalSaving.toLocaleString()}원`,
    },
    {
      label: "기록일 수",
      value: `${stats.days.length}일`,
      sub: `지출일 ${stats.daysWithExpense}일 · 저축일 ${stats.daysWithSaving}일`,
    },
  ];

  const topCat = topExpenseItems[0];

  return (
    <PageContainer title="">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#FFF7EB] via-[#FFFDFC] to-[#F3F4FF]" />

      <main className=" min-h-screen pb-7 pt-3 ">
        {/* 상단 헤더 */}
        <section className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1 rounded-full bg-white/80 border border-amber-100 px-2 py-1 text-[10px] text-amber-700 shadow-sm">
              <span>🍲</span>
              <span>{ymToText(monthParam)} 지출 레시피</span>
            </div>
            <h1 className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl">이번 달 소비 분석 대시보드</h1>
            <p className="mt-0.5 text-[11px] text-slate-600">달력에 기록한 하루 레시피를 모아서, 한 달 전체의 흐름을 한 번에 확인합니다.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1 rounded-full bg-white/90 border border-slate-200 px-2 py-1 text-[10px] text-slate-700 shadow-sm">
              <button
                type="button"
                onClick={() => handleMoveMonth(-1)}
                className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-slate-100"
              >
                ←
              </button>
              <span>{ymToText(monthParam)}</span>
              <button
                type="button"
                onClick={() => handleMoveMonth(1)}
                className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-slate-100"
              >
                →
              </button>
            </div>

            <button
              type="button"
              onClick={() => router.push(`/dashboard/calendar?month=${monthParam}`)}
              className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white shadow hover:bg-slate-800"
            >
              ✏️ 달력 레시피 수정
            </button>
          </div>
        </section>

        {/* 요약칩 */}
        <section className="mb-4 grid gap-3 md:grid-cols-3">
          {summaryChips.map((chip) => (
            <div
              key={chip.label}
              className="rounded-2xl border border-amber-100 bg-white/95 px-3.5 py-3 shadow-sm shadow-amber-100/60 flex flex-col justify-between"
            >
              <span className="text-[11px] text-slate-500">{chip.label}</span>
              <span className="mt-1 text-base font-semibold text-slate-900">{chip.value}</span>
              <span className="mt-1 text-[10px] text-slate-500">{chip.sub}</span>
            </div>
          ))}
        </section>

        {/* 메인 2컬럼 */}
        <section className="grid gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
          {/* 좌측: 파이 + 카테고리 */}
          <div className="flex flex-col gap-3 rounded-3xl bg-white/95 border border-amber-100 p-3.5 shadow-sm shadow-amber-100/70">
            {/* 건강도 + 요약 */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] text-amber-800 border border-amber-100 mb-1">
                  <span>{health.emoji}</span>
                  <span>{health.title}</span>
                </div>
                <p className="text-[11px] text-slate-600 max-w-[230px]">{health.subtitle}</p>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <p className="whitespace-nowrap">
                  지출 합계 <span className="font-semibold text-slate-900">{totalExpense.toLocaleString()}원</span>
                </p>
                <p className="mt-0.5 whitespace-nowrap">
                  저축 합계{" "}
                  <span className="font-semibold" style={{ color: BRAND_GREEN }}>
                    {totalSaving.toLocaleString()}원
                  </span>
                </p>
                {baseIncome && <p className="mt-0.5 text-[10px] text-slate-500 whitespace-nowrap">기준 소득 {baseIncome.toLocaleString()}원</p>}
              </div>
            </div>

            {/* 파이 차트(구분 기준) */}
            <PieChartCard items={topExpenseItems} total={totalExpense} />

            {/* 카테고리 리스트 */}
            <div className="mt-2 rounded-2xl bg-amber-50/40 border border-amber-100 px-3 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-slate-700">지출 구분 요약</span>
                <span className="text-[10px] text-slate-500">{topExpenseItems.length}개 항목</span>
              </div>

              <div className="space-y-1.5 text-[11px] max-h-52 overflow-auto pr-1">
                {topExpenseItems.length === 0 && (
                  <p className="text-slate-500">달력에서 지출 “구분”을 선택해 두면, 여기서 구분별 비율을 볼 수 있습니다.</p>
                )}

                {topExpenseItems.map((item, idx) => {
                  const ratio = totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0;
                  const chipColors = ["bg-orange-500", "bg-amber-400", "bg-lime-400", "bg-emerald-400", "bg-sky-400", "bg-fuchsia-400", "bg-slate-400"];
                  const chipColor = chipColors[idx % chipColors.length] ?? "bg-slate-400";

                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-2 rounded-xl bg-white/80 px-2 py-1 hover:bg-amber-50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`h-4 w-4 flex items-center justify-center rounded-full text-[10px] text-white font-semibold ${chipColor}`}>
                          {idx + 1}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-slate-900 truncate">{item.label}</span>
                          <span className="text-[10px] text-slate-500">{item.amount.toLocaleString()}원</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-600">{ratio.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 우측: 그래프 + 테이블 + 분석 */}
          <div className="flex flex-col gap-4">
            {/* ✅ 지출 전체 “선 그래프” */}
            <div className="rounded-3xl bg-white/95 border border-slate-200 p-3.5 shadow-sm shadow-slate-100">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">지출 전체 추이</span>
                <span className="text-[10px] text-slate-500">일자별 지출 합계 (원)</span>
              </div>

              <LineChartCard series={dailySeries.map((d) => ({ xLabel: formatKoreanDate(d.date), date: d.date, y: d.expense }))} />

              <div className="mt-2 text-[10px] text-slate-600">
                {stats.maxExpenseDay ? (
                  <>
                    가장 많이 쓴 날은 <span className="font-semibold">{formatKoreanDate(stats.maxExpenseDay.date)}</span>로,{" "}
                    <span className="font-semibold text-orange-600">{stats.maxExpenseDay.amount.toLocaleString()}원</span>을 사용했습니다.
                  </>
                ) : (
                  <>아직 지출이 큰 날은 없습니다.</>
                )}
              </div>
            </div>

            {/* 하단: 테이블 + 분석 카드 */}
            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              {/* 일자별 요약 테이블 */}
              <div className="rounded-3xl bg-white/95 border border-slate-200 p-3.5 shadow-sm shadow-slate-100">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">일자별 레시피 요약</span>
                  <span className="text-[10px] text-slate-500">수입·지출·저축을 한 줄로 정리했습니다</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-64">
                  <table className="min-w-full text-[11px]">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-2 py-2 text-left w-1/6">날짜</th>
                        <th className="px-2 py-2 text-right w-1/6">수입</th>
                        <th className="px-2 py-2 text-right w-1/6">지출</th>
                        <th className="px-2 py-2 text-right w-1/6">저축</th>
                        <th className="px-2 py-2 text-left">대표 항목</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.days.map((d, idx) => {
                        const isOdd = idx % 2 === 1;

                        const repr = (it?: MoneyItem) => {
                          if (!it) return "";
                          const c = (it.category || "").trim();
                          const s = (it.subcategory || "").trim();
                          const memo = (it.label || "").trim();
                          const head = c ? (s ? `${c}·${s}` : c) : "";
                          if (head && memo) return `${head} / ${memo}`;
                          return head || memo || "";
                        };

                        const bestExpense = d.expenseItems[0];
                        const bestIncome = d.incomeItems[0];
                        const bestSaving = d.savingItems[0];
                        const mainMemo = repr(bestExpense) || repr(bestIncome) || repr(bestSaving) || "";

                        return (
                          <tr
                            key={d.date}
                            className={"border-t border-slate-200 " + (isOdd ? "bg-slate-50/70" : "bg-white")}
                          >
                            <td className="px-2 py-1.5 text-slate-800 whitespace-nowrap">{formatKoreanDate(d.date)}</td>
                            <td className="px-2 py-1.5 text-right text-sky-700">{d.incomeTotal ? d.incomeTotal.toLocaleString() : "-"}</td>
                            <td className="px-2 py-1.5 text-right text-orange-700">{d.expenseTotal ? d.expenseTotal.toLocaleString() : "-"}</td>
                            <td className="px-2 py-1.5 text-right text-emerald-700">{d.savingTotal ? d.savingTotal.toLocaleString() : "-"}</td>
                            <td className="px-2 py-1.5 text-slate-700 truncate max-w-[220px]">{mainMemo || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 셰프 분석 카드 */}
              <div className="space-y-3">
                <div className="rounded-3xl bg-white/95 border border-slate-200 p-3.5 shadow-sm shadow-slate-100">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-lg">👨‍🍳</span>
                    <h2 className="text-xs font-semibold text-slate-900">이번 달 셰프 노트</h2>
                  </div>

                  <ul className="space-y-1.5 text-[11px] leading-relaxed text-slate-700">
                    {baseIncome ? (
                      <>
                        <li>
                          • 전체 지출은 소득의 <span className="font-semibold">{expenseRatio.toFixed(1)}%</span> 입니다.
                        </li>
                        <li>
                          • 저축(적금·투자)은 소득의 <span className="font-semibold">{savingRatio.toFixed(1)}%</span> 수준입니다.
                        </li>
                      </>
                    ) : (
                      <li>• 소득이 입력되지 않아 비율 분석은 생략하고, 절대 금액 위주로만 정리했습니다.</li>
                    )}

                    {topCat && (
                      <li>
                        • 가장 큰 지출 구분은 <span className="font-semibold">{topCat.label}</span> ({" "}
                        <span className="font-semibold text-orange-700">{topCat.amount.toLocaleString()}원</span> ) 입니다.
                      </li>
                    )}

                    <li>
                      • 지출이 있었던 날 기준 하루 평균{" "}
                      <span className="font-semibold text-orange-700">{stats.avgExpensePerSpendingDay.toLocaleString()}원</span>을 사용했습니다.
                    </li>
                    <li>
                      • 저축이 있었던 날 기준 하루 평균{" "}
                      <span className="font-semibold text-emerald-700">{stats.avgSavingPerSavingDay.toLocaleString()}원</span>을 떼어두고 있습니다.
                    </li>

                    {stats.maxExpenseDay && (
                      <li>
                        • 가장 지출이 컸던 날은 <span className="font-semibold">{formatKoreanDate(stats.maxExpenseDay.date)}</span>로,{" "}
                        <span className="font-semibold text-orange-700">{stats.maxExpenseDay.amount.toLocaleString()}원</span>을 사용했습니다.
                      </li>
                    )}
                  </ul>
                </div>

                <div className="rounded-3xl bg-gradient-to-r from-[#FFF7EB] to-[#FFEFD9] p-3.5 text-[11px] leading-relaxed text-slate-800 shadow-sm shadow-amber-100/80">
                  <p className="mb-2">
                    🧂 <strong>셰프 TIP.</strong> 이번 달 데이터를 바탕으로 <span className="font-semibold">“줄이고 싶은 구분(카테고리)”</span>를 1~2개만 고른 뒤,
                    다음 달 달력에서 그 구분의 지출을 상한선으로 관리해 보세요.
                  </p>
                  <p className="text-[10px] text-slate-600">
                    이 화면은 달력에 입력한 “하루 레시피” 기준 분석입니다.
                    <br />
                    나중에 실제 카드 사용 내역을 연동하면, 계획 vs 실제를 비교하는 리포트로 확장할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PageContainer>
  );
}

/* ========================
 *  ✅ 선 그래프 컴포넌트 (SVG polyline)
 * ======================== */

type LinePoint = {
  date: string; // YYYY-MM-DD
  xLabel: string; // "2월 1일"
  y: number; // 지출 금액
};

function LineChartCard({ series }: { series: LinePoint[] }) {
  const data = (series ?? []).map((p) => ({ ...p, y: safeNum(p.y) }));
  const hasAny = data.some((d) => d.y > 0);

  if (!data.length || !hasAny) {
    return (
      <p className="mt-3 text-[11px] text-slate-500">
        아직 지출이 기록된 날이 적습니다. 여러 날에 걸쳐 레시피를 채워 넣으면 그래프가 나타납니다.
      </p>
    );
  }

  const W = 720;
  const H = 170;

  const padding = { l: 42, r: 16, t: 14, b: 28 };
  const innerW = W - padding.l - padding.r;
  const innerH = H - padding.t - padding.b;

  const ys = data.map((d) => d.y);
  const yMax = Math.max(...ys, 1);
  const yMin = Math.min(...ys);

  const span = Math.max(1, yMax - yMin);
  const yPad = Math.round(span * 0.08);
  const yTop = yMax + yPad;
  const yBot = Math.max(0, yMin - yPad);

  const n = data.length;
  const xStep = n > 1 ? innerW / (n - 1) : innerW;

  const toX = (i: number) => padding.l + xStep * i;
  const toY = (v: number) => {
    const denom = Math.max(1, yTop - yBot);
    const t = (v - yBot) / denom; // 0..1
    return padding.t + (1 - t) * innerH;
  };

  const points = data.map((d, i) => ({ ...d, x: toX(i), yPix: toY(d.y) }));
  const polyline = points.map((p) => `${p.x},${p.yPix}`).join(" ");

  const ticks = [0, 0.33, 0.66, 1].map((t) => {
    const v = yBot + (yTop - yBot) * t;
    return {
      v: Math.round(v),
      y: toY(v),
    };
  });

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const hover = hoverIdx != null ? points[hoverIdx] : null;

  const showEvery = data.length > 12 ? 2 : 1;

  return (
    <div className="mt-1 w-full rounded-2xl bg-slate-50 border border-slate-200 px-3 py-3">
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[680px]" onMouseLeave={() => setHoverIdx(null)}>
          {ticks.map((t, idx) => (
            <g key={idx}>
              <line x1={padding.l} x2={W - padding.r} y1={t.y} y2={t.y} stroke="#E5E7EB" strokeDasharray="4 4" />
              <text x={padding.l - 8} y={t.y + 3} textAnchor="end" fontSize="10" fill="#64748b">
                {t.v.toLocaleString()}
              </text>
            </g>
          ))}

          <line x1={padding.l} x2={W - padding.r} y1={padding.t + innerH} y2={padding.t + innerH} stroke="#CBD5E1" />

          <polyline
            points={polyline}
            fill="none"
            stroke={BRAND_ORANGE}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          <path
            d={[
              `M ${points[0].x} ${padding.t + innerH}`,
              `L ${polyline.replace(/ /g, " L ")}`,
              `L ${points[points.length - 1].x} ${padding.t + innerH}`,
              "Z",
            ].join(" ")}
            fill="rgba(255,138,61,0.12)"
          />

          {points.map((p, i) => (
            <g key={p.date}>
              <circle
                cx={p.x}
                cy={p.yPix}
                r={i === hoverIdx ? 5 : 4}
                fill={BRAND_ORANGE}
                stroke="white"
                strokeWidth="2"
                onMouseEnter={() => setHoverIdx(i)}
              />
            </g>
          ))}

          {points.map((p, i) => {
            if (i % showEvery !== 0 && i !== points.length - 1) return null;
            return (
              <text key={`x-${p.date}`} x={p.x} y={H - 10} textAnchor="middle" fontSize="10" fill="#64748b">
                {p.xLabel}
              </text>
            );
          })}

          {hover && (
            <g>
              <line x1={hover.x} x2={hover.x} y1={padding.t} y2={padding.t + innerH} stroke="rgba(15,23,42,0.18)" />
              <g transform={`translate(${clamp(hover.x - 60, 8, W - 160)},${clamp(hover.yPix - 44, 8, H - 60)})`}>
                <rect width="152" height="44" rx="10" fill="rgba(15,23,42,0.92)" />
                <text x="10" y="17" fontSize="10" fill="rgba(226,232,240,0.95)">
                  {hover.xLabel}
                </text>
                <text x="10" y="33" fontSize="11" fill="white" fontWeight="700">
                  {hover.y.toLocaleString()}원
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-slate-600">
        <span>최저 {Math.min(...ys).toLocaleString()}원</span>
        <span>최고 {Math.max(...ys).toLocaleString()}원</span>
      </div>
    </div>
  );
}

/* ========================
 *  파이 차트 컴포넌트
 * ======================== */

type PieChartProps = {
  items: { label: string; amount: number }[];
  total: number;
};

function PieChartCard({ items, total }: PieChartProps) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;

  const palette = ["#fb923c", "#facc15", "#4ade80", "#38bdf8", "#a855f7", "#f97373", "#94a3b8"];

  let currentOffset = 0;

  return (
    <div className="mt-1 flex justify-center">
      <svg viewBox="0 0 160 160" className="h-40 w-40">
        <circle cx="80" cy="80" r={radius} fill="transparent" stroke="#E5E7EB" strokeWidth="16" />
        {items.map((item, idx) => {
          const value = item.amount;
          const ratio = total > 0 ? value / total : 0;
          const length = circumference * ratio;
          const color = palette[idx % palette.length];

          const dasharray = `${length} ${circumference - length}`;
          const dashoffset = circumference - currentOffset - length;
          currentOffset += length;

          return (
            <circle
              key={item.label}
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth="16"
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              strokeLinecap="butt"
            />
          );
        })}
        <circle cx="80" cy="80" r={36} fill="#F9FAFB" />
        <text x="80" y="72" textAnchor="middle" className="text-[10px] fill-slate-500">
          지출 합계
        </text>
        <text x="80" y="92" textAnchor="middle" className="text-[13px] font-semibold fill-slate-900">
          {total.toLocaleString()}원
        </text>
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <PageContainer title="">
          <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#FFF7EB] via-[#FFFDFC] to-[#F3F4FF]" />
          <div className="flex min-h-[60vh] items-center justify-center">
            <p className="text-xs text-slate-500">이 달의 지출 레시피 대시보드를 준비하고 있어요...</p>
          </div>
        </PageContainer>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}

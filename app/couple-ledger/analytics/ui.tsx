"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";
import CoupleLedgerNav from "@/components/couple-ledger/CoupleLedgerNav";

type CoupleContext = {
  couple_link_id: string;
  couple_ledger_id: string;
  partner_user_id: string;
  shared_ledger_on: boolean;
  personal_share_on: boolean;
  allow_edit: boolean;
} | null;

type CoupleExpense = {
  id: string;
  couple_link_id: string;
  created_by: string;
  amount: number;
  category: string | null;
  memo: string | null;
  expense_date: string;
  created_at: string;
};

type ToastType = "success" | "error" | "info";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function money(n: number | bigint) {
  const v = typeof n === "bigint" ? Number(n) : n;
  return (v || 0).toLocaleString("ko-KR");
}

function percent(n: number) {
  return `${Math.round(n)}%`;
}

function toSafeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function tooltipMoneyFormatterWithLabel(label: string) {
  return (value: unknown) => {
    const n = toSafeNumber(value);
    return [`${money(n)}원`, label] as [string, string];
  };
}

function formatMonthLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getPrevMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

function weekdayIndex(dateStr: string) {
  return new Date(dateStr).getDay();
}

function isWeekend(dateStr: string) {
  const d = weekdayIndex(dateStr);
  return d === 0 || d === 6;
}

function shortDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function Surface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-[20px] md:rounded-[24px] border border-[#F3F4F6] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]",
        className
      )}
    >
      {children}
    </section>
  );
}

function Pill({
  children,
  tone = "accent",
}: {
  children: React.ReactNode;
  tone?: "accent" | "soft" | "muted";
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-[10px] px-3 py-1 text-[11px] font-medium",
        tone === "accent" &&
          "border border-[#aadffe] bg-[#edf7ff] text-[#0c86ea]",
        tone === "soft" &&
          "border border-[#E5E7EB] bg-white text-[#0c86ea]",
        tone === "muted" &&
          "border border-slate-200 bg-slate-50 text-slate-600"
      )}
    >
      {children}
    </span>
  );
}

function DataCard({
  label,
  value,
  subtle,
}: {
  label: string;
  value: React.ReactNode;
  subtle?: React.ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-[#d5f9ff] bg-[#f9fdff] px-4 py-4">
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-[14px] md:text-[15px] font-semibold text-slate-900">
        {value}
      </div>
      {subtle ? (
        <div className="mt-1 text-[11px] text-slate-500">{subtle}</div>
      ) : null}
    </div>
  );
}

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-[12px] bg-[#69b6ff] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#0c86ea] disabled:opacity-60";

const neutralButtonClass =
  "inline-flex items-center justify-center rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50";

const PIE_COLORS = ["#69b6ff", "#94a3b8"];
const CATEGORY_COLORS = [
  "#69b6ff",
  "#94a3b8",
  "#f59e0b",
  "#34d399",
  "#f472b6",
  "#a78bfa",
];

export default function CoupleLedgerAnalyticsUI() {
  const [checking, setChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [ctx, setCtx] = useState<any>(null);
  const [sharedList, setSharedList] = useState<CoupleExpense[]>([]);
  const [baseMonth, setBaseMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const loadContext = async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    setIsLoggedIn(!!uid);

    if (!uid) {
      setCtx(null);
      setChecking(false);
      return null;
    }

    const { data, error } = await supabase.rpc("get_my_couple_context");
    if (error || !data || data.length === 0) {
      setCtx(null);
      setChecking(false);
      return null;
    }

    const next = data[0];
    setCtx(next);
    setChecking(false);
    return next;
  };

  const loadShared = async (couple_link_id: string, month: Date) => {
    const prevMonth = getPrevMonth(month);
    const start = getMonthStart(prevMonth);
    const end = getMonthEnd(month);

    const from = formatDateKey(start);
    const to = formatDateKey(end);

    const { data, error } = await supabase
      .from("couple_expenses")
      .select("*")
      .eq("couple_link_id", couple_link_id)
      .gte("expense_date", from)
      .lte("expense_date", to)
      .order("expense_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      showToast(error.message, "error");
      setSharedList([]);
      return;
    }

    setSharedList((data || []) as CoupleExpense[]);
  };

  const refresh = async (month = baseMonth) => {
    const c = await loadContext();
    if (!c?.couple_link_id) return;

    if (!c.shared_ledger_on) {
      setSharedList([]);
      return;
    }

    await loadShared(c.couple_link_id, month);
  };

  useEffect(() => {
    refresh(baseMonth);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refresh(baseMonth);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ctx?.couple_link_id || !ctx.shared_ledger_on) return;
    loadShared(ctx.couple_link_id, baseMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseMonth]);

  const currentYm = `${baseMonth.getFullYear()}-${String(
    baseMonth.getMonth() + 1
  ).padStart(2, "0")}`;
  const prevMonth = getPrevMonth(baseMonth);
  const prevYm = `${prevMonth.getFullYear()}-${String(
    prevMonth.getMonth() + 1
  ).padStart(2, "0")}`;

  const currentItems = useMemo(
    () => sharedList.filter((x) => x.expense_date.startsWith(currentYm)),
    [sharedList, currentYm]
  );

  const prevItems = useMemo(
    () => sharedList.filter((x) => x.expense_date.startsWith(prevYm)),
    [sharedList, prevYm]
  );

  const summary = useMemo(() => {
    const total = currentItems.reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const prevTotal = prevItems.reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const avg = currentItems.length ? total / currentItems.length : 0;

    const delta = total - prevTotal;
    const deltaRate = prevTotal > 0 ? (delta / prevTotal) * 100 : total > 0 ? 100 : 0;

    const myPaid = currentItems.reduce((sum, x) => {
      return x.created_by === ctx?.partner_user_id ? sum : sum + Number(x.amount || 0);
    }, 0);

    const partnerPaid = currentItems.reduce((sum, x) => {
      return x.created_by === ctx?.partner_user_id ? sum + Number(x.amount || 0) : sum;
    }, 0);

    const weekendTotal = currentItems
      .filter((x) => isWeekend(x.expense_date))
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);

    const weekendRate = total > 0 ? (weekendTotal / total) * 100 : 0;

    const dayMap: Record<string, number> = {};
    currentItems.forEach((item) => {
      dayMap[item.expense_date] = (dayMap[item.expense_date] || 0) + Number(item.amount || 0);
    });

    const topDayEntry = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0];

    const catMap: Record<string, number> = {};
    currentItems.forEach((item) => {
      const key = item.category || "기타";
      catMap[key] = (catMap[key] || 0) + Number(item.amount || 0);
    });

    const topCategoryEntry = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      prevTotal,
      avg,
      delta,
      deltaRate,
      myPaid,
      partnerPaid,
      weekendTotal,
      weekendRate,
      topDay: topDayEntry ? { date: topDayEntry[0], amount: topDayEntry[1] } : null,
      topCategory: topCategoryEntry ? { name: topCategoryEntry[0], amount: topCategoryEntry[1] } : null,
    };
  }, [currentItems, prevItems, ctx?.partner_user_id]);

  const categoryRows = useMemo(() => {
    const map: Record<string, number> = {};

    currentItems.forEach((item) => {
      const key = item.category || "기타";
      map[key] = (map[key] || 0) + Number(item.amount || 0);
    });

    const total = currentItems.reduce((sum, x) => sum + Number(x.amount || 0), 0);

    return Object.entries(map)
      .map(([category, amount]) => ({
        category,
        amount,
        ratio: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [currentItems]);

  const dailyRows = useMemo(() => {
    const map: Record<string, number> = {};

    currentItems.forEach((item) => {
      map[item.expense_date] = (map[item.expense_date] || 0) + Number(item.amount || 0);
    });

    return Object.entries(map)
      .map(([date, amount]) => ({
        date,
        shortDate: shortDate(date),
        amount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [currentItems]);

  const payerRows = useMemo(() => {
    const total = summary.total || 0;
    return [
      {
        label: "내 결제",
        amount: summary.myPaid,
        ratio: total > 0 ? (summary.myPaid / total) * 100 : 0,
      },
      {
        label: "상대 결제",
        amount: summary.partnerPaid,
        ratio: total > 0 ? (summary.partnerPaid / total) * 100 : 0,
      },
    ];
  }, [summary]);

  const insightText = useMemo(() => {
    if (!currentItems.length) {
      return "이번 달 공동 지출 기록이 아직 없습니다.";
    }

    const topCategoryText = summary.topCategory
      ? `${summary.topCategory.name} 지출 비중이 가장 큽니다`
      : "대표 카테고리를 아직 계산할 수 없습니다";

    const weekendText =
      summary.weekendRate >= 50
        ? "지출이 주말에 집중되는 편입니다"
        : "지출이 평일과 주말에 비교적 분산되어 있습니다";

    return `${topCategoryText}. ${weekendText}.`;
  }, [currentItems.length, summary.topCategory, summary.weekendRate]);

  const moveMonth = (diff: number) => {
    setBaseMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + diff, 1));
  };

  if (checking) {
    return (
      <div className="mx-auto max-w-[1180px] min-h-screen bg-white p-6 text-[14px] text-slate-600">
        불러오는 중…
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white p-4 md:p-6">
        <Surface className="mx-auto max-w-xl p-5 md:p-6">
          <div className="text-[18px] md:text-[20px] font-semibold tracking-[-0.02em] text-slate-900">
            지출 분석
          </div>
          <div className="mt-2 text-[14px] leading-6 text-slate-600">
            로그인 후 사용할 수 있습니다.
          </div>
          <div className="mt-5">
            <Link href="/sign-in" className={primaryButtonClass}>
              로그인하기
            </Link>
          </div>
        </Surface>
      </div>
    );
  }

  if (!ctx?.couple_link_id) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
          <Surface className="p-5 md:p-6">
            <div className="text-[20px] md:text-[22px] font-semibold tracking-[-0.02em] text-slate-900">
              지출 분석
            </div>
            <div className="mt-2 text-[14px] leading-6 text-slate-600">
              아직 커플 연결이 없습니다. 먼저 연결을 완료하세요.
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/couple-link" className={primaryButtonClass}>
                커플 연결하러 가기
              </Link>
              <Link href="/couple-ledger" className={neutralButtonClass}>
                가계부 메인으로
              </Link>
            </div>
          </Surface>
        </div>
      </div>
    );
  }

  const sharedLocked = ctx.shared_ledger_on !== true;

  return (
    <div className="min-h-screen bg-white pb-10">
      <div className="mx-auto max-w-[1320px] px-4 py-5 md:px-6 md:py-8">
        <Surface className="overflow-hidden">
          <div className="border-b border-[#F3F4F6] bg-white px-4 py-5 md:px-6 md:py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="text-[18px] md:text-[20px] font-semibold tracking-[-0.03em] text-slate-900">
                  우리의 지출 분석
                </div>
                <div className="mt-2 max-w-2xl text-[13px] md:text-[14px] leading-6 text-slate-600">
                  이번 달 공동 지출의 규모, 구조, 결제 비중을 한눈에 확인합니다.
                </div>

                <div className="mt-4">
                  <CoupleLedgerNav active="analytics" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Pill tone="accent">Analytics View</Pill>
                <Pill tone={sharedLocked ? "muted" : "soft"}>
                  공동 공유 {sharedLocked ? "OFF" : "ON"}
                </Pill>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 md:px-6 md:py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[17px] md:text-[18px] font-semibold tracking-[-0.02em] text-slate-900">
                  월별 분석
                </div>
                <div className="mt-2 text-[10px] leading-6 text-slate-600">
                  {formatMonthLabel(baseMonth)} 기준 공동 지출을 분석합니다.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={() => moveMonth(-1)} className={neutralButtonClass}>
                  이전 달
                </button>
                <div className="min-w-[120px] text-center text-[14px] font-semibold text-slate-900">
                  {formatMonthLabel(baseMonth)}
                </div>
                <button type="button" onClick={() => moveMonth(1)} className={neutralButtonClass}>
                  다음 달
                </button>
              </div>
            </div>
          </div>
        </Surface>

        {sharedLocked ? (
          <Surface className="mt-4 p-5 md:p-6">
            <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-[14px] text-slate-700">
              공동 공유가 꺼져 있어 분석을 표시할 수 없습니다.
            </div>
          </Surface>
        ) : (
          <>
            <Surface className="mt-4 p-4 md:p-6">
              <div className="rounded-[20px] border border-[#d5f9ff] bg-[#f9fdff] p-4 text-[13px] leading-6 text-slate-700">
                <b className="text-slate-900">한 줄 해석</b>
                <div className="mt-1">{insightText}</div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <DataCard
                  label="이번 달 총 공동지출"
                  value={`${money(summary.total)}원`}
                  subtle={`지난달 ${money(summary.prevTotal)}원`}
                />
                <DataCard
                  label="지난달 대비 증감"
                  value={`${summary.delta >= 0 ? "+" : ""}${money(summary.delta)}원`}
                  subtle={`${summary.delta >= 0 ? "+" : ""}${summary.deltaRate.toFixed(1)}%`}
                />
                <DataCard
                  label="평균 1회 지출액"
                  value={`${money(Math.round(summary.avg))}원`}
                  subtle={`${currentItems.length}건 기준`}
                />
                <DataCard
                  label="주말 지출 비중"
                  value={percent(summary.weekendRate)}
                  subtle={`${money(summary.weekendTotal)}원`}
                />
              </div>
            </Surface>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <Surface className="p-4 md:p-6">
                <div className="text-[17px] font-semibold text-slate-900">
                  카테고리별 지출 그래프
                </div>
                <div className="mt-2 text-[10px] text-slate-600">
                  카테고리별 공동 지출 금액을 막대 그래프로 보여줍니다.
                </div>

                <div className="mt-5 h-[320px]">
                  {categoryRows.length === 0 ? (
                    <div className="flex h-full items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 text-[14px] text-slate-600">
                      이번 달 카테고리 데이터가 없습니다.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={categoryRows.map((row) => ({
                          category: row.category,
                          amount: row.amount,
                        }))}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickFormatter={(v) => `${Math.round(toSafeNumber(v) / 1000)}k`}
                        />
                        <Tooltip formatter={tooltipMoneyFormatterWithLabel("지출")} />
                        <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                          {categoryRows.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Surface>

              <Surface className="p-4 md:p-6">
                <div className="text-[17px] font-semibold text-slate-900">
                  결제 비중 그래프
                </div>
                <div className="mt-2 text-[10px] text-slate-600">
                  내 결제와 상대 결제 비중을 도넛 차트로 보여줍니다.
                </div>

                <div className="mt-5 h-[320px]">
                  {summary.total === 0 ? (
                    <div className="flex h-full items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 text-[14px] text-slate-600">
                      이번 달 결제 데이터가 없습니다.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={payerRows}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={3}
                          dataKey="amount"
                          nameKey="label"
                        >
                          {payerRows.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={tooltipMoneyFormatterWithLabel("결제")} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="mt-3 grid gap-3">
                  <DataCard
                    label="가장 지출이 컸던 날"
                    value={summary.topDay ? `${summary.topDay.date} · ${money(summary.topDay.amount)}원` : "-"}
                  />
                  <DataCard
                    label="가장 큰 카테고리"
                    value={
                      summary.topCategory
                        ? `${summary.topCategory.name} · ${money(summary.topCategory.amount)}원`
                        : "-"
                    }
                  />
                </div>
              </Surface>
            </div>

            <Surface className="mt-4 p-4 md:p-6">
              <div className="text-[17px] font-semibold text-slate-900">
                일자별 지출 추이 그래프
              </div>
              <div className="mt-2 text-[10px] text-slate-600">
                날짜별 총 지출 흐름을 라인 차트로 보여줍니다.
              </div>

              <div className="mt-5 h-[360px]">
                {dailyRows.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 text-[14px] text-slate-600">
                    이번 달 일자별 데이터가 없습니다.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyRows} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="shortDate" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v) => `${Math.round(toSafeNumber(v) / 1000)}k`}
                      />
                      <Tooltip
                        formatter={tooltipMoneyFormatterWithLabel("지출")}
                        labelFormatter={(label, payload) => {
                          const row = payload?.[0]?.payload as { date?: string } | undefined;
                          return row?.date ?? String(label);
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#69b6ff"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Surface>

            <Surface className="mt-4 p-4 md:p-6">
              <div className="text-[17px] font-semibold text-slate-900">상세 테이블</div>
              <div className="mt-2 text-[10px] text-slate-600">
                카테고리별 합계를 표 형태로 확인합니다.
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-[18px] border border-[#E5E7EB]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-left text-[12px] font-medium text-slate-600">
                        카테고리
                      </th>
                      <th className="px-4 py-3 text-right text-[12px] font-medium text-slate-600">
                        금액
                      </th>
                      <th className="px-4 py-3 text-right text-[12px] font-medium text-slate-600">
                        비중
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryRows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-[13px] text-slate-500">
                          데이터가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      categoryRows.map((row, idx) => (
                        <tr key={row.category} className={idx !== 0 ? "border-t border-slate-100" : ""}>
                          <td className="px-4 py-3 text-[13px] text-slate-900">{row.category}</td>
                          <td className="px-4 py-3 text-right text-[13px] font-medium text-slate-900">
                            {money(row.amount)}원
                          </td>
                          <td className="px-4 py-3 text-right text-[13px] text-slate-600">
                            {row.ratio.toFixed(1)}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Surface>
          </>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 px-4">
          <div
            className={cx(
              "min-w-[220px] rounded-[10px] px-4 py-2.5 text-[12px] font-medium text-white shadow-[0_12px_30px_rgba(0,0,0,0.16)]",
              toast.type === "success" && "bg-[#69b6ff]",
              toast.type === "error" && "bg-[#d84b4b]",
              toast.type === "info" && "bg-slate-900"
            )}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
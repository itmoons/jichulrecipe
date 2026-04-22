"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

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
  receipt_url?: string | null;
};

type ToastType = "success" | "error" | "info";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function money(n: number | bigint) {
  const v = typeof n === "bigint" ? Number(n) : n;
  return (v || 0).toLocaleString("ko-KR");
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

function formatDateLabel(dateKey: string) {
  const d = new Date(dateKey);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getCalendarStart(date: Date) {
  const first = getMonthStart(date);
  const day = first.getDay();
  const start = new Date(first);
  start.setDate(first.getDate() - day);
  return start;
}

function getCalendarEnd(date: Date) {
  const last = getMonthEnd(date);
  const day = last.getDay();
  const end = new Date(last);
  end.setDate(last.getDate() + (6 - day));
  return end;
}

function buildCalendarDays(baseDate: Date) {
  const start = getCalendarStart(baseDate);
  const end = getCalendarEnd(baseDate);
  const days: Date[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
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

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-[12px] bg-[#69b6ff] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#0c86ea] disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-[12px] border border-[#aadffe] bg-white px-4 py-2.5 text-[13px] font-medium text-[#0c86ea] transition hover:bg-[#edf7ff]";

const neutralButtonClass =
  "inline-flex items-center justify-center rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50";

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

export default function CoupleLedgerCalendarUI() {
  const [checking, setChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [ctx, setCtx] = useState<CoupleContext>(null);
  const [sharedList, setSharedList] = useState<CoupleExpense[]>([]);
  const [baseMonth, setBaseMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(
    null
  );
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const loadContext = async (): Promise<CoupleContext> => {
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

    const next = data[0] as CoupleContext;
    setCtx(next);
    setChecking(false);
    return next;
  };

  const loadShared = async (couple_link_id: string, month: Date) => {
    const start = getCalendarStart(month);
    const end = getCalendarEnd(month);

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

  const groupedByDate = useMemo(() => {
    const map: Record<string, CoupleExpense[]> = {};

    for (const item of sharedList) {
      const key = item.expense_date;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }

    return map;
  }, [sharedList]);

  const calendarDays = useMemo(() => buildCalendarDays(baseMonth), [baseMonth]);

  const monthSummary = useMemo(() => {
    const ym = `${baseMonth.getFullYear()}-${String(baseMonth.getMonth() + 1).padStart(
      2,
      "0"
    )}`;

    const monthItems = sharedList.filter((x) => x.expense_date.startsWith(ym));
    const total = monthItems.reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const count = monthItems.length;

    const categoryMap: Record<string, number> = {};
    for (const item of monthItems) {
      const key = item.category || "기타";
      categoryMap[key] = (categoryMap[key] || 0) + Number(item.amount || 0);
    }

    const topCategory =
      Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

    return { total, count, topCategory };
  }, [sharedList, baseMonth]);

  const selectedItems = useMemo(() => {
    if (!selectedDateKey) return [];
    return groupedByDate[selectedDateKey] || [];
  }, [groupedByDate, selectedDateKey]);

  const selectedDateSummary = useMemo(() => {
    const total = selectedItems.reduce((sum, x) => sum + Number(x.amount || 0), 0);

    const categoryMap: Record<string, number> = {};
    for (const item of selectedItems) {
      const key = item.category || "기타";
      categoryMap[key] = (categoryMap[key] || 0) + Number(item.amount || 0);
    }

    const topCategory =
      Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

    return {
      total,
      count: selectedItems.length,
      topCategory,
    };
  }, [selectedItems]);

  const moveMonth = (diff: number) => {
    setSelectedDateKey(null);
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
            지출 달력
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
              지출 달력
            </div>
            <div className="mt-2 text-[14px] leading-6 text-slate-600">
              아직 커플 연결이 없습니다. 먼저 연결을 완료하세요.
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/couple-link" className={primaryButtonClass}>
                커플 연결하러 가기
              </Link>
              <Link href="/couple-ledger" className={neutralButtonClass}>
                가계부로 돌아가기
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
                  우리의 지출 달력
                </div>
                <div className="mt-2 max-w-2xl text-[13px] md:text-[14px] leading-6 text-slate-600">
                  언제 얼마나 썼는지 날짜 흐름으로 확인하는 커플 가계부 달력입니다.
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/couple-ledger" className={secondaryButtonClass}>
                    기록
                  </Link>
                  <Link href="/couple-ledger/calendar" className={primaryButtonClass}>
                    달력
                  </Link>
                  <Link href="/couple-ledger/analytics" className={secondaryButtonClass}>
                    분석
                  </Link>
                  <Link href="/couple-settings" className={neutralButtonClass}>
                    설정
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Pill tone="accent">Calendar View</Pill>
                <Pill tone={sharedLocked ? "muted" : "soft"}>
                  공동 공유 {sharedLocked ? "OFF" : "ON"}
                </Pill>
              </div>
            </div>
          </div>

          <div className="grid gap-3 px-4 py-4 md:grid-cols-3 md:px-6 md:py-5">
            <div className="rounded-[18px] border border-[#d5f9ff] bg-[#f9fdff] px-4 py-4">
              <div className="text-[11px] font-medium text-slate-500">이번 달 총 공동지출</div>
              <div className="mt-1 text-[15px] font-semibold text-slate-900">
                {money(monthSummary.total)}원
              </div>
            </div>

            <div className="rounded-[18px] border border-[#d5f9ff] bg-[#f9fdff] px-4 py-4">
              <div className="text-[11px] font-medium text-slate-500">이번 달 기록 건수</div>
              <div className="mt-1 text-[15px] font-semibold text-slate-900">
                {monthSummary.count}건
              </div>
            </div>

            <div className="rounded-[18px] border border-[#d5f9ff] bg-[#f9fdff] px-4 py-4">
              <div className="text-[11px] font-medium text-slate-500">가장 큰 비중의 카테고리</div>
              <div className="mt-1 text-[15px] font-semibold text-slate-900">
                {monthSummary.topCategory}
              </div>
            </div>
          </div>
        </Surface>

        <Surface className="mt-4 p-4 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[17px] md:text-[18px] font-semibold tracking-[-0.02em] text-slate-900">
                월별 달력
              </div>
              <div className="mt-2 text-[10px] leading-6 text-slate-600">
                날짜를 누르면 그날의 지출 상세를 볼 수 있습니다.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className={neutralButtonClass}
              >
                이전 달
              </button>
              <div className="min-w-[120px] text-center text-[14px] font-semibold text-slate-900">
                {formatMonthLabel(baseMonth)}
              </div>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                className={neutralButtonClass}
              >
                다음 달
              </button>
            </div>
          </div>

          {sharedLocked ? (
            <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-[14px] text-slate-700">
              공동 공유가 꺼져 있어 달력에 공동 지출을 표시할 수 없습니다.
            </div>
          ) : (
            <>
              <div className="mt-5 overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-7 gap-2">
                    {weekdayLabels.map((day, idx) => (
                      <div
                        key={day}
                        className={cx(
                          "rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[12px] font-medium",
                          idx === 0 && "text-rose-500",
                          idx === 6 && "text-blue-500"
                        )}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 grid grid-cols-7 gap-2">
                    {calendarDays.map((day) => {
                      const dateKey = formatDateKey(day);
                      const items = groupedByDate[dateKey] || [];
                      const isCurrentMonth = day.getMonth() === baseMonth.getMonth();
                      const isToday = dateKey === formatDateKey(new Date());
                      const total = items.reduce(
                        (sum, x) => sum + Number(x.amount || 0),
                        0
                      );

                      const categoryMap: Record<string, number> = {};
                      for (const item of items) {
                        const key = item.category || "기타";
                        categoryMap[key] =
                          (categoryMap[key] || 0) + Number(item.amount || 0);
                      }

                      const topCategories = Object.entries(categoryMap)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 2)
                        .map(([name]) => name);

                      const mePaid = items.reduce((sum, x) => {
                        return x.created_by === ctx.partner_user_id
                          ? sum
                          : sum + Number(x.amount || 0);
                      }, 0);

                      const partnerPaid = items.reduce((sum, x) => {
                        return x.created_by === ctx.partner_user_id
                          ? sum + Number(x.amount || 0)
                          : sum;
                      }, 0);

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          onClick={() => setSelectedDateKey(dateKey)}
                          className={cx(
                            "min-h-[122px] rounded-[18px] border p-3 text-left transition",
                            isCurrentMonth
                              ? "border-[#E5E7EB] bg-white hover:border-[#aadffe] hover:bg-[#fbfdff]"
                              : "border-slate-100 bg-slate-50 text-slate-400",
                            selectedDateKey === dateKey &&
                              "border-[#69b6ff] ring-2 ring-[#d9efff]",
                            isToday && "shadow-[inset_0_0_0_1px_#69b6ff]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div
                              className={cx(
                                "text-[12px] font-semibold",
                                isCurrentMonth ? "text-slate-900" : "text-slate-400"
                              )}
                            >
                              {day.getDate()}
                            </div>

                            {items.length > 0 && (
                              <div className="flex items-center gap-1">
                                <span
                                  className={cx(
                                    "h-2.5 w-2.5 rounded-full",
                                    mePaid > 0 ? "bg-[#69b6ff]" : "bg-slate-200"
                                  )}
                                />
                                <span
                                  className={cx(
                                    "h-2.5 w-2.5 rounded-full",
                                    partnerPaid > 0 ? "bg-[#94a3b8]" : "bg-slate-200"
                                  )}
                                />
                              </div>
                            )}
                          </div>

                          <div className="mt-3">
                            {items.length > 0 ? (
                              <>
                                <div className="text-[13px] font-semibold text-[#0c86ea]">
                                  {money(total)}원
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                  {items.length}건
                                </div>

                                <div className="mt-2 flex flex-wrap gap-1">
                                  {topCategories.map((cat) => (
                                    <span
                                      key={cat}
                                      className="rounded-[9px] bg-[#edf7ff] px-2 py-1 text-[10px] font-medium text-[#0c86ea]"
                                    >
                                      {cat}
                                    </span>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <div className="mt-7 text-[11px] text-slate-300">
                                기록 없음
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[20px] border border-[#d5f9ff] bg-[#f9fdff] p-4 text-[12px] leading-6 text-slate-600">
                <div>
                  <b className="text-slate-900">읽는 법</b>
                </div>
                <div className="mt-1">- 파란 점은 내가 결제한 내역이 있는 날입니다.</div>
                <div>- 회색 점은 상대가 결제한 내역이 있는 날입니다.</div>
                <div>- 날짜를 누르면 당일 상세 내역을 확인할 수 있습니다.</div>
              </div>
            </>
          )}
        </Surface>
      </div>

      {selectedDateKey && (
        <div className="fixed inset-0 z-50 bg-black/35">
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-2xl rounded-t-[10px] bg-white p-5 shadow-[0_-16px_40px_rgba(15,23,42,0.18)] md:bottom-70 md:rounded-[10px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold text-slate-900">
                  {formatDateLabel(selectedDateKey)}
                </div>
                <div className="mt-2 text-[10px] text-slate-600">
                  총 {money(selectedDateSummary.total)}원 · {selectedDateSummary.count}건
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDateKey(null)}
                className={neutralButtonClass}
              >
                닫기
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[16px] border border-[#d5f9ff] bg-[#f9fdff] px-4 py-3">
                <div className="text-[11px] text-slate-500">당일 총액</div>
                <div className="mt-1 text-[15px] font-semibold text-slate-900">
                  {money(selectedDateSummary.total)}원
                </div>
              </div>

              <div className="rounded-[16px] border border-[#d5f9ff] bg-[#f9fdff] px-4 py-3">
                <div className="text-[11px] text-slate-500">건수</div>
                <div className="mt-1 text-[15px] font-semibold text-slate-900">
                  {selectedDateSummary.count}건
                </div>
              </div>

              <div className="rounded-[16px] border border-[#d5f9ff] bg-[#f9fdff] px-4 py-3">
                <div className="text-[11px] text-slate-500">대표 카테고리</div>
                <div className="mt-1 text-[15px] font-semibold text-slate-900">
                  {selectedDateSummary.topCategory}
                </div>
              </div>
            </div>

            <div className="mt-5 max-h-[42vh] overflow-y-auto pr-1">
              {selectedItems.length === 0 ? (
                <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-6 text-center text-[14px] text-slate-600">
                  이 날짜에는 기록이 없습니다.
                </div>
              ) : (
                <div className="grid gap-3">
                  {selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[18px] border border-[#F3F4F6] bg-white px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[14px] font-semibold text-slate-900">
                              {item.memo?.trim() ? item.memo : "지출"}
                            </span>
                            <span className="rounded-[10px] bg-[#edf7ff] px-2.5 py-1 text-[11px] font-medium text-[#0c86ea]">
                              {item.category || "기타"}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {item.created_by === ctx?.partner_user_id
                                ? "상대 결제"
                                : "내 결제"}
                            </span>
                            <span
                              className={cx(
                                "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
                                item.receipt_url
                                  ? "border border-[#bfe4ff] bg-[#eef8ff] text-[#0c86ea]"
                                  : "border border-slate-200 bg-slate-50 text-slate-500"
                              )}
                            >
                              {item.receipt_url ? "🧾 영수증 있음" : "영수증 없음"}
                            </span>
                          </div>

                          {item.receipt_url && (
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={() => setReceiptPreviewUrl(item.receipt_url || null)}
                                className="inline-flex items-center rounded-[10px] border border-[#aadffe] bg-white px-3 py-1.5 text-[12px] font-medium text-[#0c86ea] transition hover:bg-[#edf7ff]"
                              >
                                영수증 보기
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="text-[15px] font-semibold text-[#0c86ea]">
                          {money(item.amount)}원
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <Link href="/couple-ledger" className={secondaryButtonClass}>
                가계부로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      )}

      {receiptPreviewUrl && (
        <div
          className="fixed inset-0 z-[70] bg-black/55 p-4"
          onClick={() => setReceiptPreviewUrl(null)}
        >
          <div className="flex min-h-full items-center justify-center">
            <div
              className="w-full max-w-3xl rounded-[20px] bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-[16px] font-semibold text-slate-900">영수증 보기</div>
                <div className="flex items-center gap-2">
                  <a
                    href={receiptPreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={secondaryButtonClass}
                  >
                    새 창에서 보기
                  </a>
                  <button
                    type="button"
                    onClick={() => setReceiptPreviewUrl(null)}
                    className={neutralButtonClass}
                  >
                    닫기
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-[16px] border border-slate-200 bg-slate-50">
                <img
                  src={receiptPreviewUrl}
                  alt="영수증 미리보기"
                  className="max-h-[70vh] w-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      )}

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
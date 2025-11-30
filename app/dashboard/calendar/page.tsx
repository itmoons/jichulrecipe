// src/app/dashboard/calendar/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BRAND_ORANGE = "#FF8A3D"; // 지출레시피 메인 컬러
const LS_KEY_DAILY = "jichulrecipe_daily_recipes_v1";

/** edit 페이지와 맞추는 타입 */
type DailyRecipe = {
  incomeAmount: number;
  incomeMemo: string;
  expenseAmount: number;
  expenseMemo: string;
  savingAmount: number;
  savingMemo: string;
  createdAt?: string;
  updatedAt?: string;
};

type DailyStore = {
  /** key: YYYY-MM-DD */
  [date: string]: DailyRecipe;
};

/** 오늘의 메모용 타입 (Supabase daily_memos) */
type TodayMemo = {
  id: number;
  user_id: string;
  date: string; // YYYY-MM-DD
  title: string;
  detail: string;
  created_at: string;
};

function formatMoney(v: number) {
  return v.toLocaleString("ko-KR") + "원";
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildCalendar(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0~11

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startWeekday = firstDay.getDay(); // 0: 일요일
  const daysInMonth = lastDay.getDate();

  const cells: (Date | null)[] = [];

  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export default function SpendingCalendarPage() {
  const router = useRouter();

  // ⬇ 현재 달 기준으로 시작
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  /** 날짜별 레시피 (localStorage) */
  const [dailyStore, setDailyStore] = useState<DailyStore>({});

  /** 오늘 날짜 key (YYYY-MM-DD) */
  const todayKey = useMemo(() => getDateKey(new Date()), []);

  /** 오늘의 메모 (Supabase) */
  const [todayMemos, setTodayMemos] = useState<TodayMemo[]>([]);
  const [memoLoading, setMemoLoading] = useState<boolean>(true);
  const [memoGlobalError, setMemoGlobalError] = useState<string | null>(null);

  /** 메모 모달 상태 */
  const [memoModalOpen, setMemoModalOpen] = useState(false);
  const [memoModalMode, setMemoModalMode] = useState<"create" | "edit">(
    "create"
  );
  const [editingMemo, setEditingMemo] = useState<TodayMemo | null>(null);
  const [memoTitleInput, setMemoTitleInput] = useState("");
  const [memoDetailInput, setMemoDetailInput] = useState("");
  const [memoSubmitting, setMemoSubmitting] = useState(false);
  const [memoFormError, setMemoFormError] = useState<string | null>(null);

  // 최초 로드: localStorage → dailyStore
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LS_KEY_DAILY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DailyStore;
      setDailyStore(parsed || {});
    } catch {
      // 파싱 실패 시 조용히 무시
    }
  }, []);

  /** 오늘의 메모 Supabase에서 불러오기 */
  useEffect(() => {
    let mounted = true;

    const loadMemos = async () => {
      setMemoLoading(true);
      setMemoGlobalError(null);
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (authError) {
          console.warn("Supabase auth error (calendar memo):", authError.message);
          setTodayMemos([]);
          setMemoGlobalError("로그인 정보를 불러오지 못했어요.");
          setMemoLoading(false);
          return;
        }

        if (!user) {
          // 로그인 안 되어 있으면 메모는 비워두고 안내만
          setTodayMemos([]);
          setMemoGlobalError("로그인 후 오늘의 메모를 저장할 수 있어요.");
          setMemoLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("daily_memos")
          .select("*")
          .eq("user_id", user.id)
          .eq("date", todayKey)
          .order("created_at", { ascending: false });

        if (!mounted) return;

        if (error) {
          console.error("daily_memos 조회 실패:", error.message);
          setTodayMemos([]);
          setMemoGlobalError("오늘의 메모를 불러오는 중 문제가 발생했어요.");
        } else {
          setTodayMemos((data || []) as TodayMemo[]);
        }
      } catch (err) {
        if (!mounted) return;
        console.error("daily_memos 로딩 중 오류:", err);
        setTodayMemos([]);
        setMemoGlobalError("오늘의 메모를 불러오는 중 오류가 발생했어요.");
      } finally {
        if (mounted) setMemoLoading(false);
      }
    };

    loadMemos();

    return () => {
      mounted = false;
    };
  }, [todayKey]);

  const currentMonthKey = getMonthKey(currentDate);

  /** 이 달에 해당하는 날짜만 필터링해서 월 합계 계산 */
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let saving = 0;

    Object.entries(dailyStore).forEach(([date, recipe]) => {
      if (!date.startsWith(currentMonthKey)) return;
      income += Number(recipe.incomeAmount || 0);
      expense += Number(recipe.expenseAmount || 0);
      saving += Number(recipe.savingAmount || 0);
    });

    const net = income - expense - saving;

    return { income, expense, saving, net };
  }, [dailyStore, currentMonthKey]);

  const cells = useMemo(() => buildCalendar(currentDate), [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const handleDayClick = (date: Date) => {
    const dateKey = getDateKey(date);
    router.push(`/dashboard/calendar/edit?date=${dateKey}`);
  };

  const monthLabel = useMemo(
    () => `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`,
    [currentDate]
  );

  /** 모달 열기 - 공통 (로그인 체크) */
  const openMemoModalBase = async (
    mode: "create" | "edit",
    memo?: TodayMemo | null
  ) => {
    setMemoFormError(null);
    setMemoGlobalError(null);

    // 인증 체크
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.warn("Supabase auth error (memo modal):", authError.message);
      setMemoGlobalError("로그인 정보를 다시 확인해 주세요.");
      return;
    }

    if (!user) {
      setMemoGlobalError("로그인 후 오늘의 메모를 작성할 수 있어요.");
      return;
    }

    if (mode === "create") {
      setMemoModalMode("create");
      setEditingMemo(null);
      setMemoTitleInput("");
      setMemoDetailInput("");
    } else if (mode === "edit" && memo) {
      setMemoModalMode("edit");
      setEditingMemo(memo);
      setMemoTitleInput(memo.title);
      setMemoDetailInput(memo.detail);
    }

    setMemoModalOpen(true);
  };

  /** 새 메모 추가 버튼 */
  const handleAddMemoClick = async () => {
    await openMemoModalBase("create");
  };

  /** 기존 메모 클릭 → 수정 모달 열기 */
  const handleEditMemoClick = async (memo: TodayMemo) => {
    await openMemoModalBase("edit", memo);
  };

  /** 모달 닫기 */
  const closeMemoModal = () => {
    if (memoSubmitting) return;
    setMemoModalOpen(false);
    setEditingMemo(null);
    setMemoTitleInput("");
    setMemoDetailInput("");
    setMemoFormError(null);
  };

  /** 메모 저장 (추가 / 수정 공용) */
  const handleMemoSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (memoSubmitting) return;

    const title = memoTitleInput.trim();
    const detail = memoDetailInput.trim();

    if (!title) {
      setMemoFormError("제목을 입력해 주세요.");
      return;
    }
    if (!detail) {
      setMemoFormError("내용을 입력해 주세요.");
      return;
    }

    setMemoFormError(null);
    setMemoSubmitting(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.warn("Supabase auth error (memo save):", authError.message);
        setMemoFormError("로그인 정보를 다시 확인해 주세요.");
        setMemoSubmitting(false);
        return;
      }

      if (!user) {
        setMemoFormError("로그인 후 메모를 저장할 수 있어요.");
        setMemoSubmitting(false);
        return;
      }

      if (memoModalMode === "create") {
        // INSERT + returning
        const { data, error } = await supabase
          .from("daily_memos")
          .insert({
            user_id: user.id,
            date: todayKey,
            title,
            detail,
          })
          .select("*")
          .single();

        if (error) {
          console.error("daily_memos insert 실패:", error.message);
          setMemoFormError("메모 저장 중 오류가 발생했어요.");
          setMemoSubmitting(false);
          return;
        }

        setTodayMemos((prev) => [data as TodayMemo, ...prev]);
      } else if (memoModalMode === "edit" && editingMemo) {
        const { error } = await supabase
          .from("daily_memos")
          .update({
            title,
            detail,
          })
          .eq("id", editingMemo.id)
          .eq("user_id", user.id);

        if (error) {
          console.error("daily_memos update 실패:", error.message);
          setMemoFormError("메모 수정 중 오류가 발생했어요.");
          setMemoSubmitting(false);
          return;
        }

        setTodayMemos((prev) =>
          prev.map((m) =>
            m.id === editingMemo.id ? { ...m, title, detail } : m
          )
        );
      }

      setMemoSubmitting(false);
      closeMemoModal();
    } catch (err) {
      console.error("메모 저장 처리 중 오류:", err);
      setMemoFormError("메모 저장 중 알 수 없는 오류가 발생했어요.");
      setMemoSubmitting(false);
    }
  };

  /** 메모 삭제 */
  const handleMemoDelete = async () => {
    if (!editingMemo || memoSubmitting) return;

    const confirmDelete = window.confirm(
      "이 메모를 정말 삭제할까요? 되돌릴 수 없어요."
    );
    if (!confirmDelete) return;

    setMemoFormError(null);
    setMemoSubmitting(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.warn("Supabase auth error (memo delete):", authError.message);
        setMemoFormError("로그인 정보를 다시 확인해 주세요.");
        setMemoSubmitting(false);
        return;
      }

      if (!user) {
        setMemoFormError("로그인 후 메모를 삭제할 수 있어요.");
        setMemoSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("daily_memos")
        .delete()
        .eq("id", editingMemo.id)
        .eq("user_id", user.id);

      if (error) {
        console.error("daily_memos delete 실패:", error.message);
        setMemoFormError("메모 삭제 중 오류가 발생했어요.");
        setMemoSubmitting(false);
        return;
      }

      setTodayMemos((prev) => prev.filter((m) => m.id !== editingMemo.id));
      setMemoSubmitting(false);
      closeMemoModal();
    } catch (err) {
      console.error("메모 삭제 처리 중 오류:", err);
      setMemoFormError("메모 삭제 중 알 수 없는 오류가 발생했어요.");
      setMemoSubmitting(false);
    }
  };

  return (
    <main
      className={[
        "min-h-screen text-neutral-900 flex flex-col items-stretch",
        "bg-[radial-gradient(circle_at_1px_1px,#e5e7eb_1px,transparent_0)]",
        "[background-size:18px_18px]",
      ].join(" ")}
    >
      {/* 가운데 고정 폭 컨테이너 */}
      <div className="w-full max-w-5xl mx-auto flex flex-col px-4 sm:px-6 lg:px-0 pb-16">
        {/* 상단 바 - 레시피 타이틀 */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-8 pb-4 bg-white/90">
          <div className="flex items-start sm:items-center gap-3">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold shadow-sm shrink-0"
              style={{
                backgroundColor: "rgba(255,138,61,0.12)",
                color: "#9A3412",
              }}
            >
              🍳
            </span>
            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
                이번 달 지출 레시피
              </h1>
              <p className="text-xs text-neutral-500">
                하루치 소비를 한 끼 레시피처럼 기록하고, 한 달의 식단표처럼 모아서 봅니다.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <button
              onClick={handlePrevMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white hover:bg-neutral-50"
            >
              <ChevronLeft size={18} className="text-neutral-700" />
            </button>
            <div className="px-4 py-1.5 rounded-full bg-amber-50 text-sm font-medium text-neutral-800 border border-amber-100 shadow-[0_2px_0_rgba(248,250,252,1)] whitespace-nowrap">
              {monthLabel} 레시피북
            </div>
            <button
              onClick={handleNextMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white hover:bg-neutral-50"
            >
              <ChevronRight size={18} className="text-neutral-700" />
            </button>
          </div>
        </header>

        {/* 전체 레이아웃 */}
        <section className="mt-3 flex-1 flex flex-col lg:flex-row gap-4 pt-2">
          {/* 좌측: 달력 + 요약 */}
          <div className="w-full lg:flex-[0.7] flex flex-col gap-4">
            {/* 요약 바 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
              <SummaryChip
                label="이번 달 완성된 레시피(순 잔액)"
                value={formatMoney(totals.net)}
                emphasis
                note="수입 - 지출 - 적금"
              />
              <SummaryChip
                label="들어온 재료(수입 합계)"
                value={formatMoney(totals.income)}
                tone="income"
                note="월급·용돈·부수입"
              />
              <SummaryChip
                label="사용한 재료(지출 합계)"
                value={formatMoney(totals.expense)}
                tone="expense"
                note="고정·변동 지출"
              />
            </div>

            {/* 달력 */}
            <div className="flex-1 rounded-[24px] border border-amber-100 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] px-3 sm:px-4 py-4 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-amber-500">
                    monthly recipe board
                  </span>
                  <span className="h-[1px] w-12 bg-amber-200 hidden sm:block" />
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-neutral-400">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    수입 재료
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: BRAND_ORANGE }}
                    />
                    지출 재료
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    적금
                  </span>
                </div>
              </div>

              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-neutral-400 mb-2">
                {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                  <div
                    key={d}
                    className="text-center pb-2 border-b border-dashed border-amber-100"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* 날짜 셀 */}
              <div className="flex-1 grid grid-cols-7 auto-rows-[60px] sm:auto-rows-[72px] gap-[4px] sm:gap-[6px] mt-1">
                {cells.map((cell, idx) => {
                  if (!cell) {
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl bg-amber-50/40 border border-dashed border-amber-100/70"
                      />
                    );
                  }

                  const dateKey = getDateKey(cell);

                  const recipe = dailyStore[dateKey];
                  const income = Number(recipe?.incomeAmount || 0);
                  const expense = Number(recipe?.expenseAmount || 0);
                  const saving = Number(recipe?.savingAmount || 0);

                  // 대표 메모: 지출 메모 > 수입 메모 > 적금 메모 순으로 하나만 표시
                  const mainMemo =
                    recipe?.expenseMemo?.trim() ||
                    recipe?.incomeMemo?.trim() ||
                    recipe?.savingMemo?.trim() ||
                    "";

                  const isTodayKey = dateKey === todayKey;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleDayClick(cell)}
                      className={[
                        "relative flex flex-col rounded-2xl border px-1.5 sm:px-2 py-1.5 text-left transition-all",
                        "bg-white/90 hover:bg-amber-50/60 hover:-translate-y-[1px] hover:shadow-sm",
                        isTodayKey
                          ? "border-[rgba(255,138,61,0.9)] shadow-[0_0_0_1px_rgba(248,250,252,1)]"
                          : "border-amber-100",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-semibold text-neutral-700">
                          {cell.getDate()}
                        </span>
                        {(income > 0 || expense > 0 || saving > 0) && (
                          <span className="flex gap-0.5">
                            {income > 0 && (
                              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                            )}
                            {expense > 0 && (
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: BRAND_ORANGE }}
                              />
                            )}
                            {saving > 0 && (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            )}
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5 text-[10px] sm:text-[11px] leading-tight">
                        {income > 0 && (
                          <div className="flex justify-between">
                            <span className="text-neutral-400">재료(+)</span>
                            <span className="font-medium text-sky-600 whitespace-nowrap">
                              {income.toLocaleString("ko-KR")}
                            </span>
                          </div>
                        )}
                        {expense > 0 && (
                          <div className="flex justify-between">
                            <span className="text-neutral-400">사용(-)</span>
                            <span
                              className="font-medium whitespace-nowrap"
                              style={{ color: "#B45309" }}
                            >
                              -{expense.toLocaleString("ko-KR")}
                            </span>
                          </div>
                        )}
                        {saving > 0 && (
                          <div className="flex justify-between">
                            <span className="text-neutral-400">적금</span>
                            <span className="font-medium text-emerald-600 whitespace-nowrap">
                              {saving.toLocaleString("ko-KR")}
                            </span>
                          </div>
                        )}
                      </div>

                      {mainMemo && (
                        <div className="mt-1 pt-1 border-t border-dashed border-amber-100 text-[9px] sm:text-[10px] text-neutral-500 truncate">
                          {mainMemo}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 우측: 오늘의 메모 (모바일에서는 아래로 내려오게) */}
          <aside className="w-full lg:flex-[0.3] flex mt-1 lg:mt-0">
            <div className="w-full rounded-[24px] border border-amber-100 bg-[#FFFBEB] shadow-[0_14px_35px_rgba(217,119,6,0.22)] flex flex-col">
              <div className="px-4 py-3 border-b border-amber-100 flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-amber-900">
                    오늘의 메모
                  </span>
                  <span className="text-[11px] text-amber-700/80 whitespace-nowrap overflow-hidden text-ellipsis">
                    {todayKey.replace(/-/g, ".")} 장보기·약속·결제 알림을 적어두세요.
                  </span>
                </div>
                <button
                  onClick={handleAddMemoClick}
                  className="inline-flex h-7 items-center justify-center rounded-full px-3 text-[11px] font-medium shadow-sm shrink-0"
                  style={{
                    backgroundColor: BRAND_ORANGE,
                    color: "#101010",
                  }}
                >
                  +
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm max-h-[260px] lg:max-h-none">
                {memoLoading && (
                  <div className="text-xs text-neutral-400">
                    메모 불러오는 중...
                  </div>
                )}

                {!memoLoading && memoGlobalError && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-600">
                    {memoGlobalError}
                  </div>
                )}

                {!memoLoading && !memoGlobalError && todayMemos.length === 0 && (
                  <div className="text-xs text-neutral-400">
                    아직 오늘 메모가 없어요. 상단의 ‘+’ 버튼을 눌러 오늘의
                    소비·일정을 기록해 보세요.
                  </div>
                )}

                {!memoLoading &&
                  !memoGlobalError &&
                  todayMemos.map((m) => (
                    <MemoCard
                      key={m.id}
                      title={m.title}
                      dateLabel={todayKey.replace(/-/g, ".")}
                      detail={m.detail}
                      onClick={() => handleEditMemoClick(m)}
                    />
                  ))}
              </div>
            </div>
          </aside>
        </section>
      </div>

      {/* 플로팅 + 버튼 – 전체 입력용 (캘린더로 이동) */}
      <button
        className="fixed bottom-6 right-6 inline-flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-amber-400/50 border border-amber-200"
        style={{ backgroundColor: BRAND_ORANGE, color: "#101010" }}
        onClick={() => router.push("/dashboard/calendar/edit?date=" + todayKey)}
      >
        <Plus size={26} />
      </button>

      {/* === 메모 모달 === */}
      {memoModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-amber-100">
            <form onSubmit={handleMemoSave}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-amber-900">
                    {memoModalMode === "create"
                      ? "오늘의 메모 추가"
                      : "오늘의 메모 수정"}
                  </span>
                  <span className="text-[11px] text-amber-700/80">
                    {todayKey.replace(/-/g, ".")} 기준 메모입니다.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeMemoModal}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-amber-50"
                >
                  <X size={16} className="text-neutral-500" />
                </button>
              </div>

              <div className="px-4 py-3 space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-neutral-700">
                    제목
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                    placeholder="예: 친구 모임 / 카드 결제일 / 장보기 메모"
                    value={memoTitleInput}
                    onChange={(e) => setMemoTitleInput(e.target.value)}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-neutral-700">
                    내용
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 resize-none h-24"
                    placeholder="예: 저녁 모임 7시 / 회비 3만 · 택시비 1만 예상"
                    value={memoDetailInput}
                    onChange={(e) => setMemoDetailInput(e.target.value)}
                  />
                </div>

                {memoFormError && (
                  <div className="rounded-md bg-red-50 px-3 py-2 text-[11px] text-red-600">
                    {memoFormError}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-amber-100 bg-amber-50/60 rounded-b-2xl">
                {memoModalMode === "edit" && editingMemo && (
                  <button
                    type="button"
                    onClick={handleMemoDelete}
                    disabled={memoSubmitting}
                    className="text-[11px] text-red-500 hover:text-red-600 disabled:opacity-50"
                  >
                    메모 삭제
                  </button>
                )}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={closeMemoModal}
                  disabled={memoSubmitting}
                  className="mr-1 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-[11px] font-medium text-neutral-600 hover:bg-amber-50 disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={memoSubmitting}
                  className="rounded-full bg-[color:var(--brand-orange)] px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#f27422] disabled:opacity-60"
                  style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
                >
                  {memoSubmitting
                    ? "저장 중..."
                    : memoModalMode === "create"
                    ? "메모 저장"
                    : "수정 완료"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

/* ============================
 *  보조 컴포넌트
 * ============================ */

type SummaryChipProps = {
  label: string;
  value: string;
  tone?: "income" | "expense";
  emphasis?: boolean;
  note?: string;
};

function SummaryChip({ label, value, tone, emphasis, note }: SummaryChipProps) {
  const toneStyle =
    tone === "income"
      ? "border-sky-200 bg-sky-50 text-sky-900"
      : tone === "expense"
      ? "border-[rgba(255,138,61,0.4)] bg-[rgba(255,247,237,1)] text-[rgba(124,45,18,1)]"
      : "border-amber-100 bg-amber-50 text-neutral-900";

  return (
    <div
      className={[
        "flex flex-col justify-between rounded-2xl border px-3 py-2.5 shadow-sm",
        toneStyle,
        emphasis ? "shadow-[0_0_0_1px_rgba(251,146,60,0.6)]" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium">{label}</span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-neutral-400/80">
          summary
        </span>
      </div>
      <span className="mt-1 text-base font-semibold whitespace-nowrap">
        {value}
      </span>
      {note && (
        <span className="mt-1 text-[10px] text-neutral-500">{note}</span>
      )}
    </div>
  );
}

type MemoCardProps = {
  title: string;
  dateLabel: string;
  detail: string;
  tone?: "soft" | "strong";
  onClick?: () => void;
};

function MemoCard({
  title,
  dateLabel,
  detail,
  tone = "strong",
  onClick,
}: MemoCardProps) {
  const base =
    tone === "strong"
      ? "bg-white/90 border-amber-200"
      : "bg-amber-50/80 border-amber-100";
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left rounded-2xl px-3 py-2.5 flex flex-col gap-1.5 border shadow-sm transition hover:bg-amber-50 cursor-pointer",
        base,
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-amber-900">{title}</span>
        <span className="text-[10px] text-amber-700/80 whitespace-nowrap">
          {dateLabel}
        </span>
      </div>
      <div className="text-[11px] text-amber-800 leading-snug line-clamp-3">
        {detail}
      </div>
    </button>
  );
}

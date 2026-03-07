// src/app/dashboard/calendar/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BRAND_blue = "#5bbbf3"; // 지출레시피 메인 컬러

/** edit 페이지와 유사한 MoneyItem 타입 (DB JSON과 호환) */
type MoneyItem = {
  id?: string;
  label: string;
  amount: number;
};

/** Supabase에서 가져와서 달력이 쓰는 구조 */
type DailyRecipe = {
  incomeItems: MoneyItem[];
  expenseItems: MoneyItem[];
  savingItems: MoneyItem[];
  incomeTotal: number;
  expenseTotal: number;
  savingTotal: number;
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

/** ============================
 *  Recurring → daily_recipes 월 반영 유틸
 *  ============================ */

type Frequency = "monthly" | "weekly" | "yearly";
type Category = "expense" | "income" | "saving";

type RuleRow = {
  id: number;
  user_id: string;
  title: string;
  category: Category;
  frequency: Frequency;
  start_date: string; // date
  end_date: string | null; // date
  day_of_month: number | null;
  day_of_week: number | null;
  default_amount: number; // numeric
};

type OverrideRow = {
  rule_id: number;
  date: string; // YYYY-MM-DD (db: date)
  amount: number | null;
  is_skipped: boolean;
  note: string | null;
};

function formatMoney(v: number) {
  return v.toLocaleString("ko-KR") + "원";
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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

function lastDayOfMonth(year: number, month1to12: number) {
  return new Date(year, month1to12, 0).getDate();
}

function sumItems(items: MoneyItem[]) {
  return items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
}

function pickColumn(category: Category) {
  if (category === "income")
    return { itemsCol: "income_items", totalCol: "income_total" };
  if (category === "saving")
    return { itemsCol: "saving_items", totalCol: "saving_total" };
  return { itemsCol: "expense_items", totalCol: "expense_total" };
}

/** rule + (rangeStart~rangeEnd) 범위에서 발생 날짜 생성 */
function generateOccurrencesForRange(
  rule: RuleRow,
  rangeStart: string,
  rangeEnd: string
): string[] {
  const start = new Date(rangeStart + "T00:00:00");
  const end = new Date(rangeEnd + "T00:00:00");

  const ruleStart = new Date(rule.start_date + "T00:00:00");
  const ruleEnd = rule.end_date ? new Date(rule.end_date + "T00:00:00") : null;

  const from = ruleStart > start ? ruleStart : start;
  const to = ruleEnd && ruleEnd < end ? ruleEnd : end;
  if (from > to) return [];

  const out: string[] = [];

  if (rule.frequency === "monthly") {
    const dom = rule.day_of_month ?? ruleStart.getDate();
    let y = from.getFullYear();
    let m = from.getMonth(); // 0-based
    while (true) {
      const month1to12 = m + 1;
      const ld = lastDayOfMonth(y, month1to12);
      const day = Math.min(dom, ld); // 31일인데 없는 달이면 말일로
      const d = new Date(y, m, day);

      if (d >= from && d <= to) out.push(getDateKey(d));

      m += 1;
      if (m >= 12) {
        m = 0;
        y += 1;
      }
      if (new Date(y, m, 1) > to) break;
    }
  }

  if (rule.frequency === "weekly") {
    const targetDow = rule.day_of_week ?? ruleStart.getDay();
    const cur = new Date(from);
    const diff = (targetDow - cur.getDay() + 7) % 7;
    cur.setDate(cur.getDate() + diff);

    while (cur <= to) {
      out.push(getDateKey(cur));
      cur.setDate(cur.getDate() + 7);
    }
  }

  if (rule.frequency === "yearly") {
    const base = new Date(rule.start_date + "T00:00:00");
    const mm = base.getMonth();
    const dd = base.getDate();
    let y = from.getFullYear();

    while (true) {
      const ld = lastDayOfMonth(y, mm + 1);
      const day = Math.min(dd, ld);
      const d = new Date(y, mm, day);

      if (d >= from && d <= to) out.push(getDateKey(d));

      y += 1;
      if (new Date(y, 0, 1) > to) break;
    }
  }

  return Array.from(new Set(out)).sort();
}

async function chunkedUpsertDailyRecipes(rows: any[], chunkSize = 200) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("daily_recipes").upsert(chunk, {
      onConflict: "user_id,date",
    });
    if (error) throw error;
  }
}

function makeRecurringItemId(ruleId: number, date: string, category: Category) {
  return `rr:${ruleId}:${category}:${date}`;
}

function stripRecurringItems(items: any[]) {
  if (!Array.isArray(items)) return [];
  return items.filter((it) => {
    const id = typeof it?.id === "string" ? it.id : "";
    // ✅ 우리가 만든 정기항목 id prefix
    return !id.startsWith("rr:");
  });
}

/** 이 월(rangeStart~rangeEnd)에 대해 모든 정기 규칙을 daily_recipes에 반영 */
async function applyRecurringTblue(params: {
  userId: string;
  rangeStart: string; // YYYY-MM-DD
  rangeEnd: string; // YYYY-MM-DD
}) {
  const { userId, rangeStart, rangeEnd } = params;

  // 1) rules
  const { data: rules, error: rErr } = await supabase
    .from("recurring_rules")
    .select(
      "id,user_id,title,category,frequency,start_date,end_date,day_of_month,day_of_week,default_amount"
    )
    .eq("user_id", userId);

  if (rErr) throw rErr;

  const ruleList = (rules || []) as RuleRow[];

  // 2) overrides (해당 월 범위)
  const ruleIds = ruleList.map((r) => r.id);
  const { data: ovs, error: oErr } = await supabase
    .from("recurring_rule_overrides")
    .select("rule_id,date,amount,is_skipped,note")
    .in("rule_id", ruleIds)
    .gte("date", rangeStart)
    .lte("date", rangeEnd);

  if (oErr) throw oErr;

  const ovMap = new Map<string, OverrideRow>(); // key: `${ruleId}|${date}`
  (ovs || []).forEach((x: any) => {
    ovMap.set(`${x.rule_id}|${x.date}`, x as OverrideRow);
  });

  // 3) existing daily_recipes (해당 월 범위)
  const { data: existing, error: dErr } = await supabase
    .from("daily_recipes")
    .select("date,income_items,expense_items,saving_items")
    .eq("user_id", userId)
    .gte("date", rangeStart)
    .lte("date", rangeEnd);

  if (dErr) throw dErr;

  const dayMap = new Map<
    string,
    { income: MoneyItem[]; expense: MoneyItem[]; saving: MoneyItem[] }
  >();

  const touched = new Set<string>();

  (existing || []).forEach((row: any) => {
    dayMap.set(row.date, {
      income: stripRecurringItems(row.income_items),
      expense: stripRecurringItems(row.expense_items),
      saving: stripRecurringItems(row.saving_items),
    });

    // ✅ 룰이 0개여도 "청소된 결과"를 DB에 반영하기 위해 touched 처리
    touched.add(row.date);
  });

  // 4) 누적 반영
  for (const rule of ruleList) {
    const dates = generateOccurrencesForRange(rule, rangeStart, rangeEnd);
    if (dates.length === 0) continue;

    const label = rule.title.trim();
    const defAmt = Number(rule.default_amount) || 0;
    const { itemsCol } = pickColumn(rule.category);

    for (const date of dates) {
      const ov = ovMap.get(`${rule.id}|${date}`);
      if (ov?.is_skipped) continue;

      const amt = ov?.amount != null ? Number(ov.amount) : defAmt;
      if (!(amt > 0) || !label) continue;

      const prev = dayMap.get(date) ?? { income: [], expense: [], saving: [] };

      const next = {
        income: [...prev.income],
        expense: [...prev.expense],
        saving: [...prev.saving],
      };

      const target =
        itemsCol === "income_items"
          ? next.income
          : itemsCol === "saving_items"
          ? next.saving
          : next.expense;

      const recurringId = makeRecurringItemId(rule.id, date, rule.category);
      const idx = target.findIndex((it) => it?.id === recurringId);

      const nextItem: MoneyItem = { id: recurringId, label, amount: amt };

      if (idx >= 0) target[idx] = nextItem;
      else target.push(nextItem);

      dayMap.set(date, next);
      touched.add(date);
    }
  }

  // 5) upsert payload
  const payload: any[] = [];
  for (const date of touched) {
    const row = dayMap.get(date)!;
    payload.push({
      user_id: userId,
      date,
      income_items: row.income,
      expense_items: row.expense,
      saving_items: row.saving,
      income_total: sumItems(row.income),
      expense_total: sumItems(row.expense),
      saving_total: sumItems(row.saving),
      updated_at: new Date().toISOString(),
    });
  }

  if (payload.length) {
    await chunkedUpsertDailyRecipes(payload);
  }
}

export default function SpendingCalendarPage() {
  const router = useRouter();

  // ⬇ 현재 달 기준으로 시작
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  /** 날짜별 레시피 (Supabase에서 로드한 데이터) */
  const [dailyStore, setDailyStore] = useState<DailyStore>({});
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  /** 오늘 날짜 key (YYYY-MM-DD) */
  const todayKey = useMemo(() => getDateKey(new Date()), []);

  /** 오늘의 메모 (Supabase) */
  const [todayMemos, setTodayMemos] = useState<TodayMemo[]>([]);
  const [memoLoading, setMemoLoading] = useState<boolean>(true);
  const [memoGlobalError, setMemoGlobalError] = useState<string | null>(null);

  /** 메모 모달 상태 */
  const [memoModalOpen, setMemoModalOpen] = useState(false);
  const [memoModalMode, setMemoModalMode] =
    useState<"create" | "edit">("create");
  const [editingMemo, setEditingMemo] = useState<TodayMemo | null>(null);
  const [memoTitleInput, setMemoTitleInput] = useState("");
  const [memoDetailInput, setMemoDetailInput] = useState("");
  const [memoSubmitting, setMemoSubmitting] = useState(false);
  const [memoFormError, setMemoFormError] = useState<string | null>(null);

  const currentMonthKey = getMonthKey(currentDate);

  /** ⬇ 이 달의 daily_recipes를 Supabase에서 불러오기 (+ 정기 납부 자동 반영) */
  useEffect(() => {
    let mounted = true;

    const loadDailyRecipes = async () => {
      setDailyLoading(true);
      setDailyError(null);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (authError) {
          console.warn(
            "Supabase auth error (daily_recipes calendar):",
            authError.message
          );
          setDailyStore({});
          setDailyError("로그인 정보를 불러오지 못했어요.");
          setDailyLoading(false);
          return;
        }

        if (!user) {
          // 로그인 안 되어 있으면 레시피는 비워둔다
          setDailyStore({});
          setDailyLoading(false);
          return;
        }

        // 해당 월의 시작일과 마지막일 계산
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth(); // 0~11
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const firstKey = getDateKey(firstDay); // YYYY-MM-01
        const lastKey = getDateKey(lastDay); // YYYY-MM-마지막날

        // ✅ 정기 납부를 먼저 daily_recipes에 반영(실패해도 달력은 열리게)
        try {
          await applyRecurringTblue({
            userId: user.id,
            rangeStart: firstKey,
            rangeEnd: lastKey,
          });
        } catch (e) {
          console.warn("정기 납부 월 반영 실패(달력은 계속 로딩):", e);
        }

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
              saving_total
            `
          )
          .eq("user_id", user.id)
          .gte("date", firstKey)
          .lte("date", lastKey);

        if (!mounted) return;

        if (error) {
          console.error("daily_recipes 조회 실패:", error.message);
          setDailyStore({});
          setDailyError("이번 달 레시피를 불러오는 중 문제가 발생했어요.");
          setDailyLoading(false);
          return;
        }

        const nextStore: DailyStore = {};
        (data || []).forEach((row: any) => {
          const dateKey = row.date as string; // 'YYYY-MM-DD'

          const incomeItems = (row.income_items as MoneyItem[] | null) ?? [];
          const expenseItems = (row.expense_items as MoneyItem[] | null) ?? [];
          const savingItems = (row.saving_items as MoneyItem[] | null) ?? [];

          nextStore[dateKey] = {
            incomeItems,
            expenseItems,
            savingItems,
            incomeTotal: Number(row.income_total ?? 0),
            expenseTotal: Number(row.expense_total ?? 0),
            savingTotal: Number(row.saving_total ?? 0),
          };
        });

        setDailyStore(nextStore);
        setDailyLoading(false);
      } catch (err) {
        if (!mounted) return;
        console.error("daily_recipes 로딩 중 오류:", err);
        setDailyStore({});
        setDailyError("이번 달 레시피를 불러오는 중 오류가 발생했어요.");
        setDailyLoading(false);
      }
    };

    loadDailyRecipes();

    return () => {
      mounted = false;
    };
  }, [currentDate]);

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
          console.warn(
            "Supabase auth error (calendar memo):",
            authError.message
          );
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
          setMemoGlobalError(
            "오늘의 메모를 불러오는 중 문제가 발생했어요."
          );
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

  /** 이 달에 해당하는 날짜만 필터링해서 월 합계 계산 */
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let saving = 0;

    Object.entries(dailyStore).forEach(([date, recipe]) => {
      if (!date.startsWith(currentMonthKey)) return;
      income += Number(recipe.incomeTotal || 0);
      expense += Number(recipe.expenseTotal || 0);
      saving += Number(recipe.savingTotal || 0);
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
        "min-h-screen flex flex-col items-stretch overflow-x-hidden",
        "text-neutral-900 dark:text-neutral-100",
        "bg-[#ffffff]",
        "dark:bg-[radial-gradient(circle_at_1px_1px,#020617_1px,transparent_0)]",
        "[background-size:18px_18px]",
      ].join(" ")}
    >
      {/* 가운데 고정 폭 컨테이너 */}
      <div className="w-full lg:w-[65%] mx-auto flex flex-col min-w-0 px-4 sm:px-6 lg:px-0 pb-16">
        {/* 상단 바 - 레시피 타이틀 */}
        <header className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between pt-6 sm:pt-8 pb-2 ">
          <div className="flex items-start sm:items-center gap-3">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-semibold shadow-sm shrink-0"
              style={{
                backgroundColor: "#e5f2ff",
                color: "#9A3412",
              }}
            >
              🍳
            </span>
            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
                이번 달 지출 레시피
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                하루치 소비를 한 끼 레시피처럼 기록하고, 한 달의 식단표처럼
                모아서 봅니다.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handlePrevMonth}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              >
                <ChevronLeft
                  size={18}
                  className="text-neutral-700 dark:text-neutral-200"
                />
              </button>

              <div className="px-4 py-1.5 rounded-[10px] bg-blue-50 text-[12px] font-medium text-neutral-800 border border-blue-100 shadow-[0_2px_0_rgba(248,250,252,1)] whitespace-nowrap dark:bg-neutral-800 dark:text-blue-100 dark:border-neutral-700">
                {monthLabel} 레시피북
              </div>

              <button
                onClick={handleNextMonth}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              >
                <ChevronRight
                  size={18}
                  className="text-neutral-700 dark:text-neutral-200"
                />
              </button>
            </div>

            {/* 정기 납부 관리로 이동 */}
            <button
              onClick={() => router.push("/dashboard/recurring")}
              className="hidden sm:inline-flex w-full sm:w-auto rounded-full border border-blue-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 hover:bg-blue-50 dark:hover:bg-neutral-800"
            >
              정기 납부 관리
            </button>
          </div>
        </header>

        {/* 전체 레이아웃 */}
        <section className="mt-2 flex-1 flex flex-col lg:flex-row gap-4 ">
          {/* 좌측: 달력 + 요약 */}
          <div className="w-full lg:flex-[0.7] flex flex-col gap-4 min-w-0">
            {/* 요약 바: 모바일 2열 + 순잔액 2칸 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-[12px] min-w-0">
              <div className="col-span-2 sm:col-span-1 min-w-0">
                <SummaryChip
                  label="이번 달 완성된 레시피(순 잔액)"
                  value={formatMoney(totals.net)}
                  emphasis
                  note="수입 - 지출 - 적금"
                />
              </div>
              <div className="min-w-0">
                <SummaryChip
                  label="들어온 재료(수입 합계)"
                  value={formatMoney(totals.income)}
                  tone="income"
                  note="월급·용돈·부수입"
                />
              </div>
              <div className="min-w-0">
                <SummaryChip
                  label="사용한 재료(지출 합계)"
                  value={formatMoney(totals.expense)}
                  tone="expense"
                  note="고정·변동 지출"
                />
              </div>
            </div>

            {/* 달력 */}
            <div className="flex-1 rounded-[24px] border border-blue-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_45px_rgba(0,0,0,0.7)] px-2 sm:px-4 py-3 sm:py-4 flex flex-col min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-blue-500">
                    monthly recipe board
                  </span>
                  <span className="h-[1px] w-12 bg-blue-200 hidden sm:block" />
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-neutral-400 dark:text-neutral-500">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    수입 재료
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: BRAND_blue }}
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
              <div className="grid grid-cols-7 text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-neutral-400 dark:text-neutral-500 mb-2">
                {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                  <div
                    key={d}
                    className="text-center pb-2 border-b border-dashed border-blue-100 dark:border-neutral-700"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* 날짜 셀 */}
              <div className="flex-1 grid grid-cols-7 auto-rows-[52px] sm:auto-rows-[110px] gap-[4px] sm:gap-[6px] mt-1 min-w-0">
                {cells.map((cell, idx) => {
                  if (!cell) {
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl bg-blue-50/40 dark:bg-neutral-900/60 border border-dashed border-blue-100/70 dark:border-neutral-700"
                      />
                    );
                  }

                  const dateKey = getDateKey(cell);

                  const recipe = dailyStore[dateKey];
                  const income = Number(recipe?.incomeTotal || 0);
                  const expense = Number(recipe?.expenseTotal || 0);
                  const saving = Number(recipe?.savingTotal || 0);

                  // 대표 메모
                  const expenseLabel =
                    recipe?.expenseItems?.find((i) => i.label?.trim())?.label ??
                    "";
                  const incomeLabel =
                    recipe?.incomeItems?.find((i) => i.label?.trim())?.label ??
                    "";
                  const savingLabel =
                    recipe?.savingItems?.find((i) => i.label?.trim())?.label ??
                    "";
                  const mainMemo = expenseLabel || incomeLabel || savingLabel || "";

                  const isTodayKey = dateKey === todayKey;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleDayClick(cell)}
                      className={[
                        "relative flex flex-col rounded-2xl border px-1.5 sm:px-2 py-1.5 text-left transition-all",
                        "h-[52px] sm:h-[110px] overflow-hidden",
                        "bg-white/90 hover:bg-blue-50/60 active:bg-blue-50/80 hover:-translate-y-[1px] hover:shadow-sm active:scale-[0.99]",
                        "dark:bg-neutral-900/80 dark:hover:bg-neutral-800",
                        isTodayKey
                          ? "border-[rgba(61,145,255,0.9)] dark:border-blue-400 shadow-[0_0_0_1px_rgba(248,250,252,1)] dark:shadow-[0_0_0_1px_rgba(15,23,42,1)]"
                          : "border-blue-100 dark:border-neutral-700",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-100">
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
                                style={{ backgroundColor: BRAND_blue }}
                              />
                            )}
                            {saving > 0 && (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            )}
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5 text-[10px] sm:text-[11px] leading-tight overflow-hidden">
                        {income > 0 && (
                          <div className="flex justify-end sm:justify-between items-baseline">
                            <span className="text-[8px] leading-[8px] hidden sm:inline text-neutral-400 dark:text-neutral-500">
                              재료(+)
                            </span>
                            <span className="text-[7px] sm:text-[8px] leading-[8px] font-medium text-sky-600 dark:text-sky-300 whitespace-nowrap">
                              {income.toLocaleString("ko-KR")}
                            </span>
                          </div>
                        )}

                        {expense > 0 && (
                          <div className="flex justify-end sm:justify-between items-baseline">
                            <span className="text-[8px] leading-[8px] hidden sm:inline text-neutral-400 dark:text-neutral-500">
                              사용(-)
                            </span>
                            <span
                              className="text-[7px] sm:text-[8px] leading-[8px] font-medium whitespace-nowrap"
                              style={{ color: "#B45309" }}
                            >
                              -{expense.toLocaleString("ko-KR")}
                            </span>
                          </div>
                        )}

                        {saving > 0 && (
                          <div className="flex justify-end sm:justify-between items-baseline">
                            <span className="text-[8px] leading-[8px] hidden sm:inline text-neutral-400 dark:text-neutral-500">
                              적금
                            </span>
                            <span className="text-[7px] sm:text-[8px] leading-[8px] font-medium text-emerald-600 dark:text-emerald-300 whitespace-nowrap">
                              {saving.toLocaleString("ko-KR")}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 모바일에서는 메모 숨기고 sm 이상에서만 */}
                      {mainMemo && (
                        <div className="hidden sm:block mt-1 pt-1 border-t border-dashed border-blue-100 dark:border-neutral-700 text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                          {mainMemo}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {dailyLoading && (
                <p className="mt-2 text-[11px] text-neutral-400">
                  이번 달 레시피를 불러오는 중입니다…
                </p>
              )}
              {!dailyLoading && dailyError && (
                <p className="mt-2 text-[11px] text-red-500">{dailyError}</p>
              )}
            </div>
          </div>

          {/* 우측: 오늘의 메모 */}
          <aside className="w-full lg:flex-[0.3] flex mt-1 lg:mt-0 min-w-0">
            <div className="w-full rounded-[24px] border border-blue-100 dark:border-neutral-800 bg-[#ebf5ff] dark:bg-neutral-900 shadow-[0_14px_14px_#0620d938] dark:shadow-[0_14px_35px_rgba(0,0,0,0.7)] flex flex-col min-w-0">
              <div className="px-4 py-3 border-b border-blue-100 dark:border-neutral-800 flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                    오늘의 메모
                  </span>
                  <span className="text-[11px] text-blue-700/80 dark:text-blue-200/80 whitespace-nowrap overflow-hidden text-ellipsis">
                    {todayKey.replace(/-/g, ".")} 장보기·약속·결제 알림을 적어두세요.
                  </span>
                </div>
                <button
                  onClick={handleAddMemoClick}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full shadow-sm shrink-0"
                  style={{
                    backgroundColor: BRAND_blue,
                    color: "#111827",
                  }}
                  aria-label="메모 추가"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-[12px] max-h-[260px] lg:max-h-none min-w-0">
                {memoLoading && (
                  <div className="text-xs text-neutral-400 dark:text-neutral-500">
                    메모 불러오는 중...
                  </div>
                )}

                {!memoLoading && memoGlobalError && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-[11px] text-red-600 dark:text-red-300">
                    {memoGlobalError}
                  </div>
                )}

                {!memoLoading && !memoGlobalError && todayMemos.length === 0 && (
                  <div className="text-xs text-neutral-400 dark:text-neutral-500">
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

      {/* 플로팅 + 버튼 */}
      <button
        className="fixed bottom-6 right-6 inline-flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-blue-400/50 border border-blue-200 dark:border-blue-500"
        style={{ backgroundColor: BRAND_blue, color: "#111827" }}
        onClick={() => router.push("/dashboard/calendar/edit?date=" + todayKey)}
        aria-label="오늘 레시피 입력"
      >
        <Plus size={26} />
      </button>

      {/* === 메모 모달 === */}
      {memoModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl border border-blue-100 dark:border-neutral-700">
            <form onSubmit={handleMemoSave}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100 dark:border-neutral-700">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                    {memoModalMode === "create"
                      ? "오늘의 메모 추가"
                      : "오늘의 메모 수정"}
                  </span>
                  <span className="text-[11px] text-blue-700/80 dark:text-blue-200/80">
                    {todayKey.replace(/-/g, ".")} 기준 메모입니다.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeMemoModal}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-blue-50 dark:hover:bg-neutral-800"
                >
                  <X size={16} className="text-neutral-500 dark:text-neutral-300" />
                </button>
              </div>

              <div className="px-4 py-3 space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-neutral-700 dark:text-neutral-200">
                    제목
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-blue-200 dark:border-neutral-700 bg-blue-50/60 dark:bg-neutral-900/80 px-3 py-2 text-[12px] text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 dark:focus:ring-blue-500 dark:focus:border-blue-500 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                    placeholder="예: 친구 모임 / 카드 결제일 / 장보기 메모"
                    value={memoTitleInput}
                    onChange={(e) => setMemoTitleInput(e.target.value)}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-neutral-700 dark:text-neutral-200">
                    내용
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-blue-200 dark:border-neutral-700 bg-blue-50/60 dark:bg-neutral-900/80 px-3 py-2 text-[12px] text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 dark:focus:ring-blue-500 dark:focus:border-blue-500 resize-none h-24 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                    placeholder="예: 저녁 모임 7시 / 회비 3만 · 택시비 1만 예상"
                    value={memoDetailInput}
                    onChange={(e) => setMemoDetailInput(e.target.value)}
                  />
                </div>

                {memoFormError && (
                  <div className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-[11px] text-red-600 dark:text-red-300">
                    {memoFormError}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-blue-100 dark:border-neutral-700 bg-blue-50/60 dark:bg-neutral-900 rounded-b-2xl">
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
                  className="mr-1 rounded-full border border-blue-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-200 hover:bg-blue-50 dark:hover:bg-neutral-800 disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={memoSubmitting}
                  className="rounded-full bg-[color:var(--brand-blue)] px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#f27422] disabled:opacity-60"
                  style={{ ["--brand-blue" as any]: BRAND_blue }}
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
      ? [
          "border-sky-200 bg-sky-50 text-sky-900",
          "dark:border-sky-500/60 dark:bg-sky-500/10 dark:text-sky-100",
        ].join(" ")
      : tone === "expense"
      ? [
          "border-blue-100 bg-blue-50 text-[#12457c]",
          "dark:border-blue-500/60 dark:bg-blue-500/10 dark:text-blue-100",
        ].join(" ")
      : [
          "border-blue-100 bg-blue-50 text-neutral-900",
          "dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-100",
        ].join(" ");

  return (
    <div
      className={[
        "min-w-0 flex flex-col justify-between rounded-2xl border px-3 py-2.5 shadow-sm",
        toneStyle,
        emphasis
          ? "shadow-[0_0_0_1px_rgba(251,146,60,0.6)] dark:shadow-[0_0_0_1px_rgba(251,146,60,0.8)]"
          : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-[11px] font-medium min-w-0 truncate">
          {label}
        </span>
        <span className="hidden sm:inline text-[10px] uppercase tracking-[0.14em] text-neutral-400/80 dark:text-neutral-500/80 shrink-0">
          summary
        </span>
      </div>
      <span className="mt-1 text-base font-semibold truncate">{value}</span>
      {note && (
        <span className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
          {note}
        </span>
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
      ? "bg-white/90 border-blue-200 dark:bg-neutral-900/90 dark:border-neutral-700"
      : "bg-blue-50/80 border-blue-100 dark:bg-neutral-900/70 dark:border-neutral-800";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left rounded-2xl px-3 py-2.5 flex flex-col gap-1.5 border shadow-sm transition hover:bg-blue-50 dark:hover:bg-neutral-800 cursor-pointer",
        base,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-xs font-semibold text-blue-900 dark:text-blue-100 truncate min-w-0">
          {title}
        </span>
        <span className="text-[10px] text-blue-700/80 dark:text-blue-200/80 whitespace-nowrap shrink-0">
          {dateLabel}
        </span>
      </div>
      <div className="text-[11px] text-blue-800 dark:text-blue-100 leading-snug line-clamp-3">
        {detail}
      </div>
    </button>
  );
}

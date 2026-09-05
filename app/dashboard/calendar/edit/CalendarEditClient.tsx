// src/app/dashboard/calendar/edit/CalendarEditClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

const BRAND_blue = "#1f7a5b";
const BRAND_BLUE1 = "#c6e2d4";
const BRAND_BLUE2 = "#dcefe5";


/** 항목 단위 (메모 + 금액 + 카테고리) */
type MoneyItem = {
  id: string;

  // ✅ 상세 메모(자유입력) - 기존 label을 메모로 사용
  label: string;

  amount: number;

  // ✅ 드롭다운 분류
  category?: string; // 대분류
  subcategory?: string; // 소분류

  // ✅ 정기/수동 구분 메타 (jsonb에 같이 저장됨)
  source?: "recurring" | "manual";
  rule_id?: number;
};

type FormState = {
  incomeItems: MoneyItem[];
  expenseItems: MoneyItem[];
  savingItems: MoneyItem[];
};

type SectionKey = "income" | "expense" | "saving";

type MonthlyGoal = {
  expense: number;
  saving: number;
};

/** YYYY-MM-DD + delta일 이동 */
function getAdjacentDate(dateStr: string, delta: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  base.setDate(base.getDate() + delta);
  const yy = base.getFullYear();
  const mm = String(base.getMonth() + 1).padStart(2, "0");
  const dd = String(base.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function createItem(): MoneyItem {
  return {
    id: crypto.randomUUID(),
    label: "",
    amount: 0,
    category: "",
    subcategory: "",
    source: "manual",
  };
}

function isRecurringItem(it: MoneyItem) {
  return it?.source === "recurring" || typeof it?.rule_id === "number";
}

function normalizeLabel(s: any) {
  return String(s ?? "")
    .trim()
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ");
}

/* =========================
   ✅ 카테고리(대/소) 옵션
   ========================= */

type CategoryMap = Record<string, string[]>; // category -> subcategories

const CATEGORY_OPTIONS: Record<SectionKey, CategoryMap> = {
  expense: {
    식사: ["외식", "배달", "카페", "야식"],
    장보기: ["마트", "편의점", "온라인장보기"],
    교통: ["대중교통", "택시", "주유", "주차/통행료"],
    "주거/고정비": ["월세/관리비", "공과금", "통신비"],
    생활: ["생필품", "미용", "의류"],
    "의료/건강": ["병원", "약", "운동"],
    "경조/부조금": ["결혼/장례", "선물"],
    "교육/자기계발": ["학원", "도서", "구독/강의"],
    "여가/취미": ["여행", "문화생활", "게임"],
    금융: ["이자/수수료", "보험료"],
    기타: [],
  },
  income: {
    급여: ["월급", "상여"],
    부수입: ["알바", "프리랜스"],
    금융수입: ["이자", "배당"],
    "환급/지원금": ["환급", "지원금"],
    "용돈/선물": ["용돈", "선물"],
    기타: [],
  },
  saving: {
    예적금: ["적금", "예금", "청약"],
    투자: ["주식", "ETF", "코인", "연금"],
    비상금: [],
    상환: ["대출상환", "카드정산"],
    기타: [],
  },
};

/* =========================
   ✅ 정기/수동 중복 제거 유틸
   - 같은 (대분류/소분류/메모 정규화) + 금액이 동일하면 수동 제거
   ========================= */

// ✅ 메모 비교용 정규화
function baseMemo(label: any) {
  let s = normalizeLabel(label).replace(/^\[R\]\s*/i, "");

  s = s.replace(/\([^)]*\)/g, " ");
  s = s.replace(/（[^）]*）/g, " ");

  s = s.replace(/[\s\-_]*\d{4}(\d{2})?$/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

function fingerprint(it: MoneyItem) {
  const cat = normalizeLabel(it?.category);
  const sub = normalizeLabel(it?.subcategory);
  const memo = baseMemo(it?.label);
  return `${cat}||${sub}||${memo}`;
}

function isSameRecurringAsManual(rec: MoneyItem, manual: MoneyItem) {
  return (
    fingerprint(rec) === fingerprint(manual) &&
    (Number(rec.amount) || 0) === (Number(manual.amount) || 0)
  );
}

function dedupeManualSameAsRecurring(items: MoneyItem[]) {
  const arr = Array.isArray(items) ? items : [];

  const recurringList = arr.filter((it) => it && isRecurringItem(it)) as MoneyItem[];
  if (recurringList.length === 0) return arr;

  return arr.filter((it) => {
    if (!it) return false;
    if (isRecurringItem(it)) return true;

    for (const rec of recurringList) {
      if (isSameRecurringAsManual(rec, it)) return false;
    }
    return true;
  });
}

export default function CalendarEditClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date"); // YYYY-MM-DD

  const prettyDate = useMemo(() => {
    if (!dateParam) return "날짜 선택 안 됨";
    const [y, m, d] = dateParam.split("-").map((v) => parseInt(v, 10));
    if (!y || !m || !d) return dateParam;
    const date = new Date(y, m - 1, d);
    const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
    return `${y}년 ${m}월 ${d}일 (${weekday})`;
  }, [dateParam]);

  const [form, setForm] = useState<FormState>({
    incomeItems: [createItem()],
    expenseItems: [createItem()],
    savingItems: [createItem()],
  });

  const [loading, setLoading] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState<MonthlyGoal>({ expense: 0, saving: 0 });
  const [goalExpenseInput, setGoalExpenseInput] = useState("");
  const [goalSavingInput, setGoalSavingInput] = useState("");
  const [monthlyBaseTotals, setMonthlyBaseTotals] = useState({ expense: 0, saving: 0 });
  const [savingGoal, setSavingGoal] = useState(false);

  const monthKey = useMemo(() => dateParam?.slice(0, 7) ?? "", [dateParam]);

  /** 1) dateParam이 바뀔 때마다 Supabase에서 해당 날짜 데이터 조회 */
  useEffect(() => {
    if (!dateParam) return;
    const dateKey = dateParam as string;

    let cancelled = false;

    async function fetchFromSupabase() {
      try {
        setLoading(true);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.warn("Supabase auth error (daily_recipes load):", authError);
          setLoading(false);
          return;
        }
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("daily_recipes")
          .select(
            `
              income_items,
              expense_items,
              saving_items,
              income_total,
              expense_total,
              saving_total
            `
          )
          .eq("user_id", user.id)
          .eq("date", dateKey)
          .maybeSingle();

        if (error) {
          console.warn("Supabase daily_recipes load error:", error);
          setLoading(false);
          return;
        }
        if (cancelled) {
          setLoading(false);
          return;
        }

        if (!data) {
          setForm({
            incomeItems: [createItem()],
            expenseItems: [createItem()],
            savingItems: [createItem()],
          });
          setLoading(false);
          return;
        }

        // Supabase row -> 폼으로 (✅ source/rule_id/category/subcategory 보존)
        const normalizeItems = (arr: any[] | null, section: SectionKey): MoneyItem[] => {
          const items = Array.isArray(arr) ? arr : [];
          return items.map((it, idx) => {
            const label = normalizeLabel(it?.label);
            const amount = Number(it?.amount ?? 0) || 0;

            const id =
              typeof it?.id === "string" && it.id.trim()
                ? it.id
                : `legacy-${section}-${dateKey}-${idx}-${Math.random().toString(36).slice(2, 7)}`;

            const source =
              it?.source === "recurring"
                ? "recurring"
                : it?.source === "manual"
                ? "manual"
                : undefined;

            const rule_id = typeof it?.rule_id === "number" ? it.rule_id : undefined;

            const category = normalizeLabel(it?.category);
            const subcategory = normalizeLabel(it?.subcategory);

            return {
              id,
              label,
              amount,
              category: category || "",
              subcategory: subcategory || "",
              source: source ?? "manual",
              rule_id,
            };
          });
        };

        const incomeItemsRaw = normalizeItems(data.income_items as any[] | null, "income");
        const expenseItemsRaw = normalizeItems(data.expense_items as any[] | null, "expense");
        const savingItemsRaw = normalizeItems(data.saving_items as any[] | null, "saving");

        const incomeItems = dedupeManualSameAsRecurring(incomeItemsRaw);
        const expenseItems = dedupeManualSameAsRecurring(expenseItemsRaw);
        const savingItems = dedupeManualSameAsRecurring(savingItemsRaw);

        setForm({
          incomeItems: incomeItems.length > 0 ? incomeItems : [createItem()],
          expenseItems: expenseItems.length > 0 ? expenseItems : [createItem()],
          savingItems: savingItems.length > 0 ? savingItems : [createItem()],
        });

        setLoading(false);
      } catch (err) {
        console.error("Supabase daily_recipes load exception:", err);
        setLoading(false);
      }
    }

    fetchFromSupabase();
    return () => {
      cancelled = true;
    };
  }, [dateParam]);

  /** 현재 작성 중인 날짜를 제외한 월 누적과 목표를 불러온다. */
  useEffect(() => {
    if (!dateParam || !monthKey) return;
    let cancelled = false;

    const loadMonthlyGoalAndTotals = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user || cancelled) return;

      const savedGoals = (user.user_metadata?.monthly_goals ?? {}) as Record<string, MonthlyGoal>;
      const savedGoal = savedGoals[monthKey] ?? { expense: 0, saving: 0 };
      if (!cancelled) {
        setMonthlyGoal(savedGoal);
        setGoalExpenseInput(savedGoal.expense ? String(savedGoal.expense) : "");
        setGoalSavingInput(savedGoal.saving ? String(savedGoal.saving) : "");
      }

      const monthStart = `${monthKey}-01`;
      const [year, month] = monthKey.split("-").map(Number);
      const nextMonth = new Date(year, month, 1);
      const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;
      const { data } = await supabase
        .from("daily_recipes")
        .select("expense_total, saving_total")
        .eq("user_id", user.id)
        .gte("date", monthStart)
        .lt("date", monthEnd)
        .neq("date", dateParam);

      if (!cancelled) {
        setMonthlyBaseTotals({
          expense: (data ?? []).reduce((sum, row) => sum + Number(row.expense_total || 0), 0),
          saving: (data ?? []).reduce((sum, row) => sum + Number(row.saving_total || 0), 0),
        });
      }
    };

    loadMonthlyGoalAndTotals();
    return () => { cancelled = true; };
  }, [dateParam, monthKey]);

  /** 섹션별 아이템 접근용 유틸 */
  const getItems = (section: SectionKey) =>
    section === "income"
      ? form.incomeItems
      : section === "expense"
      ? form.expenseItems
      : form.savingItems;

  const setItems = (section: SectionKey, items: MoneyItem[]) => {
    setForm((prev) => ({
      ...prev,
      incomeItems: section === "income" ? items : prev.incomeItems,
      expenseItems: section === "expense" ? items : prev.expenseItems,
      savingItems: section === "saving" ? items : prev.savingItems,
    }));
  };

  /** 섹션별 합계 */
  const incomeTotal = useMemo(
    () => form.incomeItems.reduce((s, i) => s + (i.amount || 0), 0),
    [form.incomeItems]
  );
  const expenseTotal = useMemo(
    () => form.expenseItems.reduce((s, i) => s + (i.amount || 0), 0),
    [form.expenseItems]
  );
  const savingTotal = useMemo(
    () => form.savingItems.reduce((s, i) => s + (i.amount || 0), 0),
    [form.savingItems]
  );
  const monthlyExpense = monthlyBaseTotals.expense + expenseTotal;
  const monthlySaving = monthlyBaseTotals.saving + savingTotal;
  const expenseRate = monthlyGoal.expense > 0 ? (monthlyExpense / monthlyGoal.expense) * 100 : 0;
  const savingRate = monthlyGoal.saving > 0 ? (monthlySaving / monthlyGoal.saving) * 100 : 0;

  /** 아이템 추가/변경/삭제 */
  const handleAddItem = (section: SectionKey) => {
    const items = getItems(section);
    setItems(section, [...items, createItem()]);
  };

  const handleItemChange = (
    section: SectionKey,
    id: string,
    field: "label" | "amount" | "category" | "subcategory",
    value: string
  ) => {
    const items = getItems(section);
    const optionMap = CATEGORY_OPTIONS[section];

    const next = items.map((item) => {
      if (item.id !== id) return item;

      const recurring = isRecurringItem(item);

      // ✅ 정기 항목은 분류/메모 수정 금지
      if (recurring && (field === "label" || field === "category" || field === "subcategory")) {
        return item;
      }

      // ✅ 정기 항목 amount 변경은 "이 날짜만" override
      if (field === "amount" && recurring) {
        const ok = confirm(
          "이 항목은 정기 규칙으로 생성된 항목입니다.\n" +
            "여기서 금액을 바꾸면 '이 날짜만' 수정된 값으로 저장됩니다.\n" +
            "정기 규칙(다음 달/다음 회차)의 금액은 바뀌지 않아요.\n\n" +
            "계속할까요?"
        );
        if (!ok) return item;
      }

      // ✅ category 바꾸면 subcategory 리셋
      if (field === "category") {
        const cat = value;
        const subs = optionMap[cat] ?? [];
        return {
          ...item,
          category: cat,
          subcategory: subs.length ? "" : "",
        };
      }

      return {
        ...item,
        [field]: field === "amount" ? Number(value || 0) : value,
      };
    });

    setItems(section, dedupeManualSameAsRecurring(next));
  };

  const handleRemoveItem = (section: SectionKey, id: string) => {
    const items = getItems(section);
    if (items.length <= 1) {
      setItems(section, [createItem()]);
      return;
    }
    setItems(
      section,
      items.filter((item) => item.id !== id)
    );
  };

  const saveMonthlyGoal = async () => {
    if (!monthKey) return;
    const nextGoal = {
      expense: Number(goalExpenseInput.replace(/\D/g, "")) || 0,
      saving: Number(goalSavingInput.replace(/\D/g, "")) || 0,
    };
    setSavingGoal(true);
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) {
      setSavingGoal(false);
      toast.error("목표는 로그인 후 저장할 수 있어요.");
      return;
    }
    const monthlyGoals = { ...(user.user_metadata?.monthly_goals ?? {}), [monthKey]: nextGoal };
    const { error } = await supabase.auth.updateUser({ data: { monthly_goals: monthlyGoals } });
    setSavingGoal(false);
    if (error) {
      toast.error("목표를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setMonthlyGoal(nextGoal);
    setGoalExpenseInput(nextGoal.expense ? String(nextGoal.expense) : "");
    setGoalSavingInput(nextGoal.saving ? String(nextGoal.saving) : "");
    toast.success(`${monthKey.replace("-", "년 ")}월 목표를 저장했어요.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dateParam) {
      alert("날짜 정보가 없어 저장할 수 없습니다.");
      return;
    }
    const dateKey = dateParam as string;

    const ensureIds = (items: MoneyItem[]) =>
      items.map((i) => ({ ...i, id: i.id?.trim() ? i.id : crypto.randomUUID() }));

    // ✅ 저장 직전에도 중복 제거
    const fixedIncome = dedupeManualSameAsRecurring(form.incomeItems);
    const fixedExpense = dedupeManualSameAsRecurring(form.expenseItems);
    const fixedSaving = dedupeManualSameAsRecurring(form.savingItems);

    // ✅ 정리
    const clean = (items: MoneyItem[]) =>
      ensureIds(items)
        .map((i) => ({
          ...i,
          label: normalizeLabel(i.label),
          category: normalizeLabel(i.category),
          subcategory: normalizeLabel(i.subcategory),
          amount: Number(i.amount || 0) || 0,
        }))
        // 완전 빈 행 제거
        .filter((i) => i.category || i.label || i.amount);

    const cleanedIncome = clean(fixedIncome);
    const cleanedExpense = clean(fixedExpense);
    const cleanedSaving = clean(fixedSaving);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.warn("Supabase auth error (daily_recipes save):", authError);
        alert("로그인 정보를 불러오지 못했어요. 다시 로그인해 주세요.");
        return;
      }

      if (!user) {
        alert("로그인 후에 레시피를 서버에 저장할 수 있어요.");
        router.push("/sign-in");
        return;
      }

      const { error: upsertError } = await supabase
        .from("daily_recipes")
        .upsert(
          {
            user_id: user.id,
            date: dateKey,
            income_items: cleanedIncome,
            expense_items: cleanedExpense,
            saving_items: cleanedSaving,
            income_total: cleanedIncome.reduce((s, i) => s + (i.amount || 0), 0),
            expense_total: cleanedExpense.reduce((s, i) => s + (i.amount || 0), 0),
            saving_total: cleanedSaving.reduce((s, i) => s + (i.amount || 0), 0),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,date" }
        );

      if (upsertError) {
        console.error("daily_recipes upsert 실패:", upsertError.message);
        alert("서버에 레시피 저장 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }

      toast.success("오늘 지출 레시피가 저장되었어요!", {
        style: {
          background: "#FEF9C3", // tailwind: yellow-100
          color: "#713F12",      // tailwind: yellow-900
          border: "1px solid #FDE68A", // tailwind: blue-200
        },
      });
      router.push("/dashboard/calendar");
    } catch (err) {
      console.error("daily_recipes 저장 처리 중 오류:", err);
      toast.error("저장에 실패했어요. 잠시 후 다시 시도해주세요.", {
        style: {
          background: "#FEE2E2", // red-100
          color: "#7F1D1D",      // red-900
          border: "1px solid #FCA5A5", // red-300
        },
      });
    }
  };

  return (
    <main
      className={[
        "landing-surface min-h-screen text-neutral-900 flex flex-col items-stretch",
        "bg-[radial-gradient(circle_at_1px_1px,#e5e7eb_1px,transparent_0)]",
        "[background-size:18px_18px]",
      ].join(" ")}
    >
      <div className="w-full max-w-full lg:max-w-[1180px] mx-auto flex flex-col">
        <header className="flex items-center justify-between px-4 py-5 sm:px-8 lg:px-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/calendar")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white hover:bg-neutral-50"
            >
              <ArrowLeft size={18} className="text-neutral-700" />
            </button>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-semibold tracking-tight">
                  오늘의 지출 기록
                </h1>
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-500">
                금액부터 입력한 뒤, 필요한 경우에만 분류와 메모를 더해보세요.
              </p>
            </div>
          </div>

          <button
            type="submit"
            form="daily-recipe-form"
            className="inline-flex min-w-[120px] items-center justify-center gap-1.5 rounded-[10px] px-3 sm:px-4 py-1.5 text-xs sm:text-[12px] font-medium shadow-sm"
            style={{ backgroundColor: BRAND_blue, color: "#ffffff" }}
          >
            <Check size={16} />
            레시피 저장
          </button>
        </header>

        <section className="w-full max-w-full mx-auto flex flex-col px-4 pb-8 sm:px-8 lg:px-0">
          <form id="daily-recipe-form" onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="rounded-2xl border border-[#c6e2d4] bg-[#eaf5ef] px-4 py-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-[#176247]">
                    기록할 날짜
                  </span>
                  <span className="text-[12px] sm:text-base font-bold text-slate-900">
                    {prettyDate}
                  </span>
                </div>
                {dateParam && (
                  <span className="text-[11px] text-[#176247]">
                    {dateParam.replace(/-/g, ".")}
                  </span>
                )}
              </div>

              {dateParam && (
                <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-600">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/dashboard/calendar/edit?date=${getAdjacentDate(dateParam, -1)}`)
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-[#b9dfcb] bg-transparent px-3 py-1.5 font-medium transition hover:bg-white/60"
                  >
                    <ArrowLeft size={12} />
                    전날로 이동
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/dashboard/calendar/edit?date=${getAdjacentDate(dateParam, +1)}`)
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-[#b9dfcb] bg-transparent px-3 py-1.5 font-medium transition hover:bg-white/60"
                  >
                    다음날로 이동
                    <ArrowLeft size={12} className="rotate-180" />
                  </button>
                </div>
              )}
            </div>

            <p className="px-1 text-[11px] font-medium text-slate-500">
              <span className="font-bold text-[#176247]">빠른 기록</span> · 1. 금액 입력 → 2. 구분 선택 → 3. 메모는 필요할 때만 입력
            </p>

            <section className="grid overflow-hidden rounded-2xl border border-[#dbe9e1] bg-white lg:grid-cols-[0.9fr_1.1fr]">
              <div className="border-b border-[#edf3ef] p-4 lg:border-b-0 lg:border-r sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[14px] font-bold text-slate-900">이번 달 목표</h2>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">매달 원하는 지출 한도와 저축액을 설정하세요.</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#eaf5ef] px-2 py-1 text-[10px] font-bold text-[#176247]">{monthKey.replace("-", ".")}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <label className="min-w-0"><span className="mb-1 block text-[10px] font-semibold text-slate-500">지출 목표</span><input inputMode="numeric" value={goalExpenseInput ? Number(goalExpenseInput).toLocaleString("ko-KR") : ""} onChange={(e) => setGoalExpenseInput(e.target.value.replace(/\D/g, ""))} placeholder="예: 150만" className="h-9 w-full rounded-lg border border-[#dbe9e1] px-2.5 text-[12px] outline-none placeholder:text-slate-300 focus:border-[#1f7a5b]" /></label>
                  <label className="min-w-0"><span className="mb-1 block text-[10px] font-semibold text-slate-500">저축 목표</span><input inputMode="numeric" value={goalSavingInput ? Number(goalSavingInput).toLocaleString("ko-KR") : ""} onChange={(e) => setGoalSavingInput(e.target.value.replace(/\D/g, ""))} placeholder="예: 50만" className="h-9 w-full rounded-lg border border-[#dbe9e1] px-2.5 text-[12px] outline-none placeholder:text-slate-300 focus:border-[#1f7a5b]" /></label>
                </div>
                <button type="button" onClick={saveMonthlyGoal} disabled={savingGoal} className="mt-3 h-9 w-full rounded-lg bg-[#1f7a5b] text-[12px] font-bold text-white disabled:opacity-50">{savingGoal ? "저장 중…" : "이번 달 목표 저장"}</button>
              </div>

              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                <GoalProgress label="지출" current={monthlyExpense} target={monthlyGoal.expense} rate={expenseRate} mode="expense" />
                <GoalProgress label="저축" current={monthlySaving} target={monthlyGoal.saving} rate={savingRate} mode="saving" />
              </div>
            </section>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              <RecipeCard
                sectionKey="income"
                title="들어온 재료 (수입)"
                subtitle="월급, 용돈, 알바비 등"
                tone="income"
                total={incomeTotal}
                items={form.incomeItems}
                onAdd={() => handleAddItem("income")}
                onChange={(id, field, value) => handleItemChange("income", id, field, value)}
                onRemove={(id) => handleRemoveItem("income", id)}
                placeholderMemo="메모(선택): 예) 1월 월급"
                placeholderAmount="120000"
              />

              <RecipeCard
                sectionKey="expense"
                title="사용한 재료 (지출)"
                subtitle="식비, 교통, 공과금 등"
                tone="expense"
                total={expenseTotal}
                items={form.expenseItems}
                onAdd={() => handleAddItem("expense")}
                onChange={(id, field, value) => handleItemChange("expense", id, field, value)}
                onRemove={(id) => handleRemoveItem("expense", id)}
                placeholderMemo="메모(선택): 예) 점심/카페"
                placeholderAmount="34500"
              />

              <RecipeCard
                sectionKey="saving"
                title="따로 덜어둔 재료 (적금·저축)"
                subtitle="자동이체, CMA, 투자 등"
                tone="saving"
                total={savingTotal}
                items={form.savingItems}
                onAdd={() => handleAddItem("saving")}
                onChange={(id, field, value) => handleItemChange("saving", id, field, value)}
                onRemove={(id) => handleRemoveItem("saving", id)}
                placeholderMemo="메모(선택): 예) 청약"
                placeholderAmount="50000"
              />
            </div>

            {loading && (
              <p className="text-[11px] text-neutral-400">
                서버에서 오늘 레시피를 불러오는 중입니다…
              </p>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}

/* ============================
 *  보조 컴포넌트
 * ============================ */

type RecipeCardProps = {
  sectionKey: SectionKey;
  title: string;
  subtitle: string;
  tone: "income" | "expense" | "saving";
  total: number;
  items: MoneyItem[];
  onAdd: () => void;
  onChange: (
    id: string,
    field: "label" | "amount" | "category" | "subcategory",
    value: string
  ) => void;
  onRemove: (id: string) => void;
  placeholderMemo: string;
  placeholderAmount: string;
};

function GoalProgress({
  label,
  current,
  target,
  rate,
  mode,
}: {
  label: "지출" | "저축";
  current: number;
  target: number;
  rate: number;
  mode: "expense" | "saving";
}) {
  const hasTarget = target > 0;
  const isOver = mode === "expense" && hasTarget && current > target;
  const color = isOver ? "bg-rose-500" : "bg-[#1f7a5b]";
  const remaining = mode === "expense" ? Math.max(target - current, 0) : Math.max(target - current, 0);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-bold text-slate-800">이번 달 {label}</p>
        <span className={`text-[11px] font-bold ${isOver ? "text-rose-600" : "text-[#176247]"}`}>{hasTarget ? `${rate.toFixed(0)}%` : "목표 없음"}</span>
      </div>
      <p className="mt-2 text-[17px] font-bold tracking-[-0.04em] text-slate-900">{current.toLocaleString("ko-KR")}원</p>
      {hasTarget ? (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eaf5ef]"><div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(rate, 100)}%` }} /></div>
          <p className="mt-2 text-[10px] text-slate-500">목표 {target.toLocaleString("ko-KR")}원 · {mode === "expense" ? (isOver ? `${(current - target).toLocaleString("ko-KR")}원 초과` : `${remaining.toLocaleString("ko-KR")}원 남음`) : (current >= target ? "목표 달성" : `${remaining.toLocaleString("ko-KR")}원 더 모으면 달성`)}</p>
        </>
      ) : <p className="mt-2 text-[10px] text-slate-400">왼쪽에서 목표 금액을 설정해보세요.</p>}
    </div>
  );
}

function RecipeCard({
  sectionKey,
  title,
  subtitle,
  tone,
  total,
  items,
  onAdd,
  onChange,
  onRemove,
  placeholderMemo,
  placeholderAmount,
}: RecipeCardProps) {
  const toneStyle =
    tone === "income"
      ? "border-[#c6e2d4] bg-white"
      : tone === "expense"
      ? "border-[#dbe9e1] bg-white"
      : "border-[#c6e2d4] bg-[#f7fcf9]";

  const totalColor =
    tone === "income"
      ? "text-[#176247]"
      : tone === "expense"
      ? "text-slate-800"
      : "text-[#176247]";

  const optionMap = CATEGORY_OPTIONS[sectionKey];

  return (
    <section
      className={[
        "rounded-2xl border px-4 py-4 shadow-[0_3px_12px_rgba(31,122,91,0.05)] flex flex-col gap-3",
        toneStyle,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xs font-semibold text-neutral-800">{title}</h2>
          <p className="text-[11px] text-neutral-500">{subtitle}</p>
        </div>
        <div className="text-right">
          <span className="block text-[10px] text-neutral-400">오늘 합계</span>
          <span className={`text-[12px] font-semibold ${totalColor} whitespace-nowrap`}>
            {total ? total.toLocaleString("ko-KR") : 0}원
          </span>
        </div>
      </div>

      <div className="h-[1px] w-full bg-white/70 my-1" />

      <div className="space-y-1.5">
        {items.map((item) => {
          const recurring = isRecurringItem(item);

          return (
            <div
              key={item.id}
              className={[
                // ✅ 깨짐 해결 핵심: wrap + min-w + shrink-0 조합
                "flex flex-wrap items-center gap-1.5 rounded-xl bg-white/70 px-2 py-1.5",
              ].join(" ")}
            >
              {/* ✅ 구분/세부: 1개 드롭다운(단계형) */}
              <div className="order-2">
                <CategoryCascadeSelect
                  disabled={recurring}
                  category={item.category || ""}
                  subcategory={item.subcategory || ""}
                  optionMap={optionMap}
                  onChangeCategory={(v) => onChange(item.id, "category", v)}
                  onChangeSubcategory={(v) => onChange(item.id, "subcategory", v)}
                />
              </div>

              {/* ✅ 메모(label) */}
              <div className="order-3 flex flex-1 items-center gap-1">
                <input
                  type="text"
                  readOnly={recurring}
                  className={[
                    "w-full min-w-0 rounded-md border px-2 py-1  text-[10px] outline-none focus:border-neutral-400",
                    recurring
                      ? "border-neutral-200 bg-neutral-100 text-neutral-600 cursor-not-allowed"
                      : "border-neutral-200 bg-white",
                  ].join(" ")}
                  placeholder={placeholderMemo}
                  value={item.label}
                  onChange={(e) => onChange(item.id, "label", e.target.value)}
                />

                {recurring && (
                  <span className="shrink-0 rounded-full bg-neutral-200 px-1.5 py-0.5 text-[9px] text-neutral-700">
                    정기
                  </span>
                )}
              </div>

              {/* 금액 */}
              <div className="order-1 relative w-28 shrink-0">
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className={[
                    "w-full rounded-md border px-2 py-1 pr-7 text-[11px] text-right outline-none focus:border-neutral-400",
                    "border-neutral-200 bg-white",
                  ].join(" ")}
                  placeholder={placeholderAmount}
                  value={item.amount || ""}
                  onChange={(e) => onChange(item.id, "amount", e.target.value)}
                  title={
                    recurring
                      ? "정기 항목 금액을 바꾸면 '이 날짜만' 수정됩니다. 규칙 자체는 바뀌지 않아요."
                      : "금액"
                  }
                />
                <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-neutral-400">
                  원
                </span>
              </div>

              {/* 삭제 */}
              <button
                type="button"
                disabled={recurring}
                onClick={() => !recurring && onRemove(item.id)}
                className={[
                  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                  recurring
                    ? "border-neutral-200 text-neutral-300 cursor-not-allowed"
                    : "border-neutral-200 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700",
                ].join(" ")}
                title={recurring ? "정기 규칙에서 관리되는 항목이에요" : "삭제"}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="mt-1 inline-flex items-center justify-center gap-1 rounded-full border border-dashed border-neutral-300 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50"
      >
        <Plus size={12} />
        항목 추가 (수동)
      </button>
    </section>
  );
}

/* ============================
 * ✅ 구분/세부 1개짜리 단계형 드롭다운
 * ============================ */

type CategoryCascadeSelectProps = {
  disabled?: boolean;
  category: string;
  subcategory: string;
  optionMap: CategoryMap; // category -> subcategories
  onChangeCategory: (v: string) => void;
  onChangeSubcategory: (v: string) => void;
  className?: string;
};

function CategoryCascadeSelect({
  disabled,
  category,
  subcategory,
  optionMap,
  onChangeCategory,
  onChangeSubcategory,
}: CategoryCascadeSelectProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [customCategory, setCustomCategory] = React.useState("");

  // 드롭다운 내부에서 즉시 보여줄 임시 category
  const [activeCategory, setActiveCategory] = React.useState<string>(category || "");

  React.useEffect(() => {
    setActiveCategory(category || "");
  }, [category]);

  const cats = React.useMemo(() => Object.keys(optionMap), [optionMap]);
  const subs = activeCategory ? optionMap[activeCategory] ?? [] : [];

  const label = React.useMemo(() => {
    const c = (category || "").trim();
    const s = (subcategory || "").trim();
    if (!c) return "구분";
    if (!s) return `${c} · 세부`;
    return `${c} · ${s}`;
  }, [category, subcategory]);

  // ✅ 바깥 클릭 닫기 (ref.contains로 안정화)
  React.useEffect(() => {
    if (!open) return;

    const onDocPointerDown = (e: PointerEvent) => {
      const el = rootRef.current;
      const target = e.target as Node | null;
      if (!el || !target) return;
      if (!el.contains(target)) setOpen(false);
    };

    // pointerdown이 click보다 먼저라서 안정적
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open]);

  const selectCategory = (c: string) => {
  setActiveCategory(c);

  // ✅ 여기서 subcategory를 따로 호출하지 말 것!
  onChangeCategory(c);

  const nextSubs = optionMap[c] ?? [];
  if (!nextSubs.length) {
    setOpen(false);
    setStep(1);
    return;
  }
  setStep(2);
};

  const selectSubcategory = (s: string) => {
    onChangeSubcategory(s);
    setOpen(false);
    setStep(1);
  };

  const saveCustomCategory = () => {
    const value = customCategory.trim();
    if (!value) return;
    setActiveCategory(value);
    onChangeCategory(value);
    setOpen(false);
    setStep(1);
    setCustomCategory("");
  };

  return (
    <div ref={rootRef} className="relative shrink-0" data-cascade-root="1">
      <button
        type="button"
        disabled={!!disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
          setStep(1);
          setActiveCategory(category || "");
          setCustomCategory("");
        }}
        className={[
          "h-[32px] w-[7.25rem] rounded-md border px-2",
          "text-[11px] flex items-center justify-between gap-2",
          "outline-none focus:border-neutral-400",
          disabled
            ? "border-neutral-200 bg-neutral-100 text-neutral-600 cursor-not-allowed"
            : "border-neutral-200 bg-white hover:bg-neutral-50",
        ].join(" ")}
        title={disabled ? "정기 항목은 규칙에서 관리돼요" : "구분/세부 선택"}
      >
        <span className="min-w-0 truncate">{label}</span>
        <span className="text-neutral-400">▾</span>
      </button>

      {open && !disabled && (
        <div className="absolute right-0 z-50 mt-1 w-[240px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg sm:left-0 sm:right-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-100">
            <div className="text-[10px] text-neutral-500">
              {step === 1 ? "구분 선택" : step === 2 ? "세부 선택" : "새 구분 직접 입력"}
            </div>
            <div className="flex items-center gap-1">
              {step !== 1 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[10px] px-2 py-0.5 rounded-md border border-neutral-200 hover:bg-neutral-50"
                >
                  ← 뒤로
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[10px] px-2 py-0.5 rounded-md border border-neutral-200 hover:bg-neutral-50"
              >
                닫기
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[260px] overflow-auto py-1">
            {step === 1 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory("");
                    onChangeCategory("");   // ✅ 이것만 호출
                    setOpen(false);
                    setStep(1);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] hover:bg-neutral-50 text-neutral-500"
                >
                  구분 없음(초기화)
                </button>

                {cats.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => selectCategory(c)}
                    className={[
                      "w-full text-left px-3 py-2 text-[11px] hover:bg-neutral-50",
                      c === category ? "bg-blue-50/60" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{c}</span>
                      <span className="text-neutral-300">›</span>
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="mt-1 flex w-full items-center gap-2 border-t border-[#edf3ef] px-3 py-3 text-left text-[11px] font-semibold text-[#176247] hover:bg-[#f1f8f4]"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#eaf5ef] text-[14px]">+</span>
                  목록에 없는 구분 직접 입력
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button
                  type="button"
                  onClick={() => selectSubcategory("")}
                  className="w-full text-left px-3 py-2 text-[11px] hover:bg-neutral-50 text-neutral-500"
                >
                  세부 없음
                </button>

                {subs.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-neutral-400">
                    세부 항목이 없습니다.
                  </div>
                ) : (
                  subs.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => selectSubcategory(s)}
                      className={[
                        "w-full text-left px-3 py-2 text-[11px] hover:bg-neutral-50",
                        s === subcategory ? "bg-blue-50/60" : "",
                      ].join(" ")}
                    >
                      {s}
                    </button>
                  ))
                )}
              </>
            )}

            {step === 3 && (
              <div className="p-3">
                <p className="mb-2 text-[10px] leading-4 text-neutral-500">예: 반려동물, 부모님 용돈, 프로젝트 비용</p>
                <input
                  autoFocus
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveCustomCategory();
                    }
                  }}
                  maxLength={20}
                  placeholder="새 구분 이름"
                  className="h-9 w-full rounded-lg border border-[#c6e2d4] bg-white px-3 text-[12px] outline-none placeholder:text-neutral-400 focus:border-[#1f7a5b]"
                />
                <button
                  type="button"
                  onClick={saveCustomCategory}
                  disabled={!customCategory.trim()}
                  className="mt-2 h-9 w-full rounded-lg bg-[#1f7a5b] text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  이 구분으로 선택
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-neutral-100 bg-neutral-50 text-[10px] text-neutral-600">
            선택:{" "}
            <span className="font-medium">{activeCategory ? activeCategory : "구분"}</span>
            {subcategory ? <span className="font-medium"> · {subcategory}</span> : null}
          </div>
        </div>
      )}
    </div>
  );
}

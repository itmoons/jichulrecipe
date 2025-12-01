// src/app/dashboard/calendar/edit/CalendarEditClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Plus, X } from "lucide-react";

const BRAND_ORANGE = "#FF8A3D";
const LS_KEY_DAILY = "jichulrecipe_daily_recipes_v1";

/** 항목 단위 (이름 + 금액) */
type MoneyItem = {
  id: string;
  label: string;
  amount: number;
};

/** 새로운 형식 (참고용) */
type DailyRecipeNew = {
  incomeItems: MoneyItem[];
  expenseItems: MoneyItem[];
  savingItems: MoneyItem[];
  incomeTotal: number;
  expenseTotal: number;
  savingTotal: number;
  createdAt?: string;
  updatedAt?: string;
};

/** localStorage 전체 구조: key = YYYY-MM-DD */
type DailyStore = {
  [date: string]: any; // 구버전 호환을 위해 any
};

type FormState = {
  incomeItems: MoneyItem[];
  expenseItems: MoneyItem[];
  savingItems: MoneyItem[];
};

type SectionKey = "income" | "expense" | "saving";

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

function createItem(defaultLabel = ""): MoneyItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: defaultLabel,
    amount: 0,
  };
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

  const [store, setStore] = useState<DailyStore>({});
  const [form, setForm] = useState<FormState>({
    incomeItems: [createItem()],
    expenseItems: [createItem()],
    savingItems: [createItem()],
  });

  /** 1) 최초 1회: localStorage에서 store만 로드 */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LS_KEY_DAILY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DailyStore;
      setStore(parsed || {});
    } catch {
      // ignore
    }
  }, []);

  /** 2) dateParam 또는 store 바뀔 때마다 form 재구성 */
  useEffect(() => {
    if (!dateParam) return;

    const entry = store[dateParam];

    // 저장된 데이터가 없으면 빈 폼 초기화
    if (!entry) {
      setForm({
        incomeItems: [createItem()],
        expenseItems: [createItem()],
        savingItems: [createItem()],
      });
      return;
    }

    // ✅ 새 구조 (items 기반) 우선
    if (entry.incomeItems || entry.expenseItems || entry.savingItems) {
      setForm({
        incomeItems:
          entry.incomeItems && entry.incomeItems.length > 0
            ? entry.incomeItems
            : [createItem()],
        expenseItems:
          entry.expenseItems && entry.expenseItems.length > 0
            ? entry.expenseItems
            : [createItem()],
        savingItems:
          entry.savingItems && entry.savingItems.length > 0
            ? entry.savingItems
            : [createItem()],
      });
      return;
    }

    // ✅ 구 구조 (incomeAmount, incomeMemo 등) → 1개 항목으로 변환
    const incomeItem =
      entry.incomeAmount || entry.incomeMemo
        ? [
            {
              id: createItem().id,
              label: entry.incomeMemo || "",
              amount: Number(entry.incomeAmount || 0),
            },
          ]
        : [createItem()];

    const expenseItem =
      entry.expenseAmount || entry.expenseMemo
        ? [
            {
              id: createItem().id,
              label: entry.expenseMemo || "",
              amount: Number(entry.expenseAmount || 0),
            },
          ]
        : [createItem()];

    const savingItem =
      entry.savingAmount || entry.savingMemo
        ? [
            {
              id: createItem().id,
              label: entry.savingMemo || "",
              amount: Number(entry.savingAmount || 0),
            },
          ]
        : [createItem()];

    setForm({
      incomeItems: incomeItem,
      expenseItems: expenseItem,
      savingItems: savingItem,
    });
  }, [dateParam, store]);

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

  /** 아이템 추가/변경/삭제 */
  const handleAddItem = (section: SectionKey) => {
    const items = getItems(section);
    setItems(section, [...items, createItem()]);
  };

  const handleItemChange = (
    section: SectionKey,
    id: string,
    field: "label" | "amount",
    value: string
  ) => {
    const items = getItems(section);
    const next = items.map((item) =>
      item.id === id
        ? {
            ...item,
            [field]:
              field === "amount" ? Number(value || 0) : (value as string),
          }
        : item
    );
    setItems(section, next);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!dateParam) {
      alert("날짜 정보가 없어 저장할 수 없습니다.");
      return;
    }

    const cleanedIncome = form.incomeItems.filter(
      (i) => i.label.trim() || i.amount
    );
    const cleanedExpense = form.expenseItems.filter(
      (i) => i.label.trim() || i.amount
    );
    const cleanedSaving = form.savingItems.filter(
      (i) => i.label.trim() || i.amount
    );

    const now = new Date().toISOString();

    // 🔹 옛 포맷과 호환을 위해 메모 문자열도 만들어준다
    const incomeMemoText = cleanedIncome.map((i) => i.label).join(", ");
    const expenseMemoText = cleanedExpense.map((i) => i.label).join(", ");
    const savingMemoText = cleanedSaving.map((i) => i.label).join(", ");

    // 🔹 새 포맷 + 옛 포맷을 함께 저장
    const prev = store[dateParam] || {};

    const next: any = {
      // --- 새 구조 ---
      incomeItems: cleanedIncome.length > 0 ? cleanedIncome : [],
      expenseItems: cleanedExpense.length > 0 ? cleanedExpense : [],
      savingItems: cleanedSaving.length > 0 ? cleanedSaving : [],
      incomeTotal,
      expenseTotal,
      savingTotal,

      // --- 옛 구조 (캘린더에서 아직 읽고 있음) ---
      incomeAmount: incomeTotal,
      incomeMemo: incomeMemoText,
      expenseAmount: expenseTotal,
      expenseMemo: expenseMemoText,
      savingAmount: savingTotal,
      savingMemo: savingMemoText,

      createdAt: prev.createdAt ?? now,
      updatedAt: now,
    };

    const nextStore: DailyStore = {
      ...store,
      [dateParam]: next,
    };

    setStore(nextStore);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_KEY_DAILY, JSON.stringify(nextStore));
      console.log("✅ 저장된 daily_recipes:", nextStore); // 디버깅용
    }

    alert("오늘 지출 레시피가 저장되었어요!");
    router.push("/dashboard/calendar");
  };

  return (
    <main
      className={[
        "min-h-screen text-neutral-900 flex flex-col items-stretch bg-white",
        "bg-[radial-gradient(circle_at_1px_1px,#e5e7eb_1px,transparent_0)]",
        "[background-size:18px_18px]",
      ].join(" ")}
    >
      {/* 가운데 65% 폭 컨테이너 */}
      <div className="w-full max-w-full lg:max-w-[65vw] mx-auto flex flex-col">
        {/* 상단 바 */}
        <header className="flex items-center justify-between px-4 sm:px-8 lg:px-0 py-4  bg-white/90 ">
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
                  하루 지출 레시피 작성
                </h1>
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-500">
                수입·지출·적금 항목을 나눠서 기록해요.
              </p>
            </div>
          </div>

          <button
            type="submit"
            form="daily-recipe-form"
            className="inline-flex min-w-[120px] items-center justify-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium shadow-sm"
            style={{ backgroundColor: BRAND_ORANGE, color: "#f5f5f5ff" }}
          >
            <Check size={16} />
            레시피 저장
          </button>

        </header>

        {/* 내용 */}
        <section className="w-full max-w-full lg:max-w-[65vw] mx-auto flex flex-col">
          <form
            id="daily-recipe-form"
            onSubmit={handleSubmit}
            className="w-full  space-y-4"
          >
            {/* 날짜 정보 + 이전/다음날 이동 */}
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-amber-700">
                    오늘의 레시피 날짜
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-amber-900">
                    {prettyDate}
                  </span>
                </div>
                {dateParam && (
                  <span className="text-[11px] text-amber-700/80">
                    {dateParam.replace(/-/g, ".")}
                  </span>
                )}
              </div>

              {dateParam && (
                <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-600">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/dashboard/calendar/edit?date=${getAdjacentDate(
                          dateParam,
                          -1
                        )}`
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white/70 px-3 py-1 hover:bg-amber-50"
                  >
                    <ArrowLeft size={12} />
                    전날로 이동
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/dashboard/calendar/edit?date=${getAdjacentDate(
                          dateParam,
                          +1
                        )}`
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white/70 px-3 py-1 hover:bg-amber-50"
                  >
                    다음날로 이동
                    <ArrowLeft size={12} className="rotate-180" />
                  </button>
                </div>
              )}
            </div>

            {/* 3칸 레이아웃 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 수입 */}
              <RecipeCard
                title="들어온 재료 (수입)"
                subtitle="월급, 용돈, 알바비 등"
                tone="income"
                total={incomeTotal}
                items={form.incomeItems}
                onAdd={() => handleAddItem("income")}
                onChange={(id, field, value) =>
                  handleItemChange("income", id, field, value)
                }
                onRemove={(id) => handleRemoveItem("income", id)}
                placeholderLabel="예: 편의점 알바비"
                placeholderAmount="120000"
              />

              {/* 지출 */}
              <RecipeCard
                title="사용한 재료 (지출)"
                subtitle="식비, 교통, 공과금 등"
                tone="expense"
                total={expenseTotal}
                items={form.expenseItems}
                onAdd={() => handleAddItem("expense")}
                onChange={(id, field, value) =>
                  handleItemChange("expense", id, field, value)
                }
                onRemove={(id) => handleRemoveItem("expense", id)}
                placeholderLabel="예: 점심·카페·택시"
                placeholderAmount="34500"
              />

              {/* 적금/저축 */}
              <RecipeCard
                title="따로 덜어둔 재료 (적금·저축)"
                subtitle="자동이체, CMA, 투자 등"
                tone="saving"
                total={savingTotal}
                items={form.savingItems}
                onAdd={() => handleAddItem("saving")}
                onChange={(id, field, value) =>
                  handleItemChange("saving", id, field, value)
                }
                onRemove={(id) => handleRemoveItem("saving", id)}
                placeholderLabel="예: 청약·적금·투자"
                placeholderAmount="50000"
              />
            </div>
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
  title: string;
  subtitle: string;
  tone: "income" | "expense" | "saving";
  total: number;
  items: MoneyItem[];
  onAdd: () => void;
  onChange: (id: string, field: "label" | "amount", value: string) => void;
  onRemove: (id: string) => void;
  placeholderLabel: string;
  placeholderAmount: string;
};

function RecipeCard({
  title,
  subtitle,
  tone,
  total,
  items,
  onAdd,
  onChange,
  onRemove,
  placeholderLabel,
  placeholderAmount,
}: RecipeCardProps) {
  const toneStyle =
    tone === "income"
      ? "border-sky-200 bg-sky-50/80"
      : tone === "expense"
      ? "border-orange-200 bg-orange-50/80"
      : "border-emerald-200 bg-emerald-50/80";

  const totalColor =
    tone === "income"
      ? "text-sky-700"
      : tone === "expense"
      ? "text-orange-700"
      : "text-emerald-700";

  return (
    <section
      className={[
        "rounded-2xl border shadow-sm px-3.5 py-3 flex flex-col gap-2.5",
        toneStyle,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xs font-semibold text-neutral-800">{title}</h2>
          <p className="text-[11px] text-neutral-500">{subtitle}</p>
        </div>
        <div className="text-right">
          <span className="block text-[10px] text-neutral-400">
            오늘 합계
          </span>
          <span
            className={`text-sm font-semibold ${totalColor} whitespace-nowrap`}
          >
            {total ? total.toLocaleString("ko-KR") : 0}원
          </span>
        </div>
      </div>

      <div className="h-[1px] w-full bg-white/70 my-1" />

      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-1.5 rounded-xl bg-white/70 px-2 py-1.5"
          >
            <input
              type="text"
              className="flex-1 min-w-0 rounded-md border border-neutral-200 px-2 py-1 text-[11px] outline-none focus:border-neutral-400"
              placeholder={placeholderLabel}
              value={item.label}
              onChange={(e) => onChange(item.id, "label", e.target.value)}
            />
            <div className="relative w-24">
              <input
                type="number"
                min={0}
                className="w-full rounded-md border border-neutral-200 px-2 py-1 pr-7 text-[11px] text-right outline-none focus:border-neutral-400"
                placeholder={placeholderAmount}
                value={item.amount || ""}
                onChange={(e) => onChange(item.id, "amount", e.target.value)}
              />
              <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-neutral-400">
                원
              </span>
            </div>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="mt-1 inline-flex items-center justify-center gap-1 rounded-full border border-dashed border-neutral-300 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50"
      >
        <Plus size={12} />
        항목 추가
      </button>
    </section>
  );
}

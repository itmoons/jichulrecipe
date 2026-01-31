// src/app/dashboard/calendar/edit/CalendarEditClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const BRAND_ORANGE = "#FF8A3D";

/** 항목 단위 (이름 + 금액) */
type MoneyItem = {
  id: string;
  label: string;
  amount: number;

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
    id: crypto.randomUUID(),
    label: defaultLabel,
    amount: 0,
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
   ✅ 정기/수동 중복 제거 유틸
   - 정기 항목([R] 또는 source/rule_id)이 존재할 때,
   - 같은 제목(접두어 제거 기준) + 같은 금액인 수동 항목만 제거
   ========================= */

// ✅ [R] 제거 + 괄호(연도/메모) 제거 + 공백 정규화
function baseTitle(label: any) {
  let s = normalizeLabel(label).replace(/^\[R\]\s*/i, "");

  // 1) 괄호 안 내용 제거: (2026), （2026）, (재계약) 등
  s = s.replace(/\([^)]*\)/g, " ");
  s = s.replace(/（[^）]*）/g, " ");

  // 2) 뒤에 붙는 연도/월 같은 숫자 꼬리표 제거(원하면 더 엄격/완화 가능)
  //    예: "월급 2026", "월급-2026", "월급_2026" → "월급"
  s = s.replace(/[\s\-_]*\d{4}(\d{2})?$/g, " ");

  // 3) 최종 공백 정리
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function isSameRecurringAsManual(rec: MoneyItem, manual: MoneyItem) {
  // ✅ 같은 '베이스 타이틀' + 같은 금액이면 중복으로 판단
  return (
    baseTitle(rec.label) === baseTitle(manual.label) &&
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

    // ✅ 어떤 정기 항목과라도 (베이스 타이틀 + 금액) 동일이면 수동은 제거
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
          // 해당 날짜 데이터가 없으면 빈 폼
          setForm({
            incomeItems: [createItem()],
            expenseItems: [createItem()],
            savingItems: [createItem()],
          });
          setLoading(false);
          return;
        }

        // Supabase row -> 폼으로 (✅ source/rule_id 보존)
        const normalizeItems = (arr: any[] | null, section: SectionKey): MoneyItem[] => {
          const items = Array.isArray(arr) ? arr : [];
          return items.map((it, idx) => {
            const label = normalizeLabel(it?.label);
            const amount = Number(it?.amount ?? 0) || 0;

            // ✅ id가 없거나 비어 있으면 생성 (섹션/날짜/순번 기반)
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

            return {
              id,
              label,
              amount,
              source: source ?? "manual",
              rule_id,
            };
          });
        };

        // ✅ 원본 로드
        const incomeItemsRaw = normalizeItems(data.income_items as any[] | null, "income");
        const expenseItemsRaw = normalizeItems(data.expense_items as any[] | null, "expense");
        const savingItemsRaw = normalizeItems(data.saving_items as any[] | null, "saving");

        // ✅ 여기서 "정기+수동 중복" 제거 (화면 2줄 방지)
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

    const next = items.map((item) => {
      if (item.id !== id) return item;

      const recurring = isRecurringItem(item);

      // ✅ 정기 항목은 label 변경 금지 (규칙 title과 정합성 유지)
      if (field === "label" && recurring) return item;

      // ✅ 정기 항목 amount 변경은 "이 날짜만" 예외(override) 성격 → UX 경고
      if (field === "amount" && recurring) {
        const ok = confirm(
          "이 항목은 정기 규칙으로 생성된 항목입니다.\n" +
            "여기서 금액을 바꾸면 '이 날짜만' 수정된 값으로 저장됩니다.\n" +
            "정기 규칙(다음 달/다음 회차)의 금액은 바뀌지 않아요.\n\n" +
            "계속할까요?"
        );
        if (!ok) return item;
      }

      return {
        ...item,
        [field]: field === "amount" ? Number(value || 0) : (value as string),
      };
    });

    // ✅ 사용자가 편집한 뒤에도 화면에서 "정기+수동(완전 동일)"이 생기면 제거
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dateParam) {
      alert("날짜 정보가 없어 저장할 수 없습니다.");
      return;
    }
    const dateKey = dateParam as string;

    const ensureIds = (items: MoneyItem[]) =>
      items.map((i) => ({ ...i, id: i.id?.trim() ? i.id : crypto.randomUUID() }));

    // ✅ 저장 직전에도 "정기+수동 중복" 제거 (DB 중복 누적 방지)
    const fixedIncome = dedupeManualSameAsRecurring(form.incomeItems);
    const fixedExpense = dedupeManualSameAsRecurring(form.expenseItems);
    const fixedSaving = dedupeManualSameAsRecurring(form.savingItems);

    // ✅ label/amount 비었으면 제거
    const cleanedIncome = ensureIds(fixedIncome).filter((i) => normalizeLabel(i.label) || i.amount);
    const cleanedExpense = ensureIds(fixedExpense).filter((i) => normalizeLabel(i.label) || i.amount);
    const cleanedSaving = ensureIds(fixedSaving).filter((i) => normalizeLabel(i.label) || i.amount);

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

      // ✅ 정기 메타(source/rule_id)를 그대로 저장해야 정기 반영 로직이 안정적으로 동작
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

      alert("오늘 지출 레시피가 저장되었어요!");
      router.push("/dashboard/calendar");
    } catch (err) {
      console.error("daily_recipes 저장 처리 중 오류:", err);
      alert("서버에 레시피 저장 중 알 수 없는 오류가 발생했어요.");
    }
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
        <header className="flex items-center justify-between px-4 sm:px-8 lg:px-0 py-4 bg-white/90">
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
                수입·지출·적금 항목을 나눠서 기록해요. (정기 항목은 규칙에서 관리)
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
          <form id="daily-recipe-form" onSubmit={handleSubmit} className="w-full space-y-4">
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
                      router.push(`/dashboard/calendar/edit?date=${getAdjacentDate(dateParam, -1)}`)
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white/70 px-3 py-1 hover:bg-amber-50"
                  >
                    <ArrowLeft size={12} />
                    전날로 이동
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/dashboard/calendar/edit?date=${getAdjacentDate(dateParam, +1)}`)
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
                onChange={(id, field, value) => handleItemChange("income", id, field, value)}
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
                onChange={(id, field, value) => handleItemChange("expense", id, field, value)}
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
                onChange={(id, field, value) => handleItemChange("saving", id, field, value)}
                onRemove={(id) => handleRemoveItem("saving", id)}
                placeholderLabel="예: 청약·적금·투자"
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
          <span className="block text-[10px] text-neutral-400">오늘 합계</span>
          <span className={`text-sm font-semibold ${totalColor} whitespace-nowrap`}>
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
              className="flex items-center gap-1.5 rounded-xl bg-white/70 px-2 py-1.5"
            >
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <input
                  type="text"
                  readOnly={recurring}
                  className={[
                    "flex-1 min-w-0 rounded-md border px-2 py-1 text-[11px] outline-none focus:border-neutral-400",
                    recurring
                      ? "border-neutral-200 bg-neutral-100 text-neutral-600 cursor-not-allowed"
                      : "border-neutral-200 bg-white",
                  ].join(" ")}
                  placeholder={placeholderLabel}
                  value={item.label}
                  onChange={(e) => onChange(item.id, "label", e.target.value)}
                />

                {recurring && (
                  <span className="shrink-0 rounded-full bg-neutral-200 px-1.5 py-0.5 text-[9px] text-neutral-700">
                    정기
                  </span>
                )}
              </div>

              <div className="relative w-24">
                <input
                  type="number"
                  min={0}
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

              {/* ✅ 정기 항목 삭제 버튼 비활성화 */}
              <button
                type="button"
                disabled={recurring}
                onClick={() => !recurring && onRemove(item.id)}
                className={[
                  "inline-flex h-6 w-6 items-center justify-center rounded-full border",
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

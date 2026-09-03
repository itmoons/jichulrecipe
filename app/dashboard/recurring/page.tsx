"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./recurring.module.css";

/* =========================
   Types
   ========================= */
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
  created_at: string;
  updated_at: string;
};

type OverrideRow = {
  id?: number;
  rule_id: number;
  date: string; // YYYY-MM-DD (DB date)
  amount: number | null;
  is_skipped: boolean;
  note: string | null;
  created_at?: string;
};

type MoneyItem = {
  id?: string; // jsonb inside daily_recipes
  label: string;
  amount: number;
  source?: "recurring" | "manual";
  rule_id?: number;
};

type DailyRecipeRow = {
  date: string;
  income_items: MoneyItem[] | null;
  expense_items: MoneyItem[] | null;
  saving_items: MoneyItem[] | null;
  income_total: number | null;
  expense_total: number | null;
  saving_total: number | null;
};

/* =========================
   Helpers (date)
   ========================= */
const pad2 = (n: number) => String(n).padStart(2, "0");
const toYmd = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function monthRange(year: number, month1to12: number) {
  const start = new Date(year, month1to12 - 1, 1);
  const end = new Date(year, month1to12, 0);
  return { start: toYmd(start), end: toYmd(end) };
}

function isValidMonth(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

function lastDayOfMonth(year: number, month1to12: number) {
  return new Date(year, month1to12, 0).getDate();
}

function sumItems(items: MoneyItem[]) {
  return (items || []).reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
}

function pickColumn(category: Category) {
  if (category === "income") return { itemsCol: "income_items", totalCol: "income_total" };
  if (category === "saving") return { itemsCol: "saving_items", totalCol: "saving_total" };
  return { itemsCol: "expense_items", totalCol: "expense_total" };
}

/* =========================
   Recurring marker policy
   - "정기항목"은 표식이 있는 것만 정리한다.
   - title과 같은 label이라고 해서 지우면 안 됨(수동 입력과 충돌).
   ========================= */
const REC_PREFIX = "[R] ";
const recurringLabel = (title: string) => `${REC_PREFIX}${String(title ?? "").trim()}`;

// label normalize
const norm = (s: any) =>
  String(s ?? "")
    .trim()
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ");

function isRecurringItem(it: MoneyItem | any) {
  const label = norm(it?.label);
  const id = norm(it?.id);
  return (
    it?.source === "recurring" ||
    typeof it?.rule_id === "number" ||
    label.startsWith(REC_PREFIX) ||
    id.startsWith("rec-")
  );
}

function stripRecurring(items: MoneyItem[]) {
  const arr = Array.isArray(items) ? items : [];
  return arr.filter((it) => !isRecurringItem(it));
}

/* =========================
   Generate occurrences within range
   ========================= */
function generateOccurrencesForRange(rule: RuleRow, rangeStart: string, rangeEnd: string): string[] {
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
    let m = from.getMonth();
    while (true) {
      const month1to12 = m + 1;
      const ld = lastDayOfMonth(y, month1to12);
      const day = Math.min(dom, ld);
      const d = new Date(y, m, day);
      if (d >= from && d <= to) out.push(toYmd(d));
      m += 1;
      if (m >= 12) { m = 0; y += 1; }
      if (new Date(y, m, 1) > to) break;
    }
  }

  if (rule.frequency === "weekly") {
    const targetDow = rule.day_of_week ?? ruleStart.getDay();
    const cur = new Date(from);
    const diff = (targetDow - cur.getDay() + 7) % 7;
    cur.setDate(cur.getDate() + diff);
    while (cur <= to) {
      out.push(toYmd(cur));
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
      if (d >= from && d <= to) out.push(toYmd(d));
      y += 1;
      if (new Date(y, 0, 1) > to) break;
    }
  }

  return Array.from(new Set(out)).sort();
}

/* =========================
   daily_recipes upsert (chunked)
   ========================= */
async function chunkedUpsertDailyRecipes(rows: any[], chunkSize = 200) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("daily_recipes").upsert(chunk, {
      onConflict: "user_id,date",
    });
    if (error) throw error;
  }
}

/* =========================
   APPLY recurring to month(range)
   - existing daily_recipes 읽고 정기항목만 제거
   - 그 위에 규칙+예외로 정기항목 다시 생성
   - (중복 방지) rule_id + date 기반 고정 id로 덮어쓰기
   ========================= */
async function applyRecurringTblue(params: { userId: string; rangeStart: string; rangeEnd: string }) {
  const { userId, rangeStart, rangeEnd } = params;

  // 1) rules
  const { data: rules, error: rErr } = await supabase
    .from("recurring_rules")
    .select("*")
    .eq("user_id", userId)
    .order("id", { ascending: false });
  if (rErr) throw rErr;

  const ruleList = (rules || []) as RuleRow[];

  // 2) overrides within range
  const ruleIds = ruleList.map((r) => r.id);
  const overrideMap = new Map<string, OverrideRow>(); // key: ruleId|date

  if (ruleIds.length) {
    const { data: ovs, error: oErr } = await supabase
      .from("recurring_rule_overrides")
      .select("*")
      .in("rule_id", ruleIds)
      .gte("date", rangeStart)
      .lte("date", rangeEnd);

    if (oErr) throw oErr;
    (ovs || []).forEach((x: any) => overrideMap.set(`${x.rule_id}|${x.date}`, x as OverrideRow));
  }

  // 3) existing daily_recipes in range
  const { data: existing, error: dErr } = await supabase
    .from("daily_recipes")
    .select("date,income_items,expense_items,saving_items")
    .eq("user_id", userId)
    .gte("date", rangeStart)
    .lte("date", rangeEnd);
  if (dErr) throw dErr;

  // dayMap init with cleanup
  const dayMap = new Map<string, DailyRecipeRow>();
  (existing || []).forEach((row: any) => {
    const income = Array.isArray(row.income_items) ? stripRecurring(row.income_items) : [];
    const expense = Array.isArray(row.expense_items) ? stripRecurring(row.expense_items) : [];
    const saving = Array.isArray(row.saving_items) ? stripRecurring(row.saving_items) : [];

    dayMap.set(row.date, {
      date: row.date,
      income_items: income,
      expense_items: expense,
      saving_items: saving,
      income_total: sumItems(income),
      expense_total: sumItems(expense),
      saving_total: sumItems(saving),
    });
  });

  // if no rules: just write cleanup result (remove recurring residues)
  if (ruleList.length === 0) {
    const payload = (existing || []).map((row: any) => {
      const cleaned = dayMap.get(row.date)!;
      return {
        user_id: userId,
        date: row.date,
        income_items: cleaned.income_items ?? [],
        expense_items: cleaned.expense_items ?? [],
        saving_items: cleaned.saving_items ?? [],
        income_total: cleaned.income_total ?? 0,
        expense_total: cleaned.expense_total ?? 0,
        saving_total: cleaned.saving_total ?? 0,
        updated_at: new Date().toISOString(),
      };
    });

    if (payload.length) await chunkedUpsertDailyRecipes(payload);
    return { applied: payload.length };
  }

  // 4) apply rules
  const touchedDates = new Set<string>();

  for (const rule of ruleList) {
    const occ = generateOccurrencesForRange(rule, rangeStart, rangeEnd);
    if (!occ.length) continue;

    const defAmt = Number(rule.default_amount) || 0;
    const { itemsCol } = pickColumn(rule.category);

    for (const date of occ) {
      const ov = overrideMap.get(`${rule.id}|${date}`);
      if (ov?.is_skipped) continue;

      const amt = ov?.amount != null ? Number(ov.amount) : defAmt;
      if (amt <= 0) continue;

      const prev = dayMap.get(date);
      const baseIncome = Array.isArray(prev?.income_items) ? (prev!.income_items as MoneyItem[]) : [];
      const baseExpense = Array.isArray(prev?.expense_items) ? (prev!.expense_items as MoneyItem[]) : [];
      const baseSaving = Array.isArray(prev?.saving_items) ? (prev!.saving_items as MoneyItem[]) : [];

      const nextIncome = [...baseIncome];
      const nextExpense = [...baseExpense];
      const nextSaving = [...baseSaving];

      const target =
        itemsCol === "income_items" ? nextIncome :
        itemsCol === "saving_items" ? nextSaving :
        nextExpense;

      const rid = rule.id;
      const label = recurringLabel(rule.title);

      // ✅ (중복 방지) 같은 rule_id 항목이 있으면 덮어쓰기
      const idx = target.findIndex((it) => typeof it?.rule_id === "number" && it.rule_id === rid);

      const newItem: MoneyItem = {
        id: `rec-${rid}-${date}`,
        label,
        amount: amt,
        source: "recurring",
        rule_id: rid,
      };

      if (idx >= 0) target[idx] = newItem;
      else target.push(newItem);

      dayMap.set(date, {
        date,
        income_items: nextIncome,
        expense_items: nextExpense,
        saving_items: nextSaving,
        income_total: sumItems(nextIncome),
        expense_total: sumItems(nextExpense),
        saving_total: sumItems(nextSaving),
      });

      touchedDates.add(date);
    }
  }

  // 5) write dates = existing dates + touched dates
  const allDates = new Set<string>();
  (existing || []).forEach((row: any) => allDates.add(row.date));
  touchedDates.forEach((d) => allDates.add(d));

  // ensure row exists
  for (const date of allDates) {
    if (!dayMap.has(date)) {
      dayMap.set(date, {
        date,
        income_items: [],
        expense_items: [],
        saving_items: [],
        income_total: 0,
        expense_total: 0,
        saving_total: 0,
      });
    }
  }

  const payload: any[] = [];
  for (const date of allDates) {
    const row = dayMap.get(date)!;
    payload.push({
      user_id: userId,
      date,
      income_items: row.income_items ?? [],
      expense_items: row.expense_items ?? [],
      saving_items: row.saving_items ?? [],
      income_total: row.income_total ?? 0,
      expense_total: row.expense_total ?? 0,
      saving_total: row.saving_total ?? 0,
      updated_at: new Date().toISOString(),
    });
  }

  if (payload.length) await chunkedUpsertDailyRecipes(payload);
  return { applied: payload.length };
}

/* =========================
   Page
   ========================= */
function todayYmd() {
  return toYmd(new Date());
}

type TabKey = "rules" | "overrides";

type SortKey = "created_at" | "title" | "category" | "frequency" | "amount";
type SortDir = "asc" | "desc";

export function RecurringManagerPage({ embedded = false }: { embedded?: boolean }) {
  const [tab, setTab] = useState<TabKey>("rules");

  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("");

  // month picker
  const now = new Date();
  const [ym, setYm] = useState(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}`);

  // rules
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    category: "expense" as Category,
    frequency: "monthly" as Frequency,
    start_date: todayYmd(),
    end_date: "",
    day_of_month: new Date().getDate(),
    day_of_week: new Date().getDay(),
    default_amount: "0",
  });

  // sorting/filtering
  const [filterCategory, setFilterCategory] = useState<Category | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // overrides UI state
  const [ovCategory, setOvCategory] = useState<Category>("saving"); // 기본은 정기적금(저축)
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);

  // overrides map for current month
  const [overrideRows, setOverrideRows] = useState<OverrideRow[]>([]);
  const overrideMap = useMemo(() => {
    const m = new Map<string, OverrideRow>(); // date -> override
    overrideRows.forEach((r) => m.set(r.date, r));
    return m;
  }, [overrideRows]);

  // occurrences for selected rule in selected month
  const selectedRule = useMemo(
    () => (selectedRuleId ? rules.find((r) => r.id === selectedRuleId) ?? null : null),
    [selectedRuleId, rules]
  );

  const monthDates = useMemo(() => {
    const [y, m] = ym.split("-").map(Number);
    if (!y || !m) return { start: "", end: "" };
    return monthRange(y, m);
  }, [ym]);

  const occDates = useMemo(() => {
    if (!selectedRule || !monthDates.start || !monthDates.end) return [];
    return generateOccurrencesForRange(selectedRule, monthDates.start, monthDates.end);
  }, [selectedRule, monthDates.start, monthDates.end]);

  const displayedRules = useMemo(() => {
    const base = filterCategory === "all" ? rules : rules.filter((r) => r.category === filterCategory);

    const getVal = (r: RuleRow) => {
      if (sortKey === "created_at") return r.created_at ?? "";
      if (sortKey === "title") return norm(r.title);
      if (sortKey === "category") return r.category;
      if (sortKey === "frequency") return r.frequency;
      if (sortKey === "amount") return Number(r.default_amount) || 0;
      return "";
    };

    const sorted = [...base].sort((a, b) => {
      const va = getVal(a) as any;
      const vb = getVal(b) as any;

      if (sortKey === "amount") {
        const diff = (va as number) - (vb as number);
        return sortDir === "asc" ? diff : -diff;
      }

      // string compare
      const sa = String(va);
      const sb = String(vb);
      const cmp = sa.localeCompare(sb, "ko");
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [rules, filterCategory, sortKey, sortDir]);

  const activeDisplayedRules = useMemo(
    () => displayedRules.filter((rule) => !rule.end_date || rule.end_date >= todayYmd()),
    [displayedRules]
  );

  const expiredDisplayedRules = useMemo(
    () => displayedRules.filter((rule) => !!rule.end_date && rule.end_date < todayYmd()),
    [displayedRules]
  );

  async function refreshRules(uid: string) {
    const { data, error } = await supabase
      .from("recurring_rules")
      .select("*")
      .eq("user_id", uid)
      .order("id", { ascending: false });
    if (error) throw error;
    setRules((data || []) as RuleRow[]);
  }

  async function applySelectedMonth(uid: string) {
    if (!isValidMonth(ym)) throw new Error("적용할 월을 선택하세요.");
    const [y, m] = ym.split("-").map(Number);
    const { start, end } = monthRange(y, m);
    const res = await applyRecurringTblue({ userId: uid, rangeStart: start, rangeEnd: end });
    return { start, end, applied: res.applied };
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      title: "",
      category: "expense",
      frequency: "monthly",
      start_date: todayYmd(),
      end_date: "",
      day_of_month: new Date().getDate(),
      day_of_week: new Date().getDay(),
      default_amount: "0",
    });
  }

  // init auth
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? "";
      setUserId(uid);
      if (!uid) return;

      setLoading(true);
      try {
        await refreshRules(uid);
      } catch (e: any) {
        setLog(`오류: ${e?.message ?? String(e)}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // overrides fetch when tab/ym/selectedRule changes
  useEffect(() => {
    if (tab !== "overrides") return;
    if (!userId) return;
    if (!selectedRuleId) {
      setOverrideRows([]);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setLog("");

        const { start, end } = monthDates;
        if (!start || !end) return;

        const { data, error } = await supabase
          .from("recurring_rule_overrides")
          .select("*")
          .eq("rule_id", selectedRuleId)
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: true });

        if (error) throw error;
        setOverrideRows((data || []) as OverrideRow[]);
      } catch (e: any) {
        setLog(`오류: ${e?.message ?? String(e)}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [tab, userId, selectedRuleId, ym, monthDates.start, monthDates.end]);

  /* =========================
     Actions: Rules CRUD
     ========================= */
  async function handleSaveRule() {
    if (!userId) return setLog("로그인이 필요합니다.");
    if (!form.title.trim()) return setLog("항목명은 필수입니다.");
    if (!form.start_date) return setLog("시작일을 선택하세요.");
    if (form.end_date && form.end_date < form.start_date) return setLog("종료일은 시작일보다 빠를 수 없습니다.");

    if (form.frequency === "monthly" && (!Number.isInteger(Number(form.day_of_month)) || Number(form.day_of_month) < 1 || Number(form.day_of_month) > 31)) {
      return setLog("매월 납부일은 1일부터 31일 사이로 입력하세요.");
    }
    if (form.frequency === "weekly" && (!Number.isInteger(Number(form.day_of_week)) || Number(form.day_of_week) < 0 || Number(form.day_of_week) > 6)) {
      return setLog("매주 요일을 다시 선택하세요.");
    }

    const def = Number(form.default_amount);
    if (!Number.isFinite(def) || def <= 0) return setLog("기본 금액은 0원보다 크게 입력하세요.");

    setLoading(true);
    setLog("");
    try {
      const payload = {
        user_id: userId,
        title: form.title.trim(),
        category: form.category,
        frequency: form.frequency,
        start_date: form.start_date,
        end_date: form.end_date?.trim() ? form.end_date : null,
        day_of_month: form.frequency === "monthly" ? Number(form.day_of_month) : null,
        day_of_week: form.frequency === "weekly" ? Number(form.day_of_week) : null,
        default_amount: def,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("recurring_rules")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("recurring_rules").insert(payload);
        if (error) throw error;
      }

      await refreshRules(userId);
      resetForm();

      setLog("규칙 저장 완료. (달력 반영은 ‘선택 월에 적용(동기화)’에서 실행하세요.)");
    } catch (e: any) {
      setLog(`오류: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(rule: RuleRow) {
    setEditingId(rule.id);
    setForm({
      title: rule.title,
      category: rule.category,
      frequency: rule.frequency,
      start_date: rule.start_date,
      end_date: rule.end_date ?? "",
      day_of_month: rule.day_of_month ?? 1,
      day_of_week: rule.day_of_week ?? 0,
      default_amount: String(rule.default_amount ?? 0),
    });
    setTab("rules");
  }

  async function handleDeleteRule(ruleId: number) {
    if (!userId) return;
    const ok = confirm("이 정기 규칙을 삭제할까요? (해당 규칙의 예외 설정도 함께 삭제됩니다)");
    if (!ok) return;

    setLoading(true);
    setLog("");
    try {
      const { error } = await supabase
        .from("recurring_rules")
        .delete()
        .eq("id", ruleId)
        .eq("user_id", userId);
      if (error) throw error;

      await refreshRules(userId);
      if (selectedRuleId === ruleId) setSelectedRuleId(null);

      // 규칙 삭제는 daily_recipes에 남아있을 수 있는 해당 월 정기항목을 동기화로 정리하는 게 안전
      const ok2 = confirm("삭제 후 선택 월 달력을 동기화(정기항목 정리)할까요?");
      if (ok2) {
        const { start, end, applied } = await applySelectedMonth(userId);
        setLog(`삭제 완료 · 달력 동기화: ${start} ~ ${end} (${applied}일 업데이트)`);
      } else {
        setLog("삭제 완료");
      }
    } catch (e: any) {
      setLog(`오류: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncThisMonth() {
    if (!userId) return setLog("로그인이 필요합니다.");
    setLoading(true);
    setLog("선택 월 달력 동기화(정기항목 재계산) 중...");
    try {
      const { start, end, applied } = await applySelectedMonth(userId);
      setLog(`동기화 완료: ${start} ~ ${end} (${applied}일 업데이트)`);
    } catch (e: any) {
      setLog(`오류: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     Actions: Overrides (this month only)
     ========================= */
  function getEffectiveAmount(date: string) {
    const ov = overrideMap.get(date);
    if (ov?.is_skipped) return { kind: "skipped" as const, amount: 0 };
    if (ov && ov.amount != null) return { kind: "override" as const, amount: Number(ov.amount) || 0 };
    return { kind: "default" as const, amount: Number(selectedRule?.default_amount ?? 0) || 0 };
  }

  async function upsertOverride(input: { rule_id: number; date: string; amount: number | null; is_skipped: boolean; note?: string | null }) {
    const payload = {
      rule_id: input.rule_id,
      date: input.date,
      amount: input.amount,
      is_skipped: input.is_skipped,
      note: input.note ?? null,
      created_at: new Date().toISOString(),
    };

    // ✅ unique(rule_id, date)가 있어야 onConflict 가능 (SQL은 필요시 별도로 적용)
    const { error } = await supabase
      .from("recurring_rule_overrides")
      .upsert(payload, { onConflict: "rule_id,date" });

    if (error) throw error;
  }

  async function deleteOverride(ruleId: number, date: string) {
    const { error } = await supabase
      .from("recurring_rule_overrides")
      .delete()
      .eq("rule_id", ruleId)
      .eq("date", date);
    if (error) throw error;
  }

  async function handleSaveOverrideForDate(date: string, amountStr: string, isSkipped: boolean) {
    if (!userId) return setLog("로그인이 필요합니다.");
    if (!selectedRule) return setLog("규칙을 선택하세요.");

    const amt = amountStr.trim() === "" ? null : Number(amountStr);
    if (amt != null && (!Number.isFinite(amt) || amt < 0)) return setLog("금액은 0 이상 숫자여야 합니다.");
    if (!isSkipped && amt === 0) return setLog("0원으로 적용하려면 ‘스킵’을 선택하세요.");

    setLoading(true);
    setLog("");
    try {
      await upsertOverride({
        rule_id: selectedRule.id,
        date,
        amount: isSkipped ? null : amt,
        is_skipped: isSkipped,
        note: null,
      });

      // refresh overrides
      const { start, end } = monthDates;
      const { data, error } = await supabase
        .from("recurring_rule_overrides")
        .select("*")
        .eq("rule_id", selectedRule.id)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: true });
      if (error) throw error;
      setOverrideRows((data || []) as OverrideRow[]);

      // ✅ 예외 저장 후 선택 월 즉시 동기화
      const { start: s, end: e, applied } = await applySelectedMonth(userId);
      setLog(`예외 저장 완료 · 달력 동기화: ${s} ~ ${e} (${applied}일 업데이트)`);
    } catch (e: any) {
      setLog(`오류: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetOverrideForDate(date: string) {
    if (!userId) return setLog("로그인이 필요합니다.");
    if (!selectedRule) return setLog("규칙을 선택하세요.");

    const ok = confirm(`${date} 예외를 삭제하고 기본값으로 되돌릴까요?`);
    if (!ok) return;

    setLoading(true);
    setLog("");
    try {
      await deleteOverride(selectedRule.id, date);

      // refresh overrides
      const { start, end } = monthDates;
      const { data, error } = await supabase
        .from("recurring_rule_overrides")
        .select("*")
        .eq("rule_id", selectedRule.id)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: true });
      if (error) throw error;
      setOverrideRows((data || []) as OverrideRow[]);

      // sync
      const { start: s, end: e, applied } = await applySelectedMonth(userId);
      setLog(`예외 삭제(원복) 완료 · 달력 동기화: ${s} ~ ${e} (${applied}일 업데이트)`);
    } catch (e: any) {
      setLog(`오류: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     Derived: rules for override tab
     ========================= */
  const rulesForOverrideTab = useMemo(() => {
    return rules
      .filter((r) => r.category === ovCategory)
      .sort((a, b) => norm(a.title).localeCompare(norm(b.title), "ko"));
  }, [rules, ovCategory]);

  useEffect(() => {
    // 탭2에서 카테고리 바꾸면 선택 규칙 자동 세팅
    if (tab !== "overrides") return;
    if (!rulesForOverrideTab.length) {
      setSelectedRuleId(null);
      return;
    }
    // 기존 선택이 유효하면 유지, 아니면 첫 번째
    const exists = selectedRuleId && rulesForOverrideTab.some((r) => r.id === selectedRuleId);
    if (!exists) setSelectedRuleId(rulesForOverrideTab[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, ovCategory, rulesForOverrideTab, selectedRuleId]);

  /* =========================
     Render
     ========================= */
  return (
    <div id={embedded ? "recurring" : undefined} className={`${styles.page} ${embedded ? styles.embedded : ""}`}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.title}>{embedded ? "정기 레시피" : "정기 납부 관리"}</div>
            <div className={styles.subtitle}>
              {embedded
                ? "적금 자동이체부터 반복 지출까지 한 번 등록하고 달력에 반영하세요."
                : "반복되는 수입·지출·저축을 한 번 등록하고 달력에 반영하세요."}
            </div>
          </div>
          <span className={styles.badge}>자동 반영 관리</span>
        </div>

        {/* Tabs */}
        <div className={styles.topbar}>
          <div className={styles.tabRow}>
            <div className={styles.tabButtons}>
              <button className={styles.btnPrimary} data-active={tab === "rules"} onClick={() => setTab("rules")} disabled={loading}>정기 규칙</button>
              <button className={styles.btnSecondary} data-active={tab === "overrides"} onClick={() => setTab("overrides")} disabled={loading}>이번 달 예외</button>
            </div>
          </div>

          <div className={styles.monthRow}>
            <label className={styles.monthPicker}>
              <input className={styles.input} type="month" value={ym} onChange={(e) => setYm(e.target.value)} aria-label="달력에 반영할 월 선택" />
            </label>
            <button className={styles.btnPrimary} onClick={handleSyncThisMonth} disabled={loading}>
              {loading ? "동기화 중..." : "선택 월에 적용"}
            </button>
          </div>
        </div>


        {/* TAB: Rules */}
        {tab === "rules" && (
          <>
            <section className={styles.card}>
              <div className={styles.cardTitleRow}>
                <div>
                  <div className={styles.cardTitle}>{editingId ? "정기 규칙 수정" : "정기 규칙 추가"}</div>
                  <div className={styles.cardDesc}>규칙을 저장한 뒤 선택한 달에 적용하세요.</div>
                </div>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.label}>
                  <div className={styles.labelText}>항목명</div>
                  <input
                    className={styles.input}
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  />
                </label>

                <label className={styles.label}>
                  <div className={styles.labelText}>구분(daily_recipes 반영 위치)</div>
                  <select
                    className={styles.select}
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as Category }))}
                  >
                    <option value="expense">지출</option>
                    <option value="income">수입</option>
                    <option value="saving">저축(정기적금)</option>
                  </select>
                </label>

                <label className={styles.label}>
                  <div className={styles.labelText}>주기</div>
                  <select
                    className={styles.select}
                    value={form.frequency}
                    onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value as Frequency }))}
                  >
                    <option value="monthly">매월</option>
                    <option value="weekly">매주</option>
                    <option value="yearly">매년</option>
                  </select>
                </label>

                <label className={styles.label}>
                  <div className={styles.labelText}>기본 금액</div>
                  <input
                    className={styles.input}
                    value={form.default_amount}
                    inputMode="numeric"
                    onChange={(e) => setForm((p) => ({ ...p, default_amount: e.target.value }))}
                  />
                </label>

                <label className={styles.label}>
                  <div className={styles.labelText}>시작일</div>
                  <input
                    className={styles.input}
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                  />
                </label>

                <label className={styles.label}>
                  <div className={styles.labelText}>종료일(선택)</div>
                  <input
                    className={styles.input}
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                  />
                </label>

                {form.frequency === "monthly" && (
                  <label className={styles.label}>
                    <div className={styles.labelText}>매월 납부일</div>
                    <input
                      className={styles.input}
                      type="number"
                      min={1}
                      max={31}
                      value={form.day_of_month}
                      onChange={(e) => setForm((p) => ({ ...p, day_of_month: Number(e.target.value) }))}
                    />
                  </label>
                )}

                {form.frequency === "weekly" && (
                  <label className={styles.label}>
                    <div className={styles.labelText}>매주 요일</div>
                    <select
                      className={styles.select}
                      value={form.day_of_week}
                      onChange={(e) => setForm((p) => ({ ...p, day_of_week: Number(e.target.value) }))}
                    >
                      <option value={0}>일</option>
                      <option value={1}>월</option>
                      <option value={2}>화</option>
                      <option value={3}>수</option>
                      <option value={4}>목</option>
                      <option value={5}>금</option>
                      <option value={6}>토</option>
                    </select>
                  </label>
                )}
              </div>

              <div className={styles.btnPrimaryGroup}>
                <div className={styles.actionButtons}>
                <button className={styles.btnPrimary} disabled={loading} onClick={handleSaveRule}>
                  {editingId ? "규칙 수정 저장" : "규칙 저장"}
                </button>
                <button
                  className={styles.btnSecondary}
                  disabled={loading}
                  onClick={resetForm}
                >
                  초기화
                </button>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardTitleRow}>
                <div>
                  <div className={styles.cardTitle}>등록된 정기 규칙</div>
                  <div className={styles.cardDesc}>여기서는 규칙만 관리합니다. (달력 반영은 동기화 버튼)</div>
                </div>

                {/* Sorting / Filtering controls */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <select
                    className={styles.select}
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value as any)}
                    style={{ width: 140 }}
                  >
                    <option value="all">전체</option>
                    <option value="expense">지출</option>
                    <option value="income">수입</option>
                    <option value="saving">저축</option>
                  </select>

                  <select
                    className={styles.select}
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    style={{ width: 160 }}
                  >
                    <option value="created_at">정렬: 최신/과거</option>
                    <option value="title">정렬: 이름</option>
                    <option value="category">정렬: 구분</option>
                    <option value="frequency">정렬: 주기</option>
                    <option value="amount">정렬: 금액</option>
                  </select>

                  <select
                    className={styles.select}
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value as SortDir)}
                    style={{ width: 120 }}
                  >
                    <option value="desc">내림차순</option>
                    <option value="asc">오름차순</option>
                  </select>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead className={styles.thead}>
                    <tr>
                      <th>이름</th>
                      <th>구분</th>
                      <th>주기</th>
                      <th>기본금액</th>
                      <th>기간</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody className={styles.tbody}>
                    {activeDisplayedRules.length > 0 && (
                      <tr className={styles.ruleGroupRow}>
                        <td colSpan={6}>사용 중인 규칙 <span>{activeDisplayedRules.length}</span></td>
                      </tr>
                    )}
                    {activeDisplayedRules.map((r) => (
                      <tr key={r.id}>
                        <td className={styles.cellDate}>{r.title}</td>
                        <td>{r.category}</td>
                        <td>
                          {r.frequency}
                          {r.frequency === "monthly" && r.day_of_month != null ? ` (${r.day_of_month}일)` : ""}
                          {r.frequency === "weekly" && r.day_of_week != null ? ` (dow:${r.day_of_week})` : ""}
                        </td>
                        <td>{Number(r.default_amount).toLocaleString()}</td>
                        <td>
                          {r.start_date} {r.end_date ? `~ ${r.end_date}` : ""}
                        </td>
                        <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            className={styles.btnPrimary}
                            style={{ padding: "8px 10px" }}
                            disabled={loading}
                            onClick={() => startEdit(r)}
                          >
                            수정
                          </button>
                          <button
                            className={styles.btnDanger}
                            style={{ padding: "8px 10px" }}
                            disabled={loading}
                            onClick={() => handleDeleteRule(r.id)}
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}

                    {expiredDisplayedRules.length > 0 && (
                      <tr className={styles.ruleGroupRow} data-expired="true">
                        <td colSpan={6}>마감 완료된 규칙 <span>{expiredDisplayedRules.length}</span></td>
                      </tr>
                    )}
                    {expiredDisplayedRules.map((r) => (
                      <tr key={r.id} className={styles.expiredRuleRow}>
                        <td className={styles.cellDate}>
                          {r.title}<span className={styles.expiredPill}>마감</span>
                        </td>
                        <td>{r.category}</td>
                        <td>
                          {r.frequency}
                          {r.frequency === "monthly" && r.day_of_month != null ? ` (${r.day_of_month}일)` : ""}
                          {r.frequency === "weekly" && r.day_of_week != null ? ` (dow:${r.day_of_week})` : ""}
                        </td>
                        <td>{Number(r.default_amount).toLocaleString()}</td>
                        <td>{r.start_date} ~ {r.end_date}</td>
                        <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button className={styles.btnSecondary} style={{ padding: "8px 10px" }} disabled={loading} onClick={() => startEdit(r)}>수정</button>
                          <button className={styles.btnDanger} style={{ padding: "8px 10px" }} disabled={loading} onClick={() => handleDeleteRule(r.id)}>삭제</button>
                        </td>
                      </tr>
                    ))}

                    {displayedRules.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: 12, color: "#667085" }}>
                          아직 등록된 정기 규칙이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {!!log && <div className={styles.logBox}>{log}</div>}
            </section>
          </>
        )}

        {/* TAB: Overrides */}
        {tab === "overrides" && (
          <>
            <section className={styles.card}>
              <div className={styles.cardTitleRow}>
                <div>
                  <div className={styles.cardTitle}>이번 달 예외 설정</div>
                  <div className={styles.cardDesc}>
                    여기서는 <b>특정 달만</b> 금액을 바꾸거나(override), 한 번만 스킵합니다.
                    저장 시 <b>자동으로 선택 월 동기화</b>합니다.
                  </div>
                </div>
              </div>

              {/* Category picker + rule selector */}
              <div className={styles.formGrid}>
                <label className={styles.label}>
                  <div className={styles.labelText}>예외 대상 구분</div>
                  <select
                    className={styles.select}
                    value={ovCategory}
                    onChange={(e) => setOvCategory(e.target.value as Category)}
                  >
                    <option value="saving">저축(정기적금)</option>
                    <option value="income">수입</option>
                    <option value="expense">지출</option>
                  </select>
                </label>

                <label className={styles.label}>
                  <div className={styles.labelText}>예외 적용할 규칙 선택</div>
                  <select
                    className={styles.select}
                    value={selectedRuleId ?? ""}
                    onChange={(e) => setSelectedRuleId(e.target.value ? Number(e.target.value) : null)}
                  >
                    {rulesForOverrideTab.length === 0 && <option value="">규칙이 없습니다</option>}
                    {rulesForOverrideTab.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} (기본 {Number(r.default_amount).toLocaleString()}원)
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Occurrences list */}
              <div style={{ marginTop: 12 }}>
                <div className={styles.cardDesc} style={{ marginBottom: 8 }}>
                  선택한 월({ym})에서 발생하는 날짜별로 예외를 설정합니다.
                </div>

                {!selectedRule && (
                  <div style={{ padding: 12, color: "#667085" }}>규칙을 선택하세요.</div>
                )}

                {selectedRule && occDates.length === 0 && (
                  <div style={{ padding: 12, color: "#667085" }}>
                    이 월({ym})에는 발생 날짜가 없습니다. (시작/종료일 또는 주기 설정을 확인하세요)
                  </div>
                )}

                {selectedRule && occDates.length > 0 && (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead className={styles.thead}>
                        <tr>
                          <th>날짜</th>
                          <th>기본값</th>
                          <th>이번 달 값(예외)</th>
                          <th>스킵</th>
                          <th>액션</th>
                        </tr>
                      </thead>
                      <tbody className={styles.tbody}>
                        {occDates.map((date) => {
                          const ov = overrideMap.get(date);
                          const effective = getEffectiveAmount(date);

                          return (
                            <OverrideRowEditor
                              key={date}
                              date={date}
                              defaultAmount={Number(selectedRule.default_amount) || 0}
                              initAmount={ov?.amount != null ? String(ov.amount) : ""}
                              initSkipped={!!ov?.is_skipped}
                              status={effective.kind}
                              disabled={loading}
                              onSave={(amountStr, isSkipped) => handleSaveOverrideForDate(date, amountStr, isSkipped)}
                              onReset={() => handleResetOverrideForDate(date)}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {!!log && <div className={styles.logBox}>{log}</div>}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default RecurringManagerPage;

/* =========================
   Override row editor component
   ========================= */
function OverrideRowEditor(props: {
  date: string;
  defaultAmount: number;
  initAmount: string;
  initSkipped: boolean;
  status: "default" | "override" | "skipped";
  disabled: boolean;
  onSave: (amountStr: string, isSkipped: boolean) => void;
  onReset: () => void;
}) {
  const { date, defaultAmount, initAmount, initSkipped, status, disabled, onSave, onReset } = props;
  const [amountStr, setAmountStr] = useState(initAmount);
  const [skipped, setSkipped] = useState(initSkipped);

  useEffect(() => setAmountStr(initAmount), [initAmount]);
  useEffect(() => setSkipped(initSkipped), [initSkipped]);

  const statusText =
    status === "default" ? "기본" :
    status === "override" ? "예외" :
    "스킵";

  return (
    <tr>
      <td className={styles.cellDate}>
        {date} <span style={{ color: "#667085", fontWeight: 700, marginLeft: 6 }}>({statusText})</span>
      </td>
      <td>{defaultAmount.toLocaleString()}원</td>
      <td>
        <input
          className={styles.input}
          style={{ width: 160 }}
          inputMode="numeric"
          disabled={disabled || skipped}
          placeholder="비우면 기본값"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
        />
      </td>
      <td>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={skipped}
            disabled={disabled}
            onChange={(e) => setSkipped(e.target.checked)}
          />
          스킵
        </label>
      </td>
      <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          className={styles.btnPrimary}
          style={{ padding: "8px 10px" }}
          disabled={disabled}
          onClick={() => onSave(amountStr, skipped)}
        >
          예외 저장
        </button>
        <button
          className={styles.btnDanger}
          style={{ padding: "8px 10px" }}
          disabled={disabled}
          onClick={onReset}
        >
          예외 삭제(원복)
        </button>
      </td>
    </tr>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./recurring.module.css";

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
  date: string; // YYYY-MM-DD (DB는 date)
  amount: number | null;
  is_skipped: boolean;
  note: string | null;
};

type MoneyItem = { label: string; amount: number };

type DailyRecipeRow = {
  date: string;
  income_items: MoneyItem[] | null;
  expense_items: MoneyItem[] | null;
  saving_items: MoneyItem[] | null;
  income_total: number | null;
  expense_total: number | null;
  saving_total: number | null;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const toYmd = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function monthRange(year: number, month1to12: number) {
  const start = new Date(year, month1to12 - 1, 1);
  const end = new Date(year, month1to12, 0);
  return { start: toYmd(start), end: toYmd(end) };
}

function lastDayOfMonth(year: number, month1to12: number) {
  return new Date(year, month1to12, 0).getDate();
}

function sumItems(items: MoneyItem[]) {
  return items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
}

function pickColumn(category: Category) {
  if (category === "income") return { itemsCol: "income_items", totalCol: "income_total" };
  if (category === "saving") return { itemsCol: "saving_items", totalCol: "saving_total" };
  return { itemsCol: "expense_items", totalCol: "expense_total" };
}

/** rule + (start~end) 범위에서 발생 날짜 생성 */
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
    let m = from.getMonth(); // 0-based
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

async function chunkedUpsertDailyRecipes(rows: any[], chunkSize = 200) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("daily_recipes").upsert(chunk, {
      onConflict: "user_id,date",
    });
    if (error) throw error;
  }
}

/** 특정 월 범위에 대해 “모든 규칙”을 daily_recipes에 반영 */
async function applyRecurringToRange(params: {
  userId: string;
  rangeStart: string; // YYYY-MM-DD
  rangeEnd: string;   // YYYY-MM-DD
}) {
  const { userId, rangeStart, rangeEnd } = params;

  // 1) rules 불러오기
  const { data: rules, error: rErr } = await supabase
    .from("recurring_rules")
    .select("*")
    .eq("user_id", userId)
    .order("id", { ascending: false });

  if (rErr) throw rErr;

  const ruleList = (rules || []) as RuleRow[];
  if (ruleList.length === 0) return { applied: 0 };

  // 2) overrides 범위 내 가져오기 (date type이라 YYYY-MM-DD로 비교 가능)
  const ruleIds = ruleList.map((r) => r.id);

  const { data: ovs, error: oErr } = await supabase
    .from("recurring_rule_overrides")
    .select("*")
    .in("rule_id", ruleIds)
    .gte("date", rangeStart)
    .lte("date", rangeEnd);

  if (oErr) throw oErr;

  const overrideMap = new Map<string, OverrideRow>(); // key: `${ruleId}|${date}`
  (ovs || []).forEach((x: any) => {
    overrideMap.set(`${x.rule_id}|${x.date}`, x as OverrideRow);
  });

  // 3) 기존 daily_recipes 범위 조회
  const { data: existing, error: dErr } = await supabase
    .from("daily_recipes")
    .select("date,income_items,expense_items,saving_items,income_total,expense_total,saving_total")
    .eq("user_id", userId)
    .gte("date", rangeStart)
    .lte("date", rangeEnd);

  if (dErr) throw dErr;

  const dayMap = new Map<string, DailyRecipeRow>();
  (existing || []).forEach((row: any) => dayMap.set(row.date, row as DailyRecipeRow));

  // 4) 날짜별로 “여러 규칙”을 누적 반영
  const upsertPayload: any[] = [];
  const touchedDates = new Set<string>();

  for (const rule of ruleList) {
    const occ = generateOccurrencesForRange(rule, rangeStart, rangeEnd);
    if (occ.length === 0) continue;

    const label = rule.title;
    const defAmt = Number(rule.default_amount) || 0;
    const { itemsCol } = pickColumn(rule.category);

    for (const date of occ) {
      const ov = overrideMap.get(`${rule.id}|${date}`);
      if (ov?.is_skipped) continue;

      const amt = ov?.amount != null ? Number(ov.amount) : defAmt;
      if (amt <= 0) continue;

      const prev = dayMap.get(date);

      const baseIncome: MoneyItem[] = Array.isArray(prev?.income_items) ? (prev!.income_items as any) : [];
      const baseExpense: MoneyItem[] = Array.isArray(prev?.expense_items) ? (prev!.expense_items as any) : [];
      const baseSaving: MoneyItem[] = Array.isArray(prev?.saving_items) ? (prev!.saving_items as any) : [];

      const nextIncome = [...baseIncome];
      const nextExpense = [...baseExpense];
      const nextSaving = [...baseSaving];

      const target =
        itemsCol === "income_items" ? nextIncome :
        itemsCol === "saving_items" ? nextSaving :
        nextExpense;

      // 같은 label 있으면 덮어쓰기(정기 규칙 1개 = label 1개라는 가정)
      const idx = target.findIndex((it) => it?.label === label);
      if (idx >= 0) target[idx] = { label, amount: amt };
      else target.push({ label, amount: amt });

      const merged: DailyRecipeRow = {
        date,
        income_items: nextIncome,
        expense_items: nextExpense,
        saving_items: nextSaving,
        income_total: sumItems(nextIncome),
        expense_total: sumItems(nextExpense),
        saving_total: sumItems(nextSaving),
      };

      dayMap.set(date, merged);
      touchedDates.add(date);
    }
  }

  // touchedDates만 upsert payload 생성
  for (const date of touchedDates) {
    const row = dayMap.get(date)!;
    upsertPayload.push({
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

  if (upsertPayload.length) {
    await chunkedUpsertDailyRecipes(upsertPayload);
  }

  return { applied: upsertPayload.length };
}

function todayYmd() {
  return toYmd(new Date());
}

export default function RecurringManagerPage() {
  const [userId, setUserId] = useState("");
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("");

  // 편의: 현재 월 선택(달력에 반영 버튼용)
  const now = new Date();
  const [ym, setYm] = useState(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}`);

  // 폼 상태(추가/수정 공용)
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

  async function refreshRules(uid: string) {
    const { data, error } = await supabase
      .from("recurring_rules")
      .select("*")
      .eq("user_id", uid)
      .order("id", { ascending: false });
    if (error) throw error;
    setRules((data || []) as RuleRow[]);
  }

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

  async function handleSaveRule() {
    if (!userId) return setLog("로그인이 필요합니다.");
    if (!form.title.trim()) return setLog("항목명은 필수입니다.");

    const def = Number(form.default_amount);
    if (!Number.isFinite(def) || def < 0) return setLog("기본 금액을 올바르게 입력하세요.");

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
        const { error } = await supabase.from("recurring_rules").update(payload).eq("id", editingId).eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("recurring_rules").insert(payload);
        if (error) throw error;
      }

      await refreshRules(userId);
      resetForm();
      setLog("저장 완료");
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
  }

  async function handleDelete(ruleId: number) {
    if (!userId) return;
    const ok = confirm("이 정기 규칙을 삭제할까요? (해당 규칙의 예외 설정도 함께 삭제됩니다)");
    if (!ok) return;

    setLoading(true);
    setLog("");
    try {
      // overrides는 FK cascade라 같이 제거됨
      const { error } = await supabase.from("recurring_rules").delete().eq("id", ruleId).eq("user_id", userId);
      if (error) throw error;
      await refreshRules(userId);
      setLog("삭제 완료");
    } catch (e: any) {
      setLog(`오류: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyThisMonth() {
    if (!userId) return setLog("로그인이 필요합니다.");
    const [y, m] = ym.split("-").map(Number);
    const { start, end } = monthRange(y, m);

    setLoading(true);
    setLog("이번 달 정기 납부를 레시피 달력에 반영 중...");
    try {
      const res = await applyRecurringToRange({ userId, rangeStart: start, rangeEnd: end });
      setLog(`반영 완료: ${start} ~ ${end} 기간에 ${res.applied}일 업데이트`);
    } catch (e: any) {
      setLog(`오류: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>정기 납부 관리</div>
            <div className={styles.subtitle}>
              규칙을 여러 개 등록하고, 달력에는 자동 반영(업서트) 방식으로 표시합니다.
            </div>
          </div>
          <span className={styles.badge}>지출레시피 • Rules</span>
        </div>

        <section className={styles.card}>
          <div className={styles.cardTitleRow}>
            <div>
              <div className={styles.cardTitle}>{editingId ? "정기 규칙 수정" : "정기 규칙 추가"}</div>
              <div className={styles.cardDesc}>저장 후 달력 화면에서 월 범위로 자동 반영됩니다.</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                className={styles.input}
                style={{ width: 140 }}
                value={ym}
                onChange={(e) => setYm(e.target.value)}
                placeholder="YYYY-MM"
              />
              <button className={styles.btnPrimary} disabled={loading} onClick={handleApplyThisMonth}>
                {loading ? "처리 중..." : "선택 월 달력 반영"}
              </button>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.label}>
              <div className={styles.labelText}>항목명</div>
              <input className={styles.input} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </label>

            <label className={styles.label}>
              <div className={styles.labelText}>구분(daily_recipes 반영 위치)</div>
              <select className={styles.select} value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as Category }))}>
                <option value="expense">지출</option>
                <option value="income">수입</option>
                <option value="saving">저축</option>
              </select>
            </label>

            <label className={styles.label}>
              <div className={styles.labelText}>주기</div>
              <select className={styles.select} value={form.frequency} onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value as Frequency }))}>
                <option value="monthly">매월</option>
                <option value="weekly">매주</option>
                <option value="yearly">매년</option>
              </select>
            </label>

            <label className={styles.label}>
              <div className={styles.labelText}>기본 금액</div>
              <input className={styles.input} value={form.default_amount} inputMode="numeric" onChange={(e) => setForm((p) => ({ ...p, default_amount: e.target.value }))} />
            </label>

            <label className={styles.label}>
              <div className={styles.labelText}>시작일</div>
              <input className={styles.input} type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} />
            </label>

            <label className={styles.label}>
              <div className={styles.labelText}>종료일(선택)</div>
              <input className={styles.input} type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} />
            </label>

            {form.frequency === "monthly" && (
              <label className={styles.label}>
                <div className={styles.labelText}>매월 납부일</div>
                <input className={styles.input} type="number" min={1} max={31} value={form.day_of_month} onChange={(e) => setForm((p) => ({ ...p, day_of_month: Number(e.target.value) }))} />
              </label>
            )}

            {form.frequency === "weekly" && (
              <label className={styles.label}>
                <div className={styles.labelText}>매주 요일</div>
                <select className={styles.select} value={form.day_of_week} onChange={(e) => setForm((p) => ({ ...p, day_of_week: Number(e.target.value) }))}>
                  <option value={0}>일</option><option value={1}>월</option><option value={2}>화</option><option value={3}>수</option>
                  <option value={4}>목</option><option value={5}>금</option><option value={6}>토</option>
                </select>
              </label>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button className={styles.btnPrimary} disabled={loading} onClick={handleSaveRule}>
              {editingId ? "수정 저장" : "추가 저장"}
            </button>
            <button className={styles.btnPrimary} style={{ background: "linear-gradient(180deg,#94a3b8,#64748b)" }} disabled={loading} onClick={resetForm}>
              초기화
            </button>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardTitleRow}>
            <div>
              <div className={styles.cardTitle}>등록된 정기 규칙</div>
              <div className={styles.cardDesc}>수정/삭제가 가능하며, 달력은 월 단위로 자동 반영됩니다.</div>
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
                {rules.map((r) => (
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
                      <button className={styles.btnPrimary} style={{ padding: "8px 10px" }} disabled={loading} onClick={() => startEdit(r)}>
                        수정
                      </button>
                      <button className={styles.btnPrimary} style={{ padding: "8px 10px", background: "linear-gradient(180deg,#ef4444,#dc2626)" }} disabled={loading} onClick={() => handleDelete(r.id)}>
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 12, color: "#64748b" }}>
                      아직 등록된 정기 규칙이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!!log && <div className={styles.logBox}>{log}</div>}
        </section>
      </div>
    </div>
  );
}

// src/app/dashboard/gifts/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  X,
  Check,
  ArrowDownUp,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./gifts.module.css";

type GiftKind = "축의금" | "부조금" | "선물" | "기타";
type Direction = "지출" | "수입";

type GiftRow = {
  id: number;
  user_id: string;
  kind: GiftKind;
  direction: Direction;
  person_name: string;
  relation: string | null;
  event_date: string; // YYYY-MM-DD
  amount: number; // numeric -> number로 받는 전제
  memo: string | null;
  created_at: string;
};

type FormState = {
  id?: number;
  kind: GiftKind;
  direction: Direction;
  person_name: string;
  relation: string;
  event_date: string;
  amount: string; // input
  memo: string;
};

const KIND_OPTIONS: GiftKind[] = ["축의금", "부조금", "선물", "기타"];
const DIR_OPTIONS: Direction[] = ["지출", "수입"];

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function nf0(x: number) {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(x);
}

export default function GiftsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [rows, setRows] = useState<GiftRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<GiftKind | "전체">("전체");
  const [dirFilter, setDirFilter] = useState<Direction | "전체">("전체");
  const [sort, setSort] = useState<
    "date_desc" | "date_asc" | "amt_desc" | "amt_asc"
  >("date_desc");

  const [form, setForm] = useState<FormState>({
    kind: "축의금",
    direction: "지출",
    person_name: "",
    relation: "",
    event_date: todayISO(),
    amount: "",
    memo: "",
  });

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    let list = rows.filter((r) => {
      if (kindFilter !== "전체" && r.kind !== kindFilter) return false;
      if (dirFilter !== "전체" && r.direction !== dirFilter) return false;

      if (!qq) return true;
      const blob = `${r.person_name} ${r.relation ?? ""} ${r.kind} ${
        r.direction
      } ${r.memo ?? ""}`.toLowerCase();
      return blob.includes(qq);
    });

    list = list.sort((a, b) => {
      if (sort === "date_desc") return b.event_date.localeCompare(a.event_date);
      if (sort === "date_asc") return a.event_date.localeCompare(b.event_date);
      if (sort === "amt_desc") return b.amount - a.amount;
      return a.amount - b.amount;
    });

    return list;
  }, [rows, q, kindFilter, dirFilter, sort]);

  const stats = useMemo(() => {
    const out = filtered.reduce(
      (acc, r) => {
        if (r.direction === "지출") acc.out += r.amount;
        else acc.in += r.amount;
        return acc;
      },
      { out: 0, in: 0 }
    );
    return {
      out: out.out,
      in: out.in,
      net: out.in - out.out,
      count: filtered.length,
    };
  }, [filtered]);

  // ✅ DB 로드: getUser() + user_id 필터
  async function load() {
    setLoading(true);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      router.replace("/auth/login");
      return;
    }
    const userId = auth.user.id;

    const { data, error } = await supabase
      .from("gift_entries")
      .select("*")
      .eq("user_id", userId)
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data as GiftRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm({
      kind: "축의금",
      direction: "지출",
      person_name: "",
      relation: "",
      event_date: todayISO(),
      amount: "",
      memo: "",
    });
    setOpen(true);
  }

  function openEdit(r: GiftRow) {
    setEditingId(r.id);
    setForm({
      id: r.id,
      kind: r.kind,
      direction: r.direction,
      person_name: r.person_name,
      relation: r.relation ?? "",
      event_date: r.event_date,
      amount: String(r.amount),
      memo: r.memo ?? "",
    });
    setOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
  }

  function validate(): string | null {
    if (!form.person_name.trim()) return "이름/대상을 입력해 주세요.";
    if (!form.event_date) return "날짜를 선택해 주세요.";
    const amt = Number(form.amount.replaceAll(",", ""));
    if (!Number.isFinite(amt) || amt <= 0) return "금액은 0보다 큰 숫자여야 합니다.";
    return null;
  }

  // ✅ 저장: insert/update 모두 user_id 포함, update는 (id + user_id)
  async function upsert() {
    const errMsg = validate();
    if (errMsg) {
      alert(errMsg);
      return;
    }

    setSaving(true);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      alert("로그인이 필요합니다.");
      router.replace("/auth/login");
      return;
    }
    const userId = auth.user.id;

    const amt = Number(form.amount.replaceAll(",", ""));
    const payload = {
      user_id: userId,
      kind: form.kind,
      direction: form.direction,
      person_name: form.person_name.trim(),
      relation: form.relation.trim() ? form.relation.trim() : null,
      event_date: form.event_date, // date 컬럼: YYYY-MM-DD 문자열 OK
      amount: amt, // numeric 컬럼: number
      memo: form.memo.trim() ? form.memo.trim() : null,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("gift_entries")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("gift_entries").insert(payload);
        if (error) throw error;
      }

      await load();
      setOpen(false);
    } catch (e) {
      console.error(e);
      alert("저장에 실패했습니다. (콘솔 로그 확인)");
    } finally {
      setSaving(false);
    }
  }

  // ✅ 삭제: (id + user_id)
  async function remove(id: number) {
    const ok = confirm("삭제할까요? (되돌릴 수 없습니다)");
    if (!ok) return;

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      alert("로그인이 필요합니다.");
      router.replace("/auth/login");
      return;
    }
    const userId = auth.user.id;

    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== id));

    const { error } = await supabase
      .from("gift_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error(error);
      alert("삭제에 실패했습니다.");
      setRows(prev);
    }
  }

  function onAmountInput(v: string) {
    const digits = v.replace(/[^\d]/g, "");
    if (!digits) {
      setForm((p) => ({ ...p, amount: "" }));
      return;
    }
    const num = Number(digits);
    setForm((p) => ({ ...p, amount: nf0(num) }));
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <div className={styles.kicker}>지출레시피 · 경조사비</div>
          <h1 className={styles.title}>축의금 / 부조금 관리</h1>
        </div>

        <button className={styles.primaryBtn} onClick={openCreate}>
          <Plus size={18} />
          새 기록
        </button>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>지출</div>
          <div className={styles.summaryValue}>{nf0(stats.out)}원</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>수입</div>
          <div className={styles.summaryValue}>{nf0(stats.in)}원</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>순증감</div>
          <div className={styles.summaryValue}>
            {stats.net >= 0 ? "+" : ""}
            {nf0(stats.net)}원
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>건수</div>
          <div className={styles.summaryValue}>{nf0(stats.count)}건</div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Search size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름, 관계, 메모로 검색"
          />
          {q ? (
            <button className={styles.iconBtn} onClick={() => setQ("")} aria-label="clear">
              <X size={16} />
            </button>
          ) : null}
        </div>

        <div className={styles.filters}>
          <div className={styles.selectWrap}>
            <Filter size={16} />
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as any)}
              aria-label="kind"
            >
              <option value="전체">전체</option>
              {KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.selectWrap}>
            <select
              value={dirFilter}
              onChange={(e) => setDirFilter(e.target.value as any)}
              aria-label="direction"
            >
              <option value="전체">전체</option>
              {DIR_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <button
            className={styles.ghostBtn}
            onClick={() => {
              setSort((s) => {
                if (s === "date_desc") return "date_asc";
                if (s === "date_asc") return "amt_desc";
                if (s === "amt_desc") return "amt_asc";
                return "date_desc";
              });
            }}
            title="정렬"
          >
            <ArrowDownUp size={16} />
            <span className={styles.ghostBtnText}>
              {sort === "date_desc"
                ? "날짜↓"
                : sort === "date_asc"
                ? "날짜↑"
                : sort === "amt_desc"
                ? "금액↓"
                : "금액↑"}
            </span>
          </button>
        </div>
      </div>

      {/* Desktop table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>날짜</th>
              <th>구분</th>
              <th>흐름</th>
              <th>대상</th>
              <th>관계</th>
              <th className={styles.thRight}>금액</th>
              <th>메모</th>
              <th className={styles.thRight}>작업</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className={styles.empty}>
                  불러오는 중…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.empty}>
                  아직 기록이 없습니다. 새 기록으로 시작해요.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td className={styles.mono}>{r.event_date}</td>
                  <td>
                    <span className={styles.badge}>{r.kind}</span>
                  </td>
                  <td>
                    <span
                      className={`${styles.pill} ${
                        r.direction === "지출" ? styles.out : styles.in
                      }`}
                    >
                      {r.direction}
                    </span>
                  </td>
                  <td className={styles.strong}>{r.person_name}</td>
                  <td className={styles.muted}>{r.relation ?? "-"}</td>
                  <td className={`${styles.money} ${styles.thRight}`}>
                    {nf0(r.amount)}원
                  </td>
                  <td className={styles.muted}>{r.memo ?? "-"}</td>
                  <td className={styles.actions}>
                    <button className={styles.iconBtn} onClick={() => openEdit(r)} aria-label="edit">
                      <Pencil size={16} />
                    </button>
                    <button
                      className={`${styles.iconBtn} ${styles.danger}`}
                      onClick={() => remove(r.id)}
                      aria-label="delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className={styles.cards}>
        {loading ? (
          <div className={styles.cardEmpty}>불러오는 중…</div>
        ) : filtered.length === 0 ? (
          <div className={styles.cardEmpty}>
            기록이 없습니다. <b>새 기록</b>을 추가해 보세요.
          </div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.cardLeft}>
                  <div className={styles.cardDate}>{r.event_date}</div>
                  <div className={styles.cardName}>{r.person_name}</div>
                  <div className={styles.cardMeta}>
                    <span className={styles.badge}>{r.kind}</span>
                    <span
                      className={`${styles.pill} ${
                        r.direction === "지출" ? styles.out : styles.in
                      }`}
                    >
                      {r.direction}
                    </span>
                    {r.relation ? <span className={styles.dot}>·</span> : null}
                    {r.relation ? <span className={styles.muted}>{r.relation}</span> : null}
                  </div>
                </div>
                <div className={styles.cardRight}>
                  <div className={styles.cardAmount}>{nf0(r.amount)}원</div>
                  <div className={styles.cardBtns}>
                    <button className={styles.iconBtn} onClick={() => openEdit(r)} aria-label="edit">
                      <Pencil size={16} />
                    </button>
                    <button
                      className={`${styles.iconBtn} ${styles.danger}`}
                      onClick={() => remove(r.id)}
                      aria-label="delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
              {r.memo ? <div className={styles.cardMemo}>{r.memo}</div> : null}
            </div>
          ))
        )}
      </div>

      {/* Mobile floating add */}
      <button className={styles.fab} onClick={openCreate} aria-label="add">
        <Plus size={20} />
      </button>

      {/* Modal */}
      {open ? (
        <div className={styles.modalOverlay} onMouseDown={closeModal}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div>
                <div className={styles.modalKicker}>경조사비</div>
                <div className={styles.modalTitle}>
                  {editingId ? "기록 수정" : "새 기록 추가"}
                </div>
              </div>
              <button className={styles.iconBtn} onClick={closeModal} aria-label="close">
                <X size={18} />
              </button>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>구분</span>
                <select
                  value={form.kind}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, kind: e.target.value as GiftKind }))
                  }
                >
                  {KIND_OPTIONS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>흐름</span>
                <select
                  value={form.direction}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, direction: e.target.value as Direction }))
                  }
                >
                  {DIR_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>이름/대상</span>
                <input
                  value={form.person_name}
                  onChange={(e) => setForm((p) => ({ ...p, person_name: e.target.value }))}
                  placeholder="예: 김OO, 회사 동료"
                />
              </label>

              <label className={styles.field}>
                <span>관계(선택)</span>
                <input
                  value={form.relation}
                  onChange={(e) => setForm((p) => ({ ...p, relation: e.target.value }))}
                  placeholder="예: 친구, 선배, 친척"
                />
              </label>

              <label className={styles.field}>
                <span>날짜</span>
                <input
                  type="date"
                  value={form.event_date}
                  onChange={(e) => setForm((p) => ({ ...p, event_date: e.target.value }))}
                />
              </label>

              <label className={styles.field}>
                <span>금액</span>
                <input
                  inputMode="numeric"
                  value={form.amount}
                  onChange={(e) => onAmountInput(e.target.value)}
                  placeholder="예: 50,000"
                />
              </label>

              <label className={`${styles.field} ${styles.full}`}>
                <span>메모(선택)</span>
                <textarea
                  value={form.memo}
                  onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
                  placeholder="예: 현금/이체, 답례 여부 등"
                  rows={3}
                />
              </label>
            </div>

            <div className={styles.modalFoot}>
              <button className={styles.ghostBtn} onClick={closeModal} disabled={saving}>
                취소
              </button>
              <button className={styles.primaryBtn} onClick={upsert} disabled={saving}>
                {saving ? (
                  "저장 중…"
                ) : (
                  <>
                    <Check size={18} /> 저장
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

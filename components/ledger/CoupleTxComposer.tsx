"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function CoupleTxComposer({
  ledgerId,
  ledgerStatus,
}: {
  ledgerId: string;
  ledgerStatus: "active" | "archived_readonly";
}) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [memo, setMemo] = useState<string>("");
  const [txDate, setTxDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const disabled = ledgerStatus !== "active";

  const submit = async () => {
    if (disabled) {
      alert("이 장부는 읽기 전용입니다.");
      return;
    }
    const v = Number(amount);
    if (!Number.isFinite(v) || v <= 0) {
      alert("금액을 올바르게 입력하세요.");
      return;
    }

    setLoading(true);
    try {
      const { data: u } = await sb.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("로그인이 필요합니다.");

      const { error } = await sb.from("transactions").insert({
        ledger_id: ledgerId,
        user_id: uid, // RLS with_check에서 user_id=auth.uid() 강제
        tx_type: txType,
        amount: v,
        currency: "KRW",
        category: category || null,
        memo: memo || null,
        tx_date: txDate,
      });

      if (error) throw error;

      setAmount("");
      setCategory("");
      setMemo("");
    } catch (e: any) {
      alert(e?.message ?? "등록 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, width: 520 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ fontWeight: 800 }}>거래 입력</div>
        {ledgerStatus !== "active" && (
          <div style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, background: "#eee" }}>
            READ ONLY
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <select value={txType} onChange={(e) => setTxType(e.target.value as any)} disabled={disabled}>
          <option value="expense">지출</option>
          <option value="income">수입</option>
        </select>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="금액"
          inputMode="numeric"
          disabled={disabled}
          style={{ flex: 1, padding: 8 }}
        />
        <input
          value={txDate}
          onChange={(e) => setTxDate(e.target.value)}
          type="date"
          disabled={disabled}
          style={{ padding: 8 }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="카테고리(선택)"
          disabled={disabled}
          style={{ flex: 1, padding: 8 }}
        />
        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모(선택)"
          disabled={disabled}
          style={{ flex: 2, padding: 8 }}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <button onClick={submit} disabled={loading || disabled}>
          {loading ? "저장중…" : "저장"}
        </button>
      </div>
    </div>
  );
}
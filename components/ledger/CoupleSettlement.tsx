"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Row = {
  user_id: string;
  expense_total: number;
  income_total: number;
  net_total: number;
};

export default function CoupleSettlement({ ledgerId }: { ledgerId: string }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const p_month = `${month}-01`;
      const { data, error } = await sb.rpc("get_monthly_settlement", { p_ledger_id: ledgerId, p_month });
      if (error) throw error;
      setRows((data ?? []) as any);
    } catch (e: any) {
      alert(e?.message ?? "정산 로드 실패");
    } finally {
      setLoading(false);
    }
  };

  // 차액(지출만 기준으로) 간단 정산: 두 명일 때
  const expenseRows = rows.map((r) => ({ user_id: r.user_id, expense_total: Number(r.expense_total) || 0 }));
  const diffHint = (() => {
    if (expenseRows.length !== 2) return null;
    const [a, b] = expenseRows;
    const diff = a.expense_total - b.expense_total;
    if (diff === 0) return "이번 달 지출이 동일합니다.";
    if (diff > 0) return `사용자 A가 B보다 ${diff.toLocaleString()}원 더 지출`;
    return `사용자 B가 A보다 ${Math.abs(diff).toLocaleString()}원 더 지출`;
  })();

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, width: 520 }}>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>월별 정산</div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <button onClick={load} disabled={loading}>
          {loading ? "불러오는 중…" : "정산 보기"}
        </button>
      </div>

      {diffHint && <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>{diffHint}</div>}

      <div style={{ marginTop: 10 }}>
        {rows.length === 0 ? (
          <div style={{ opacity: 0.7 }}>데이터 없음</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((r) => (
              <div key={r.user_id} style={{ padding: 10, borderRadius: 10, background: "#f6f6f6" }}>
                <div style={{ fontWeight: 700 }}>user_id: {r.user_id}</div>
                <div>지출: {Number(r.expense_total).toLocaleString()}원</div>
                <div>수입: {Number(r.income_total).toLocaleString()}원</div>
                <div>순액: {Number(r.net_total).toLocaleString()}원</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
        * user_id는 추후 profiles.display_name으로 매핑해서 이름으로 보여주면 됩니다.
      </div>
    </div>
  );
}
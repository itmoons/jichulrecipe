"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { RecipeBadge, RecipeButton, RecipeCard, RecipeTextarea } from "@/components/ui/recipe";

export default function SettlementLockAndPay({ ledgerId }: { ledgerId: string }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<null | "lock" | "paid">(null);

  const lock = async () => {
    setLoading("lock");
    try {
      const p_month = `${month}-01`;

      const { error } = await sb.rpc("lock_monthly_settlement", {
        p_ledger_id: ledgerId,
        p_month,
        p_note: note?.trim() || null,
      });
      if (error) throw error;

      alert("정산을 확정(잠금)했습니다. 이제 해당 월은 수정이 제한됩니다.");
    } catch (e: any) {
      alert(e?.message ?? "정산 잠금 실패");
    } finally {
      setLoading(null);
    }
  };

  const markPaid = async () => {
    setLoading("paid");
    try {
      const p_month = `${month}-01`;

      // 프로젝트에 없으면 아래 RPC를 만들거나, 이 버튼을 숨겨도 됩니다.
      const { error } = await sb.rpc("mark_settlement_paid", {
        p_ledger_id: ledgerId,
        p_month,
      });
      if (error) throw error;

      alert("송금 완료로 표시했습니다.");
    } catch (e: any) {
      alert(e?.message ?? "송금 완료 처리 실패");
    } finally {
      setLoading(null);
    }
  };

  return (
    <RecipeCard
      title="✅ 정산 확정 & 송금 완료"
      description="정산을 확정하면 해당 월이 잠기고, 승인 없이는 수정이 제한됩니다."
      right={<RecipeBadge variant="blue">{month}</RecipeBadge>}
      className="w-full"
    >
      <div className="flex items-center gap-2">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-[160px] rounded-xl border border-blue-200 bg-white px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-blue-200"
        />

        <RecipeButton onClick={lock} disabled={loading !== null}>
          {loading === "lock" ? "확정중…" : "정산 확정(잠금)"}
        </RecipeButton>

        <RecipeButton variant="outline" onClick={markPaid} disabled={loading !== null}>
          {loading === "paid" ? "처리중…" : "송금 완료"}
        </RecipeButton>
      </div>

      <div className="mt-3">
        <RecipeTextarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="선택: 메모(예: 3월 정산 확정, 누락 반영 완료)"
          rows={3}
        />
        <div className="mt-2 text-xs text-zinc-500">
          * 정산이 잠긴 후 수정이 필요하면 “잠금 월 수정 요청”을 통해 승인받아야 합니다.
        </div>
      </div>
    </RecipeCard>
  );
}
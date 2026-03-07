"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { RecipeBadge, RecipeButton, RecipeCard, RecipeTextarea } from "@/components/ui/recipe";

export default function RequestChangeForLockedMonth({ ledgerId }: { ledgerId: string }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const m = `${month}-01`;

      const { data, error } = await sb.rpc("request_settlement_change", {
        p_ledger_id: ledgerId,
        p_month: m,
        p_reason: reason,
      });

      if (error) throw error;

      setReason("");
      alert("수정 요청을 보냈습니다. 상대 승인 후 15분간 수정할 수 있어요.");
      return data;
    } catch (e: any) {
      alert(e?.message ?? "요청 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RecipeCard
      title="🔒 잠금 월 수정 요청"
      description="정산이 잠긴 달은 바로 수정할 수 없어요. 승인받으면 15분만 열립니다."
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

        <RecipeButton onClick={submit} disabled={loading || reason.trim().length < 3}>
          {loading ? "전송중…" : "요청 보내기"}
        </RecipeButton>

        <RecipeBadge>사유 3자 이상</RecipeBadge>
      </div>

      <div className="mt-3">
        <RecipeTextarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="예) 3/12 점심 결제자 오류, 분할 금액이 잘못 입력됨, 환불 반영 필요…"
          rows={4}
        />
        <div className="mt-2 text-xs text-zinc-500">
          * 요청은 즉시 알림으로 전송됩니다. 승인되면 <b>15분</b> 동안만 수정 가능하고, 이후 자동으로 다시 잠깁니다.
        </div>
      </div>
    </RecipeCard>
  );
}
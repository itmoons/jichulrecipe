"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { RecipeBadge, RecipeButton, RecipeCard, RecipeInput } from "@/components/ui/recipe";

type PlanRow = { from_user_id: string; to_user_id: string; amount: number };
type ProfileRow = { user_id: string; display_name: string | null };

export default function TransferPlan({ ledgerId }: { ledgerId: string }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [plan, setPlan] = useState<PlanRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const nameOf = (uid: string) => profiles[uid] ?? uid;

  const load = async () => {
    setLoading(true);
    try {
      const p_month = `${month}-01`;
      const { data: planData, error: planErr } = await sb.rpc("get_monthly_transfer_plan", {
        p_ledger_id: ledgerId,
        p_month,
      });
      if (planErr) throw planErr;

      const rows = ((planData ?? []) as any) as PlanRow[];
      setPlan(rows);

      const ids = Array.from(new Set(rows.flatMap((r) => [r.from_user_id, r.to_user_id])));
      if (ids.length > 0) {
        const { data: pData, error: pErr } = await sb.from("profiles").select("user_id, display_name").in("user_id", ids);
        if (!pErr && pData) {
          const map: Record<string, string> = {};
          (pData as any as ProfileRow[]).forEach((r) => (map[r.user_id] = r.display_name ?? r.user_id));
          setProfiles(map);
        }
      }
    } catch (e: any) {
      alert(e?.message ?? "송금 지시표 로드 실패");
    } finally {
      setLoading(false);
    }
  };

  const total = plan.reduce((a, b) => a + (Number(b.amount) || 0), 0);

  return (
    <RecipeCard
      title="송금 지시표"
      description="정산 결과를 ‘누가 → 누구에게 → 얼마’로 변환합니다."
      right={<RecipeBadge variant="blue">{month}</RecipeBadge>}
    >
      <div className="flex items-center gap-2">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-[160px] rounded-xl border border-blue-200 bg-white px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-blue-200"
        />
        <RecipeButton onClick={load} disabled={loading}>
          {loading ? "계산중…" : "계산"}
        </RecipeButton>
        <RecipeBadge>{Math.round(total).toLocaleString()}원</RecipeBadge>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {plan.length === 0 ? (
          <div className="text-[12px] text-zinc-500">송금이 필요 없거나(균형) 데이터가 없습니다.</div>
        ) : (
          plan.map((r, idx) => (
            <div key={idx} className="rounded-lg border border-blue-100 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[12px] font-bold text-zinc-900">
                  {nameOf(r.from_user_id)} → {nameOf(r.to_user_id)}
                </div>
                <RecipeBadge variant="blue">{Math.round(Number(r.amount)).toLocaleString()}원</RecipeBadge>
              </div>
              <div className="mt-1 text-xs text-zinc-500">이 송금만 하면 해당 월 정산이 깔끔히 맞춰집니다.</div>
            </div>
          ))
        )}
      </div>
    </RecipeCard>
  );
}
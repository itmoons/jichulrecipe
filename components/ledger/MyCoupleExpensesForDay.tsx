"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type CoupleExpense = { id: string; amount: number; category: string | null; memo: string | null };

export function MyCoupleExpensesForDay({ date }: { date: string }) {
  const [items, setItems] = useState<CoupleExpense[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const { data, error } = await supabase.from("couple_expenses")
        .select("id,amount,category,memo")
        .eq("created_by", user.id)
        .eq("expense_date", date)
        .order("created_at", { ascending: false });
      if (active && !error) setItems((data ?? []) as CoupleExpense[]);
    };
    void load();
    return () => { active = false; };
  }, [date]);

  if (!items.length) return null;
  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return <section className="mb-4 rounded-lg border border-[#c6e2d4] bg-white p-4 sm:p-5" aria-label="커플 장부에서 내가 결제한 지출">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-bold text-slate-900">커플 장부 · 내가 결제한 공동 지출</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">아래 금액은 레시피 달력 합계에 포함됩니다. 수정은 커플 장부에서 해주세요.</p>
      </div>
      <strong className="text-sm text-[#176247]">{total.toLocaleString("ko-KR")}원</strong>
    </div>
    <ul className="mt-3 divide-y divide-[#edf3ef] border-t border-[#edf3ef]">
      {items.map(item => <li key={item.id} className="flex justify-between gap-3 py-2 text-xs text-slate-600">
        <span>{item.memo || item.category || "공동 지출"}</span><span className="font-semibold text-slate-800">{Number(item.amount).toLocaleString("ko-KR")}원</span>
      </li>)}
    </ul>
    <Link href="/couple-ledger/entry" className="mt-3 inline-flex text-xs font-semibold text-[#176247] underline underline-offset-2">커플 장부에서 수정하기 →</Link>
  </section>;
}

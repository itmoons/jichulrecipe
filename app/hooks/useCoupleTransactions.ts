"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export type TxRow = {
  id: string;
  ledger_id: string;
  user_id: string;
  tx_type: "expense" | "income";
  amount: number;
  currency: string;
  category: string | null;
  memo: string | null;
  tx_date: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
};

type LedgerRow = {
  id: string;
  status: "active" | "archived_readonly";
  ledger_type: "personal" | "couple";
  title: string;
};

export function useCoupleTransactions(ledgerId?: string) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [ledger, setLedger] = useState<LedgerRow | null>(null);

  const [items, setItems] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // pagination cursor
  const [from, setFrom] = useState(0);
  const pageSize = 30;
  const [hasMore, setHasMore] = useState(true);

  // 1) ledger 상태 로드 (active / archived_readonly)
  useEffect(() => {
    if (!ledgerId) return;
    (async () => {
      const { data, error } = await sb
        .from("ledgers")
        .select("id,status,ledger_type,title")
        .eq("id", ledgerId)
        .maybeSingle();
      if (!error && data) setLedger(data as any);
    })();
  }, [sb, ledgerId]);

  // 2) 초기 로드
  useEffect(() => {
    if (!ledgerId) return;
    setItems([]);
    setFrom(0);
    setHasMore(true);

    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await sb
        .from("transactions")
        .select("*")
        .eq("ledger_id", ledgerId)
        .order("tx_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(0, pageSize - 1);

      if (!cancelled) {
        if (!error && data) {
          setItems(data as any);
          setFrom(pageSize);
          setHasMore((data?.length ?? 0) === pageSize);
        }
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sb, ledgerId]);

  // 3) 더보기
  const loadMore = async () => {
    if (!ledgerId || !hasMore || loadingMore) return;
    setLoadingMore(true);

    const { data, error } = await sb
      .from("transactions")
      .select("*")
      .eq("ledger_id", ledgerId)
      .order("tx_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (!error && data) {
      // 중복 방지
      const seen = new Set(items.map((x) => x.id));
      const appended = (data as any as TxRow[]).filter((x) => !seen.has(x.id));
      setItems((prev) => [...prev, ...appended]);
      setFrom((prev) => prev + pageSize);
      setHasMore((data?.length ?? 0) === pageSize);
    }

    setLoadingMore(false);
  };

  // 4) Realtime: INSERT/UPDATE/DELETE 반영
  useEffect(() => {
    if (!ledgerId) return;

    const channel = sb
      .channel(`tx:${ledgerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `ledger_id=eq.${ledgerId}` },
        (payload) => {
          const row = payload.new as any as TxRow;
          setItems((prev) => {
            if (prev.some((x) => x.id === row.id)) return prev;
            return [row, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions", filter: `ledger_id=eq.${ledgerId}` },
        (payload) => {
          const row = payload.new as any as TxRow;
          setItems((prev) => prev.map((x) => (x.id === row.id ? row : x)));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "transactions", filter: `ledger_id=eq.${ledgerId}` },
        (payload) => {
          const oldRow = payload.old as any as { id: string };
          setItems((prev) => prev.filter((x) => x.id !== oldRow.id));
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [sb, ledgerId]);

  return { ledger, items, loading, loadMore, loadingMore, hasMore, setItems };
}
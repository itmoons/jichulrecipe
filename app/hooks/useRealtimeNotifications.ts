"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export type NotificationRow = {
  id: string;
  to_user_id: string;
  from_user_id: string | null;
  type:
    | "COUPLE_REQUESTED"
    | "COUPLE_APPROVED"
    | "COUPLE_REJECTED"
    | "COUPLE_REVOKED"
    | "PERSONAL_SHARE_ON"
    | "PERSONAL_SHARE_OFF";
  payload: any;
  created_at: string;
  read_at: string | null;
};

export function useRealtimeNotifications(userId?: string) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [ready, setReady] = useState(false);

  // 1) 초기 로드: 최근 알림 N개
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    (async () => {
      const { data, error } = await sb
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      if (!cancelled) {
        if (!error && data) setItems(data as any);
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sb, userId]);

  // 2) Realtime 구독: 내(to_user_id) 알림 insert만 수신
  useEffect(() => {
    if (!userId) return;

    const channel = sb
      .channel(`notif:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `to_user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as any as NotificationRow;
          setItems((prev) => [row, ...prev]);
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [sb, userId]);

  // 3) 읽음 처리
  const markRead = async (id: string) => {
    await sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  };

  return { items, setItems, ready, markRead };
}
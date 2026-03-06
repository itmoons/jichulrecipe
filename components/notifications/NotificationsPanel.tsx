"use client";

import { useEffect, useState } from "react";
import { useRealtimeNotifications } from '@/app/hooks/useRealtimeNotifications';
import { supabaseBrowser } from "@/lib/supabase/browser";

type Props = { userId: string };

export default function NotificationsPanel({ userId }: Props) {
  const sb = supabaseBrowser();
  const { items, ready, markRead } = useRealtimeNotifications(userId);

  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const approve = async (coupleLinkId: string, notifId: string) => {
    setLoadingAction(`approve:${coupleLinkId}`);
    try {
      const { error } = await sb.rpc("approve_couple_link", { p_link_id: coupleLinkId });
      if (error) throw error;
      await markRead(notifId);
      alert("커플 연결을 승인했습니다.");
    } catch (e: any) {
      alert(e?.message ?? "승인 실패");
    } finally {
      setLoadingAction(null);
    }
  };

  const reject = async (coupleLinkId: string, notifId: string) => {
    setLoadingAction(`reject:${coupleLinkId}`);
    try {
      const { error } = await sb.rpc("reject_couple_link", { p_link_id: coupleLinkId });
      if (error) throw error;
      await markRead(notifId);
      alert("요청을 거절했습니다.");
    } catch (e: any) {
      alert(e?.message ?? "거절 실패");
    } finally {
      setLoadingAction(null);
    }
  };

  if (!ready) return <div>알림 로딩중…</div>;

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, width: 420 }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>알림</div>

      {items.length === 0 && <div style={{ opacity: 0.7 }}>새 알림이 없습니다.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((n) => {
          const isUnread = !n.read_at;
          const coupleLinkId = n.payload?.couple_link_id as string | undefined;

          return (
            <div key={n.id} style={{ padding: 10, borderRadius: 10, background: isUnread ? "#fff7ed" : "#f6f6f6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{n.type}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{new Date(n.created_at).toLocaleString()}</div>
                </div>
                {isUnread && (
                  <button onClick={() => markRead(n.id)} style={{ height: 28 }}>
                    읽음
                  </button>
                )}
              </div>

              {n.type === "COUPLE_REQUESTED" && coupleLinkId && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => approve(coupleLinkId, n.id)}
                    disabled={loadingAction === `approve:${coupleLinkId}`}
                  >
                    승인
                  </button>
                  <button
                    onClick={() => reject(coupleLinkId, n.id)}
                    disabled={loadingAction === `reject:${coupleLinkId}`}
                  >
                    거절
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
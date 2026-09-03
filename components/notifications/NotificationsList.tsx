"use client";

import { useMemo, useState } from "react";
import { useRealtimeNotifications } from "@/app/hooks/useRealtimeNotifications";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Props = {
  userId: string;
  compact?: boolean;
};

function getNotificationTitle(type: string) {
  switch (type) {
    case "COUPLE_INVITE_CREATED":
      return "커플 초대 코드 생성";
    case "COUPLE_REQUESTED":
      return "커플 연결 요청";
    case "COUPLE_APPROVED":
      return "커플 연결 승인";
    case "COUPLE_REJECTED":
      return "커플 연결 거절";
    case "SETTLEMENT_CHANGE_REQUESTED":
      return "정산 잠금 월 수정 요청";
    case "SETTLEMENT_CHANGE_APPROVED":
      return "수정 요청 승인";
    case "SETTLEMENT_CHANGE_REJECTED":
      return "수정 요청 거절";
    case "SETTLEMENT_EDIT_WINDOW_REMINDER":
      return "수정창 만료 임박";
    case "SETTLEMENT_EDIT_WINDOW_EXPIRED":
      return "수정창 만료";
    default:
      return type;
  }
}

export default function NotificationsList({
  userId,
  compact = false,
}: Props) {
  const sb = supabaseBrowser();
  const { items, ready, markRead } = useRealtimeNotifications(userId);

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const approve = async (coupleLinkId: string, notifId: string) => {
    setLoadingAction(`approve:${coupleLinkId}`);
    try {
      const { error } = await sb.rpc("approve_couple_link", {
        p_link_id: coupleLinkId,
      });
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
      const { error } = await sb.rpc("reject_couple_link", {
        p_link_id: coupleLinkId,
      });
      if (error) throw error;

      await markRead(notifId);
      alert("요청을 거절했습니다.");
    } catch (e: any) {
      alert(e?.message ?? "거절 실패");
    } finally {
      setLoadingAction(null);
    }
  };

  const dismissOne = async (notifId: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(notifId);
      return next;
    });

    try {
      await sb.from("notifications").delete().eq("id", notifId);
    } catch {
      // UX 우선: 화면에서는 숨김 유지
    }
  };

  const visibleItems = useMemo(() => {
    const base = items.filter((n) => !dismissedIds.has(n.id));
    if (filter === "unread") {
      return base.filter((n) => !n.read_at);
    }
    return base;
  }, [items, dismissedIds, filter]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  if (!ready) {
    return <div className="text-sm text-zinc-500">알림 로딩중…</div>;
  }

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-zinc-800">
            미확인 알림 {unreadCount}개
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                filter === "all"
                  ? "bg-[#ff8a3d] text-slate-900"
                  : "bg-zinc-100 text-zinc-700"
              }`}
            >
              전체
            </button>

            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                filter === "unread"
                  ? "bg-[#ff8a3d] text-slate-900"
                  : "bg-zinc-100 text-zinc-700"
              }`}
            >
              안 읽은 알림
            </button>
          </div>
        </div>
      )}

      {visibleItems.length === 0 && (
        <div className="text-sm text-zinc-500">새 알림이 없습니다.</div>
      )}

      <div className="flex flex-col gap-3">
        {visibleItems.map((n) => {
          const isUnread = !n.read_at;
          const coupleLinkId = n.payload?.couple_link_id as string | undefined;

          return (
            <div
              key={n.id}
              className={`relative rounded-2xl border p-4 ${
                isUnread
                  ? "border-amber-200 bg-amber-50"
                  : "border-zinc-200 bg-zinc-50"
              }`}
            >
              <button
                type="button"
                aria-label="알림 닫기"
                onClick={() => dismissOne(n.id)}
                className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
              >
                ✕
              </button>

              <div className="flex items-start justify-between gap-3 pr-8">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-zinc-900 sm:text-sm">
                    {getNotificationTitle(n.type)}
                  </div>
                  <div className="mt-1 text-[10px] text-zinc-500 sm:text-xs">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>

                {isUnread && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="h-8 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700"
                  >
                    읽음
                  </button>
                )}
              </div>

              {n.type === "COUPLE_REQUESTED" && coupleLinkId && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => approve(coupleLinkId, n.id)}
                    disabled={loadingAction === `approve:${coupleLinkId}`}
                    className="rounded-lg bg-[#ff8a3d] px-3 py-2 text-xs font-semibold text-slate-900 disabled:opacity-60"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => reject(coupleLinkId, n.id)}
                    disabled={loadingAction === `reject:${coupleLinkId}`}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 disabled:opacity-60"
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

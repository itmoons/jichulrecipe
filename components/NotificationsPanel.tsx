"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { supabase } from "@/lib/supabaseClient";
import { RecipeBadge, RecipeButton, RecipeCard } from "@/components/ui/recipe";

type NotificationRow = {
  id: string;
  to_user_id: string;
  from_user_id: string | null;
  type: string;
  payload: any;
  created_at: string;
  read_at: string | null;
};

type ProfileRow = {
  user_id: string;
  display_name: string | null;
};

type ToastType = "success" | "error" | "info";

type NotificationsPanelProps = {
  onClose?: () => void;
};

function formatLeft(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function typeMeta(type: string) {
  switch (type) {
    case "SETTLEMENT_CHANGE_REQUESTED":
      return { icon: "📝", title: "정산 잠금 월 수정 요청" };
    case "SETTLEMENT_CHANGE_APPROVED":
      return { icon: "✅", title: "수정 요청 승인" };
    case "SETTLEMENT_CHANGE_REJECTED":
      return { icon: "⛔", title: "수정 요청 거절" };
    case "SETTLEMENT_EDIT_WINDOW_REMINDER":
      return { icon: "⏰", title: "수정창 만료 임박" };
    case "SETTLEMENT_EDIT_WINDOW_EXPIRED":
      return { icon: "🔒", title: "수정창 만료" };
    case "COUPLE_INVITE_CREATED":
      return { icon: "🔔", title: "커플 초대 코드 생성" };
    default:
      return { icon: "🔔", title: type };
  }
}

export default function NotificationsPanel({
  onClose,
}: NotificationsPanelProps) {
  const sb = supabase;

  const [me, setMe] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(
    null
  );

  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const stopBubble = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  const nameOf = (uid?: string | null) => (uid ? profiles[uid] ?? uid : "알 수 없음");

  const loadProfiles = async (userIds: string[]) => {
    const ids = Array.from(new Set(userIds.filter(Boolean)));
    if (ids.length === 0) return;

    const { data, error } = await sb
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", ids);

    if (!error && data) {
      const map: Record<string, string> = {};
      (data as ProfileRow[]).forEach((r) => {
        map[r.user_id] = r.display_name ?? r.user_id;
      });
      setProfiles((prev) => ({ ...prev, ...map }));
    }
  };

  const fetchMe = async () => {
    const { data } = await sb.auth.getUser();
    const uid = data.user?.id ?? null;
    setMe(uid);
    return uid;
  };

  const fetchNotifications = async (uid: string) => {
    setLoading(true);
    try {
      const { data, error } = await sb
        .from("notifications")
        .select("id,to_user_id,from_user_id,type,payload,created_at,read_at")
        .eq("to_user_id", uid)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const rows = (data ?? []) as NotificationRow[];
      setItems(rows);

      const userIds = rows
        .flatMap((n) => [n.to_user_id, n.from_user_id])
        .filter(Boolean) as string[];

      await loadProfiles(userIds);
    } catch (e: any) {
      showToast(e?.message ?? "알림을 불러오지 못했습니다.", "error");
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (notificationId: string) => {
    const now = new Date().toISOString();

    const { error } = await sb
      .from("notifications")
      .update({ read_at: now })
      .eq("id", notificationId);

    if (error) throw error;

    setItems((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read_at: now } : n))
    );
  };

  const markAllRead = async () => {
    if (!me) return;

    const unreadIds = visibleItems.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) {
      showToast("이미 모두 읽은 상태입니다.", "info");
      return;
    }

    setLoadingAction("markAllRead");
    try {
      const now = new Date().toISOString();

      const { error } = await sb
        .from("notifications")
        .update({ read_at: now })
        .eq("to_user_id", me)
        .is("read_at", null);

      if (error) throw error;

      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
      showToast("모든 알림을 읽음 처리했습니다.", "success");
    } catch (e: any) {
      showToast(e?.message ?? "모두 읽음 처리에 실패했습니다.", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const dismissOnlyOneCard = (notificationId: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(notificationId);
      return next;
    });
  };

  const tryDeleteInBackground = async (notificationId: string) => {
    try {
      await sb.from("notifications").delete().eq("id", notificationId);
    } catch {
      // UX 우선
    }
  };

  useEffect(() => {
    (async () => {
      const uid = await fetchMe();
      if (!uid) return;
      await fetchNotifications(uid);
    })();
  }, [sb]);

  useEffect(() => {
    if (!me) return;

    const ch = sb
      .channel(`notif:${me}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `to_user_id=eq.${me}`,
        },
        async (payload) => {
          const row = payload.new as NotificationRow;
          setItems((prev) => [row, ...prev]);
          await loadProfiles(
            [row.from_user_id, row.to_user_id].filter(Boolean) as string[]
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `to_user_id=eq.${me}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          setItems((prev) => prev.map((n) => (n.id === row.id ? row : n)));
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(ch);
    };
  }, [sb, me]);

  const visibleItems = items.filter((n) => !dismissedIds.has(n.id));
  const unreadCount = visibleItems.filter((n) => !n.read_at).length;

  const todayItems = visibleItems.filter((n) => isToday(n.created_at));
  const previousItems = visibleItems.filter((n) => !isToday(n.created_at));

  if (!me) {
    return <div className="text-[12px] text-zinc-700">로그인이 필요합니다.</div>;
  }

  const renderActions = (n: NotificationRow) => {
    if (n.type === "SETTLEMENT_CHANGE_REQUESTED") {
      const changeRequestId = n.payload?.change_request_id as string | undefined;
      if (!changeRequestId) return null;

      const approveKey = `approve:${changeRequestId}`;
      const rejectKey = `reject:${changeRequestId}`;

      return (
        <div className="mt-3 flex gap-2" onClick={stopBubble} onPointerDown={stopBubble}>
          <RecipeButton
            onClick={async (e: any) => {
              e.stopPropagation();
              setLoadingAction(approveKey);
              try {
                const { error } = await sb.rpc("approve_settlement_change", {
                  p_change_request_id: changeRequestId,
                  p_decision_note: null,
                });
                if (error) throw error;

                await markRead(n.id);
                showToast("승인했습니다. 15분간 수정 가능합니다.", "success");
              } catch (e: any) {
                showToast(e?.message ?? "승인 실패", "error");
              } finally {
                setLoadingAction(null);
              }
            }}
            disabled={loadingAction === approveKey}
          >
            승인(15분)
          </RecipeButton>

          <RecipeButton
            variant="outline"
            onClick={async (e: any) => {
              e.stopPropagation();
              setLoadingAction(rejectKey);
              try {
                const { error } = await sb.rpc("reject_settlement_change", {
                  p_change_request_id: changeRequestId,
                  p_decision_note: "현재는 변경이 어렵습니다.",
                });
                if (error) throw error;

                await markRead(n.id);
                showToast("거절했습니다.", "info");
              } catch (e: any) {
                showToast(e?.message ?? "거절 실패", "error");
              } finally {
                setLoadingAction(null);
              }
            }}
            disabled={loadingAction === rejectKey}
          >
            거절
          </RecipeButton>
        </div>
      );
    }

    return null;
  };

  const renderList = (rows: NotificationRow[]) => {
    if (rows.length === 0) return null;

    return (
      <div className="flex flex-col gap-3" onClick={stopBubble} onPointerDown={stopBubble}>
        {rows.map((n) => {
          const isUnread = !n.read_at;
          const meta = typeMeta(n.type);

          const m = n.payload?.month ? String(n.payload.month).slice(0, 7) : "";
          const subtitle = (() => {
            if (n.type === "SETTLEMENT_CHANGE_REQUESTED") {
              return `${m} · 요청자: ${nameOf(n.from_user_id)}`;
            }
            if (n.type === "SETTLEMENT_CHANGE_APPROVED") {
              return `${m} · 승인자: ${nameOf(n.from_user_id)}`;
            }
            if (n.type === "SETTLEMENT_CHANGE_REJECTED") {
              return `${m} · 처리 결과 안내`;
            }
            if (n.type === "SETTLEMENT_EDIT_WINDOW_REMINDER") {
              return `${m} · 곧 자동 재잠금`;
            }
            if (n.type === "SETTLEMENT_EDIT_WINDOW_EXPIRED") {
              return `${m} · 재잠금 완료`;
            }
            if (n.type === "COUPLE_INVITE_CREATED") {
              return `보낸 사람: ${nameOf(n.from_user_id)}`;
            }
            return `보낸 사람: ${nameOf(n.from_user_id)}`;
          })();

          const body =
            n.type === "SETTLEMENT_CHANGE_REQUESTED"
              ? String(n.payload?.reason ?? "")
              : n.type === "SETTLEMENT_CHANGE_REJECTED"
              ? String(n.payload?.note ?? "")
              : "";

          const expiresAt = n.payload?.approved_expires_at
            ? new Date(String(n.payload.approved_expires_at)).getTime()
            : null;

          const leftMs = expiresAt ? expiresAt - Date.now() : null;
          const showCountdown =
            (n.type === "SETTLEMENT_CHANGE_APPROVED" ||
              n.type === "SETTLEMENT_EDIT_WINDOW_REMINDER") &&
            leftMs !== null;

          return (
            <div
              key={n.id}
              className={[
                "relative rounded-2xl border p-4 transition",
                isUnread
                  ? "border-blue-200 bg-gradient-to-br from-blue-50 to-blue-50 shadow-sm"
                  : "border-zinc-200 bg-white",
              ].join(" ")}
              onClick={stopBubble}
              onPointerDown={stopBubble}
            >

              <div className="flex items-start justify-between gap-3 pr-8">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{meta.icon}</span>
                    <div className="text-[12px] font-extrabold text-zinc-900">
                      {meta.title}
                    </div>
                    {isUnread && <RecipeBadge variant="blue">NEW</RecipeBadge>}
                  </div>

                  <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>
                  <div className="mt-1 text-[11px] text-zinc-400">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>

                {showCountdown && (
                  <div onClick={stopBubble} onPointerDown={stopBubble}>
                    <RecipeBadge
                      variant={leftMs! <= 2 * 60 * 1000 ? "danger" : "neutral"}
                    >
                      남은 {formatLeft(leftMs!)}
                    </RecipeBadge>
                  </div>
                )}
              </div>

              {body && (
                <div
                  className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-[12px] text-zinc-800"
                  onClick={stopBubble}
                  onPointerDown={stopBubble}
                >
                  {body}
                </div>
              )}

              {renderActions(n)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div onClick={stopBubble} onPointerDown={stopBubble}>
      <RecipeCard
        title="알림"
        description={`미확인 ${unreadCount}개`}
        right={
          loading ? (
            <RecipeBadge>로딩중</RecipeBadge>
          ) : (
            <div
              className="flex items-center gap-2"
              onClick={stopBubble}
              onPointerDown={stopBubble}
            >
              <RecipeBadge variant="blue">LIVE</RecipeBadge>
              <RecipeButton
                variant="ghost"
                onClick={(e: any) => {
                  e.stopPropagation();
                  markAllRead();
                }}
                disabled={loadingAction === "markAllRead" || unreadCount === 0}
              >
                모두 읽음
              </RecipeButton>
              <RecipeButton
                variant="outline"
                onClick={(e: any) => {
                  e.stopPropagation();
                  onClose?.();
                }}
              >
                닫기
              </RecipeButton>
            </div>
          )
        }
        className="w-full"
      >
        <div onClick={stopBubble} onPointerDown={stopBubble}>
          {visibleItems.length === 0 && !loading && (
            <div className="text-[12px] text-zinc-500">알림이 없습니다.</div>
          )}

          {todayItems.length > 0 && (
            <div>
              <div className="mb-3 text-xs font-extrabold tracking-wide text-zinc-500">
                오늘
              </div>
              {renderList(todayItems)}
            </div>
          )}

          {previousItems.length > 0 && (
            <div className={todayItems.length > 0 ? "mt-6" : ""}>
              <div className="mb-3 text-xs font-extrabold tracking-wide text-zinc-500">
                이전
              </div>
              {renderList(previousItems)}
            </div>
          )}
        </div>
      </RecipeCard>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4">
          <div
            className={`min-w-[220px] rounded-2xl px-4 py-3 text-[12px] font-semibold text-white shadow-xl ${
              toast.type === "success"
                ? "bg-blue-500"
                : toast.type === "error"
                ? "bg-red-500"
                : "bg-slate-900"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import NotificationsList from "@/components/notifications/NotificationsList";

export default function NotificationsPage() {
  const sb = supabaseBrowser();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await sb.auth.getUser();
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [sb]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8fbff] px-4 py-6">
        <div className="mx-auto w-full max-w-[1240px] text-sm text-zinc-500">
          알림을 불러오는 중입니다...
        </div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-[#f8fbff] px-4 py-6">
        <div className="mx-auto w-full max-w-[1240px] rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-zinc-900">알림 내역</h1>
          <p className="mt-2 text-sm text-zinc-600">
            로그인 후 알림 내역을 확인할 수 있습니다.
          </p>
          <Link
            href="/sign-in"
            className="mt-4 inline-flex rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white"
          >
            로그인하러 가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] px-4 py-6">
      <div className="mx-auto w-full max-w-[1240px]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">알림 내역</h1>
            <p className="mt-1 text-[10px] text-zinc-500 sm:text-sm">
              최근 받은 알림을 한곳에서 확인할 수 있습니다.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-[10px] sm:text-sm font-medium text-zinc-700"
          >
            홈으로
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <NotificationsList userId={userId} />
        </div>
      </div>
    </main>
  );
}
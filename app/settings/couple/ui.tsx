"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import CoupleLinkBox from "@/components/couple/CoupleLinkBox";
import NotificationsPanel from "@/components/notifications/NotificationsPanel";
import PersonalShareToggle from "@/components/sharing/PersonalShareToggle";

export default function CoupleClientPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await sb.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, [sb]);

  if (!userId) return <div>로그인이 필요합니다.</div>;

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <CoupleLinkBox />
      <NotificationsPanel userId={userId} />
      <PersonalShareToggle />
    </div>
  );
}
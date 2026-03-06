"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function PersonalShareToggle() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(false);
  const [isOn, setIsOn] = useState(false);

  const setShare = async (next: boolean) => {
    setLoading(true);
    try {
      const { error } = await sb.rpc("set_personal_share", { p_is_on: next });
      if (error) throw error;
      setIsOn(next);
      alert(next ? "개인지출 공유 ON" : "개인지출 공유 OFF");
    } catch (e: any) {
      alert(e?.message ?? "토글 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, width: 420 }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>개인지출 공유</div>
      <button onClick={() => setShare(!isOn)} disabled={loading}>
        {isOn ? "공유 끄기" : "공유 켜기"}
      </button>
      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
        * 커플 연결(active) 상태에서만 동작합니다.
      </div>
    </div>
  );
}
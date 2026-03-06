"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function CoupleLinkBox() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [issuedCode, setIssuedCode] = useState<string>("");
  const [inputCode, setInputCode] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const issue = async () => {
    setLoading(true);
    try {
      const { data, error } = await sb.rpc("issue_pair_invite", { ttl_minutes: 10 });
      if (error) throw error;
      // RPC returns table: array
      const row = Array.isArray(data) ? data[0] : null;
      setIssuedCode(row?.code ?? "");
      alert("인증코드를 발급했습니다.");
    } catch (e: any) {
      alert(e?.message ?? "발급 실패");
    } finally {
      setLoading(false);
    }
  };

  const consume = async () => {
    setLoading(true);
    try {
      const { data, error } = await sb.rpc("consume_pair_invite", { p_code: inputCode.trim() });
      if (error) throw error;

      const coupleLinkId = data as string;
      alert(`요청을 보냈습니다. (link_id: ${coupleLinkId})`);
      setInputCode("");
    } catch (e: any) {
      alert(e?.message ?? "요청 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, width: 420 }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>커플 연결</div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <button onClick={issue} disabled={loading}>
          인증코드 발급
        </button>
        {issuedCode && (
          <div style={{ fontFamily: "monospace", fontSize: 18, letterSpacing: 2 }}>{issuedCode}</div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value)}
          placeholder="상대 코드 6자리 입력"
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={consume} disabled={loading || inputCode.trim().length < 6}>
          요청 보내기
        </button>
      </div>

      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
        * 코드 입력 시 상대에게 즉시 알림이 생성되며, 상대가 승인해야 연결됩니다.
      </div>
    </div>
  );
}
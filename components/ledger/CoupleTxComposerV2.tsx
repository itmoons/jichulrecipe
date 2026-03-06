"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Member = { user_id: string; display_name?: string | null };

type SplitMethod = "self" | "equal" | "amount";
type TxType = "expense" | "income";

export default function CoupleTxComposerV2({
  ledgerId,
  ledgerStatus,
}: {
  ledgerId: string;
  ledgerStatus: "active" | "archived_readonly";
}) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [members, setMembers] = useState<Member[]>([]);

  const [txType, setTxType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("");
  const [memo, setMemo] = useState("");

  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal");
  const [shares, setShares] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const disabledLedger = ledgerStatus !== "active";

  // ✅ 날짜가 속한 월이 잠금인지(또는 edit window open인지) 확인
  const [isLockedMonth, setIsLockedMonth] = useState(false);

  const refreshLockedState = async (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return;

      const month = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); // YYYY-MM-01

      // ledger_settlements에서 locked 여부 확인
      const { data: sData, error: sErr } = await sb
        .from("ledger_settlements")
        .select("status")
        .eq("ledger_id", ledgerId)
        .eq("month", month)
        .maybeSingle();

      if (sErr) {
        // 정책/권한 문제면 보수적으로 잠금 처리
        setIsLockedMonth(true);
        return;
      }

      // locked이면 true, unlocked/없으면 false
      setIsLockedMonth((sData as any)?.status === "locked");
    } catch {
      setIsLockedMonth(true);
    }
  };

  useEffect(() => {
    refreshLockedState(txDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txDate, ledgerId]);

  useEffect(() => {
    (async () => {
      const { data, error } = await sb
        .from("ledger_members")
        .select("user_id, profiles:profiles(display_name)")
        .eq("ledger_id", ledgerId)
        .eq("is_active", true);

      if (!error && data) {
        const mapped: Member[] = (data as any).map((r: any) => ({
          user_id: r.user_id,
          display_name: r.profiles?.display_name ?? null,
        }));
        setMembers(mapped);

        const init: Record<string, string> = {};
        for (const m of mapped) init[m.user_id] = "";
        setShares(init);
      }
    })();
  }, [sb, ledgerId]);

  const submit = async () => {
    if (disabledLedger) return alert("이 장부는 읽기 전용입니다.");
    if (isLockedMonth) return alert("정산 잠금된 달입니다. 아래에서 ‘수정 요청’을 보내세요.");

    const vAmount = Number(amount);
    if (!Number.isFinite(vAmount) || vAmount <= 0) return alert("금액을 올바르게 입력하세요.");

    setLoading(true);
    try {
      let splits: any = null;

      if (splitMethod === "amount") {
        const arr = members.map((m) => ({
          user_id: m.user_id,
          share_amount: Number(shares[m.user_id] || 0),
        }));
        const sum = arr.reduce((a: number, b: any) => a + (Number(b.share_amount) || 0), 0);
        if (Math.round(sum) !== Math.round(vAmount)) {
          throw new Error(`분할 합계(${sum})가 총액(${vAmount})과 같아야 합니다.`);
        }
        splits = arr;
      }

      const { data, error } = await sb.rpc("create_tx_with_split", {
        p_ledger_id: ledgerId,
        p_tx_type: txType,
        p_amount: vAmount,
        p_tx_date: txDate,
        p_category: category || null,
        p_memo: memo || null,
        p_split_method: splitMethod,
        p_splits: splits,
      });

      if (error) throw error;

      setAmount("");
      setCategory("");
      setMemo("");
      alert("저장 완료");
      return data;
    } catch (e: any) {
      alert(e?.message ?? "저장 실패");
    } finally {
      setLoading(false);
    }
  };

  const requestChange = async () => {
    setLoading(true);
    try {
      const month = new Date(new Date(txDate).getFullYear(), new Date(txDate).getMonth(), 1).toISOString().slice(0, 10);
      const reason =
        memo?.trim() ||
        `잠금된 ${month.slice(0, 7)} 달 거래 수정이 필요합니다. (예: 결제자/분할/금액 오류)`;

      const { error } = await sb.rpc("request_settlement_change", {
        p_ledger_id: ledgerId,
        p_month: month,
        p_reason: reason,
      });
      if (error) throw error;

      alert("수정 요청을 보냈습니다. 승인되면 15분간 수정 가능합니다.");
    } catch (e: any) {
      alert(e?.message ?? "요청 실패");
    } finally {
      setLoading(false);
    }
  };

  const disabled = disabledLedger || loading;

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, width: 560 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontWeight: 800 }}>거래 입력(분할 지원)</div>
        {isLockedMonth && (
          <div style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, background: "#fee2e2" }}>
            🔒 정산 잠금 월
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <select value={txType} onChange={(e) => setTxType(e.target.value as any)} disabled={disabled}>
          <option value="expense">지출</option>
          <option value="income">수입</option>
        </select>

        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="총액"
          disabled={disabled || isLockedMonth}
          style={{ flex: 1, padding: 8 }}
        />

        <input
          type="date"
          value={txDate}
          onChange={(e) => setTxDate(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="카테고리"
          style={{ flex: 1, padding: 8 }}
          disabled={disabled || isLockedMonth}
        />
        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모(수정 요청 사유로도 사용)"
          style={{ flex: 2, padding: 8 }}
          disabled={disabledLedger ? true : false}
        />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>분할</div>
        <select
          value={splitMethod}
          onChange={(e) => setSplitMethod(e.target.value as any)}
          disabled={disabled || isLockedMonth}
        >
          <option value="self">내가 전액</option>
          <option value="equal">균등(공동비)</option>
          <option value="amount">금액 지정</option>
        </select>
      </div>

      {splitMethod === "amount" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {members.map((m) => (
            <div key={m.user_id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ width: 180 }}>{m.display_name ?? m.user_id}</div>
              <input
                value={shares[m.user_id] ?? ""}
                onChange={(e) => setShares((prev) => ({ ...prev, [m.user_id]: e.target.value }))}
                placeholder="몫(원)"
                disabled={disabled || isLockedMonth}
                style={{ flex: 1, padding: 8 }}
              />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={submit} disabled={disabled || isLockedMonth}>
          {loading ? "저장중…" : "저장"}
        </button>

        {isLockedMonth && (
          <button onClick={requestChange} disabled={disabled}>
            수정 요청 보내기
          </button>
        )}
      </div>

      {isLockedMonth && (
        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
          * 이 달은 정산이 확정되어 거래 수정/추가가 제한됩니다. 상대 승인 후 15분 동안만 수정 가능합니다.
        </div>
      )}
    </div>
  );
}
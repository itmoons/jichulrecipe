"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type MyCouple = {
  couple_link_id: string;
  couple_ledger_id: string;
  status: string;
  partner_user_id: string;
} | null;

type ToastType = "success" | "error" | "info";

export default function CoupleLinkPage() {
  const [checking, setChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [myCouple, setMyCouple] = useState<MyCouple>(null);

  const [invCode, setInvCode] = useState<string | null>(null);
  const [invExpiresAt, setInvExpiresAt] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [codeInput, setCodeInput] = useState("");
  const [accepting, setAccepting] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  const [inlineMessage, setInlineMessage] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  const showInlineMessage = (message: string, type: ToastType = "info") => {
    setInlineMessage({ message, type });
  };

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    setIsLoggedIn(!!uid);

    if (!uid) {
      setMyCouple(null);
      setChecking(false);
      return;
    }

    const { data, error } = await supabase.rpc("get_my_couple_link");

    if (!error && data && data.length > 0) {
      setMyCouple(data[0] as MyCouple);
    } else {
      setMyCouple(null);
    }

    setChecking(false);
  };

  useEffect(() => {
    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 2600);

    return () => clearTimeout(timer);
  }, [toast]);

  const createInvite = async () => {
    setCreating(true);
    setInlineMessage(null);

    try {
      const { data, error } = await supabase.rpc("create_couple_invitation", {
        p_ttl_minutes: 10,
      });

      if (error) throw error;

      const row: any = Array.isArray(data) ? data[0] : data;

      const code = row?.code ? String(row.code) : null;
      const expires = row?.expires_at ? String(row.expires_at) : null;

      if (!code) {
        showToast("인증코드 생성에 실패했습니다.", "error");
        showInlineMessage("인증코드 생성에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
        return;
      }

      setInvCode(code);
      setInvExpiresAt(expires);

      showToast(`인증코드 ${code} 생성 완료`, "success");
      showInlineMessage("인증코드가 생성되었습니다. 상대에게 공유해 주세요.", "success");
    } catch (e: any) {
      const message = e?.message ?? "코드 생성 실패";
      showToast(message, "error");
      showInlineMessage(message, "error");
    } finally {
      setCreating(false);
    }
  };

  const acceptInvite = async () => {
    setAccepting(true);
    setInlineMessage(null);

    try {
      const code = codeInput.trim();

      if (!/^\d{6}$/.test(code)) {
        showToast("6자리 숫자 코드를 입력하세요.", "error");
        showInlineMessage("6자리 숫자 코드를 정확히 입력해 주세요.", "error");
        return;
      }

      const { error } = await supabase.rpc("accept_couple_invitation", {
        p_code: code,
      });

      if (error) throw error;

      setCodeInput("");
      showToast("커플 연결이 완료되었습니다.", "success");
      showInlineMessage("커플 연결이 완료되었습니다. 이제 커플 장부를 사용할 수 있어요.", "success");

      await load();
    } catch (e: any) {
      const message = e?.message ?? "연결 실패";
      showToast(message, "error");
      showInlineMessage(message, "error");
    } finally {
      setAccepting(false);
    }
  };

  const copyInviteCode = async () => {
    if (!invCode) return;

    try {
      await navigator.clipboard.writeText(invCode);
      showToast("인증코드를 복사했습니다.", "success");
    } catch {
      showToast("복사에 실패했습니다.", "error");
    }
  };

  if (checking) {
    return <div className="p-6 text-[12px] text-slate-700">확인 중…</div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-blue-100 bg-white p-5">
          <div className="text-lg font-extrabold text-slate-900">커플 연결</div>
          <div className="mt-1 text-[12px] text-slate-600">로그인 후 사용할 수 있습니다.</div>
          <div className="mt-4">
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center rounded-xl bg-blue-500 px-4 py-2 text-[12px] font-bold text-white hover:bg-blue-600"
            >
              로그인하기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const linked = !!myCouple?.couple_link_id;

  return (
    <div className="bg-recipe min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-extrabold text-slate-900">커플 연결</div>
            <div className="mt-1 text-[12px] text-slate-600">
              인증코드로 연결하고, 상대 동의(코드 입력)가 있어야만 활성화됩니다.
            </div>
          </div>

          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            🍊 지출레시피
          </span>
        </div>

        {inlineMessage && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-[12px] font-medium ${
              inlineMessage.type === "success"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : inlineMessage.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            {inlineMessage.message}
          </div>
        )}

        {linked ? (
          <div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-base font-extrabold text-slate-900">연결 완료</div>
                <div className="mt-1 text-[12px] text-slate-600">
                  커플 장부 ID: <span className="font-mono text-xs">{myCouple?.couple_ledger_id}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  상대(파트너) user_id: <span className="font-mono">{myCouple?.partner_user_id}</span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  * 공유/비공유 토글은 다음 단계에서 <b>설정 페이지</b>로 붙입니다. (공동장부 ON, 개인공유 OFF, 편집 제한)
                </div>
              </div>

              <Link
                href="/couple-ledger"
                className="inline-flex items-center justify-center rounded-xl bg-blue-500 px-4 py-2 text-[12px] font-bold text-white hover:bg-blue-600"
              >
                커플 장부로 이동
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
              <div className="text-base font-extrabold text-slate-900">내가 초대하기</div>
              <div className="mt-1 text-[12px] text-slate-600">6자리 인증코드를 만들어 상대에게 공유하세요.</div>

              <button
                onClick={createInvite}
                disabled={creating}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-500 px-4 py-2 text-[12px] font-bold text-white hover:bg-blue-600 disabled:opacity-60"
              >
                {creating ? "생성 중…" : "인증코드 만들기"}
              </button>

              {invCode && (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold tracking-wide text-blue-700">발급된 인증코드</div>
                      <div className="mt-2 text-3xl font-extrabold tracking-[0.25em] text-slate-900">
                        {invCode}
                      </div>
                    </div>

                    <button
                      onClick={copyInviteCode}
                      className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-blue-50"
                    >
                      복사
                    </button>
                  </div>

                  <div className="mt-3 text-xs text-slate-600">
                    만료: {invExpiresAt ? new Date(invExpiresAt).toLocaleString() : "-"} (기본 10분)
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    상대가 이 코드를 입력하는 순간 동의 처리되어 연결됩니다.
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
              <div className="text-base font-extrabold text-slate-900">코드 입력해서 연결</div>
              <div className="mt-1 text-[12px] text-slate-600">상대가 준 6자리 코드를 입력하면 연결이 완료됩니다.</div>

              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="예: 123456"
                inputMode="numeric"
                maxLength={6}
                className="mt-4 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-blue-200"
              />

              <button
                onClick={acceptInvite}
                disabled={accepting}
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-2 text-[12px] font-bold text-slate-900 hover:bg-blue-50 disabled:opacity-60"
              >
                {accepting ? "연결 중…" : "연결(동의)하기"}
              </button>

              <div className="mt-3 text-[11px] text-slate-500">
                * 보안상 코드 만료(10분), 본인 코드 수락 불가, 이미 연결된 상대는 재연결 불가입니다.
              </div>
            </div>
          </div>
        )}
      </div>

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
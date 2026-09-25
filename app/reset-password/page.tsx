// src/app/reset-password/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";

const BRAND_BLUE = "#1f7a5b";

function validatePassword(value: string) {
  if (!value) {
    return "비밀번호를 입력해 주세요.";
  }

  if (value.length < 8) {
    return "비밀번호는 8자 이상이어야 합니다.";
  }

  if (value.length > 128) {
    return "비밀번호는 128자 이하여야 합니다.";
  }

  return null;
}

export default function ResetPasswordPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordCheck, setPasswordCheck] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const bootstrap = async () => {
      try {
        /**
         * 초기 세션 확인
         * - recovery 링크로 이미 세션이 생성되었는지 확인
         */
        const { data } = await supabase.auth.getSession();

        if (!mountedRef.current) return;

        if (data?.session) {
          setHasRecoverySession(true);
          setLoading(false);
          return;
        }

        setHasRecoverySession(false);
        setLoading(false);
      } catch (err) {
        console.error("reset-password session bootstrap error:", err);
        if (!mountedRef.current) return;
        setHasRecoverySession(false);
        setLoading(false);
      }
    };

    bootstrap();

    /**
     * PASSWORD_RECOVERY 또는 세션 변경 감지
     * - 일부 환경에서는 첫 진입 직후 세션 반영 타이밍 이슈를 보완
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;

      if (event === "PASSWORD_RECOVERY" || !!session) {
        setHasRecoverySession(true);
        setLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();

      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrorMsg(passwordError);
      return;
    }

    if (!passwordCheck) {
      setErrorMsg("비밀번호 확인을 입력해 주세요.");
      return;
    }

    if (password !== passwordCheck) {
      setErrorMsg("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    if (!hasRecoverySession) {
      setErrorMsg(
        "유효한 비밀번호 재설정 세션이 없습니다. 다시 비밀번호 재설정을 진행해 주세요."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorMsg(
          "비밀번호 변경에 실패했습니다. 링크가 만료되었거나 이미 사용되었을 수 있습니다."
        );
        return;
      }

      /**
       * 변경 성공 후 재설정 세션 정리
       */
      await supabase.auth.signOut();

      if (!mountedRef.current) return;

      setSuccessMsg("비밀번호가 성공적으로 변경되었습니다. 다시 로그인해 주세요.");

      redirectTimerRef.current = setTimeout(() => {
        router.replace("/sign-in");
      }, 1200);
    } catch (err) {
      console.error("reset-password updateUser error:", err);
      if (!mountedRef.current) return;
      setErrorMsg("비밀번호 변경 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center landing-surface px-4">
        <p className="text-xs text-slate-500">
          비밀번호 재설정 링크를 확인하고 있습니다...
        </p>
      </main>
    );
  }

  if (!hasRecoverySession) {
    return (
      <main className="flex min-h-screen items-center justify-center landing-surface px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-sm ">
          <h1 className="mb-2 text-base font-semibold text-slate-900">
            유효하지 않은 비밀번호 재설정 링크입니다
          </h1>
          <p className="mb-4 text-xs text-slate-600">
            링크가 만료되었거나 이미 사용된 것일 수 있습니다.
            <br />
            다시 비밀번호 찾기를 진행해 새 링크를 받아 주세요.
          </p>
          <button
            type="button"
            onClick={() => router.replace("/sign-in")}
            className="inline-flex items-center justify-center rounded-xl bg-[color:var(--brand-blue)] px-4 py-2.5 text-[12px] font-semibold text-white shadow-md hover:bg-[#176247]"
            style={{ ["--brand-blue" as any]: BRAND_BLUE }}
          >
            로그인 페이지로 이동
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center landing-surface px-4">

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="mt-[12rem] w-full max-w-md rounded-xl bg-white p-6 shadow-sm "
      >
        <div className="mb-4 flex flex-col gap-1">
          <div className="inline-flex items-center gap-2">
            <span className="text-xl">🥕</span>
            <span className="text-[12px] font-semibold tracking-tight text-slate-900">
              지출레시피
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-slate-900">
            비밀번호 재설정
          </h1>
          <p className="text-xs text-slate-600">
            새로 사용할 비밀번호를 입력해 주세요.
          </p>
        </div>

        {successMsg && (
          <div className="mb-3 rounded-xl border border border-[#1f7a5b]/30 bg-[#1f7a5b]/10 px-3 py-2 text-[11px] text-slate-700">
            {successMsg}
          </div>
        )}

        {errorMsg && <p className="mb-3 text-xs text-red-500">{errorMsg}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              새 비밀번호
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] outline-none focus:border-slate-400"
              placeholder="8자 이상 입력해 주세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              maxLength={128}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              새 비밀번호 확인
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] outline-none focus:border-slate-400"
              placeholder="한 번 더 입력해 주세요"
              value={passwordCheck}
              onChange={(e) => setPasswordCheck(e.target.value)}
              autoComplete="new-password"
              maxLength={128}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center rounded-xl bg-[color:var(--brand-blue)] px-4 py-2.5 text-[12px] font-semibold text-white shadow-md transition hover:bg-[#176247] disabled:cursor-not-allowed disabled:opacity-70"
            style={{ ["--brand-blue" as any]: BRAND_BLUE }}
          >
            {isSubmitting ? "변경 중..." : "비밀번호 변경하기"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}

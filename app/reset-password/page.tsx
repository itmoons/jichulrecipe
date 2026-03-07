// src/app/reset-password/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";

const BRAND_blue = "#5bbbf3";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordCheck, setPasswordCheck] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 메일 링크로 들어왔을 때 Supabase가 세션을 붙여줬는지 확인
  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("getSession error on reset-password:", error);
      }
      setHasSession(!!data.session);
      setLoading(false);
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setErrorMsg("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== passwordCheck) {
      setErrorMsg("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password,
      });

      console.log("updateUser (reset-password) result:", { data, error });

      if (error) {
        setErrorMsg(
          error.message ||
            "비밀번호 변경에 실패했습니다. 링크 유효시간이 지났을 수도 있습니다."
        );
        return;
      }

      setSuccessMsg("비밀번호가 성공적으로 변경되었습니다. 다시 로그인해 주세요.");
      // 잠시 메시지 보여주고 로그인 페이지로 이동
      setTimeout(() => {
        router.push("/sign-in");
      }, 1500);
    } catch (err) {
      console.error("reset-password updateUser error:", err);
      setErrorMsg("비밀번호 변경 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#FFF8EC] via-[#FFFDFC] to-[#F7FAFF] px-4">
        <p className="text-xs text-slate-500">
          비밀번호 재설정 링크를 확인하고 있습니다...
        </p>
      </main>
    );
  }

  if (!hasSession) {
    // 세션이 없다면: 잘못된/만료된 링크
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#FFF8EC] via-[#FFFDFC] to-[#F7FAFF] px-4">
        <div className="w-full max-w-md rounded-3xl bg-white/95 p-6 text-center shadow-lg shadow-blue-100">
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
            onClick={() => router.push("/sign-in")}
            className="inline-flex items-center justify-center rounded-xl bg-[color:var(--brand-blue)] px-4 py-2.5 text-[12px] font-semibold text-white shadow-md shadow-blue-200 hover:bg-[#f27422]"
            style={{ ["--brand-blue" as any]: BRAND_blue }}
          >
            로그인 페이지로 이동
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-[#FFF8EC] via-[#FFFDFC] to-[#F7FAFF] px-4">
      <div className="pointer-events-none fixed left-[-80px] top-[40%] -z-10 h-52 w-52 rounded-full bg-[rgba(255,184,108,0.25)] blur-3xl" />
      <div className="pointer-events-none fixed right-[-60px] bottom-[8%] -z-10 h-52 w-52 rounded-full bg-[rgba(86,115,231,0.18)] blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-md rounded-3xl bg-white/95 p-6 shadow-lg shadow-blue-100"
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
          <div className="mb-3 rounded-xl border border-blue-200 bg-[#FFF7EB] px-3 py-2 text-[11px] text-blue-700">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <p className="mb-3 text-xs text-red-500">{errorMsg}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              새 비밀번호
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] outline-none focus:border-slate-400"
              placeholder="6자 이상 입력해 주세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center rounded-xl bg-[color:var(--brand-blue)] px-4 py-2.5 text-[12px] font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-[#f27422] disabled:cursor-not-allowed disabled:opacity-70"
            style={{ ["--brand-blue" as any]: BRAND_blue }}
          >
            {isSubmitting ? "변경 중..." : "비밀번호 변경하기"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}

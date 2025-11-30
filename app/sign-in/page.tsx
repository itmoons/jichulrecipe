// src/app/sign-in/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";

const BRAND_ORANGE = "#FF8A3D";

/**
 * ✅ 실제 로그인/회원가입 로직이 들어 있는 컴포넌트
 *   - 여기에서 useSearchParams()를 사용
 */
function SignInInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ?mode=register 로 들어오면 회원가입 탭부터
  const initialMode =
    searchParams.get("mode") === "register" ? "register" : "login";

  // 로그인 후 되돌아갈 경로 (?redirect=...)
  const redirectPath = searchParams.get("redirect") || "/";

  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordCheck, setPasswordCheck] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null); // 회원가입 축하 메시지
  const [resetMsg, setResetMsg] = useState<string | null>(null); // 비밀번호 재설정 안내

  const title = mode === "login" ? "로그인" : "회원가입";
  const subtitle =
    mode === "login"
      ? "이메일과 비밀번호로 지출레시피에 로그인하세요."
      : "이메일만으로 간단히 가입하고, 나만의 지출 레시피를 시작해 보세요.";

  const validate = () => {
    if (!email.trim()) {
      setErrorMsg("이메일을 입력해 주세요.");
      return false;
    }
    if (!email.includes("@")) {
      setErrorMsg("올바른 이메일 형식을 입력해 주세요.");
      return false;
    }
    if (!password) {
      setErrorMsg("비밀번호를 입력해 주세요.");
      return false;
    }
    if (password.length < 6) {
      setErrorMsg("비밀번호는 6자 이상이어야 합니다.");
      return false;
    }
    if (mode === "register") {
      if (!passwordCheck) {
        setErrorMsg("비밀번호 확인을 입력해 주세요.");
        return false;
      }
      if (password !== passwordCheck) {
        setErrorMsg("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        return false;
      }
    }
    setErrorMsg(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setResetMsg(null);

    // 이메일은 항상 trim + 소문자 처리해서 사용
    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (mode === "register") {
        // =========================
        // 1) 회원가입
        // =========================
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });

        console.log("signUp result:", { data, error });

        if (error) {
          setErrorMsg(error.message || "회원가입에 실패했습니다.");
          return;
        }

        // 회원가입 성공
        setSuccessMsg(
          "쉐프가 된것을 축하합니다! 이제 로그인하고 나만의 지출 레시피를 시작해 보세요."
        );
        setMode("login");

        // =========================
        // 2) 바로 로그인 시도 (자동 로그인)
        // =========================
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

        console.log("auto signIn after signUp:", {
          signInData,
          signInError,
        });

        if (signInError) {
          if (signInError.message === "Invalid login credentials") {
            setErrorMsg(
              "가입은 완료되었지만, 로그인 정보가 올바르지 않습니다. 다시 한 번 이메일/비밀번호를 확인해 주세요."
            );
          } else {
            setErrorMsg(
              signInError.message ||
                "가입은 완료되었지만 자동 로그인에는 실패했습니다. 다시 로그인해 주세요."
            );
          }
          return;
        }

        // 자동 로그인 성공 → redirectPath 이동
        router.push(redirectPath);
      } else {
        // =========================
        // 로그인
        // =========================
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        console.log("signIn result:", { data, error });

        if (error) {
          if (error.message === "Invalid login credentials") {
            setErrorMsg(
              "이메일 또는 비밀번호가 올바르지 않습니다. 가입한 이메일/비밀번호와 동일한지 확인해 주세요."
            );
          } else {
            setErrorMsg(error.message || "로그인에 실패했습니다.");
          }
          return;
        }

        // 로그인 성공 → redirectPath 이동
        router.push(redirectPath);
      }
    } catch (err) {
      console.error("Auth error:", err);
      setErrorMsg(
        "처리 중 오류가 발생했습니다. Supabase 설정(.env)이나 네트워크 상태를 한 번 확인해 주세요."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 비밀번호 재설정 메일 보내기
  const handleSendResetEmail = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMsg("비밀번호를 재설정하려면 먼저 이메일을 입력해 주세요.");
      return;
    }
    if (!normalizedEmail.includes("@")) {
      setErrorMsg("올바른 이메일 형식을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setResetMsg(null);

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${origin}/reset-password`,
        }
      );

      if (error) {
        console.error("resetPasswordForEmail error:", error);
        setErrorMsg(
          error.message ||
            "비밀번호 재설정 메일 전송에 실패했습니다. 잠시 후 다시 시도해 주세요."
        );
        return;
      }

      setResetMsg(
        "비밀번호 재설정 링크를 이메일로 보냈습니다. 메일함(및 스팸함)을 확인해 주세요."
      );
    } catch (err) {
      console.error("reset password error:", err);
      setErrorMsg(
        "비밀번호 재설정 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-[#FFF8EC] via-[#FFFDFC] to-[#F7FAFF] px-4">
      {/* 배경 장식 */}
      <div className="pointer-events-none fixed left-[-80px] top-[40%] -z-10 h-52 w-52 rounded-full bg-[rgba(255,184,108,0.25)] blur-3xl" />
      <div className="pointer-events-none fixed right-[-60px] bottom-[8%] -z-10 h-52 w-52 rounded-full bg-[rgba(86,115,231,0.18)] blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-md rounded-3xl bg-white/95 p-6 shadow-lg shadow-orange-100"
      >
        {/* 로고 + 인사말 */}
        <div className="mb-5 flex flex-col gap-1">
          <div className="inline-flex items-center gap-2">
            <span className="text-xl">🥕</span>
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              지출레시피
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-600">{subtitle}</p>
        </div>

        {/* 로그인 / 회원가입 탭 */}
        <div className="mb-3 flex rounded-full bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMsg(null);
              setSuccessMsg(null);
              setResetMsg(null);
            }}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              mode === "login"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setErrorMsg(null);
              setSuccessMsg(null);
              setResetMsg(null);
            }}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              mode === "register"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            회원가입
          </button>
        </div>

        {/* 회원가입 성공 메시지 배너 */}
        {successMsg && (
          <div className="mb-3 rounded-xl border border-orange-200 bg-[#FFF7EB] px-3 py-2 text-[11px] text-orange-700">
            <strong className="mr-1">🎉 쉐프가 된것을 축하합니다!</strong>
            <span>
              이제 로그인하고 나만의 지출 레시피를 시작해 보세요.
            </span>
          </div>
        )}

        {/* 비밀번호 재설정 안내 메시지 */}
        {resetMsg && (
          <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
            {resetMsg}
          </div>
        )}

        {/* 이메일 전용 폼 */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              이메일
            </label>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="예: user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              비밀번호
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="6자 이상 입력해 주세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {mode === "register" && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                비밀번호 확인
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="비밀번호를 다시 입력해 주세요"
                value={passwordCheck}
                onChange={(e) => setPasswordCheck(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          )}

          {errorMsg && (
            <p className="pt-1 text-xs text-red-500">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 flex w-full items-center justify-center rounded-xl bg-[color:var(--brand-orange)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-[#f27422] disabled:cursor-not-allowed disabled:opacity-70"
            style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
          >
            {isSubmitting
              ? "처리 중..."
              : mode === "login"
              ? "이메일로 로그인"
              : "이메일로 회원가입"}
          </button>
        </form>

        {/* 하단 안내 + 비밀번호 찾기 */}
        <div className="mt-4 space-y-1 text-[10px] text-slate-500">
          <p>• 이메일 계정만 지원합니다. 소셜 로그인은 추후 확장 가능합니다.</p>
          <button
            type="button"
            onClick={handleSendResetEmail}
            disabled={isSubmitting}
            className="mt-1 text-[10px] font-semibold text-slate-600 underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            비밀번호를 잊으셨나요? 비밀번호 재설정 메일 보내기
          </button>
        </div>
      </motion.div>
    </main>
  );
}

/**
 * ✅ 페이지 컴포넌트
 *   - 여기서 SignInInner를 Suspense로 감싸서
 *     `useSearchParams must be wrapped in Suspense` 에러를 해결
 */
export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#FFF8EC] via-[#FFFDFC] to-[#F7FAFF] px-4">
          <div className="rounded-3xl bg-white/90 p-6 text-sm text-slate-600 shadow">
            로그인 화면을 준비 중입니다...
          </div>
        </main>
      }
    >
      <SignInInner />
    </Suspense>
  );
}

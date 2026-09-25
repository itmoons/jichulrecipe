// src/app/sign-in/page.tsx
"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";

const BRAND_BLUE = "#1f7a5b";

type AuthMode = "login" | "register";

function isValidEmail(value: string) {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * redirect 취약점 방지
 * - 내부 경로만 허용
 * - //, http:, https:, javascript: 등 차단
 */
function getSafeRedirectPath(raw: string | null) {
  if (!raw) return "/";
  const value = raw.trim();

  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (value.includes("\r") || value.includes("\n")) return "/";

  return value;
}

/**
 * Supabase signUp 응답에서
 * "이미 가입된 이메일" 가능성을 최대한 안전하게 판별
 */
function isExistingEmailSignUpResult(data: any) {
  const identities = data?.user?.identities;
  return Array.isArray(identities) && identities.length === 0;
}

function SignInInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMode: AuthMode =
    searchParams.get("mode") === "register" ? "register" : "login";

  const redirectPath = useMemo(
    () => getSafeRedirectPath(searchParams.get("redirect")),
    [searchParams]
  );

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordCheck, setPasswordCheck] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const title = mode === "login" ? "로그인" : "회원가입";
  const subtitle =
    mode === "login"
      ? "이메일과 비밀번호로 지출레시피에 로그인하세요."
      : "이메일만으로 간단히 가입하고, 나만의 지출 레시피를 시작해 보세요.";

  const resetMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setResetMsg(null);
  };

  const validate = () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMsg("이메일을 입력해 주세요.");
      return false;
    }

    if (!isValidEmail(normalizedEmail)) {
      setErrorMsg("올바른 이메일 형식을 입력해 주세요.");
      return false;
    }

    if (!password) {
      setErrorMsg("비밀번호를 입력해 주세요.");
      return false;
    }

    if (password.length < 8) {
      setErrorMsg("비밀번호는 8자 이상이어야 합니다.");
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
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);
    resetMessages();

    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });

        if (error) {
          setErrorMsg("회원가입에 실패했습니다. 입력 정보를 다시 확인해 주세요.");
          return;
        }

        /**
         * 이미 존재하는 이메일일 수 있는 경우
         * - 성공 배너를 띄우지 않음
         * - 사용자에게는 안전한 일반 메시지 제공
         */
        if (isExistingEmailSignUpResult(data)) {
          setErrorMsg(
            "이미 사용 중인 이메일이거나 가입을 진행할 수 없습니다. 로그인 또는 비밀번호 재설정을 이용해 주세요."
          );
          return;
        }

        /**
         * 이메일 인증이 필요한 설정이라면 자동 로그인보다 안내가 우선
         */
        const needsEmailVerification =
          !!data?.user &&
          data?.session == null &&
          !!data?.user?.email_confirmed_at === false;

        if (needsEmailVerification) {
          setSuccessMsg(
            "회원가입이 완료되었습니다. 이메일 인증 후 로그인해 주세요."
          );
          setMode("login");
          return;
        }

        /**
         * 회원가입 직후 자동 로그인 시도
         * - 여기서 실패해도 회원가입 성공 배너는 유지
         */
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInError) {
          setSuccessMsg(
            "회원가입이 완료되었습니다. 이제 로그인하고 나만의 지출 레시피를 시작해 보세요."
          );
          setMode("login");
          setPassword("");
          setPasswordCheck("");
          return;
        }

        router.replace(redirectPath);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setErrorMsg(
          "이메일 또는 비밀번호가 올바르지 않습니다. 다시 확인해 주세요."
        );
        return;
      }

      router.replace(redirectPath);
    } catch (err) {
      console.error("Auth error:", err);
      setErrorMsg(
        "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (isSubmitting) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMsg("비밀번호를 재설정하려면 먼저 이메일을 입력해 주세요.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setErrorMsg("올바른 이메일 형식을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    resetMessages();

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${origin}/reset-password`,
      });

      /**
       * 계정 존재 여부 노출 방지
       * - 성공/실패 여부를 너무 자세히 구분하지 않음
       */
      setResetMsg(
        "입력한 이메일로 비밀번호 재설정 안내를 보냈습니다. 메일함과 스팸함을 확인해 주세요."
      );
    } catch (err) {
      console.error("Reset password error:", err);
      setResetMsg(
        "입력한 이메일로 비밀번호 재설정 안내를 보냈습니다. 메일함과 스팸함을 확인해 주세요."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center landing-surface px-4">

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="mt-[-14rem] w-full max-w-md rounded-xl bg-white p-6 shadow-sm "
      >
        <div className="mb-5 flex flex-col gap-1">
          <div className="inline-flex items-center gap-2">
            <span className="text-xl">🥕</span>
            <span className="text-[12px] font-semibold tracking-tight text-slate-900">
              지출레시피
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-600">{subtitle}</p>
        </div>

        <div className="mb-3 flex rounded-full bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              resetMessages();
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
              resetMessages();
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

        {successMsg && (
          <div className="mb-3 rounded-xl border border border-[#1f7a5b]/30 bg-[#1f7a5b]/10 px-3 py-2 text-[11px] text-slate-700">
            <strong className="mr-1">🎉 안내 🎉</strong>
            <span>{successMsg}</span>
          </div>
        )}

        {resetMsg && (
          <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
            {resetMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              이메일
            </label>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] outline-none focus:border-slate-400"
              placeholder="예: user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              maxLength={254}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              비밀번호
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] outline-none focus:border-slate-400"
              placeholder="8자 이상 입력해 주세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              maxLength={128}
            />
          </div>

          {mode === "register" && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                비밀번호 확인
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] outline-none focus:border-slate-400"
                placeholder="비밀번호를 다시 입력해 주세요"
                value={passwordCheck}
                onChange={(e) => setPasswordCheck(e.target.value)}
                autoComplete="new-password"
                maxLength={128}
              />
            </div>
          )}

          {errorMsg && <p className="pt-1 text-xs text-red-500">{errorMsg}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 flex w-full items-center justify-center rounded-xl bg-[color:var(--brand-blue)] px-4 py-2.5 text-[12px] font-semibold text-white shadow-md transition hover:bg-[#176247] disabled:cursor-not-allowed disabled:opacity-70"
            style={{ ["--brand-blue" as any]: BRAND_BLUE }}
          >
            {isSubmitting
              ? "처리 중..."
              : mode === "login"
              ? "이메일로 로그인"
              : "이메일로 회원가입"}
          </button>
        </form>

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

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center landing-surface px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm " aria-label="로그인 화면 불러오는 중">
            <div className="h-4 w-24 animate-pulse rounded bg-orange-100" />
            <div className="mt-4 h-7 w-20 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="mt-6 h-10 animate-pulse rounded-xl bg-slate-100" />
            <div className="mt-3 h-10 animate-pulse rounded-xl bg-slate-100" />
            <div className="mt-4 h-11 animate-pulse rounded-xl bg-orange-100" />
          </div>
        </main>
      }
    >
      <SignInInner />
    </Suspense>
  );
}

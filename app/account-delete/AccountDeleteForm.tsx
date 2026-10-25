"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
export default function AccountDeleteForm() {
  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccount(session ? session.user.email ?? "로그인한 계정" : null);
      setAgreed(false); setConfirmation("");
    });
    supabase.auth.getUser().then(({ data }) => setAccount(data.user ? data.user.email ?? "로그인한 계정" : null)).catch(() => setError("로그인 상태를 확인하지 못했습니다.")).finally(() => setLoading(false));
    return () => subscription.unsubscribe();
  }, []);
  async function remove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account || !agreed || confirmation !== "계정 삭제" || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const { error } = await supabase.rpc("delete_my_account", { consent: agreed, confirmation });
      if (error) throw error;
      setDeleted(true);
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      setError("삭제하지 못했습니다. 다시 로그인해 시도해 주세요. 문제가 계속되면 관리자에게 문의해 주세요.");
    } finally { lock.current = false; setBusy(false); }
  }
  if (deleted) return <div role="status" className="px-5 py-8 text-center sm:px-7"><p className="font-semibold text-slate-800">계정 삭제가 완료되었습니다.</p><Link href="/" className="mt-5 inline-flex rounded-xl bg-[#1f7a5b] px-6 py-3 text-sm font-semibold text-white hover:bg-[#176247]">홈으로 이동</Link></div>;
  if (loading) return <p role="status" className="animate-pulse px-5 py-8 text-sm text-slate-500 sm:px-7">로그인 정보를 확인하고 있어요…</p>;
  if (!account) return <div className="space-y-5 px-5 py-7 sm:px-7">{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}<p className="text-sm leading-6 text-slate-500">본인 계정을 삭제하려면 먼저 로그인해 주세요.</p><Link href="/sign-in?redirect=%2Faccount-delete" className="flex justify-center rounded-xl bg-[#1f7a5b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#176247]">로그인하기</Link></div>;
  return <form onSubmit={remove} className="space-y-6 px-5 py-6 sm:px-7 sm:py-7">
    <div className="rounded-xl bg-[#f6f7f5] px-4 py-3"><p className="text-[11px] font-medium text-slate-500">삭제할 계정</p><p className="mt-1 break-all text-sm font-semibold text-slate-800">{account}</p></div>
    <fieldset disabled={busy} className="space-y-6 disabled:opacity-60">
      <legend className="sr-only">계정 삭제 동의</legend>
      <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${agreed ? "border-[#a5cdbb] bg-[#f3f9f5]" : "border-slate-200 bg-white hover:bg-slate-50"}`}><input type="checkbox" required checked={agreed} onChange={event => setAgreed(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#1f7a5b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f7a5b]" /><span className="text-[13px] leading-6 text-slate-600"><span className="mb-1 block font-semibold text-slate-800">계정 영구 삭제에 동의합니다 <span className="text-rose-600">(필수)</span></span>계정과 연결된 기록이 삭제되며 복구할 수 없음을 확인했습니다.</span></label>
      <label className="block text-[13px] font-medium text-slate-700">확인 문구 입력<span className="mt-1 block text-xs font-normal leading-5 text-slate-500">아래에 <strong className="font-semibold text-slate-700">계정 삭제</strong>를 정확히 입력해 주세요.</span><input required autoComplete="off" spellCheck={false} placeholder="계정 삭제" value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-3 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1f7a5b] focus:ring-2 focus:ring-[#1f7a5b]/10" /></label>
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-xs leading-6 text-rose-700">{error}</p>}
      <div className="space-y-2 border-t border-slate-100 pt-5"><button disabled={busy || !agreed || confirmation !== "계정 삭제"} className="min-h-12 w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">{busy ? "삭제 중…" : "동의하고 계정 영구 삭제"}</button><Link href="/settings" className="block rounded-xl px-4 py-3 text-center text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800">취소하고 돌아가기</Link></div>
    </fieldset>
  </form>;
}


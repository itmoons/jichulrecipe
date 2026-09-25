"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Memo = { id: number; user_id: string; date: string; title: string; detail: string; created_at: string };
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const pageSize = 30;

export default function MemosPage() {
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [memos, setMemos] = useState<Memo[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Memo | "new" | null>(null);
  const [draft, setDraft] = useState({ title: "", detail: "", date: today() });
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const version = useRef(0);
  const mutation = useRef(false);
  const currentUser = useRef<string | null>(null);
  const invalidate = useCallback(() => { version.current++; }, []);

  const load = useCallback(async (offset = 0) => {
    const request = ++version.current;
    setLoading(true);
    setError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (request !== version.current) return;
      if (authError || !auth.user) {
        setUserId(null); setMemos([]); setMore(false);
        if (authError && authError.name !== "AuthSessionMissingError") setError("로그인 정보를 확인하지 못했습니다. 다시 로그인해 주세요.");
        return;
      }
      setUserId(auth.user.id);
      currentUser.current = auth.user.id;
      const [year, number] = month.split("-").map(Number);
      const last = new Date(year, number, 0).getDate();
      const { data, error: fetchError } = await supabase.from("daily_memos")
        .select("id,user_id,date,title,detail,created_at")
        .eq("user_id", auth.user.id).gte("date", `${month}-01`).lte("date", `${month}-${last}`)
        .order("date", { ascending: false }).order("id", { ascending: false })
        .range(offset, offset + pageSize);
      if (request !== version.current) return;
      if (fetchError) throw fetchError;
      const rows = (data ?? []) as Memo[];
      setMore(rows.length > pageSize);
      setMemos(previous => offset ? [...previous, ...rows.slice(0, pageSize)] : rows.slice(0, pageSize));
    } catch {
      if (request === version.current) setError("메모를 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.");
    } finally {
      if (request === version.current) setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
    let authTimer: number | undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (event === "SIGNED_IN" && session?.user.id !== currentUser.current)) {
        invalidate();
        currentUser.current = session?.user.id ?? null;
        setUserId(null);
        setEditing(null); setMemos([]); setDeleting(null);
        // Auth callbacks must not await another auth request.
        authTimer = window.setTimeout(() => { void load(); }, 0);
      }
    });
    return () => { invalidate(); window.clearTimeout(authTimer); subscription.unsubscribe(); };
  }, [load, invalidate]);

  useEffect(() => {
    if (!editing) return;
    const original = editing === "new" ? { title: "", detail: "", date: today() } : editing;
    if (draft.title === original.title && draft.detail === original.detail && draft.date === original.date) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest("a[href]") || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
      if (!window.confirm("메모에 저장하지 않은 변경 사항이 있습니다. 이동할까요?")) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", click, true); };
  }, [editing, draft]);

  const closeEditor = () => {
    const original = editing && editing !== "new" ? editing : { title: "", detail: "", date: today() };
    if ((draft.title !== original.title || draft.detail !== original.detail || draft.date !== original.date) && !window.confirm("작성 중인 내용을 저장하지 않고 닫을까요?")) return;
    setEditing(null); setError("");
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mutation.current || !editing || !userId || !draft.title.trim()) return;
    mutation.current = true; setBusy(true); setError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || auth.user?.id !== userId) throw new Error("auth");
      const values = { title: draft.title.trim(), detail: draft.detail.trim(), date: draft.date };
      const result = editing === "new"
        ? await supabase.from("daily_memos").insert({ ...values, user_id: userId }).select("id").single()
        : await supabase.from("daily_memos").update(values).eq("id", editing.id).eq("user_id", userId).select("id").single();
      if (result.error || !result.data) throw result.error ?? new Error("missing");
      setEditing(null); setMessage("메모를 저장했습니다.");
      if (draft.date.slice(0, 7) !== month) { setMemos([]); setMonth(draft.date.slice(0, 7)); }
      else await load();
    } catch {
      setError("저장하지 못했습니다. 입력 내용은 유지됩니다. 로그인·연결 상태를 확인하고 다시 시도해 주세요.");
    } finally { mutation.current = false; setBusy(false); }
  };

  const remove = async (memo: Memo) => {
    if (mutation.current || !userId) return;
    mutation.current = true; setBusy(true); setError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || auth.user?.id !== userId) throw new Error("auth");
      const { data, error: deleteError } = await supabase.from("daily_memos").delete().eq("id", memo.id).eq("user_id", userId).select("id");
      if (deleteError || data?.length !== 1) throw deleteError ?? new Error("missing");
      setDeleting(null); setMessage("메모를 삭제했습니다.");
      await load();
    } catch { setError("삭제하지 못했습니다. 로그인·연결 상태를 확인하고 다시 시도해 주세요."); }
    finally { mutation.current = false; setBusy(false); }
  };

  return <main className="min-h-screen bg-[#f6f7f5] px-4 py-8 sm:px-6">
    <div className="mx-auto w-full max-w-[1320px]">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold text-slate-900">오늘의 메모</h1><p className="mt-2 text-sm text-slate-500">달력에 남긴 메모를 날짜별로 모아보고 수정하거나 삭제하세요.</p></div>
        <button type="button" disabled={!userId || loading || busy || !!editing} onClick={() => { setEditing("new"); setDraft({ title: "", detail: "", date: today() }); setError(""); setMessage(""); setDeleting(null); }} className="rounded-lg bg-[#1f7a5b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#176247] disabled:opacity-50">메모 작성</button>
      </header>
      <label className="mb-5 flex items-center gap-3 text-sm text-slate-600">조회 월<input type="month" required value={month} disabled={busy || !!editing} onChange={e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) { setMemos([]); setMonth(e.target.value); setDeleting(null); setMessage(""); } }} className="rounded-md border border-slate-200 bg-white px-3 py-2" /></label>
      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}{!editing && <button type="button" disabled={loading || busy} onClick={() => void load()} className="ml-3 underline">다시 불러오기</button>}</div>}
      {message && <p role="status" className="mb-4 text-sm text-[#176247]">{message}</p>}
      {editing && <form onSubmit={save} className="mb-6 space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">{editing === "new" ? "새 메모" : "메모 수정"}</h2>
        <fieldset disabled={busy} className="space-y-4">
          <label className="block text-sm">날짜<input required type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} className="mt-1 block rounded-md border border-slate-200 px-3 py-2" /></label>
          <label className="block text-sm">제목<input autoFocus required maxLength={200} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className="mt-1 block w-full rounded-md border border-slate-200 px-3 py-2" /></label>
          <label className="block text-sm">내용<textarea rows={5} maxLength={10000} value={draft.detail} onChange={e => setDraft({ ...draft, detail: e.target.value })} className="mt-1 block w-full resize-y rounded-md border border-slate-200 px-3 py-2" /></label>
          <div className="flex gap-2"><button disabled={!draft.title.trim()} className="rounded-md bg-[#1f7a5b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "저장 중…" : "저장"}</button><button type="button" onClick={closeEditor} className="rounded-md border border-slate-200 px-4 py-2 text-sm">취소</button></div>
        </fieldset>
      </form>}
      {!loading && !userId ? <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm">로그인 후 메모를 관리할 수 있습니다. <Link href="/sign-in" className="text-[#176247] underline">로그인하기</Link></p> : <>
        {!loading && !error && !memos.length && <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">선택한 달에 저장된 메모가 없습니다.</p>}
        <div className="space-y-3">{memos.map(memo => <article key={memo.id} className="rounded-lg border border-slate-200 bg-white p-5">
          <time dateTime={memo.date} className="text-xs text-slate-500">{memo.date}</time><h2 className="mt-2 break-words font-semibold">{memo.title}</h2><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{memo.detail}</p>
          <div className="mt-4 flex items-center gap-4 text-xs"><button disabled={busy || !!editing} onClick={() => { setEditing(memo); setDraft({ date: memo.date, title: memo.title, detail: memo.detail }); setDeleting(null); setMessage(""); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="font-medium text-[#176247] disabled:opacity-40">수정</button><button disabled={busy || !!editing} onClick={() => setDeleting(memo.id)} className="text-red-600 disabled:opacity-40">삭제</button><Link href={`/dashboard/calendar?month=${memo.date.slice(0, 7)}`} className="ml-auto text-slate-500 underline">달력 보기</Link></div>
          {deleting === memo.id && <div className="mt-3 border-t border-red-100 pt-3 text-sm"><p>이 메모를 삭제할까요? 삭제하면 복구할 수 없습니다.</p><div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => void remove(memo)} className="rounded-md bg-red-600 px-3 py-2 text-white disabled:opacity-50">{busy ? "삭제 중…" : "삭제 확인"}</button><button disabled={busy} onClick={() => setDeleting(null)} className="rounded-md border border-slate-200 px-3 py-2">취소</button></div></div>}
        </article>)}</div>
        {loading && <p role="status" className="py-6 text-center text-sm text-slate-500">메모를 불러오는 중…</p>}
        {more && !loading && <button disabled={busy || !!editing} onClick={() => void load(memos.length)} className="mt-4 w-full rounded-md border border-slate-200 bg-white py-3 text-sm">이전 메모 더 보기</button>}
      </>}
    </div>
  </main>;
}

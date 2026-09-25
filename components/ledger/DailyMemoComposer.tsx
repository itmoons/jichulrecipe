"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Memo = { id: number; title: string; detail: string };

export function DailyMemoComposer({ date, userId, onPendingChange }: {
  date: string;
  userId: string | null;
  onPendingChange: (pending: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const inFlight = useRef(false);
  const dirty = !!(title || detail);

  useEffect(() => { onPendingChange(dirty || saving); }, [dirty, saving, onPendingChange]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data, error: loadError } = await supabase.from("daily_memos")
          .select("id,title,detail").eq("user_id", userId).eq("date", date)
          .order("created_at", { ascending: false }).limit(5);
        if (!active) return;
        if (loadError) throw loadError;
        setMemos(data ?? []);
      } catch { if (active) setError("메모를 불러오지 못했습니다. 다시 불러오기를 눌러 주세요."); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [date, userId, reload]);

  useEffect(() => {
    if (!dirty && !saving) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest("a[href]") || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
      if (!window.confirm("아직 추가하지 않은 오늘의 메모가 있습니다. 이동할까요?")) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", click, true); };
  }, [dirty, saving]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || inFlight.current || !title.trim()) return;
    inFlight.current = true;
    setSaving(true); setError(""); setNotice("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || auth.user?.id !== userId) throw new Error("auth");
      const { data, error: insertError } = await supabase.from("daily_memos")
        .insert({ user_id: userId, date, title: title.trim(), detail: detail.trim() })
        .select("id,title,detail").single();
      if (insertError || !data) throw insertError ?? new Error("missing");
      setMemos(previous => [data, ...previous].slice(0, 5));
      setTitle(""); setDetail("");
      setNotice(`${date} 메모를 추가했습니다.`);
    } catch { setError("메모를 저장하지 못했습니다. 입력 내용은 유지됩니다. 연결·로그인 상태를 확인하고 다시 추가해 주세요."); }
    finally { inFlight.current = false; setSaving(false); }
  };

  return <section aria-labelledby="daily-memo-heading" className="mt-6 rounded-lg border border-[#e2e5e1] bg-white p-5 sm:p-6">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="daily-memo-heading" className="text-sm font-semibold text-slate-900">오늘의 메모</h2><p className="mt-2 text-xs leading-5 text-slate-500">{date}에 남길 장보기 목록이나 약속을 적어보세요. 메모는 ‘메모 추가’를 눌러 저장합니다.</p></div>
      <Link href="/dashboard/memos" className="shrink-0 text-xs font-medium text-[#176247] underline underline-offset-4">전체 메모 관리</Link>
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={submit}>
        <fieldset disabled={!userId || saving} className="flex flex-col gap-4">
          <label className="text-xs font-medium text-slate-600">제목<input required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 주말 장보기" className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#1f7a5b]" /></label>
          <label className="text-xs font-medium text-slate-600">내용 <span className="font-normal text-slate-400">(선택)</span><textarea rows={3} maxLength={10000} value={detail} onChange={e => setDetail(e.target.value)} placeholder="기억해 둘 내용을 적어주세요." className="mt-2 w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm leading-6 outline-none focus:border-[#1f7a5b]" /></label>
          <button type="submit" disabled={!title.trim()} className="self-start rounded-md bg-[#1f7a5b] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#176247] disabled:opacity-50">{saving ? "추가 중…" : "메모 추가"}</button>
        </fieldset>
        {!userId && <p className="mt-3 text-xs text-slate-500">로그인과 기록 불러오기가 완료되면 작성할 수 있습니다.</p>}
        {notice && <p role="status" className="mt-3 text-xs text-[#176247]">{notice}</p>}
        {error && <p role="alert" className="mt-3 text-xs leading-5 text-red-700">{error} <button type="button" disabled={loading || saving} onClick={() => setReload(n => n + 1)} className="underline">다시 불러오기</button></p>}
      </form>
      <div className="border-t border-slate-100 pt-5 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
        <h3 className="text-xs font-medium text-slate-500">이 날짜에 저장한 메모 · 최근 5개</h3>
        {loading ? <p className="mt-4 text-xs text-slate-500">불러오는 중…</p> : memos.length ? <ul className="mt-2 max-h-72 divide-y divide-slate-100 overflow-y-auto">{memos.map(memo => <li key={memo.id} className="py-3"><p className="break-words text-sm font-medium text-slate-800">{memo.title}</p>{memo.detail && <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6 text-slate-500">{memo.detail}</p>}</li>)}</ul> : <p className="mt-4 text-xs text-slate-400">{error ? "메모를 불러오면 여기에 표시됩니다." : "아직 저장된 메모가 없습니다."}</p>}
      </div>
    </div>
  </section>;
}

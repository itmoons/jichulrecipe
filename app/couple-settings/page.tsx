"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SettingsRow = {
  couple_link_id: string;
  shared_ledger_on: boolean;
  personal_share_on: boolean;
  allow_edit: boolean;
  updated_at: string;
} | null;

type ToastType = "success" | "error" | "info";

function Toggle({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <div className="text-[12px] font-extrabold text-slate-900">{label}</div>
        <div className="mt-1 text-xs text-slate-600">{desc}</div>
      </div>

      <button
        type="button"
        onClick={() => onChange(!value)}
        className={[
          "relative inline-flex h-8 w-14 items-center rounded-full border transition",
          value
            ? "border-orange-200 bg-[#1f7a5b]"
            : "border-slate-200 bg-slate-100",
        ].join(" ")}
        aria-pressed={value}
      >
        <span
          className={[
            "inline-block h-6 w-6 rounded-full bg-white shadow-sm transition",
            value ? "translate-x-7" : "translate-x-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

export default function CoupleSettingsPage() {
  const [checking, setChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [settings, setSettings] = useState<SettingsRow>(null);

  const [sharedLedgerOn, setSharedLedgerOn] = useState(true);
  const [personalShareOn, setPersonalShareOn] = useState(false);
  const [allowEdit, setAllowEdit] = useState(false);

  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    setIsLoggedIn(!!uid);

    if (!uid) {
      setSettings(null);
      setChecking(false);
      return;
    }

    const { data, error } = await supabase.rpc("get_my_couple_settings");
    if (error || !data || data.length === 0) {
      setSettings(null);
      setChecking(false);
      return;
    }

    const row = data[0] as any;
    setSettings(row);

    setSharedLedgerOn(!!row.shared_ledger_on);
    setPersonalShareOn(!!row.personal_share_on);
    setAllowEdit(!!row.allow_edit);

    setChecking(false);
  };

  useEffect(() => {
    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => load());

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 2500);

    return () => clearTimeout(timer);
  }, [toast]);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc("update_my_couple_settings", {
        p_shared_ledger_on: sharedLedgerOn,
        p_personal_share_on: personalShareOn,
        p_allow_edit: allowEdit,
      });

      if (error) throw error;

      setToast({
        message: "설정이 저장되었습니다.",
        type: "success",
      });

      await load();
    } catch (e: any) {
      setToast({
        message: e?.message ?? "저장 실패",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (checking) return <div className="p-6 text-[12px] text-slate-700">확인 중…</div>;

  if (!isLoggedIn) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-orange-100 bg-white p-5">
          <div className="text-lg font-extrabold text-slate-900">커플 공유 설정</div>
          <div className="mt-1 text-[12px] text-slate-600">로그인 후 사용할 수 있습니다.</div>
          <div className="mt-4">
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center rounded-xl bg-[#1f7a5b] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#348f6c]"
            >
              로그인하기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-recipe min-h-screen">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
            <div className="text-lg font-extrabold text-slate-900">커플 공유 설정</div>
            <div className="mt-1 text-[12px] text-slate-600">
              아직 커플 연결이 없습니다. 먼저 커플을 연결해 주세요.
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/couple-link"
                className="inline-flex items-center justify-center rounded-xl bg-[#1f7a5b] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#348f6c]"
              >
                커플 연결하러 가기
              </Link>

              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2 text-[12px] font-bold text-slate-900 hover:bg-orange-50"
              >
                홈으로
              </Link>
            </div>

            <div className="mt-3 text-[11px] text-slate-500">
              * 연결 완료 후 이 페이지에서 “공동장부/개인지출 공유”를 켜거나 끌 수 있습니다.
            </div>
          </div>

          {toast && (
            <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4">
              <div
                className={`min-w-[220px] rounded-2xl px-4 py-3 text-[12px] font-semibold text-white shadow-xl ${
                  toast.type === "success"
                    ? "bg-[#1f7a5b]"
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
      </div>
    );
  }

  const changed =
    sharedLedgerOn !== settings.shared_ledger_on ||
    personalShareOn !== settings.personal_share_on ||
    allowEdit !== settings.allow_edit;

  return (
    <div className="bg-recipe min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-extrabold text-slate-900">커플 공유 설정</div>
            <div className="mt-1 text-[12px] text-slate-600">
              공동장부/개인지출 공유를 켜고 끌 수 있습니다. 기본은 <b>공동 ON</b>, <b>개인 OFF</b>, <b>편집 제한</b>입니다.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/couple-ledger"
              className="inline-flex items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2 text-[12px] font-bold text-slate-900 hover:bg-orange-50"
            >
              커플 장부
            </Link>
            <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">
              🍊 지출레시피
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <Toggle
            label="공동 장부 공유"
            desc="커플 장부(함께 쓰는 돈)를 서로 볼 수 있게 합니다."
            value={sharedLedgerOn}
            onChange={setSharedLedgerOn}
          />

          <Toggle
            label="개인 지출 공유"
            desc="내 개인 지출도 상대가 볼 수 있게 합니다. (기본 OFF 권장)"
            value={personalShareOn}
            onChange={setPersonalShareOn}
          />

          <Toggle
            label="편집 허용"
            desc="A안: 기본은 편집 제한(조회 중심). 켜면 상대도 일부 항목 편집 가능."
            value={allowEdit}
            onChange={setAllowEdit}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={save}
            disabled={saving || !changed}
            className="inline-flex items-center justify-center rounded-xl bg-[#1f7a5b] px-5 py-2 text-[12px] font-extrabold text-white hover:bg-[#348f6c] disabled:opacity-60"
          >
            {saving ? "저장 중…" : changed ? "설정 저장" : "변경 없음"}
          </button>

          <div className="text-xs text-slate-500">
            마지막 저장:{" "}
            <span className="font-mono">
              {settings.updated_at ? new Date(settings.updated_at).toLocaleString() : "-"}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-orange-100 bg-white p-4 text-[11px] text-slate-600">
          <b>운영 팁</b>
          <div className="mt-1">
            - 개인 공유는 갈등 비용이 커질 수 있어 기본 OFF가 합리적입니다. (정보 비대칭을 줄이되 사생활 비용을 관리)
          </div>
          <div className="mt-1">
            - 편집 허용은 “조회는 공유하되, 수정은 제한”이라는 A안을 지키는 장치입니다.
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4">
          <div
            className={`min-w-[220px] rounded-2xl px-4 py-3 text-[12px] font-semibold text-white shadow-xl ${
              toast.type === "success"
                ? "bg-[#1f7a5b]"
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
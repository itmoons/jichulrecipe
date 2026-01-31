"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { PageContainer } from "@/components/layout/PageContainer";

const BRAND_ORANGE = "#ffbb3d";

type SavingPlan = {
  id: number;
  user_id: string;
  name: string;
  bank: string | null;
  monthly_amount: number;
  goal_amount: number | null;
  start_month: string | null; // YYYY-MM
  auto_transfer_day: number | null; // 1~31
  memo: string | null;

  current_amount: number | null;
  start_date: string | null; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD

  created_at: string;
  updated_at: string;
};

type SortKey = "created_at" | "name" | "monthly_amount" | "progress";
type SortDir = "asc" | "desc";

type FormState = {
  id: number | null;
  name: string;
  bank: string;
  monthlyAmount: string; // digits only
  goalAmount: string; // digits only
  startMonth: string; // YYYY-MM
  autoTransferDay: string; // digits only
  memo: string;

  currentAmount: string; // digits only
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
};

function emptyForm(): FormState {
  return {
    id: null,
    name: "",
    bank: "",
    monthlyAmount: "",
    goalAmount: "",
    startMonth: "",
    autoTransferDay: "",
    memo: "",
    currentAmount: "",
    startDate: "",
    endDate: "",
  };
}

function onlyDigits(s: string) {
  return (s ?? "").replace(/[^0-9]/g, "");
}

function formatWonFromDigits(digits: string) {
  if (!digits) return "";
  const n = Number(digits);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("ko-KR");
}

function formatNumber(n: number | null | undefined) {
  if (!Number.isFinite(Number(n))) return "-";
  return Number(n).toLocaleString("ko-KR");
}

function getMonthsSince(startMonth: string | null | undefined) {
  if (!startMonth) return 0;
  const [y, m] = startMonth.split("-").map((v) => Number(v));
  if (!y || !m) return 0;

  const start = new Date(y, m - 1, 1);
  const now = new Date();
  const yearsDiff = now.getFullYear() - start.getFullYear();
  const monthsDiff = now.getMonth() - start.getMonth();
  const total = yearsDiff * 12 + monthsDiff + 1; // 시작월 포함
  return Math.max(total, 0);
}

function clampDay(d: string) {
  const n = Number(d);
  if (!Number.isFinite(n)) return "";
  return String(Math.min(31, Math.max(1, n)));
}

function calcProgress(plan: SavingPlan) {
  const months = getMonthsSince(plan.start_month);
  const expectedByMonth = months * (plan.monthly_amount || 0);
  const savedSoFar =
    plan.current_amount != null ? plan.current_amount : expectedByMonth;

  const goal = plan.goal_amount ?? 0;
  const progress =
    goal > 0 ? Math.min(100, Math.floor((savedSoFar / goal) * 100)) : 0;

  return { months, savedSoFar, progress };
}

export default function SavingPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [plans, setPlans] = useState<SavingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [activeId, setActiveId] = useState<number | null>(null);

  // ✅ 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState<FormState>(emptyForm());

  // 로그인/데이터 로딩
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) console.error(userError);

        if (!user) {
          router.replace("/sign-in");
          return;
        }

        setUserId(user.id);

        const { data, error } = await supabase
          .from("saving_plans")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error) {
          console.error(error);
          setErrorMsg("적금 정보를 불러오는 중 오류가 발생했습니다.");
          return;
        }

        setPlans((data ?? []) as SavingPlan[]);
      } catch (err) {
        console.error(err);
        setErrorMsg("예기치 못한 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const totalMonthlySaving = useMemo(
    () => plans.reduce((sum, p) => sum + (p.monthly_amount || 0), 0),
    [plans]
  );

  const expectedOneYear = useMemo(() => totalMonthlySaving * 12, [totalMonthlySaving]);

  const sortedPlans = useMemo(() => {
    const arr = [...plans];
    const dir = sortDir === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      if (sortKey === "created_at") {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      }
      if (sortKey === "name") {
        const av = (a.name ?? "").toLowerCase();
        const bv = (b.name ?? "").toLowerCase();
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      }
      if (sortKey === "monthly_amount") {
        return ((a.monthly_amount ?? 0) - (b.monthly_amount ?? 0)) * dir;
      }
      if (sortKey === "progress") {
        return (calcProgress(a).progress - calcProgress(b).progress) * dir;
      }
      return 0;
    });

    return arr;
  }, [plans, sortKey, sortDir]);

  const openCreateModal = () => {
    setActiveId(null);
    setForm(emptyForm());
    setIsModalOpen(true);
  };

  const openEditModal = (p: SavingPlan) => {
    setActiveId(p.id);
    setForm({
      id: p.id,
      name: p.name ?? "",
      bank: p.bank ?? "",
      monthlyAmount: String(p.monthly_amount ?? 0),
      goalAmount: p.goal_amount != null ? String(p.goal_amount) : "",
      startMonth: p.start_month ?? "",
      autoTransferDay: p.auto_transfer_day != null ? String(p.auto_transfer_day) : "",
      memo: p.memo ?? "",
      currentAmount: p.current_amount != null ? String(p.current_amount) : "",
      startDate: p.start_date ?? "",
      endDate: p.end_date ?? "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    // 닫을 때 선택 유지할지/해제할지 취향인데, 보통은 유지합니다.
    // setActiveId(null);
    // setForm(emptyForm());
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      alert("로그인 정보를 확인할 수 없습니다.");
      return;
    }

    const monthlyAmount = Number(onlyDigits(form.monthlyAmount)) || 0;
    const goalAmountRaw = form.goalAmount ? Number(onlyDigits(form.goalAmount)) : null;
    const autoTransferDayRaw = form.autoTransferDay
      ? Number(clampDay(onlyDigits(form.autoTransferDay)))
      : null;
    const currentAmountRaw = form.currentAmount ? Number(onlyDigits(form.currentAmount)) : null;

    if (!form.name.trim()) {
      alert("적금/목표 이름을 입력해 주세요.");
      return;
    }
    if (monthlyAmount <= 0) {
      alert("월 불입액을 0보다 크게 입력해 주세요.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      if (form.id == null) {
        // INSERT
        const { data, error } = await supabase
          .from("saving_plans")
          .insert({
            user_id: userId,
            name: form.name.trim(),
            bank: form.bank.trim() || null,
            monthly_amount: monthlyAmount,
            goal_amount: goalAmountRaw,
            start_month: form.startMonth || null,
            auto_transfer_day: autoTransferDayRaw,
            memo: form.memo.trim() || null,
            current_amount: currentAmountRaw,
            start_date: form.startDate || null,
            end_date: form.endDate || null,
          })
          .select()
          .single();

        if (error) {
          console.error(error);
          setErrorMsg("적금 정보를 저장하는 중 오류가 발생했습니다.");
          return;
        }

        setPlans((prev) => [...prev, data as SavingPlan]);
        setIsModalOpen(false);
        setForm(emptyForm());
      } else {
        // UPDATE
        const { data, error } = await supabase
          .from("saving_plans")
          .update({
            name: form.name.trim(),
            bank: form.bank.trim() || null,
            monthly_amount: monthlyAmount,
            goal_amount: goalAmountRaw,
            start_month: form.startMonth || null,
            auto_transfer_day: autoTransferDayRaw,
            memo: form.memo.trim() || null,
            current_amount: currentAmountRaw,
            start_date: form.startDate || null,
            end_date: form.endDate || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", form.id)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) {
          console.error(error);
          setErrorMsg("적금 정보를 수정하는 중 오류가 발생했습니다.");
          return;
        }

        const updated = data as SavingPlan;
        setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setActiveId(updated.id);
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("저장 중 예기치 못한 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!userId) {
      alert("로그인 정보를 확인할 수 없습니다.");
      return;
    }
    if (!confirm("이 적금 항목을 삭제할까요?")) return;

    setSaving(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from("saving_plans")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        console.error(error);
        setErrorMsg("적금 항목 삭제 중 오류가 발생했습니다.");
        return;
      }

      setPlans((prev) => prev.filter((p) => p.id !== id));
      if (activeId === id) setActiveId(null);
      if (form.id === id) {
        setIsModalOpen(false);
        setForm(emptyForm());
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("삭제 중 예기치 못한 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <main
          className={[
            "min-h-screen bg-slate-50",
            "bg-[radial-gradient(circle_at_1px_1px,#e5e7eb_1px,transparent_0)]",
            "[background-size:18px_18px]",
          ].join(" ")}
      >
        <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* 헤더 */}
        <section className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">💰 적금 · 목표 저축</h1>
            <p className="mt-1 text-sm text-slate-600">
              항목은 목록에서 보고, 추가/수정은 팝업에서 처리합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {loading && <div className="text-xs text-slate-400">불러오는 중…</div>}
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-full px-4 py-2 text-sm font-semibold shadow-sm"
              style={{ backgroundColor: BRAND_ORANGE, color: "#fff" }}
              disabled={saving}
            >
              새 항목 추가
            </button>
          </div>
        </section>

        {/* 에러 */}
        {errorMsg && (
          <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </section>
        )}

        {/* 요약 */}
        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label="등록된 항목" value={`${plans.length}개`} />
          <SummaryCard label="월 불입 총액" value={`${formatNumber(totalMonthlySaving)}원/월`} />
          <SummaryCard label="1년 예상 적립액" value={`${formatNumber(expectedOneYear)}원`} />
        </section>

        {/* 목록만 남김 */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">적금 목록</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                행을 클릭하면 수정 팝업이 뜹니다.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="created_at">생성순</option>
                <option value="name">이름</option>
                <option value="monthly_amount">월 불입액</option>
                <option value="progress">진행률</option>
              </select>
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value as SortDir)}
              >
                <option value="asc">오름차순</option>
                <option value="desc">내림차순</option>
              </select>
            </div>
          </div>

          {/* 데스크탑 테이블 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs text-slate-500 bg-slate-50">
                <tr className="whitespace-nowrap">
                  <th className="px-3 py-3 text-center">상품/목표</th>
                  <th className="px-3 py-3 text-center">은행</th>
                  <th className="px-3 py-3 text-center">월 불입</th>
                  <th className="px-3 py-3 text-center">목표</th>
                  <th className="px-3 py-3 text-center">시작월</th>
                  <th className="px-3 py-3 text-center">이체일</th>
                  <th className="px-3 py-3 text-center">진행</th>
                  <th className="px-3 py-3 text-center">관리</th>
                </tr>
              </thead>

              <tbody>
                {!loading && sortedPlans.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-sm text-slate-400">
                      아직 등록된 적금이 없습니다. “새 항목 추가”로 시작하세요.
                    </td>
                  </tr>
                )}

                {sortedPlans.map((p) => {
                  const { savedSoFar, progress } = calcProgress(p);
                  const active = activeId === p.id;

                  return (
                    <tr
                      key={p.id}
                      className={[
                        "border-b border-slate-100 cursor-pointer",
                        active ? "bg-orange-50/60" : "hover:bg-slate-50",
                      ].join(" ")}
                      onClick={() => openEditModal(p)}
                    >
                      <td className="px-3 py-3">
                        <div
                          className="font-semibold text-slate-900 truncate max-w-[320px]"
                          title={p.name || ""}
                        >
                          {p.name || "-"}
                        </div>
                        {p.memo && (
                          <div className="mt-1 text-[11px] text-slate-500 truncate max-w-[320px]" title={p.memo}>
                            {p.memo}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3 text-slate-800 text-center whitespace-nowrap">
                        {p.bank || "-"}
                      </td>

                      <td className="px-3 py-3 text-slate-900 text-center whitespace-nowrap">
                        {formatNumber(p.monthly_amount)}
                      </td>

                      <td className="px-3 py-3 text-slate-800 text-center whitespace-nowrap">
                        {p.goal_amount ? formatNumber(p.goal_amount) : "-"}
                      </td>

                      <td className="px-3 py-3 text-slate-800 text-center whitespace-nowrap">
                        {p.start_month || "-"}
                      </td>

                      <td className="px-3 py-3 text-slate-800 text-center whitespace-nowrap">
                        {p.auto_transfer_day ?? "-"}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden min-w-[120px]">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{ width: `${progress}%`, backgroundColor: BRAND_ORANGE }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 w-12 text-right">
                            {progress}%
                          </span>
                        </div>

                        <div className="mt-1 text-[11px] text-slate-600 truncate">
                          현재 {formatNumber(savedSoFar)}원
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(p.id);
                          }}
                          disabled={saving}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
          <div className="md:hidden divide-y divide-slate-100">
            {!loading && sortedPlans.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-slate-400">
                아직 등록된 적금이 없습니다. “새 항목 추가”로 시작하세요.
              </div>
            )}

            {sortedPlans.map((p) => {
              const { months, savedSoFar, progress } = calcProgress(p);
              const active = activeId === p.id;

              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openEditModal(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openEditModal(p);
                    }
                  }}
                  className={[
                    "px-4 py-4 cursor-pointer select-none",
                    active ? "bg-orange-50/60" : "hover:bg-slate-50",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 text-sm truncate">
                        {p.name || "-"}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 truncate">
                        {(p.bank || "-") + " · " + (p.start_month || "-") + " · " + (p.auto_transfer_day ?? "-") + "일"}
                      </div>
                      {p.memo && <div className="mt-2 text-[11px] text-slate-500 line-clamp-2">{p.memo}</div>}
                    </div>

                    <div className="text-right min-w-[108px]">
                      <div className="text-xs text-slate-600">월 불입</div>
                      <div className="font-semibold text-slate-900">
                        {formatNumber(p.monthly_amount)}원
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600">
                        현재 {formatNumber(savedSoFar)}원
                      </div>
                      {months > 0 && <div className="text-[11px] text-slate-500">({months}개월차)</div>}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-2 rounded-full" style={{ width: `${progress}%`, backgroundColor: BRAND_ORANGE }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 w-12 text-right">{progress}%</span>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(p.id);
                      }}
                      disabled={saving}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ✅ 모달 */}
        <SavingPlanModal
          open={isModalOpen}
          title={form.id ? "항목 수정" : "새 항목 추가"}
          saving={saving}
          onClose={closeModal}
          onSubmit={handleSubmit}
        >
          <div className="space-y-4">
            <Field label="상품/목표 이름" required>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                placeholder="예: 청년도약계좌, 3년 뒤 전세자금"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="은행/상품사">
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  placeholder="예: 국민은행, 카카오뱅크"
                  value={form.bank}
                  onChange={(e) => handleChange("bank", e.target.value)}
                />
              </Field>

              <Field label="월 불입액(원)" required>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-right outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  inputMode="numeric"
                  placeholder="예: 700000"
                  value={formatWonFromDigits(form.monthlyAmount)}
                  onChange={(e) => handleChange("monthlyAmount", onlyDigits(e.target.value))}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="목표 금액(원)">
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-right outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  inputMode="numeric"
                  placeholder="예: 42700000"
                  value={formatWonFromDigits(form.goalAmount)}
                  onChange={(e) => handleChange("goalAmount", onlyDigits(e.target.value))}
                />
              </Field>

              <Field label="시작월(YYYY-MM)">
                <input
                  type="month"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none text-slate-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  value={form.startMonth}
                  onChange={(e) => handleChange("startMonth", e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="현재까지 납입 금액(원)">
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-right outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  inputMode="numeric"
                  placeholder="예: 6300000"
                  value={formatWonFromDigits(form.currentAmount)}
                  onChange={(e) => handleChange("currentAmount", onlyDigits(e.target.value))}
                />
              </Field>

              <Field label="자동이체일(1~31)">
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-right outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  inputMode="numeric"
                  placeholder="예: 27"
                  value={form.autoTransferDay}
                  onChange={(e) => handleChange("autoTransferDay", clampDay(onlyDigits(e.target.value)))}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="신규일">
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none text-slate-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  value={form.startDate}
                  onChange={(e) => handleChange("startDate", e.target.value)}
                />
              </Field>

              <Field label="만기일">
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none text-slate-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  value={form.endDate}
                  onChange={(e) => handleChange("endDate", e.target.value)}
                />
              </Field>
            </div>

            <Field label="메모(선택)">
              <textarea
                className="w-full min-h-[90px] rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                placeholder="예: 우대조건/중도해지/특약 등"
                value={form.memo}
                onChange={(e) => handleChange("memo", e.target.value)}
              />
            </Field>

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                onClick={closeModal}
                disabled={saving}
              >
                취소
              </button>

              <button
                type="submit"
                className="rounded-full px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-50"
                style={{ backgroundColor: BRAND_ORANGE, color: "#fff" }}
                disabled={saving}
              >
                {saving ? "저장 중..." : form.id ? "수정 완료" : "적금 추가"}
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              * 월 불입액은 필수입니다. 목표 금액을 입력하면 진행률(%) 계산이 가능합니다.
            </p>
          </div>
        </SavingPlanModal>
        </div>
      </main>
    </PageContainer>
  );
}

/** 요약 카드 */
function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-orange-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

/** 공통 필드 */
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

/** ✅ 아주 가벼운 모달(라이브러리 없이) */
function SavingPlanModal({
  open,
  title,
  saving,
  onClose,
  onSubmit,
  children,
}: {
  open: boolean;
  title: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !saving && onClose()}
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-[640px] rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <div className="text-sm font-semibold text-slate-900">{title}</div>
              <div className="mt-0.5 text-xs text-slate-500">
                항목을 입력하고 저장하세요.
              </div>
            </div>

            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              onClick={onClose}
              disabled={saving}
            >
              닫기
            </button>
          </div>

          <form onSubmit={onSubmit} className="p-5">
            {children}
          </form>
        </div>
      </div>
    </div>
  );
}

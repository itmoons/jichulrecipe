"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { PageContainer } from "@/components/layout/PageContainer";
import { RecurringManagerPage } from "@/app/dashboard/recurring/page";

const BRAND_BLUE = "#ff8a3deb";

type SavingPlan = {
  id: number;
  user_id: string;
  name: string;
  bank: string | null;
  monthly_amount: number;
  goal_amount: number | null;
  start_month: string | null;
  auto_transfer_day: number | null;
  memo: string | null;

  current_amount: number | null;
  start_date: string | null;
  end_date: string | null;

  created_at: string;
  updated_at: string;
};

type SortKey = "created_at" | "name" | "monthly_amount" | "progress";
type SortDir = "asc" | "desc";

type FormState = {
  id: number | null;
  name: string;
  bank: string;
  monthlyAmount: string;
  goalAmount: string;
  startMonth: string;
  autoTransferDay: string;
  memo: string;

  currentAmount: string;
  startDate: string;
  endDate: string;
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
  const total = yearsDiff * 12 + monthsDiff + 1;
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
  const [linkMsg, setLinkMsg] = useState<string | null>(null);
  const [recurringVersion, setRecurringVersion] = useState(0);

  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [activeId, setActiveId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

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

  const expectedOneYear = useMemo(
    () => totalMonthlySaving * 12,
    [totalMonthlySaving]
  );

  const sortedPlans = useMemo(() => {
    const arr = [...plans];
    const dir = sortDir === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      if (sortKey === "created_at") {
        return (
          (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) *
          dir
        );
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
      autoTransferDay:
        p.auto_transfer_day != null ? String(p.auto_transfer_day) : "",
      memo: p.memo ?? "",
      currentAmount: p.current_amount != null ? String(p.current_amount) : "",
      startDate: p.start_date ?? "",
      endDate: p.end_date ?? "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
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
    const goalAmountRaw = form.goalAmount
      ? Number(onlyDigits(form.goalAmount))
      : null;
    const autoTransferDayRaw = form.autoTransferDay
      ? Number(clampDay(onlyDigits(form.autoTransferDay)))
      : null;
    const currentAmountRaw = form.currentAmount
      ? Number(onlyDigits(form.currentAmount))
      : null;

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

  const handleCreateRecurringFromPlan = async (plan: SavingPlan) => {
    if (!userId) return;

    const amount = Number(plan.monthly_amount) || 0;
    if (!plan.name.trim() || amount <= 0) {
      setErrorMsg("이름과 월 불입액이 있어야 정기 저축으로 등록할 수 있습니다.");
      return;
    }

    const now = new Date();
    const baseMonth = plan.start_month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const transferDay = Math.min(31, Math.max(1, plan.auto_transfer_day ?? now.getDate()));
    const lastDay = new Date(Number(baseMonth.slice(0, 4)), Number(baseMonth.slice(5, 7)), 0).getDate();
    const startDate = plan.start_date || `${baseMonth}-${String(Math.min(transferDay, lastDay)).padStart(2, "0")}`;

    setSaving(true);
    setErrorMsg(null);
    setLinkMsg(null);
    try {
      const { data: duplicate, error: duplicateError } = await supabase
        .from("recurring_rules")
        .select("id")
        .eq("user_id", userId)
        .eq("title", plan.name.trim())
        .eq("category", "saving")
        .eq("frequency", "monthly")
        .limit(1);

      if (duplicateError) throw duplicateError;
      if (duplicate?.length) {
        setLinkMsg(`‘${plan.name}’은 이미 정기 저축 규칙으로 등록되어 있습니다.`);
        return;
      }

      const { error } = await supabase.from("recurring_rules").insert({
        user_id: userId,
        title: plan.name.trim(),
        category: "saving",
        frequency: "monthly",
        start_date: startDate,
        end_date: plan.end_date || null,
        day_of_month: transferDay,
        day_of_week: null,
        default_amount: amount,
      });
      if (error) throw error;

      setRecurringVersion((version) => version + 1);
      setLinkMsg(`‘${plan.name}’을 정기 저축으로 등록했습니다. 아래 정기 레시피에서 선택한 달에 적용하세요.`);
      document.getElementById("recurring")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      console.error(err);
      setErrorMsg("정기 저축 규칙을 만드는 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <main
        className={[
          "min-h-screen bg-transparent",
        ].join(" ")}
      >
        <div className="mx-auto w-full max-w-[1360px] px-3 py-4 sm:px-0 sm:py-6">
          <div className="space-y-4 sm:space-y-6">
            {/* 헤더 */}
            <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-[16px] font-bold text-slate-900 sm:text-[20px]">
                  💰 저축 · 정기 레시피
                </h1>
                <p className="mt-1 text-[10px] text-slate-600 sm:text-[8px]">
                  목표 저축과 반복 이체를 한 곳에서 관리하고 달력에 반영하세요.
                </p>
              </div>

              <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                {loading && (
                  <div className="mr-auto text-[10px] text-slate-400 sm:mr-0 sm:text-[8px]">
                    불러오는 중…
                  </div>
                )}
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="w-full m-auto rounded-[10px] px-4 py-2 text-[10px] font-semibold shadow-sm sm:ml-0 sm:text-[8px]"
                  style={{ backgroundColor: BRAND_BLUE, color: "#fff" }}
                  disabled={saving}
                >
                  새 항목 추가
                </button>
              </div>
            </section>

            <nav className="flex w-fit items-center gap-1 rounded-xl border border-orange-100 bg-white p-1 text-[11px] font-semibold text-slate-600 shadow-sm">
              <a href="#saving-plans" className="rounded-lg bg-orange-50 px-3 py-2 text-orange-800">저축 목표</a>
              <a href="#recurring" className="rounded-lg px-3 py-2 transition hover:bg-orange-50 hover:text-orange-800">정기 레시피</a>
            </nav>

            {/* 에러 */}
            {errorMsg && (
              <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] text-red-700 sm:text-[8px]">
                {errorMsg}
              </section>
            )}

            {linkMsg && (
              <section className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-[11px] font-medium text-orange-800">
                {linkMsg}
              </section>
            )}

            {/* 요약 */}
            <section id="saving-plans" className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              <SummaryCard
                label="등록된 항목"
                value={`${plans.length}개`}
              />
              <SummaryCard
                label="월 불입 총액"
                value={`${formatNumber(totalMonthlySaving)}원/월`}
              />
              <SummaryCard
                label="1년 예상 적립액"
                value={`${formatNumber(expectedOneYear)}원`}
              />
            </section>

            {/* 목록 */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <div className="min-w-0">
                  <h2 className="text-[10px] font-semibold text-slate-900 sm:text-[16px]">
                    적금 목록
                  </h2>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    행을 클릭하면 수정 팝업이 뜹니다.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                  <select
                    className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] text-slate-700 outline-none sm:py-1"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                  >
                    <option value="created_at">생성순</option>
                    <option value="name">이름</option>
                    <option value="monthly_amount">월 불입액</option>
                    <option value="progress">진행률</option>
                  </select>
                  <select
                    className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] text-slate-700 outline-none sm:py-1"
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value as SortDir)}
                  >
                    <option value="asc">오름차순</option>
                    <option value="desc">내림차순</option>
                  </select>
                </div>
              </div>

              {/* 데스크탑 테이블 */}
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-[12px]">
                  <thead className="bg-slate-50 text-xs text-slate-500">
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
                        <td
                          colSpan={8}
                          className="px-3 py-10 text-center text-[12px] text-slate-400"
                        >
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
                            "cursor-pointer border-b border-slate-100",
                            active ? "bg-blue-50/60" : "hover:bg-slate-50",
                          ].join(" ")}
                          onClick={() => openEditModal(p)}
                        >
                          <td className="px-3 py-3">
                            <div
                              className="max-w-[320px] truncate font-semibold text-slate-900"
                              title={p.name || ""}
                            >
                              {p.name || "-"}
                            </div>
                            {p.memo && (
                              <div
                                className="mt-1 max-w-[320px] truncate text-[11px] text-slate-500"
                                title={p.memo}
                              >
                                {p.memo}
                              </div>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-3 py-3 text-center text-slate-800">
                            {p.bank || "-"}
                          </td>

                          <td className="whitespace-nowrap px-3 py-3 text-center text-slate-900">
                            {formatNumber(p.monthly_amount)}
                          </td>

                          <td className="whitespace-nowrap px-3 py-3 text-center text-slate-800">
                            {p.goal_amount ? formatNumber(p.goal_amount) : "-"}
                          </td>

                          <td className="whitespace-nowrap px-3 py-3 text-center text-slate-800">
                            {p.start_month || "-"}
                          </td>

                          <td className="whitespace-nowrap px-3 py-3 text-center text-slate-800">
                            {p.auto_transfer_day ?? "-"}
                          </td>

                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="min-w-[120px] flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-2 rounded-full transition-all"
                                  style={{
                                    width: `${progress}%`,
                                    backgroundColor: BRAND_BLUE,
                                  }}
                                />
                              </div>
                              <span className="w-12 text-right text-xs font-semibold text-slate-700">
                                {progress}%
                              </span>
                            </div>

                            <div className="mt-1 truncate text-[11px] text-slate-600">
                              현재 {formatNumber(savedSoFar)}원
                            </div>
                          </td>

                          <td className="px-3 py-3 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                type="button"
                                className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-800 hover:bg-orange-100 disabled:opacity-50"
                                onClick={(e) => { e.stopPropagation(); handleCreateRecurringFromPlan(p); }}
                                disabled={saving}
                              >
                                정기 이체 등록
                              </button>
                              <button
                                type="button"
                                className="rounded-lg border border-slate-200 px-3 py-1 text-[11px] text-slate-600 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                                onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                                disabled={saving}
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 모바일 카드 */}
              <div className="divide-y divide-slate-100 md:hidden">
                {!loading && sortedPlans.length === 0 && (
                  <div className="px-4 py-8 text-center text-[10px] text-slate-400">
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
                        "cursor-pointer select-none px-3 py-3",
                        active ? "bg-blue-50/60" : "hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[10px] font-semibold text-slate-900">
                            {p.name || "-"}
                          </div>
                          <div className="mt-1 truncate text-[10px] text-slate-500">
                            {(p.bank || "-") +
                              " · " +
                              (p.start_month || "-") +
                              " · " +
                              (p.auto_transfer_day ?? "-") +
                              "일"}
                          </div>
                          {p.memo && (
                            <div className="mt-2 line-clamp-2 text-[10px] leading-4 text-slate-500">
                              {p.memo}
                            </div>
                          )}
                        </div>

                        <div className="min-w-[96px] text-right">
                          <div className="text-[10px] text-slate-600">
                            월 불입
                          </div>
                          <div className="text-[11px] font-semibold text-slate-900">
                            {formatNumber(p.monthly_amount)}원
                          </div>
                          <div className="mt-1 text-[10px] text-slate-600">
                            현재 {formatNumber(savedSoFar)}원
                          </div>
                          {months > 0 && (
                            <div className="text-[10px] text-slate-500">
                              ({months}개월차)
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: BRAND_BLUE,
                            }}
                          />
                        </div>
                        <span className="w-10 text-right text-[10px] font-semibold text-slate-700">
                          {progress}%
                        </span>
                      </div>

                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-semibold text-orange-800 hover:bg-orange-100 disabled:opacity-50"
                          onClick={(e) => { e.stopPropagation(); handleCreateRecurringFromPlan(p); }}
                          disabled={saving}
                        >
                          정기 이체 등록
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-3 py-1 text-[10px] text-slate-600 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
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

            <RecurringManagerPage key={recurringVersion} embedded />

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
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[10px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-[8px]"
                    placeholder="예: 청년도약계좌, 3년 뒤 전세자금"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="은행/상품사">
                    <input
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[10px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-[8px]"
                      placeholder="예: 국민은행, 카카오뱅크"
                      value={form.bank}
                      onChange={(e) => handleChange("bank", e.target.value)}
                    />
                  </Field>

                  <Field label="월 불입액(원)" required>
                    <input
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[10px] text-right outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-[8px]"
                      inputMode="numeric"
                      placeholder="예: 700000"
                      value={formatWonFromDigits(form.monthlyAmount)}
                      onChange={(e) =>
                        handleChange("monthlyAmount", onlyDigits(e.target.value))
                      }
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="목표 금액(원)">
                    <input
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[10px] text-right outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-[8px]"
                      inputMode="numeric"
                      placeholder="예: 42700000"
                      value={formatWonFromDigits(form.goalAmount)}
                      onChange={(e) =>
                        handleChange("goalAmount", onlyDigits(e.target.value))
                      }
                    />
                  </Field>

                  <Field label="시작월(YYYY-MM)">
                    <input
                      type="month"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[10px] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-[8px]"
                      value={form.startMonth}
                      onChange={(e) => handleChange("startMonth", e.target.value)}
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="현재까지 납입 금액(원)">
                    <input
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[10px] text-right outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-[8px]"
                      inputMode="numeric"
                      placeholder="예: 6300000"
                      value={formatWonFromDigits(form.currentAmount)}
                      onChange={(e) =>
                        handleChange("currentAmount", onlyDigits(e.target.value))
                      }
                    />
                  </Field>

                  <Field label="자동이체일(1~31)">
                    <input
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[10px] text-right outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-[8px]"
                      inputMode="numeric"
                      placeholder="예: 27"
                      value={form.autoTransferDay}
                      onChange={(e) =>
                        handleChange(
                          "autoTransferDay",
                          clampDay(onlyDigits(e.target.value))
                        )
                      }
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="신규일">
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[10px] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-[8px]"
                      value={form.startDate}
                      onChange={(e) => handleChange("startDate", e.target.value)}
                    />
                  </Field>

                  <Field label="만기일">
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[10px] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-[8px]"
                      value={form.endDate}
                      onChange={(e) => handleChange("endDate", e.target.value)}
                    />
                  </Field>
                </div>

                <Field label="메모(선택)">
                  <textarea
                    className="min-h-[90px] w-full rounded-xl border border-slate-300 px-3 py-2 text-[10px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-[8px]"
                    placeholder="예: 우대조건/중도해지/특약 등"
                    value={form.memo}
                    onChange={(e) => handleChange("memo", e.target.value)}
                  />
                </Field>

                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end sm:gap-3">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:text-[8px]"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    취소
                  </button>

                  <button
                    type="submit"
                    className="rounded-full px-4 py-2 text-[10px] font-semibold shadow-sm disabled:opacity-50 sm:text-[8px]"
                    style={{ backgroundColor: BRAND_BLUE, color: "#fff" }}
                    disabled={saving}
                  >
                    {saving ? "저장 중..." : form.id ? "수정 완료" : "적금 추가"}
                  </button>
                </div>

                <p className="text-[10px] leading-4 text-slate-500 sm:text-[11px]">
                  * 월 불입액은 필수입니다. 목표 금액을 입력하면 진행률(%) 계산이 가능합니다.
                </p>
              </div>
            </SavingPlanModal>
          </div>
        </div>
      </main>
    </PageContainer>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-[10px] font-medium text-slate-500 sm:text-xs">
        {label}
      </div>
      <div className="mt-2 text-[14px] font-bold text-slate-900 sm:text-xl">
        {value}
      </div>
    </div>
  );
}

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
      <label className="text-[10px] font-medium text-slate-700 sm:text-[8px]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

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
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !saving && onClose()}
      />

      <div className="absolute inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <div className="flex h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:max-w-[640px] sm:rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-slate-900 sm:text-[8px]">
                {title}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                항목을 입력하고 저장하세요.
              </div>
            </div>

            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:text-xs"
              onClick={onClose}
              disabled={saving}
            >
              닫기
            </button>
          </div>

          <form
            onSubmit={onSubmit}
            className="flex-1 overflow-y-auto p-4 sm:p-5"
          >
            {children}
          </form>
        </div>
      </div>
    </div>
  );
}

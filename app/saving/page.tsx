"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer"; // 가정된 PageContainer
import { supabase } from "@/lib/supabaseClient";

const BRAND_ORANGE = "#FF8A3D";

// 🔹 타입 정의 유지 및 추가 정보 반영
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
  current_amount: number | null; // 현재까지 납입 금액
  start_date: string | null; // 신규일 (YYYY-MM-DD)
  end_date: string | null; // 만기일 (YYYY-MM-DD)
  created_at: string;
  updated_at: string;
};

type FormState = {
  id: number | null;
  name: string;
  bank: string;
  monthlyAmount: string;
  goalAmount: string;
  startMonth: string;
  autoTransferDay: string;
  memo: string;
  currentAmount: string; // 현재까지 납입 금액
  startDate: string; // 신규일
  endDate: string; // 만기일
};

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

export default function SavingPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [plans, setPlans] = useState<SavingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    id: null,
    name: "",
    bank: "",
    monthlyAmount: "",
    goalAmount: "",
    startMonth: "",
    autoTransferDay: "",
    memo: "",
    currentAmount: "", // 추가
    startDate: "", // 추가
    endDate: "", // 추가
  });

  // 로그인 / 데이터 로딩 (기존 로직 유지)
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error(userError);
        }

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

  // 총액 계산 (기존 로직 유지)
  const totalMonthlySaving = useMemo(
    () => plans.reduce((sum, p) => sum + (p.monthly_amount || 0), 0),
    [plans]
  );

  const expectedOneYear = useMemo(
    () => totalMonthlySaving * 12,
    [totalMonthlySaving]
  );

  // 핸들러 함수 (기존 로직 유지 + 새 필드 반영)
  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm({
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
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      alert("로그인 정보를 확인할 수 없습니다.");
      return;
    }

    const monthlyAmount = Number(form.monthlyAmount.replace(/[^0-9]/g, "")) || 0;
    const goalAmountRaw = form.goalAmount
      ? Number(form.goalAmount.replace(/[^0-9]/g, ""))
      : null;
    const autoTransferDayRaw = form.autoTransferDay
      ? Number(form.autoTransferDay)
      : null;
    const currentAmountRaw = form.currentAmount
      ? Number(form.currentAmount.replace(/[^0-9]/g, ""))
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
        resetForm();
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

        setPlans((prev) =>
          prev.map((p) => (p.id === form.id ? (data as SavingPlan) : p))
        );
        resetForm();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("저장 중 예기치 못한 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p: SavingPlan) => {
    setForm({
      id: p.id,
      name: p.name,
      bank: p.bank ?? "",
      monthlyAmount: (p.monthly_amount ?? 0).toString(),
      goalAmount: p.goal_amount != null ? p.goal_amount.toString() : "",
      startMonth: p.start_month ?? "",
      autoTransferDay: p.auto_transfer_day
        ? p.auto_transfer_day.toString()
        : "",
      memo: p.memo ?? "",
      currentAmount:
        p.current_amount != null ? p.current_amount.toString() : "",
      startDate: p.start_date ?? "",
      endDate: p.end_date ?? "",
    });
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
      if (form.id === id) {
        resetForm();
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
      <main className="mx-auto  py-4 space-y-8">
        {/* 헤더 */}
        <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              💰 적금 · 목표 저축 관리
            </h1>
            <p className="mt-2 text-base text-slate-600">
              월 불입 총액과 진행률을 한눈에 정리합니다.
            </p>
          </div>
          {loading && (
            <div className="text-sm text-slate-400">
              불러오는 중...
            </div>
          )}
        </section>

        {/* 에러 메시지 */}
        {errorMsg && (
          <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </section>
        )}

        {/* 요약 카드 */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-orange-200 bg-white px-4 py-4 shadow-md">
            <div className="text-sm font-medium text-slate-500">
              등록된 적금/목표 수
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900">
                {plans.length}
              </span>
              <span className="text-sm text-slate-500">개</span>
            </div>
          </div>
          <div className="rounded-xl border border-orange-200 bg-white px-4 py-4 shadow-md">
            <div className="text-sm font-medium text-slate-500">
              월 적금 총액
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900">
                {formatNumber(totalMonthlySaving)}
              </span>
              <span className="text-sm text-slate-500">
                원 / 월
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-orange-200 bg-white px-4 py-4 shadow-md">
            <div className="text-sm font-medium text-slate-500">
              1년 후 예상 적립액 (단순 합계)
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900">
                {formatNumber(expectedOneYear)}
              </span>
              <span className="text-sm text-slate-500">
                원
              </span>
            </div>
          </div>
        </section>

        {/* 본문: 리스트 + 입력폼 */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)]">
          {/* 리스트 영역 */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">
                적금 목록
              </h2>
              <span className="text-xs text-slate-500">
                항목 클릭 시 오른쪽 폼으로 불러옵니다.
              </span>
            </div>

            {/* 데스크탑: 테이블 레이아웃 */}
            <div className="hidden md:block overflow-x-auto">
              {/* 테이블 헤더의 불필요한 공백/줄바꿈 제거 */}
              <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                <thead className="text-xs text-slate-500 whitespace-nowrap">
                  <tr className="align-middle">
                    <th className="px-3 py-3 text-left w-48">상품/목표</th>
                    <th className="px-3 py-3 text-left w-28">은행</th>
                    <th className="px-3 py-3 text-right w-32">월 불입액</th>
                    <th className="px-3 py-3 text-right w-36">목표 금액</th>
                    <th className="px-3 py-3 text-center w-24">시작월/일</th>
                    <th className="px-3 py-3 text-center w-20">이체일</th>
                    <th className="px-3 py-3 text-left w-64">진행 상황</th>
                    <th className="px-3 py-3 text-center w-20">관리</th>
                  </tr>
                </thead>
                <tbody className="align-middle">
                  {!loading && plans.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-400 whitespace-nowrap">
                        아직 등록된 적금이 없습니다. 오른쪽에서 첫 적금을 추가해 보세요.
                      </td>
                    </tr>
                  )}
                  {plans.map((p) => {
                    const months = getMonthsSince(p.start_month);
                    const expectedByMonth = months * (p.monthly_amount || 0);
                    const savedSoFar =
                      p.current_amount != null
                        ? p.current_amount
                        : expectedByMonth;
                    const progress =
                      p.goal_amount && p.goal_amount > 0
                        ? Math.min(
                            100,
                            Math.floor(
                              (savedSoFar / (p.goal_amount || 1)) * 100
                            )
                          )
                        : 0;

                    return (
                      // <tr> 태그 내부에 불필요한 공백 제거
                      <tr key={p.id} className={`cursor-pointer transition hover:bg-orange-50/60 ${form.id === p.id ? 'bg-orange-100/50' : ''}`} onClick={() => handleEdit(p)}>
                        <td className="px-3 py-3 align-top whitespace-nowrap">
                          <div className="font-semibold text-slate-900 leading-snug">
                            {p.name || "-"}
                          </div>
                          {(p.start_date || p.end_date) && (
                            <div className="mt-1 text-[11px] text-slate-500 leading-snug">
                              {p.start_date && (
                                <span>신규일: {p.start_date}</span>
                              )}
                              {p.end_date && (
                                <>
                                  {p.start_date && (
                                    <span className="mx-1">·</span>
                                  )}
                                  <span>만기일: {p.end_date}</span>
                                </>
                              )}
                            </div>
                          )}
                          {p.memo && (
                            <div className="mt-1 text-[11px] text-slate-500 leading-snug line-clamp-1 w-44">
                              {p.memo}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-800 leading-snug whitespace-nowrap">
                          {p.bank || "-"}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-slate-900 leading-snug whitespace-nowrap">
                          {formatNumber(p.monthly_amount)}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-800 leading-snug whitespace-nowrap">
                          {p.goal_amount ? formatNumber(p.goal_amount) : "-"}
                        </td>
                        <td className="px-3 py-3 text-center text-slate-800 leading-snug whitespace-nowrap">
                          {p.start_month || "-"}
                        </td>
                        <td className="px-3 py-3 text-center text-slate-800 leading-snug whitespace-nowrap">
                          {p.auto_transfer_day ?? "-"}
                        </td>
                        <td className="px-3 py-3 leading-snug">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${progress}%`,
                                  backgroundColor: BRAND_ORANGE,
                                }}
                              />
                            </div>
                            <span className="w-12 text-right text-xs font-semibold text-slate-800">
                              {progress}%
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] font-medium text-slate-700 leading-snug whitespace-nowrap">
                            현재 {formatNumber(savedSoFar)}원
                          </div>
                          {months > 0 && (
                            <div className="text-[11px] text-slate-500 leading-snug whitespace-nowrap">
                              ({months}개월차)
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center align-middle">
                          <button
                            type="button"
                            className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:border-red-300 hover:text-red-500 transition"
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

            {/* 모바일: 카드 레이아웃 */}
            <div className="md:hidden divide-y divide-slate-100">
              {!loading && plans.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-slate-400">
                  아직 등록된 적금이 없습니다. 아래에서 첫 적금을 추가해
                  보세요.
                </div>
              )}
              {plans.map((p) => {
                const months = getMonthsSince(p.start_month);
                const expectedByMonth =
                  months * (p.monthly_amount || 0);
                const savedSoFar =
                  p.current_amount != null
                    ? p.current_amount
                    : expectedByMonth;
                const progress =
                  p.goal_amount && p.goal_amount > 0
                    ? Math.min(
                        100,
                        Math.floor(
                          (savedSoFar / (p.goal_amount || 1)) * 100
                        )
                      )
                    : 0;

                return (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left px-4 py-4 transition hover:bg-orange-50/10 active:bg-orange-50/50"
                    onClick={() => handleEdit(p)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="font-semibold text-slate-900 text-sm">
                          {p.name || "-"}
                        </div>

                        {/* 상세 정보 */}
                        <div className="text-[11px] text-slate-500 leading-snug">
                          {p.bank && <span>{p.bank}</span>}
                          {p.start_month && (
                            <>
                              {p.bank && <span className="mx-1">·</span>}
                              <span>시작 {p.start_month}</span>
                            </>
                          )}
                          {p.auto_transfer_day && (
                            <>
                              <span className="mx-1">·</span>
                              <span>{p.auto_transfer_day}일 이체</span>
                            </>
                          )}
                        </div>
                        {(p.start_date || p.end_date) && (
                          <div className="text-[11px] text-slate-500 leading-snug">
                            {p.start_date && <span>신규일 {p.start_date}</span>}
                            {p.end_date && (
                              <>
                                {p.start_date && <span className="mx-1">·</span>}
                                <span>만기일 {p.end_date}</span>
                              </>
                            )}
                          </div>
                        )}
                        {p.memo && (
                          <div className="text-[11px] text-slate-500 leading-snug line-clamp-1">
                            {p.memo}
                          </div>
                        )}
                      </div>
                      
                      {/* 금액 정보 */}
                      <div className="text-right text-sm text-slate-700 min-w-[100px] space-y-1">
                        <div className="font-medium">월 {formatNumber(p.monthly_amount)}원</div>
                        {p.goal_amount && (
                          <div className="text-[11px] text-slate-500">
                            목표 {formatNumber(p.goal_amount)}원
                          </div>
                        )}
                        <div className="text-xs font-semibold text-slate-900 pt-1">
                          현재 {formatNumber(savedSoFar)}원
                        </div>
                      </div>
                    </div>
                    {/* 진행률 바 */}
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: BRAND_ORANGE,
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">
                          {progress}%
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 입력 폼 */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-lg h-fit">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                {form.id ? "✏️ 적금 항목 수정" : "➕ 새 적금 추가"}
              </h2>
              {form.id && (
                <button
                  type="button"
                  className="text-xs text-slate-500 underline-offset-2 hover:underline"
                  onClick={resetForm}
                  disabled={saving}
                >
                  새로 입력
                </button>
              )}
            </div>

            <form className="space-y-4 pt-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  상품/목표 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition duration-150"
                  placeholder="예: 청년도약계좌, 3년 뒤 전세 자금"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>

              {/* 금액 및 은행 */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    은행/상품사
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    placeholder="예: 카카오뱅크, 국민은행"
                    value={form.bank}
                    onChange={(e) => handleChange("bank", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    월 불입액(원) <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-right outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    inputMode="numeric"
                    placeholder="예: 700000"
                    value={formatNumber(Number(form.monthlyAmount))} // 쉼표 표시
                    onChange={(e) =>
                      handleChange(
                        "monthlyAmount",
                        e.target.value.replace(/[^0-9]/g, "")
                      )
                    }
                  />
                </div>
              </div>

              {/* 목표 금액 및 시작 월 */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    목표 금액(원)
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-right outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    inputMode="numeric"
                    placeholder="예: 42700000"
                    value={formatNumber(Number(form.goalAmount))} // 쉼표 표시
                    onChange={(e) =>
                      handleChange(
                        "goalAmount",
                        e.target.value.replace(/[^0-9]/g, "")
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    시작월 (YYYY-MM)
                  </label>
                  <input
                    type="month"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none text-slate-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    value={form.startMonth}
                    onChange={(e) =>
                      handleChange("startMonth", e.target.value)
                    }
                  />
                </div>
              </div>

              {/* 현재 금액 및 이체일 */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    현재까지 납입 금액(원)
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-right outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    inputMode="numeric"
                    placeholder="예: 6300000"
                    value={formatNumber(Number(form.currentAmount))} // 쉼표 표시
                    onChange={(e) =>
                      handleChange(
                        "currentAmount",
                        e.target.value.replace(/[^0-9]/g, "")
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    자동이체일(일)
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-right outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    inputMode="numeric"
                    placeholder="예: 27"
                    value={form.autoTransferDay}
                    onChange={(e) =>
                      handleChange(
                        "autoTransferDay",
                        e.target.value.replace(/[^0-9]/g, "")
                      )
                    }
                  />
                </div>
              </div>

              {/* 신규일 / 만기일 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  신규일 / 만기일 (YYYY-MM-DD)
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="date"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none text-slate-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    value={form.startDate}
                    onChange={(e) =>
                      handleChange("startDate", e.target.value)
                    }
                  />
                  <input
                    type="date"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none text-slate-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    value={form.endDate}
                    onChange={(e) => handleChange("endDate", e.target.value)}
                  />
                </div>
              </div>

              {/* 메모 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  메모 (선택)
                </label>
                <textarea
                  className="w-full min-h-[80px] rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  placeholder="예: 우대조건, 중도해지 이율, 특약사항 등"
                  value={form.memo}
                  onChange={(e) => handleChange("memo", e.target.value)}
                />
              </div>

              {/* 버튼 */}
              <div className="flex justify-end gap-3 pt-3">
                {form.id && (
                  <button
                    type="button"
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition duration-150"
                    onClick={resetForm}
                    disabled={saving}
                  >
                    취소
                  </button>
                )}
                <button
                  type="submit"
                  className="rounded-full px-4 py-2 text-sm font-semibold shadow-md transition duration-150"
                  style={{ backgroundColor: BRAND_ORANGE, color: "#fff" }}
                  disabled={saving}
                >
                  {saving
                    ? "저장 중..."
                    : form.id
                    ? "수정 완료"
                    : "적금 추가"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </PageContainer>
  );
}
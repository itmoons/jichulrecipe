// src/app/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { supabase } from "@/lib/supabaseClient";

const BRAND_ORANGE = "#FF8A3D";
const BRAND_GREEN = "#4CAF50";
const BRAND_BLUE = "#5673E7";
const LS_KEY_DAILY = "jichulrecipe_daily_recipes_v1";

/** localStorage 구조(느슨하게) */
type DailyStore = {
  [date: string]: any;
};

const recipeCards = [
  {
    icon: "🥗",
    title: "필수 지출 플레이트",
    desc: "월세·관리비·통신비·식비처럼 매달 빠져나가는 고정비를 한 접시로 묶어줍니다.",
    tag: "고정비 레시피",
  },
  {
    icon: "🍊",
    title: "저축 비타민 세트",
    desc: "비상자금, 단기 저축, 투자까지 한 번에 비율을 잡아주는 저축 전용 레시피입니다.",
    tag: "저축 레시피",
  },
  {
    icon: "🍰",
    title: "여가·취미 디저트",
    desc: "OTT·게임·취미·모임비를 ‘마음 편히 써도 되는 선’ 안에서 따로 담아둡니다.",
    tag: "소확행 레시피",
  },
];

/** YYYY-MM 형식 */
function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

/** YYYY-MM-DD 형식 */
function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

/** 월별 달력 셀 생성 */
function buildCalendar(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startWeekday = firstDay.getDay(); // 0: 일
  const daysInMonth = lastDay.getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function HomePage() {
  const router = useRouter();

  // 로그인 상태
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // 달력 프리뷰용
  const [dailyStore, setDailyStore] = useState<DailyStore>({});
  const [currentDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const todayKey = useMemo(() => getDateKey(new Date()), []);

  // 모달 상태
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);

  /** 로그인 상태 확인 */
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!mounted) return;
        setIsLoggedIn(!!session);
      } catch {
        if (!mounted) return;
        setIsLoggedIn(false);
      } finally {
        if (mounted) setAuthChecking(false);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, []);

  /** localStorage에서 레시피 데이터 로드 */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LS_KEY_DAILY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DailyStore;
      setDailyStore(parsed || {});
    } catch {
      // 무시
    }
  }, []);

  const monthKey = useMemo(() => getMonthKey(currentDate), [currentDate]);
  const calendarCells = useMemo(
    () => buildCalendar(currentDate),
    [currentDate]
  );

  /** 이번 달 간단 합계/통계 */
  const monthStats = useMemo(() => {
    let daysWithAny = 0;
    let totalExpense = 0;

    Object.entries(dailyStore).forEach(([date, entry]) => {
      if (!date.startsWith(monthKey)) return;

      const income =
        Number(entry.incomeTotal ?? entry.incomeAmount ?? 0) || 0;
      const expense =
        Number(entry.expenseTotal ?? entry.expenseAmount ?? 0) || 0;
      const saving =
        Number(entry.savingTotal ?? entry.savingAmount ?? 0) || 0;

      if (income > 0 || expense > 0 || saving > 0) daysWithAny += 1;
      totalExpense += expense;
    });

    return { daysWithAny, totalExpense };
  }, [dailyStore, monthKey]);

  const monthLabel = useMemo(
    () =>
      `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`,
    [currentDate]
  );

  /* ==============================
   *  CTA 핸들러
   * ============================== */
  const openRecipeModal = () => setRecipeModalOpen(true);
  const closeRecipeModal = () => setRecipeModalOpen(false);

  /* 실제 이동 액션 */
  const goTodayRecipeEdit = () => {
    const d = new Date();
    const key = getDateKey(d);
    router.push(`/dashboard/calendar/edit?date=${key}`);
  };
  const goCalendar = () => router.push("/dashboard/calendar");
  const goDashboard = () => router.push("/dashboard");
  const goSignIn = () => router.push("/sign-in");

  // 📊 이번 달 소비 분석 보기 클릭 시 분기
  const handleDashboardClick = () => {
    if (authChecking) {
      // 로그인 상태 확인 중이면 일단 대기
      return;
    }
    if (isLoggedIn) {
      router.push("/dashboard");
    } else {
      router.push("/sign-in");
    }
  };

  return (
    <PageContainer>
      {/* 부드러운 배경 */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#FFF7EC] via-[#FFFDF8] to-[#F5F7FF]" />
      <div className="pointer-events-none fixed left-[-80px] top-[-80px] -z-10 h-56 w-56 rounded-full bg-[rgba(255,184,108,0.3)] blur-3xl" />
      <div className="pointer-events-none fixed right-[-60px] bottom-[-60px] -z-10 h-52 w-52 rounded-full bg-[rgba(86,115,231,0.22)] blur-3xl" />

      {/* ✨ 중앙 래퍼: 반응형 폭 정리 */}
      <div className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-0 space-y-8">
        {/* 상단 히어로 */}
        <section className="grid gap-8 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          {/* 왼쪽: 카피 · CTA */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-6 text-center md:text-left"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm border border-orange-100/60 mx-auto md:mx-0">
              <span>👩‍🍳 사회초년생 전용 지출 레시피</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-[1.8rem] font-bold leading-snug text-slate-900 sm:text-[2rem] md:text-[2.2rem]">
                <span
                  className="mr-1 rounded-xl bg-[rgba(255,138,61,0.08)] px-2 py-1 text-[color:var(--brand-orange)]"
                  style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
                >
                  지출
                </span>
                을 요리하듯 기록하고
                <br className="hidden sm:block" />
                <span className="underline decoration-[rgba(86,115,231,0.3)] decoration-[6px] underline-offset-[7px]">
                  나만의 예산 레시피
                </span>
                를 만드세요.
              </h1>
              <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-700">
                숫자 가득한 가계부 대신 오늘 쓴 돈을 한 끼 식단처럼 남기는 방식입니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <button
                type="button"
                onClick={openRecipeModal}
                className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--brand-orange)] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 hover:translate-y-0.5 hover:bg-[#f27422] transition"
                style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
              >
                🍽 오늘 레시피부터 기록하기
              </button>
              <button
                type="button"
                onClick={handleDashboardClick}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-5 py-2.5 text-sm text-slate-800 shadow-sm hover:bg-white"
              >
                📊 이번 달 소비 분석 보기
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500 md:justify-start">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                ✅ 세후 월급만 넣고 시작
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                ✅ 필수·저축·여가 비율 자동 계산
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                ✅ 달력에 하루치 레시피만 기록
              </span>
            </div>
          </motion.div>

          {/* 오른쪽: 레시피 카드 + 도넛 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative mx-auto max-w-xs sm:max-w-sm rounded-3xl border border-orange-100 bg-white/95 p-4 pb-5 shadow-lg shadow-orange-100">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-orange-400">
                    today&apos;s budget recipe
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    세후 3,100,000원 · 기본 레시피
                  </p>
                  <p className="text-[11px] text-slate-500">
                    필수·저축·여가를 3가지 접시로 나눈 균형 레시피 예시입니다.
                  </p>
                </div>
                <Image
                  src="/logo/logo.png"
                  alt="지출레시피 로고"
                  width={52}
                  height={52}
                  className="drop-shadow-sm"
                />
              </div>

              {/* 도넛 + 레전드 */}
              <div className="mt-4 flex items-center gap-4">
                {/* 도넛 */}
                <div className="relative h-28 w-28 shrink-0 mx-auto sm:mx-0">
                  <div className="absolute inset-0 rounded-full bg-[rgba(255,242,222,0.9)]" />
                  <div
                    className="absolute inset-1.5 rounded-full border-[7px] border-transparent border-t-[7px] border-r-[7px] border-b-[7px]"
                    style={{
                      borderTopColor: BRAND_GREEN, // 필수
                      borderRightColor: BRAND_BLUE, // 저축
                      borderBottomColor: BRAND_ORANGE, // 여가
                    }}
                  />
                  <div className="absolute inset-6 rounded-full bg-white" />
                  <div className="absolute inset-7 flex flex-col items-center justify-center text-[10px] font-semibold text-slate-600 leading-tight">
                    <span>예산</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* 레전드 */}
                <div className="flex-1 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: BRAND_GREEN }}
                      />
                      <span className="text-slate-700">
                        필수 지출{" "}
                        <span className="text-[11px]">(월세·식비)</span>
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">40%</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: BRAND_BLUE }}
                      />
                      <span className="text-slate-700">저축·비상자금</span>
                    </div>
                    <span className="text-[11px] text-slate-500">30%</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: BRAND_ORANGE }}
                      />
                      <span className="text-slate-700">여가·취미·기타</span>
                    </div>
                    <span className="text-[11px] text-slate-500">30%</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col items-center justify-between gap-2 border-t border-dashed border-orange-100 pt-3 text-[11px] text-slate-500 sm:flex-row">
                <span>기본 레시피는 언제든지 조정할 수 있어요.</span>
                <span className="rounded-full bg-orange-50 px-2 py-1 font-medium text-orange-500">
                  예시 불러오기
                </span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* 로그인 시: 이번 달 달력 프리뷰 */}
        {isLoggedIn && (
          <section className="rounded-3xl bg-white/95 p-4 sm:p-5 shadow-sm shadow-orange-50 border border-orange-100/60">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-center sm:text-left">
                <h2 className="text-sm font-semibold text-slate-900">
                  {monthLabel} 레시피 달력 미리보기
                </h2>
                <p className="text-xs text-slate-600">
                  이미 기록된 날을 한눈에 보고, 캘린더 화면으로 바로 이동할 수 있어요.
                </p>
              </div>
              <button
                type="button"
                onClick={goCalendar}
                className="rounded-full bg-[color:var(--brand-orange)] px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#f27422]"
                style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
              >
                전체 달력 열기
              </button>
            </div>

            <div className="grid grid-cols-7 text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-neutral-400 mb-2">
              {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                <div
                  key={d}
                  className="text-center pb-2 border-b border-dashed border-orange-100"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-[44px] sm:auto-rows-[52px] gap-[4px] mt-1">
              {calendarCells.map((cell, idx) => {
                if (!cell) {
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl bg-orange-50/40 border border-dashed border-orange-100/70"
                    />
                  );
                }

                const dateKey = getDateKey(cell);
                const entry = dailyStore[dateKey];
                const income =
                  Number(entry?.incomeTotal ?? entry?.incomeAmount ?? 0) || 0;
                const expense =
                  Number(entry?.expenseTotal ?? entry?.expenseAmount ?? 0) || 0;
                const saving =
                  Number(entry?.savingTotal ?? entry?.savingAmount ?? 0) || 0;

                const hasAny = income > 0 || expense > 0 || saving > 0;
                const isToday = dateKey === todayKey;

                return (
                  <div
                    key={idx}
                    className={[
                      "relative flex flex-col rounded-2xl border px-1.5 py-1.5 text-left text-[10px] sm:text-[11px]",
                      "bg-white/90",
                      hasAny
                        ? "border-orange-200 shadow-[0_2px_6px_rgba(248,153,75,0.15)]"
                        : "border-orange-100",
                      isToday ? "ring-1 ring-orange-400/80" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-neutral-700">
                        {cell.getDate()}
                      </span>
                      {hasAny && (
                        <span className="flex gap-0.5">
                          {income > 0 && (
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                          )}
                          {expense > 0 && (
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: BRAND_ORANGE }}
                            />
                          )}
                          {saving > 0 && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          )}
                        </span>
                      )}
                    </div>
                    {hasAny ? (
                      <div className="mt-auto text-[9px] sm:text-[10px] text-neutral-500 leading-tight">
                        {expense > 0 && (
                          <div className="flex justify-between">
                            <span>지출</span>
                            <span>
                              {expense.toLocaleString("ko-KR")}
                              <span className="ml-0.5">원</span>
                            </span>
                          </div>
                        )}
                        {saving > 0 && (
                          <div className="flex justify-between">
                            <span>적금</span>
                            <span>
                              {saving.toLocaleString("ko-KR")}
                              <span className="ml-0.5">원</span>
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-auto text-[9px] sm:text-[10px] text-neutral-300">
                        -
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-[11px] text-slate-500 text-center sm:text-left">
              이번 달에는{" "}
              <strong className="font-semibold text-orange-600">
                {monthStats.daysWithAny}일
              </strong>
              에 레시피가 기록되어 있고, 총 지출 합계는{" "}
              <strong className="font-semibold text-orange-600">
                {monthStats.totalExpense.toLocaleString("ko-KR")}원
              </strong>
              입니다.
            </p>
          </section>
        )}

        {/* 대표 레시피 3종 */}
        <section className="space-y-4">
          <div className="text-center md:text-left">
            <h2 className="text-sm font-semibold text-slate-900">
              지출레시피에서 제공하는 기본 메뉴
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              한 달 예산을 한 번에 나누기 어렵다면, 아래 3가지 기본 레시피부터 시작해 보세요.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {recipeCards.map((item, idx) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + idx * 0.07 }}
                className="group flex flex-col justify-between rounded-2xl border border-orange-100 bg-white/95 p-4 shadow-sm hover:-translate-y-1 hover:shadow-md hover:shadow-orange-100 transition"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.icon}</span>
                      <h3 className="text-sm font-semibold text-slate-900">
                        {item.title}
                      </h3>
                    </div>
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-500">
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span>기본 레시피에서 자동으로 추천됩니다.</span>
                  <span
                    className="text-[11px] text-[color:var(--brand-blue)] group-hover:underline"
                    style={{ ["--brand-blue" as any]: BRAND_BLUE }}
                  />
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* 이용 플로우: 3단계 안내 */}
        <section className="mt-2 rounded-3xl bg-white/95 p-4 sm:p-5 shadow-sm shadow-orange-50">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 text-center md:text-left">
            지출레시피, 이렇게 사용해 보세요
          </h2>
          <p className="mb-4 text-xs text-slate-600 text-center md:text-left">
            매일 모든 내역을 적는 가계부가 아니라, &quot;레시피로 기준을 세우고 달력에 하루치만 기록&quot;
            하는 방식입니다.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2 rounded-2xl bg-[#FFF7EB] p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-orange-500">
                  STEP 1
                </span>
                <span className="text-lg">🥕</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                세후 월급과 고정비 입력
              </h3>
              <p className="text-xs leading-relaxed text-slate-700">
                월급, 월세·관리비, 대출 상환액만 넣으면
                기본 플레이트가 자동으로 만들어집니다.
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl bg-[#F4FAFF] p-4">
              <div className="flex items-center justify-between">
                <span
                  className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[color:var(--brand-blue)]"
                  style={{ ["--brand-blue" as any]: BRAND_BLUE }}
                >
                  STEP 2
                </span>
                <span className="text-lg">📊</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                필수·저축·여가 비율 확인
              </h3>
              <p className="text-xs leading-relaxed text-slate-700">
                내 소비가 어느 쪽에 치우쳐 있는지 도넛 차트와
                대시보드에서 한눈에 확인합니다.
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl bg-[#F6FFF5] p-4">
              <div className="flex items-center justify-between">
                <span
                  className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[color:var(--brand-green)]"
                  style={{ ["--brand-green" as any]: BRAND_GREEN }}
                >
                  STEP 3
                </span>
                <span className="text-lg">🍽</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                달력에 하루치 레시피만 기록
              </h3>
              <p className="text-xs leading-relaxed text-slate-700">
                오늘 쓴 돈을 간단한 메모와 함께 남기면,
                월말에는 한 달치 소비 레시피북이 완성됩니다.
              </p>
            </div>
          </div>
        </section>

        {/* 오늘의 샘플 레시피 섹션 */}
        <section className="mt-4 mb-2 rounded-3xl border border-dashed border-orange-200 bg-gradient-to-r from-[#FFF7EB] to-[#FFF9F3] p-4 sm:p-5">
          {/* 상단 안내 + 배지 영역 (전체 중앙 정렬) */}
          <div className="min-w-full mb-3 flex flex-col items-center justify-center gap-2 text-center">
            <div>
              <h2 className="text-xs text-slate-600 text-center">
                샘플 레시피로 감만 먼저 잡아보세요
              </h2>
              <p className="text-xs text-slate-600 text-center">
                세후 월급 구간별로 많이 선택된 비율을 단순 예시
              </p>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-orange-500 shadow-sm">
              나중에 내 상황에 맞게 자유롭게 수정 가능
            </span>
          </div>

          {/* 샘플 테이블 */}
          <div className="overflow-x-auto text-xs">
            {/* ✅ 테이블 최소 폭 유지 + 중앙 정렬용 래퍼 */}
            <div className="inline-block min-w-[640px] align-middle mx-auto">
              <table className="w-full table-fixed border-separate border-spacing-y-2">
                <thead className="text-[11px] text-slate-500">
                  <tr>
                    <th className="px-2 py-1 text-left">세후 월급</th>
                    <th className="px-2 py-1 text-left">필수 지출</th>
                    <th className="px-2 py-1 text-left">저축·비상자금</th>
                    <th className="px-2 py-1 text-left">여가·취미</th>
                    <th className="px-2 py-1 text-left">기타 버퍼</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      income: "2,300,000원",
                      essential: "900,000원 (39%)",
                      saving: "500,000원 (22%)",
                      leisure: "250,000원 (11%)",
                      etc: "150,000원 (6%)",
                    },
                    {
                      income: "2,800,000원",
                      essential: "1,050,000원 (38%)",
                      saving: "650,000원 (23%)",
                      leisure: "300,000원 (11%)",
                      etc: "200,000원 (7%)",
                    },
                    {
                      income: "3,100,000원",
                      essential: "1,150,000원 (37%)",
                      saving: "750,000원 (24%)",
                      leisure: "330,000원 (11%)",
                      etc: "220,000원 (7%)",
                    },
                  ].map((row) => (
                    <tr
                      key={row.income}
                      className="rounded-xl bg-white/95 shadow-sm shadow-orange-50"
                    >
                      <td className="px-2 py-2 font-semibold text-slate-800">
                        {row.income}
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        {row.essential}
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        {row.saving}
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        {row.leisure}
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        {row.etc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 하단 주석도 중앙 정렬 */}
          <p className="mt-3 text-[11px] text-slate-500 text-center">
            * 위 수치는 어디까지나 &quot;적당히 무리 없는 예시&quot;일 뿐입니다.
            내 상황에 맞게 필수·저축·여가 비율을 직접 조정하는 것이 가장 중요합니다.
          </p>
        </section>
      </div>

      {/* ===== 모달들 ===== */}
      {/* 레시피 시작 모달 */}
      {recipeModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-orange-100">
            <div className="px-4 py-3 border-b border-orange-100">
              <h2 className="text-sm font-semibold text-slate-900">
                오늘 레시피부터 기록할까요?
              </h2>
              <p className="mt-1 text-[11px] text-slate-600">
                오늘 날짜 기준으로 하루 지출 레시피를 작성하고,
                달력에서 한 달 치를 모아볼 수 있습니다.
              </p>
            </div>

            <div className="px-4 py-3 space-y-3 text-[12px] text-slate-700">
              {authChecking ? (
                <p className="text-xs text-slate-400">
                  로그인 상태를 확인하는 중입니다...
                </p>
              ) : isLoggedIn ? (
                <>
                  <p>
                    바로 오늘 날짜로 이동해서{" "}
                    <strong>수입·지출·적금 항목</strong>을 적어볼 수 있어요.
                  </p>
                  <ul className="list-disc pl-4 text-[11px] text-slate-500 space-y-1">
                    <li>오늘만 간단히 기록해도 괜찮아요.</li>
                    <li>기록한 내용은 내 브라우저에 우선 저장됩니다.</li>
                  </ul>
                </>
              ) : (
                <>
                  <p>
                    먼저 로그인하면, 오늘 레시피와 앞으로의 기록을
                    안전하게 보관할 수 있습니다.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    로그인 없이도 잠깐 써볼 수는 있지만,
                    기기 변경 시 기록이 사라질 수 있어요.
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-orange-100 bg-orange-50/60 rounded-b-2xl">
              <button
                type="button"
                onClick={closeRecipeModal}
                className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-orange-50"
              >
                나중에 할래요
              </button>

              <div className="flex gap-2">
                {!authChecking && !isLoggedIn && (
                  <button
                    type="button"
                    onClick={goSignIn}
                    className="rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-black"
                  >
                    로그인 하러 가기
                  </button>
                )}
                {!authChecking && isLoggedIn && (
                  <>
                    <button
                      type="button"
                      onClick={goCalendar}
                      className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-orange-50"
                    >
                      달력 먼저 보기
                    </button>
                    <button
                      type="button"
                      onClick={goTodayRecipeEdit}
                      className="rounded-full bg-[color:var(--brand-orange)] px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#f27422]"
                      style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
                    >
                      오늘 레시피 쓰러 가기
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

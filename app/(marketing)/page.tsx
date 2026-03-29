"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import SiteFooter from "@/components/layout/SiteFooter";

const BRAND_BLUE = "#5bbbf3";

type DailyStore = {
  [date: string]: any;
};

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMonthRange(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  return {
    firstKey: getDateKey(first),
    lastKey: getDateKey(last),
  };
}

function buildCalendar(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function Cloud({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const map = {
    sm: "w-10 h-6 sm:w-14 sm:h-8",
    md: "w-14 h-8 sm:w-20 sm:h-10",
    lg: "w-20 h-10 sm:w-28 sm:h-14",
  };

  return (
    <div className={`relative ${map[size]} ${className}`}>
      <div className="absolute bottom-0 left-0 right-0 h-1/2 rounded-full bg-white" />
      <div className="absolute left-[8%] top-[18%] h-[56%] w-[34%] rounded-full bg-white" />
      <div className="absolute left-[30%] top-0 h-[70%] w-[36%] rounded-full bg-white" />
      <div className="absolute right-[10%] top-[20%] h-[54%] w-[30%] rounded-full bg-white" />
    </div>
  );
}

function AwningCard({
  color = "purple",
  children,
}: {
  color?: "purple" | "blue";
  children: React.ReactNode;
}) {
  const isPurple = color === "purple";

  return (
    <section className="mx-auto w-full max-w-[980px] px-3 sm:px-4">
      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_14px_32px_rgba(70,70,110,0.08)] sm:rounded-[28px] sm:shadow-[0_18px_40px_rgba(70,70,110,0.08)]">
        <div
          className={[
            "relative h-12 sm:h-16",
            isPurple ? "bg-[#c9e2ff]" : "bg-[#b3e1ff]",
          ].join(" ")}
        >
          <div className="absolute inset-x-0 top-0 flex justify-center gap-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={[
                  "h-12 w-[12.5%] rounded-b-[999px] border-b border-white/40 sm:h-16",
                  i % 2 === 0
                    ? "bg-white/95"
                    : isPurple
                    ? "bg-[#8feeff]"
                    : "bg-[#6fb9ff]",
                ].join(" ")}
              />
            ))}
          </div>
        </div>

        <div className="px-4 pb-5 pt-4 sm:px-8 sm:pb-6 sm:pt-5">{children}</div>
      </div>
    </section>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[#b9e8ff] sm:bg-gradient-to-b sm:from-[#8fd7ff] sm:via-[#b9e8ff] sm:to-[#f5fbff]" />

      <div className="absolute bottom-0 left-0 right-0 h-[72px] bg-[radial-gradient(circle_at_12%_100%,white_0,white_19%,transparent_20%),radial-gradient(circle_at_32%_100%,white_0,white_22%,transparent_23%),radial-gradient(circle_at_54%_100%,white_0,white_19%,transparent_20%),radial-gradient(circle_at_74%_100%,white_0,white_22%,transparent_23%),radial-gradient(circle_at_92%_100%,white_0,white_18%,transparent_19%)] opacity-95 sm:h-[150px]" />

      <div className="pointer-events-none absolute left-[4%] top-[16%]">
        <Cloud size="md" />
      </div>
      <div className="pointer-events-none absolute right-[5%] top-[16%]">
        <Cloud size="sm" />
      </div>
      <div className="pointer-events-none absolute left-[10%] top-[46%]">
        <Cloud size="sm" />
      </div>
      <div className="pointer-events-none absolute right-[8%] top-[44%]">
        <Cloud size="md" />
      </div>

      <div className="relative mx-auto max-w-[980px] px-4 pb-10 pt-4 sm:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative text-center"
        >
          <p className="mb-2 text-[12px] font-bold text-[#2f4461] sm:mb-3 sm:text-[14px] sm:font-medium">
            행사기간 · 오늘부터 바로 시작
          </p>

          <h1 className="mx-auto max-w-[640px] text-[28px] font-black leading-[1.05] tracking-[-0.05em] text-white drop-shadow-[0_4px_0_rgba(73,80,106,0.35)] sm:text-[64px] sm:leading-[1.05]">
            지출레시피는
            <br />
            처음이지?
          </h1>

          <p className="mx-auto mt-3 max-w-[320px] text-[10px] font-semibold leading-6 text-[#2f4461] sm:mt-5 sm:max-w-none sm:text-[14px] sm:font-medium sm:text-slate-700">
            신규 회원 & 첫 기록 고객에게
            <span className="text-[#4b83ff]"> 오늘만 무료 혜택</span>을 드립니다!
          </p>

          <div className="relative mx-auto mt-5 w-full max-w-[980px] px-1 sm:mt-10 sm:px-4">
            <div className="pointer-events-none absolute inset-x-0 bottom-1 mx-auto h-6 w-[72%] rounded-full bg-black/10 blur-2xl sm:h-12 sm:w-[72%]" />

            <div className="group relative mx-auto aspect-[300/220] w-full max-w-[210px] overflow-hidden sm:mt-8 sm:aspect-[860/390] sm:max-w-[860px]">
              <Image
                src="/images/fridge-1.png"
                alt="기본 냉장고 이미지"
                fill
                className="object-contain transition-opacity duration-300 group-hover:opacity-0"
                priority
              />

              <Image
                src="/images/fridge-2.png"
                alt="호버 냉장고 이미지"
                fill
                className="object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                priority
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const [dailyStore, setDailyStore] = useState<DailyStore>({});
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  const [currentDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const todayKey = useMemo(() => getDateKey(new Date()), []);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);

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

  useEffect(() => {
    let mounted = true;

    const fetchDaily = async () => {
      if (authChecking) return;

      if (!isLoggedIn) {
        setDailyStore({});
        return;
      }

      setLoadingDaily(true);
      setDailyError(null);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (authError) {
          setDailyError("로그인 정보를 불러오지 못했어요.");
          setDailyStore({});
          setLoadingDaily(false);
          return;
        }

        if (!user) {
          setDailyStore({});
          setLoadingDaily(false);
          return;
        }

        const { firstKey, lastKey } = getMonthRange(currentDate);

        const { data, error } = await supabase
          .from("daily_recipes")
          .select(
            `
            date,
            income_items,
            expense_items,
            saving_items,
            income_total,
            expense_total,
            saving_total,
            created_at,
            updated_at
          `
          )
          .eq("user_id", user.id)
          .gte("date", firstKey)
          .lte("date", lastKey);

        if (!mounted) return;

        if (error) {
          setDailyError("이번 달 레시피를 불러오는 중 문제가 발생했어요.");
          setDailyStore({});
          setLoadingDaily(false);
          return;
        }

        const store: DailyStore = {};
        (data || []).forEach((row: any) => {
          store[row.date] = {
            incomeTotal:
              typeof row.income_total === "number"
                ? row.income_total
                : undefined,
            expenseTotal:
              typeof row.expense_total === "number"
                ? row.expense_total
                : undefined,
            savingTotal:
              typeof row.saving_total === "number"
                ? row.saving_total
                : undefined,
            incomeItems: row.income_items ?? [],
            expenseItems: row.expense_items ?? [],
            savingItems: row.saving_items ?? [],
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
        });

        setDailyStore(store);
        setLoadingDaily(false);
      } catch {
        if (!mounted) return;
        setDailyError("이번 달 레시피를 불러오는 중 오류가 발생했어요.");
        setDailyStore({});
        setLoadingDaily(false);
      }
    };

    fetchDaily();
    return () => {
      mounted = false;
    };
  }, [authChecking, isLoggedIn, currentDate]);

  const monthKey = useMemo(() => getMonthKey(currentDate), [currentDate]);
  const calendarCells = useMemo(() => buildCalendar(currentDate), [currentDate]);

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
    () => `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`,
    [currentDate]
  );

  const openRecipeModal = () => setRecipeModalOpen(true);
  const closeRecipeModal = () => setRecipeModalOpen(false);

  const goTodayRecipeEdit = () => {
    const d = new Date();
    const key = getDateKey(d);
    router.push(`/dashboard/calendar/edit?date=${key}`);
  };

  const goCalendar = () => router.push("/dashboard/calendar");
  const goDashboard = () => router.push("/dashboard");
  const goSignIn = () => router.push("/sign-in");

  return (
    <main className="w-full overflow-x-hidden bg-[#ffffff] text-slate-900">
      <HeroSection />

      <section className="bg-[#ffffff] pb-8 pt-6 sm:pb-10 sm:pt-10">
        <div className="mx-auto mb-5 max-w-[980px] px-4 text-center sm:mb-6">
          <p className="mb-2 text-[15px] font-bold text-[#00aeff] sm:text-[18px]">
            ◎ 선택 1
          </p>
          <h2 className="text-[16px] font-black tracking-[-0.03em] text-slate-800 sm:text-[26px] lg:text-[38px]">
            첫 기록 고객
            <span className="text-slate-950"> 맞춤 레시피 + 달력 프리뷰</span>
          </h2>
          <p className="mt-2 text-[10px] text-slate-500 sm:text-[14px]">
            오늘의 지출을 기록하면, 이번 달 예산 흐름을 바로 볼 수 있습니다.
          </p>
        </div>

        <AwningCard color="purple">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 sm:gap-4">
            {[
              { name: "레시피 달력 서비스", price: "1,000원", color: "#ffd166" },
              { name: "레시피 분석 서비스", price: "1,000원", color: "#caa77a" },
              { name: "정기레시피 서비스", price: "1,900원", color: "#9ad59b" },
              { name: "적금관리 서비스", price: "1,900원", color: "#ffb38a" },
            ].map((item) => (
              <div
                key={item.name}
                className="rounded-2xl border border-slate-200 bg-white px-4 pb-4 pt-5 text-center shadow-sm"
              >
                <div
                  className="mx-auto mb-3 h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <p className="text-[14px] font-semibold text-slate-800">
                  {item.name}
                </p>
                <p className="mt-1 text-[10px] text-slate-400 line-through">
                  7,980
                </p>
                <p className="text-[24px] font-black text-slate-900 sm:text-[26px]">
                  {item.price}
                </p>
                <button
                  onClick={openRecipeModal}
                  className="mt-3 w-full rounded-full bg-[#7fd6ff] px-5 py-2.5 text-[10px] font-bold text-white shadow-sm"
                >
                  이용하기 &gt;
                </button>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-[#d8dbff] bg-[#f6f7ff] p-4 sm:mt-6 sm:p-5">
            <div className="mb-4 text-center text-[18px] font-black text-[#66adff] sm:text-[20px]">
              • 쿠폰 사용 방법 •
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                "회원가입 후 로그인",
                "원하는 예산 메뉴 선택",
                "오늘의 기록 입력",
                "달력/대시보드에서 확인",
              ].map((step, idx) => (
                <div
                  key={step}
                  className="flex flex-col items-center rounded-2xl bg-white px-3 py-4 text-center shadow-sm sm:px-4 sm:py-5"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#dfeeff] text-[18px] font-black text-[#66adff] sm:h-14 sm:w-14 sm:text-[20px]">
                    {idx + 1}
                  </div>
                  <p className="text-[12px] font-semibold text-slate-700 sm:text-[10px]">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </AwningCard>
      </section>

      <section className="bg-[#ffffff] pb-10 pt-2 sm:pb-14 sm:pt-8">
        <div className="mx-auto mb-5 max-w-[980px] px-4 text-center sm:mb-6">
          <p className="mb-2 text-[15px] font-bold text-blue-400 sm:text-[18px]">
            ◎ 선택 2
          </p>
          <h2 className="text-[16px] font-black tracking-[-0.03em] text-slate-800 sm:text-[24px] lg:text-[36px]">
            지금이 딱!
            <span className="text-slate-950"> 지출레시피 사용할 때!</span>
          </h2>
        </div>

        <AwningCard color="blue">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {[
              {
                label: "적금",
                value: "100%",
                sub: "적금은 필수 관리",
              },
              {
                label: "경조사비",
                value: "100%",
                sub: "매번 잊어버리는 경조사비 관리",
              },
              {
                label: "커플장부",
                value: "필수사용",
                sub: "커플통장 사용하는 커플 필수",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm"
              >
                <div className="mb-2 text-[10px] font-semibold text-slate-500">
                  {item.label}
                </div>
                <div className="text-[32px] font-black leading-none text-slate-900 sm:text-[40px]">
                  {item.value}
                </div>
                <div className="mt-2 text-[10px] text-slate-500">
                  {item.sub}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-center">
            <button
              onClick={isLoggedIn ? goDashboard : goSignIn}
              className="w-full max-w-[320px] rounded-full bg-[#6fcaff] px-8 py-3 text-[15px] font-black text-white shadow-[0_4px_20px_#aadffe] sm:w-auto sm:max-w-none sm:text-[16px]"
            >
              무료 분석 받아보기 &gt;
            </button>
          </div>

          <div className="mt-6 rounded-2xl bg-[#faf7f8] p-4 text-[8px] leading-6 text-slate-500 sm:p-5 sm:text-[10px] sm:leading-7">
            <p className="mb-2 font-bold text-slate-700">유의사항</p>
            <p>· 쿠폰 제공 대상: 신규회원 및 구독이력이 없는 고객 대상</p>
            <p>· 사용기간: 발급 후 14일 이내</p>
            <p>· ID당 각 쿠폰 1회 사용 가능, 실제 결제 단계에서 조건이 적용됩니다</p>
            <p>· 일부 서비스 및 항목은 쿠폰 적용이 제한될 수 있습니다</p>
          </div>
        </AwningCard>
      </section>

      {isLoggedIn && (
  <section className="hidden bg-[#ffffff] pb-12 sm:block sm:pb-16">
    <div className="mx-auto w-full max-w-[980px] px-3 sm:px-4">
      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(70,70,110,0.08)] sm:rounded-[28px]">
        <div className="bg-gradient-to-r from-[#b8f1ff] via-[#dbf5ff] to-[#dbe7ff] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div>
              <h3 className="text-[20px] font-black tracking-[-0.03em] text-slate-800 sm:text-[22px]">
                {monthLabel} 레시피 달력
              </h3>
              <p className="mt-1 hidden text-slate-600 sm:block sm:text-[10px]">
                이미 기록한 날과 총 지출을 한눈에 볼 수 있습니다.
              </p>
              {dailyError && (
                <p className="mt-2 text-[12px] text-red-500">{dailyError}</p>
              )}
            </div>
            <button
              onClick={goCalendar}
              className="w-full rounded-full bg-slate-900 px-5 py-2.5 text-[10px] font-bold text-white sm:w-auto"
            >
              전체 달력 열기
            </button>
          </div>
        </div>

        <div className="px-3 pb-4 pt-4 sm:px-6 sm:pb-5">
          <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400 sm:text-[11px]">
            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-[4px] sm:gap-[6px]">
            {calendarCells.map((cell, idx) => {
              if (!cell) {
                return (
                  <div
                    key={idx}
                    className="h-[64px] rounded-xl border border-dashed border-slate-200 bg-slate-50 sm:h-[84px]"
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
                    "flex h-[44px] flex-col rounded-xl border p-1.5 sm:h-[84px] sm:p-2",
                    hasAny
                      ? "border-blue-200 bg-[#f2f8ff] shadow-sm"
                      : "border-slate-200 bg-white",
                    isToday ? "ring-2 ring-[#5bbbf3]/70" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 sm:text-[12px]">
                      {cell.getDate()}
                    </span>
                    {hasAny && (
                      <span className="flex gap-1">
                        {income > 0 && (
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 sm:h-2 sm:w-2" />
                        )}
                        {expense > 0 && (
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 sm:h-2 sm:w-2" />
                        )}
                        {saving > 0 && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 sm:h-2 sm:w-2" />
                        )}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto">
                    {hasAny ? (
                      <div className="text-[6px] leading-tight text-slate-600 sm:text-[11px]">
                        <div className="font-semibold text-blue-500">
                          {expense.toLocaleString("ko-KR")}원
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-300 sm:text-[11px]">
                        {loadingDaily ? "…" : "-"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl bg-[#fafafa] px-4 py-3 text-[12px] text-slate-600 sm:text-[10px]">
            이번 달에는{" "}
            <strong className="text-blue-500">
              {monthStats.daysWithAny}일
            </strong>
            에 레시피가 기록되어 있고, 총 지출 합계는{" "}
            <strong className="text-blue-500">
              {monthStats.totalExpense.toLocaleString("ko-KR")}원
            </strong>
            입니다.
          </div>
        </div>
      </div>
    </div>
  </section>
)}

      {recipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl sm:rounded-[28px]">
            <div className="bg-gradient-to-r from-[#d7ecff] to-[#dbe7ff] px-5 py-4">
              <h2 className="text-[18px] font-black tracking-[-0.03em] text-slate-800">
                오늘 레시피부터 기록할까요?
              </h2>
              <p className="mt-1 text-[10px] text-slate-600">
                오늘 날짜 기준으로 하루 지출 레시피를 바로 작성할 수 있습니다.
              </p>
            </div>

            <div className="px-5 py-5 text-[10px] leading-6 text-slate-700">
              {authChecking ? (
                <p>로그인 상태를 확인하는 중입니다...</p>
              ) : isLoggedIn ? (
                <>
                  <p>
                    바로 오늘 날짜로 이동해서 <strong>수입 · 지출 · 적금 항목</strong>을
                    적어볼 수 있어요.
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-[12px] text-slate-500">
                    <li>오늘만 가볍게 기록해도 괜찮습니다.</li>
                    <li>이후 달력에서 한 달 흐름을 모아볼 수 있습니다.</li>
                  </ul>
                </>
              ) : (
                <>
                  <p>
                    먼저 로그인하면 오늘 레시피와 앞으로의 기록을 안전하게 보관할 수
                    있습니다.
                  </p>
                  <p className="mt-2 text-[12px] text-slate-500">
                    로그인 없이 잠깐 써볼 수는 있지만, 기기 변경 시 기록이 사라질 수
                    있습니다.
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-200 bg-[#fafafa] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={closeRecipeModal}
                className="rounded-[10px] border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-600"
              >
                나중에 할래요
              </button>

              <div className="flex flex-col gap-2 sm:flex-row">
                {!authChecking && !isLoggedIn && (
                  <button
                    type="button"
                    onClick={goSignIn}
                    className="rounded-[10px] bg-slate-900 px-4 py-2 text-[12px] font-bold text-white"
                  >
                    로그인 하러 가기
                  </button>
                )}
                {!authChecking && isLoggedIn && (
                  <>
                    <button
                      type="button"
                      onClick={goCalendar}
                      className="rounded-[10px] border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-700"
                    >
                      달력 보기
                    </button>
                    <button
                      type="button"
                      onClick={goTodayRecipeEdit}
                      className="rounded-[10px] bg-[#3d8bffeb] px-4 py-2 text-[12px] font-bold text-white"
                    >
                      오늘 레시피 쓰기
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-20 hidden rounded-full bg-white/95 p-2 shadow-lg md:block">
        <Image
          src="/logo/logo.png"
          alt="지출레시피 로고"
          width={40}
          height={40}
          priority
          style={{ width: "40px", height: "40px" }}
        />
      </div>

    </main>
  );
}
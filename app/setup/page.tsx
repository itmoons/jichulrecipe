"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PageContainer } from "@/components/layout/PageContainer";
import { supabase } from "@/lib/supabaseClient";

type BaseInput = {
  netIncome: number; // 세후 월급
  rent: number; // 월세 + 관리비
  loanPayment: number; // 대출 상환액
};

type DetailKey =
  | "saving" // 적금
  | "card" // 신용카드 납부비
  | "transport" // 교통비
  | "mobile" // 통신비
  | "internet" // 인터넷요금
  | "insurance" // 보험비
  | "events" // 경조사비
  | "birthday" // 생일선물비
  | "clothes" // 의류구매비
  | "groceries"; // 식료품비

type DetailMap = Record<DetailKey, number>;

type ExtraItem = {
  id: string;
  label: string;
  amount: number;
};

type MonthlySetup = BaseInput & {
  details: DetailMap;
  extraItems: ExtraItem[];
};

type MonthlySetupStore = {
  [yearMonth: string]: MonthlySetup;
};

const LS_KEY_SINGLE = "budget_setup_v1"; // 대시보드 호환용
const LS_KEY_MONTHLY = "jichulrecipe_setup_monthly_v1";

const BRAND_ORANGE = "#FF8A3D";
const BRAND_GREEN = "#4CAF50";
const BRAND_BLUE = "#5673E7";

/** YYYY-MM 포맷 */
function getYearMonth(date = new Date()) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`;
}

function ymToText(ym: string) {
  const [y, m] = ym.split("-");
  return `${y}년 ${Number(m)}월`;
}

const DETAIL_CONFIG: {
  key: DetailKey;
  label: string;
  hint: string;
  emoji: string;
}[] = [
  { key: "saving", label: "적금", hint: "매달 넣는 적금·저축", emoji: "💰" },
  {
    key: "card",
    label: "신용카드 납부비",
    hint: "할부·일시불 포함 월 납부 예상액",
    emoji: "💳",
  },
  { key: "transport", label: "교통비", hint: "대중교통·주유비 등", emoji: "🚌" },
  { key: "mobile", label: "통신비", hint: "휴대폰 요금", emoji: "📱" },
  { key: "internet", label: "인터넷요금", hint: "와이파이·인터넷", emoji: "🌐" },
  {
    key: "insurance",
    label: "보험비",
    hint: "건강·실비·자동차 등",
    emoji: "🩺",
  },
  {
    key: "events",
    label: "경조사비",
    hint: "경조사 평균 월환산액",
    emoji: "🎎",
  },
  {
    key: "birthday",
    label: "생일선물비",
    hint: "가족·지인 선물 평균 월환산액",
    emoji: "🎁",
  },
  { key: "clothes", label: "의류구매비", hint: "옷·신발 등", emoji: "👕" },
  {
    key: "groceries",
    label: "식료품비",
    hint: "마트·배달 등 식비 중심",
    emoji: "🥦",
  },
];

const DETAIL_KEYS: DetailKey[] = DETAIL_CONFIG.map((d) => d.key);

const INITIAL_DETAIL_STATE: Record<DetailKey, string> = {
  saving: "",
  card: "",
  transport: "",
  mobile: "",
  internet: "",
  insurance: "",
  events: "",
  birthday: "",
  clothes: "",
  groceries: "",
};

export default function SetupPage() {
  const router = useRouter();

  const today = new Date();
  const initialYear = today.getFullYear();
  const initialYM = getYearMonth(today);

  // 현재 연도 / 선택된 월(YYYY-MM)
  const [currentYear, setCurrentYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialYM);

  const [monthlyStore, setMonthlyStore] = useState<MonthlySetupStore>({});

  // 폼 상태
  const [netIncome, setNetIncome] = useState<string>("");
  const [rent, setRent] = useState<string>("");
  const [loanPayment, setLoanPayment] = useState<string>("");
  const [details, setDetails] = useState<Record<DetailKey, string>>(
    INITIAL_DETAIL_STATE
  );
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);

  // 인증 체크 중인지 여부
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 현재 연도의 1~12월
  const monthTabs = useMemo(() => {
    const arr: string[] = [];
    for (let m = 1; m <= 12; m++) {
      const mm = `${m}`.padStart(2, "0");
      arr.push(`${currentYear}-${mm}`);
    }
    return arr;
  }, [currentYear]);

  /** 선택된 ym에 맞춰 폼 채우기 */
  const loadMonthData = (ym: string, store: MonthlySetupStore = monthlyStore) => {
    const data = store[ym];
    if (data) {
      setNetIncome(String(data.netIncome || ""));
      setRent(String(data.rent || ""));
      setLoanPayment(String(data.loanPayment || ""));
      const d: Record<DetailKey, string> = { ...INITIAL_DETAIL_STATE };
      DETAIL_KEYS.forEach((k) => {
        d[k] = String(data.details?.[k] ?? "");
      });
      setDetails(d);
      setExtraItems(data.extraItems || []);
    } else {
      setNetIncome("");
      setRent("");
      setLoanPayment("");
      setDetails({ ...INITIAL_DETAIL_STATE });
      setExtraItems([]);
    }
  };

  /** localStorage + Supabase 기반 초기 로드 */
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (typeof window === "undefined") return;

      // 1) 현재 로그인 유저 확인
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (authError) {
        console.warn("Supabase auth error in setup:", authError.message);
      }

      // 2) 로그인 안 되어 있으면: localStorage 정리 + /sign-in으로 이동
      if (!user) {
        try {
          window.localStorage.removeItem(LS_KEY_MONTHLY);
          window.localStorage.removeItem(LS_KEY_SINGLE);
        } catch {
          // ignore
        }

        setMonthlyStore({});
        setNetIncome("");
        setRent("");
        setLoanPayment("");
        setDetails({ ...INITIAL_DETAIL_STATE });
        setExtraItems([]);

        router.replace("/sign-in?redirect=/setup");
        return;
      }

      // 3) 로그인되어 있으면: Supabase에서 해당 유저의 monthly_recipes 로드
      let dbStore: MonthlySetupStore = {};
      try {
        const { data: rows, error: dbError } = await supabase
          .from("monthly_recipes")
          .select(
            "year_month, net_income, rent, loan_payment, details, extra_items"
          )
          .eq("user_id", user.id);

        if (dbError) {
          console.error("Supabase monthly_recipes 조회 실패:", dbError.message);
        } else if (rows && Array.isArray(rows)) {
          rows.forEach((row: any) => {
            const ym: string = row.year_month;
            const detailFromDb: Partial<DetailMap> = row.details || {};
            const extraFromDb: ExtraItem[] = row.extra_items || [];

            const detailFull: DetailMap = {
              saving: Number(detailFromDb.saving || 0),
              card: Number(detailFromDb.card || 0),
              transport: Number(detailFromDb.transport || 0),
              mobile: Number(detailFromDb.mobile || 0),
              internet: Number(detailFromDb.internet || 0),
              insurance: Number(detailFromDb.insurance || 0),
              events: Number(detailFromDb.events || 0),
              birthday: Number(detailFromDb.birthday || 0),
              clothes: Number(detailFromDb.clothes || 0),
              groceries: Number(detailFromDb.groceries || 0),
            };

            dbStore[ym] = {
              netIncome: Number(row.net_income || 0),
              rent: Number(row.rent || 0),
              loanPayment: Number(row.loan_payment || 0),
              details: detailFull,
              extraItems: extraFromDb,
            };
          });
        }
      } catch (err) {
        console.error("Supabase monthly_recipes 로딩 중 오류:", err);
      }

      // 4) localStorage 와 머지 (있다면)
      let mergedStore: MonthlySetupStore = { ...dbStore };
      try {
        const raw = window.localStorage.getItem(LS_KEY_MONTHLY);
        if (raw) {
          const parsed = JSON.parse(raw) as MonthlySetupStore;
          // 같은 ym에 대해선 DB값이 우선
          mergedStore = { ...parsed, ...dbStore };
        }
      } catch {
        // 파싱 실패 시 무시
      }

      if (!mounted) return;

      setMonthlyStore(mergedStore);

      // 현재 월 폼 채우기
      loadMonthData(initialYM, mergedStore);

      // 캐시용 localStorage 다시 기록
      try {
        window.localStorage.setItem(LS_KEY_MONTHLY, JSON.stringify(mergedStore));
      } catch {
        // ignore
      }

      setCheckingAuth(false);
    };

    init();

    return () => {
      mounted = false;
    };
  }, [initialYM, router]);

  /** 월 탭 클릭 */
  const handleSelectMonth = (ym: string) => {
    setSelectedMonth(ym);
    loadMonthData(ym);
  };

  /** 연도 이동 (이전/다음) */
  const handleChangeYear = (delta: number) => {
    const nextYear = currentYear + delta;
    setCurrentYear(nextYear);

    // 기존 선택된 월의 "월"을 유지하면서 연도만 변경
    const [, m] = selectedMonth.split("-");
    const nextYM = `${nextYear}-${m}`;
    setSelectedMonth(nextYM);
    loadMonthData(nextYM);
  };

  /** 상세 항목 값 변경 */
  const handleChangeDetail = (key: DetailKey, value: string) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
  };

  /** 추가 항목 추가/수정/삭제 */
  const handleAddExtraItem = () => {
    setExtraItems((prev) => [
      ...prev,
      {
        id: `extra-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: "",
        amount: 0,
      },
    ]);
  };

  const handleChangeExtraItem = (
    id: string,
    field: "label" | "amount",
    value: string
  ) => {
    setExtraItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === "amount" ? Number(value || 0) : (value as string),
            }
          : item
      )
    );
  };

  const handleRemoveExtraItem = (id: string) => {
    setExtraItems((prev) => prev.filter((item) => item.id !== id));
  };

  /** 합계 계산 */
  const rentNum = Number(rent || 0);
  const loanNum = Number(loanPayment || 0);
  const netIncomeNum = Number(netIncome || 0);

  const detailTotal = DETAIL_KEYS.reduce(
    (sum, k) => sum + Number(details[k] || 0),
    0
  );
  const extraTotal = extraItems.reduce(
    (sum, item) => sum + (item.amount || 0),
    0
  );

  const fixedTotal = rentNum + loanNum + detailTotal + extraTotal;
  const remain = netIncomeNum - fixedTotal;
  const usageRate =
    netIncomeNum > 0 ? Math.min(1, fixedTotal / netIncomeNum) : 0;
  const isOver = netIncomeNum > 0 && fixedTotal > netIncomeNum;

  /** 저장 후 (월별) 대시보드 이동 + Supabase 저장 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const detailNumbers: DetailMap = DETAIL_KEYS.reduce(
      (acc, k) => ({
        ...acc,
        [k]: Number(details[k] || 0),
      }),
      {} as DetailMap
    );

    const payload: MonthlySetup = {
      netIncome: netIncomeNum,
      rent: rentNum,
      loanPayment: loanNum,
      details: detailNumbers,
      extraItems,
    };

    // 1) Supabase에 저장 (로그인된 경우)
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.warn("Supabase auth error:", authError.message);
      }

      if (user) {
        const { error: dbError } = await supabase
          .from("monthly_recipes")
          .upsert(
            {
              user_id: user.id,
              year_month: selectedMonth,
              net_income: netIncomeNum,
              rent: rentNum,
              loan_payment: loanNum,
              details: detailNumbers,
              extra_items: extraItems,
            },
            {
              onConflict: "user_id,year_month",
            }
          );

        if (dbError) {
          console.error("Supabase 저장 실패:", dbError.message);
        }
      } else {
        console.info(
          "로그인되지 않은 상태입니다. Supabase에는 저장하지 않습니다."
        );
      }
    } catch (err) {
      console.error("Supabase 처리 중 오류:", err);
    }

    // 2) 기존처럼 localStorage 저장 (캐시 & 비로그인 지원용)
    if (typeof window !== "undefined") {
      const nextStore: MonthlySetupStore = {
        ...monthlyStore,
        [selectedMonth]: payload,
      };
      setMonthlyStore(nextStore);
      window.localStorage.setItem(LS_KEY_MONTHLY, JSON.stringify(nextStore));

      // 대시보드에서 고정비로 쓸 데이터 (상세 + 추가 항목까지 합산해서 넘김)
      const singlePayload: BaseInput = {
        netIncome: netIncomeNum,
        rent: rentNum,
        loanPayment: loanNum + detailTotal + extraTotal,
      };
      window.localStorage.setItem(LS_KEY_SINGLE, JSON.stringify(singlePayload));
    }

    // 3) 월별 대시보드로 이동
    router.push(`/dashboard?month=${selectedMonth}`);
  };

  /** 연도 단위 분석 데시보드로 이동 */
  const handleOpenYearDashboard = () => {
    router.push(`/dashboard/yearly?year=${currentYear}`);
  };

  // ✅ 인증 체크 중에는 화면 렌더를 잠시 막아줌 (깜빡임 방지)
  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#FFF8EC] via-[#FFFDFC] to-[#F7FAFF]">
        <p className="text-xs text-slate-500">쉐프 계정을 확인하고 있어요...</p>
      </main>
    );
  }

  return (
    <PageContainer title="기본 레시피 만들기">
      {/* 배경 */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#FFF8EC] via-[#FFFDFC] to-[#F7FAFF]" />
      <div className="pointer-events-none fixed left-[-80px] top-[40%] -z-10 h-52 w-52 rounded-full bg-[rgba(255,184,108,0.25)] blur-3xl" />
      <div className="pointer-events-none fixed right-[-60px] bottom-[8%] -z-10 h-52 w-52 rounded-full bg-[rgba(86,115,231,0.18)] blur-3xl" />

      {/* 상단 설명 */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-6 space-y-3"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: BRAND_ORANGE }}
          />
          <span>연도별 · 월별 예산 레시피 · 재료 준비 단계</span>
        </div>

        <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">
          한 해의{" "}
          <span
            className="text-[color:var(--brand-orange)]"
            style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
          >
            12개월 지출 레시피
          </span>
          를 쉐프처럼 미리 설계해 볼까요?
        </h2>
        <p className="text-xs leading-relaxed text-slate-700 md:text-[13px]">
          세후 월급과 고정비, 생활비 항목을 월별로 적어두면
          <br className="hidden sm:block" />
          이번 달뿐 아니라, 작년·내년까지{" "}
          <span className="font-semibold">“나만의 소비 레시피”</span>를 한눈에
          비교할 수 있어요.
        </p>
      </motion.section>

      {/* 연도 + 월 선택 영역 */}
      <section className="mb-5 rounded-2xl bg-white/80 p-3 shadow-sm shadow-orange-50 md:p-4">
        {/* 연도 네비게이션 */}
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleChangeYear(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50"
            >
              ←
            </button>
            <span className="text-sm font-semibold text-slate-900">
              {currentYear}년 레시피북
            </span>
            <button
              type="button"
              onClick={() => handleChangeYear(1)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50"
            >
              →
            </button>
          </div>
          <span className="text-[11px] text-slate-500">
            연도를 넘기면 상단의 1~12월 탭이 해당 연도 기준으로 바뀝니다.
          </span>
        </div>

        {/* 1~12월 탭 */}
        <div className="flex flex-wrap gap-1.5">
          {monthTabs.map((ym) => {
            const isActive = ym === selectedMonth;
            const hasData = !!monthlyStore[ym];
            const [, m] = ym.split("-");
            return (
              <motion.button
                key={ym}
                type="button"
                onClick={() => handleSelectMonth(ym)}
                whileTap={{ scale: 0.96 }}
                whileHover={{ y: -1 }}
                className={[
                  "relative flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition",
                  isActive
                    ? "border-orange-300 bg-[#FFF4E6] text-orange-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                <span className="text-[10px] font-semibold uppercase text-slate-400">
                  STEP
                </span>
                <span className="font-semibold">{Number(m)}월</span>
                {hasData && (
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[9px] text-orange-600">
                    레시피 저장됨
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* 현재 선택된 월 안내 */}
        <AnimatePresence mode="wait">
          <motion.p
            key={selectedMonth}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mt-3 text-[11px] text-slate-600"
          >
            지금은{" "}
            <span className="font-semibold text-orange-700">
              {ymToText(selectedMonth)}
            </span>{" "}
            지출 레시피의 재료를 정리하고 있어요.
          </motion.p>
        </AnimatePresence>
      </section>

      {/* 폼 */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]"
      >
        {/* 왼쪽: 레시피 재료 입력 */}
        <div className="space-y-4">
          {/* STEP 1: 기본 재료 (세후 월급) */}
          <div className="rounded-2xl bg-white/95 p-4 shadow-sm shadow-orange-50">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-semibold text-orange-600">
                  STEP 1 · 기본 재료
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                한 달 레시피의 전체 양을 정해요
              </span>
            </div>

            <div className="mb-2 flex items-center gap-2">
              <span className="text-lg">💳</span>
              <h3 className="text-sm font-semibold text-slate-900">
                세후 월급 (통장에 실제로 들어오는 금액)
              </h3>
            </div>
            <p className="mb-3 text-[11px] text-slate-600">
              4대보험·세금을 제외하고{" "}
              <span className="font-semibold">실제로 입금되는 금액</span>을
              적어주세요. 이 금액을 기준으로 전체 레시피의 비율이 계산됩니다.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                placeholder="예: 3000000"
                value={netIncome}
                onChange={(e) => setNetIncome(e.target.value)}
                required
              />
              <span className="text-xs text-slate-500">원</span>
            </div>
          </div>

          {/* STEP 2: 고정비 (월세 + 대출) */}
          <div className="rounded-2xl bg-white/95 p-4 shadow-sm shadow-orange-50">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#E9F3FF] px-2 py-1 text-[10px] font-semibold text-[#3F6FD9]">
                  STEP 2 · 기본 고정비
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                매달 거의 같은 “베이스 비용”
              </span>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-slate-700">
                  월세 + 관리비
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    placeholder="예: 800000"
                    value={rent}
                    onChange={(e) => setRent(e.target.value)}
                  />
                  <span className="text-xs text-slate-500">원</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  월세, 관리비, 장기주택부담금 등이 있으면 함께 적어주세요.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-slate-700">
                  대출 상환액 (학자금·전세자금·신용대출 등)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    placeholder="예: 300000 (없으면 0)"
                    value={loanPayment}
                    onChange={(e) => setLoanPayment(e.target.value)}
                  />
                  <span className="text-xs text-slate-500">원</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  정기적으로 나가는 상환액이 없다면 0으로 비워두셔도 됩니다.
                </p>
              </div>
            </div>
          </div>

          {/* STEP 3: 생활비(양념) + 추가 토핑 */}
          <div className="rounded-2xl bg-white/95 p-4 shadow-sm shadow-orange-50">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#F3F4FF] px-2 py-1 text-[10px] font-semibold text-[#5B6CD9]">
                  STEP 3 · 생활비 양념 & 토핑
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                매달 조절 가능한 “레시피의 맛” 부분
              </span>
            </div>

            <p className="mb-3 text-[11px] text-slate-600">
              적금·카드·교통·식비 등 생활비를{" "}
              <span className="font-semibold">“이번 달 목표 예산”</span> 기준으로
              적어주세요. 나중에 실제 지출과 비교하면서 레시피를 조정하게 됩니다.
            </p>

            {/* 10개 상세 항목: 2열 그리드 */}
            <div className="space-y-2 rounded-xl bg-slate-50/80 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700">
                  생활비 기본 양념 (10개 항목)
                </span>
                <span className="text-[10px] text-slate-400">
                  자주 쓰는 대표 카테고리를 모아두었어요
                </span>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                {DETAIL_CONFIG.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center gap-2 rounded-md bg-white px-2.5 py-2"
                  >
                    <span className="text-base">{item.emoji}</span>
                    <div className="w-28 flex-shrink-0">
                      <div className="text-[11px] font-semibold text-slate-800">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {item.hint}
                      </div>
                    </div>
                    <div className="flex flex-1 items-center gap-1">
                      <input
                        type="number"
                        className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-[11px] outline-none focus:border-slate-400"
                        placeholder="0"
                        value={details[item.key] || ""}
                        onChange={(e) =>
                          handleChangeDetail(item.key, e.target.value)
                        }
                      />
                      <span className="text-[11px] text-slate-500">원</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 추가 항목 */}
            <div className="mt-4 space-y-2 rounded-xl bg-slate-50/90 p-3">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🧂</span>
                  <span className="text-[11px] font-semibold text-slate-700">
                    추가 지출 항목(나만의 토핑)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddExtraItem}
                  className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-orange-600 shadow-sm hover:bg-orange-50"
                >
                  + 토핑 추가
                </button>
              </div>

              {extraItems.length === 0 && (
                <p className="text-[11px] text-slate-500">
                  반려동물, 취미, 학원비 등 위 항목에 없는 지출이 있다면
                  <br className="hidden sm:block" />
                  여기에 “토핑”처럼 따로 적어 두고 관리해 보세요.
                </p>
              )}

              <div className="space-y-2">
                {extraItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-1 rounded-md bg-white px-2.5 py-2 sm:flex-row sm:items-center sm:gap-2"
                  >
                    <input
                      type="text"
                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-[11px] outline-none focus:border-slate-400 sm:w-32"
                      placeholder="예: 반려동물비"
                      value={item.label}
                      onChange={(e) =>
                        handleChangeExtraItem(item.id, "label", e.target.value)
                      }
                    />
                    <div className="flex flex-1 items-center gap-1">
                      <input
                        type="number"
                        className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-[11px] outline-none focus:border-slate-400"
                        placeholder="0"
                        value={item.amount || ""}
                        onChange={(e) =>
                          handleChangeExtraItem(item.id, "amount", e.target.value)
                        }
                      />
                      <span className="text-[11px] text-slate-500">원</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExtraItem(item.id)}
                      className="self-end rounded-md px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-100 hover:text-slate-700 sm:self-auto"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 요약 + 안내 (md 이상 sticky) */}
        <div className="space-y-4 md:sticky md:top-24">
          <div className="rounded-2xl bg-white/95 p-4 shadow-sm shadow-orange-50">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="text-base">🍲</span>
              <span>이 달 레시피 한눈에 보기</span>
            </h3>
            {/* <p className="mb-3 text-[11px] text-slate-600">
              입력한 금액을 바탕으로, 지출레시피가 한 달 예산 구조를
              도넛 차트와 카테고리별 금액으로 정리해 보여줄 예정입니다.
              <br />
              연도를 바꿔가며 12개월의 레시피를 비교하면, 연 단위 지출
              패턴도 한눈에 보이게 됩니다.
            </p> */}

            <div className="space-y-2 rounded-xl bg-slate-50/80 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">세후 월급(전체 반죽)</span>
                <span className="font-semibold text-slate-900">
                  {netIncomeNum ? netIncomeNum.toLocaleString() : "-"}원
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">
                  월세·대출 + 생활비 양념 + 토핑 합계
                </span>
                <span className="font-semibold text-slate-900">
                  {fixedTotal ? fixedTotal.toLocaleString() : "-"}원
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">
                  남는 금액(여유 반죽·예상 오차)
                </span>
                <span
                  className={[
                    "font-semibold",
                    isOver
                      ? "text-red-500"
                      : "text-[color:var(--brand-green)]",
                  ].join(" ")}
                  style={
                    isOver
                      ? undefined
                      : ({ ["--brand-green" as any]: BRAND_GREEN } as any)
                  }
                >
                  {netIncome ? remain.toLocaleString() : "-"}원
                </span>
              </div>

              {/* 사용률 바 */}
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>예산 사용률</span>
                  <span>
                    {netIncomeNum
                      ? `${Math.round(usageRate * 100)}%`
                      : "-"}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={
                      "h-full rounded-full transition-all" +
                      (isOver
                        ? " bg-red-400"
                        : " bg-[color:var(--brand-orange)]")
                    }
                    style={{
                      width: `${Math.min(usageRate * 100, 130)}%`,
                      ["--brand-orange" as any]: BRAND_ORANGE,
                    }}
                  />
                </div>
                {isOver && (
                  <p className="mt-1 text-[10px] text-red-500">
                    * 예상 지출이 세후 월급을 초과했어요. 일부 양념(생활비)을
                    줄이거나 토핑을 조정해 보세요.
                  </p>
                )}
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-500">
              * 입력값은 “이 정도로 써보겠다”는 목표 예산입니다.{" "}
              실제 지출과의 차이는 대시보드에서 확인·조정하면서 레시피를
              다듬게 됩니다.
            </p>
          </div>

          {/* 안내 + 버튼들 */}
          <div className="flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-[#FFF7EB] to-[#FFF4E5] p-4 shadow-sm shadow-orange-50">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-lg">👨‍🍳</span>
              <p className="text-[11px] leading-relaxed text-slate-700">
                이 페이지는{" "}
                <strong>“각 연도의 12개월 지출 재료를 미리 적어두는 단계”</strong>
                예요. 대시보드에서 실제 한 달을 살아보며
                적금·카드·식비·취미 비용을 조정하면, 연 단위로{" "}
                <strong>나만의 지출 레시피북</strong>이 완성됩니다.
              </p>
            </div>

            {/* 월별 대시보드 버튼 */}
            <button
              type="submit"
              className="mt-1 inline-flex items-center justify-center rounded-xl bg-[color:var(--brand-orange)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-[#f27422]"
              style={{ ["--brand-orange" as any]: BRAND_ORANGE }}
            >
              🍽 {ymToText(selectedMonth)} 레시피 저장하고 대시보드로 가기
            </button>

            {/* 연간 통계 대시보드 버튼 */}
            <button
              type="button"
              onClick={handleOpenYearDashboard}
              className="inline-flex items-center justify-center rounded-xl border border-orange-200 bg-white/70 px-4 py-2.5 text-sm font-semibold text-orange-700 shadow-sm transition hover:bg-orange-50"
            >
              📊 {currentYear}년 12개월 레시피를 통계로 분석하기
            </button>

            <p className="text-[10px] text-slate-500">
              * 연도별·월별로 따로 저장되며, 위의 화살표와 월 탭으로
              과거·현재·미래 예산 레시피를 넘겨보며 비교할 수 있습니다.
            </p>
          </div>
        </div>
      </motion.form>
    </PageContainer>
  );
}

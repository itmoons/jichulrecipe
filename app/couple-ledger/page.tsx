"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";

type CoupleContext = {
  couple_link_id: string;
  couple_ledger_id: string;
  partner_user_id: string;
  shared_ledger_on: boolean;
  personal_share_on: boolean;
  allow_edit: boolean;
} | null;

type CoupleExpense = {
  id: string;
  couple_link_id: string;
  created_by: string;
  amount: number;
  category: string | null;
  memo: string | null;
  expense_date: string;
  created_at: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function money(n: number | bigint) {
  const v = typeof n === "bigint" ? Number(n) : n;
  return (v || 0).toLocaleString("ko-KR");
}

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function Surface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-[24px] border border-[#ECECEC] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]",
        className
      )}
    >
      {children}
    </section>
  );
}

function ProfileCircle({
  label,
  subLabel,
  imageSrc,
}: {
  label: string;
  subLabel?: string;
  imageSrc?: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[92px] w-[92px] overflow-hidden rounded-full bg-[#E9E9E9] sm:h-[110px] sm:w-[110px]">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={label}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-3 text-center text-[12px] font-medium text-slate-700 sm:text-[13px]">
            {label}
          </div>
        )}
      </div>

      {subLabel ? (
        <div className="mt-2 text-[11px] text-slate-500">{subLabel}</div>
      ) : null}
    </div>
  );
}
function SummaryChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[16px] border border-[#EAEAEA] bg-[#FAFAFA] px-4 py-3">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-1 text-[14px] font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function QuickCard({
  href,
  title,
  desc,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-[24px] border border-[#EAEAEA] bg-[#F3F3F3] p-6 transition hover:-translate-y-[2px] hover:border-[#cfe7ff] hover:bg-[#f7fbff] hover:shadow-[0_12px_28px_rgba(12,134,234,0.08)]"
    >
      <div className="flex h-full min-h-[190px] flex-col justify-between sm:min-h-[140px]">
        <div className="flex items-start justify-between gap-3">
          <div className="text-[28px]">{icon}</div>
          <div className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-600">
            바로가기
          </div>
        </div>

        <div>
          <div className="text-[18px] font-semibold tracking-[-0.02em] text-slate-900">
            {title}
          </div>
          <div className="mt-2 text-[10px] leading-6 text-slate-600">{desc}</div>
        </div>
      </div>
    </Link>
  );
}

function BarRow({
  label,
  amount,
  max,
}: {
  label: string;
  amount: number;
  max: number;
}) {
  const width = max > 0 ? Math.max((amount / max) * 100, 6) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] text-slate-700">{label}</div>
        <div className="text-[13px] font-semibold text-slate-900">{money(amount)}원</div>
      </div>
      <div className="mt-2 h-2.5 rounded-full bg-white/80">
        <div className="h-2.5 rounded-full bg-[#69b6ff]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function CoupleLedgerPage() {
  const [checking, setChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [ctx, setCtx] = useState<CoupleContext>(null);
  const [sharedList, setSharedList] = useState<CoupleExpense[]>([]);

  const loadContext = async (): Promise<CoupleContext> => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    setIsLoggedIn(!!uid);

    if (!uid) {
      setCtx(null);
      setChecking(false);
      return null;
    }

    const { data, error } = await supabase.rpc("get_my_couple_context");
    if (error || !data || data.length === 0) {
      setCtx(null);
      setChecking(false);
      return null;
    }

    const next = data[0] as CoupleContext;
    setCtx(next);
    setChecking(false);
    return next;
  };

  const loadSharedThisMonth = async (couple_link_id: string) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data, error } = await supabase
      .from("couple_expenses")
      .select("*")
      .eq("couple_link_id", couple_link_id)
      .gte("expense_date", formatDateKey(start))
      .lte("expense_date", formatDateKey(end))
      .order("expense_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setSharedList([]);
      return;
    }

    setSharedList((data || []) as CoupleExpense[]);
  };

  const refresh = async () => {
    const c = await loadContext();
    if (!c?.couple_link_id || !c.shared_ledger_on) {
      setSharedList([]);
      return;
    }
    await loadSharedThisMonth(c.couple_link_id);
  };

  useEffect(() => {
    refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => subscription.unsubscribe();
  }, []);

  const summary = useMemo(() => {
    const total = sharedList.reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const count = sharedList.length;

    const myPaid = sharedList.reduce((sum, x) => {
      return x.created_by === ctx?.partner_user_id ? sum : sum + Number(x.amount || 0);
    }, 0);

    const partnerPaid = sharedList.reduce((sum, x) => {
      return x.created_by === ctx?.partner_user_id ? sum + Number(x.amount || 0) : sum;
    }, 0);

    const catMap: Record<string, number> = {};
    sharedList.forEach((item) => {
      const key = item.category || "기타";
      catMap[key] = (catMap[key] || 0) + Number(item.amount || 0);
    });

    const topCategories = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, amount]) => ({ label, amount }));

    const topCategory = topCategories[0]?.label ?? "-";

    return {
      total,
      count,
      myPaid,
      partnerPaid,
      topCategory,
      topCategories,
    };
  }, [sharedList, ctx?.partner_user_id]);

  const chartMax = useMemo(() => {
    return Math.max(...summary.topCategories.map((x) => x.amount), 1);
  }, [summary.topCategories]);

  if (checking) {
    return (
      <div className="mx-auto max-w-[1280px] min-h-screen bg-[#ffffff] p-6 text-[14px] text-slate-600">
        불러오는 중…
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#ffffff] px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-[1280px]">
          <Surface className="p-6 sm:p-8">
            <div className="text-[24px] font-semibold tracking-[-0.03em] text-slate-900">
              커플 가계부
            </div>
            <div className="mt-2 text-[14px] leading-6 text-slate-600">
              로그인 후 커플 가계부와 달력, 분석 기능을 사용할 수 있습니다.
            </div>
            <div className="mt-6">
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center rounded-[14px] bg-[#69b6ff] px-5 py-3 text-[14px] font-medium text-white transition hover:bg-[#0c86ea]"
              >
                로그인하기
              </Link>
            </div>
          </Surface>
        </div>
      </div>
    );
  }

  if (!ctx?.couple_link_id) {
    return (
      <div className="min-h-screen bg-[#ffffff] px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-[1280px]">
          <Surface className="p-6 sm:p-8">
            <div className="text-[24px] font-semibold tracking-[-0.03em] text-slate-900">
              커플 가계부
            </div>
            <div className="mt-2 text-[14px] leading-6 text-slate-600">
              아직 커플 연결이 없습니다. 먼저 연결을 완료한 뒤 가계부를 사용할 수 있습니다.
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/couple-link"
                className="inline-flex items-center justify-center rounded-[14px] bg-[#69b6ff] px-5 py-3 text-[14px] font-medium text-white transition hover:bg-[#0c86ea]"
              >
                커플 연결하러 가기
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-[14px] border border-slate-200 bg-white px-5 py-3 text-[14px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                홈으로
              </Link>
            </div>
          </Surface>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ffffff] px-4 py-8 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-[1230px]">
        <Surface className="px-5 py-8 sm:px-8 sm:py-4">
          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
            <ProfileCircle
  label="내 프로필"
  subLabel="내 프로필"
  imageSrc="/images/couple/me.png"
/>

            <div className="flex flex-col items-center justify-center">
              <div className="text-[28px] sm:text-[34px]">💙</div>
              <div className="mt-2 text-[12px] text-slate-500">커플 연결 완료</div>
            </div>

            <ProfileCircle
  label="상대 프로필"
  subLabel="상대 프로필"
  imageSrc="/images/couple/partner.png"
/>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <SummaryChip label="이번 달 공동지출" value={`${money(summary.total)}원`} />
            <SummaryChip label="이번 달 기록 수" value={`${summary.count}건`} />
            <SummaryChip label="가장 큰 카테고리" value={summary.topCategory} />
          </div>
        </Surface>

        <Surface className="mt-6 overflow-hidden bg-[#ECECEC]">
          <div className="grid min-h-[160px] gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-10">
              <div className="text-[24px] font-semibold tracking-[-0.03em] text-slate-900 sm:text-[20px]">
                지출 분석 그래프 및 요약 페이지
              </div>
              <div className="mt-3 max-w-[620px] text-[10px] leading-7 text-slate-600">
                이번 달 함께 사용한 금액의 흐름을 빠르게 확인하고, 카테고리별 소비 패턴과 결제 비중을 정리해볼 수 있습니다.
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/couple-ledger/analytics"
                  className="inline-flex items-center justify-center rounded-[14px] bg-[#69b6ff] px-5 py-3 text-[14px] font-medium text-white transition hover:bg-[#0c86ea]"
                >
                  분석 보러가기
                </Link>
                <Link
                  href="/couple-ledger/calendar"
                  className="inline-flex items-center justify-center rounded-[14px] border border-slate-200 bg-white px-5 py-3 text-[14px] font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  달력 보러가기
                </Link>
              </div>
            </div>

            <div className="border-t border-white/50 px-6 py-8 lg:border-l lg:border-t-0 sm:px-8">
              <div className="text-[14px] font-semibold text-slate-900">이번 달 카테고리 요약</div>
              <div className="mt-4 space-y-4">
                {summary.topCategories.length === 0 ? (
                  <div className="rounded-[18px] border border-white/70 bg-white/70 p-5 text-[13px] text-slate-600">
                    아직 이번 달 공동 지출 기록이 없습니다.
                  </div>
                ) : (
                  summary.topCategories.map((row) => (
                    <BarRow key={row.label} label={row.label} amount={row.amount} max={chartMax} />
                  ))
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-[18px] border border-white/80 bg-white/80 px-4 py-4">
                  <div className="text-[11px] text-slate-500">내 결제</div>
                  <div className="mt-1 text-[15px] font-semibold text-slate-900">
                    {money(summary.myPaid)}원
                  </div>
                </div>
                <div className="rounded-[18px] border border-white/80 bg-white/80 px-4 py-4">
                  <div className="text-[11px] text-slate-500">상대 결제</div>
                  <div className="mt-1 text-[15px] font-semibold text-slate-900">
                    {money(summary.partnerPaid)}원
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Surface>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <QuickCard
            href="/couple-ledger/entry"
            title="가계부 입력"
            desc="오늘 사용한 지출을 빠르게 기록하고 수정할 수 있습니다."
            icon="✍️"
          />
          <QuickCard
            href="/couple-ledger/calendar"
            title="가계부 달력"
            desc="언제 얼마나 썼는지 월간 흐름으로 확인할 수 있습니다."
            icon="🗓️"
          />
          <QuickCard
            href="/couple-ledger/analytics"
            title="지출 분석"
            desc="카테고리, 결제 비중, 날짜별 패턴을 한눈에 분석합니다."
            icon="📊"
          />
        </div>
      </div>
    </div>
  );
}
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
        "rounded-[18px] border border-[#f1e4da] bg-white shadow-[0_4px_16px_rgba(85,47,18,0.05)]",
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
      <div className="relative h-[68px] w-[68px] overflow-hidden rounded-full border border-orange-100 bg-[#fff7ed] sm:h-[78px] sm:w-[78px]">
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
    <div className="rounded-[14px] border border-[#f3e5da] bg-[#fffdfb] px-4 py-3">
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-[15px] font-bold tracking-[-0.02em] text-slate-900">{value}</div>
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
      className="group block rounded-[18px] border border-[#f1e4da] bg-white p-5 transition hover:-translate-y-[2px] hover:border-orange-200 hover:bg-[#fffdfb] hover:shadow-[0_10px_22px_rgba(211,92,16,0.09)]"
    >
      <div className="flex h-full min-h-[190px] flex-col justify-between sm:min-h-[140px]">
        <div className="flex items-start justify-between gap-3">
          <div className="text-[28px]">{icon}</div>
          <div className="rounded-full border border-orange-100 bg-[#fff7ed] px-3 py-1 text-[11px] font-semibold text-orange-700">
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
      <div className="mt-2 h-2 rounded-full bg-orange-100/70">
        <div className="h-2 rounded-full bg-[#ff8a3d]" style={{ width: `${width}%` }} />
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
      <div className="app-surface mx-auto max-w-[1320px] min-h-screen p-6 text-[14px] text-slate-600">
        불러오는 중…
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="app-surface min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-[1320px]">
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
                className="inline-flex items-center justify-center rounded-[14px] bg-[#ff8a3d] px-5 py-3 text-[14px] font-medium text-white transition hover:bg-[#ff8a3d]"
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
      <div className="app-surface min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-[1320px]">
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
                className="inline-flex items-center justify-center rounded-[14px] bg-[#ff8a3d] px-5 py-3 text-[14px] font-medium text-white transition hover:bg-[#ff8a3d]"
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
    <div className="app-surface min-h-screen px-4 py-8 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-[0.12em] text-orange-600">COUPLE LEDGER</p>
            <h1 className="mt-1 text-[24px] font-bold tracking-[-0.04em] text-slate-900">우리의 공동 장부</h1>
            <p className="mt-1 text-[13px] text-slate-600">이번 달 함께 쓴 돈을 기록하고, 필요한 순간에 분석하세요.</p>
          </div>
          <Link href="/couple-ledger/entry" className="inline-flex w-fit items-center justify-center rounded-[10px] bg-[#ff8a3d] px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_3px_8px_rgba(211,92,16,0.18)] transition hover:bg-[#ff963f]">지출 기록하기</Link>
        </div>

        <Surface className="px-5 py-6 sm:px-8">
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-8">
            <ProfileCircle
  label="내 프로필"
  subLabel="내 프로필"
  imageSrc="/images/couple/me.png"
/>

            <div className="flex flex-col items-center justify-center">
              <div className="text-[24px] text-orange-500">♥</div>
              <div className="mt-1 text-[11px] font-medium text-slate-500">공동 장부 연결됨</div>
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

        <Surface className="mt-5 overflow-hidden">
          <div className="grid min-h-[160px] gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="flex flex-col justify-center px-6 py-7 sm:px-8 sm:py-8">
              <div className="text-[20px] font-bold tracking-[-0.03em] text-slate-900 sm:text-[22px]">
                이번 달 소비 흐름
              </div>
              <div className="mt-3 max-w-[620px] text-[10px] leading-7 text-slate-600">
                이번 달 함께 사용한 금액의 흐름을 빠르게 확인하고, 카테고리별 소비 패턴과 결제 비중을 정리해볼 수 있습니다.
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href="/couple-ledger/analytics"
                  className="inline-flex items-center justify-center rounded-[10px] bg-[#ff8a3d] px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#ff963f]"
                >
                  분석 보러가기
                </Link>
                <Link
                  href="/couple-ledger/calendar"
                  className="inline-flex items-center justify-center rounded-[10px] border border-orange-200 bg-white px-4 py-2.5 text-[13px] font-bold text-orange-800 transition hover:bg-[#fff7ed]"
                >
                  달력 보러가기
                </Link>
              </div>
            </div>

            <div className="border-t border-[#f3e5da] bg-[#fffaf6] px-6 py-7 lg:border-l lg:border-t-0 sm:px-8">
              <div className="text-[14px] font-semibold text-slate-900">이번 달 카테고리 요약</div>
              <div className="mt-4 space-y-4">
                {summary.topCategories.length === 0 ? (
                  <div className="rounded-[14px] border border-orange-100 bg-white p-5 text-[13px] text-slate-600">
                    아직 이번 달 공동 지출 기록이 없습니다.
                  </div>
                ) : (
                  summary.topCategories.map((row) => (
                    <BarRow key={row.label} label={row.label} amount={row.amount} max={chartMax} />
                  ))
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-[14px] border border-orange-100 bg-white px-4 py-4">
                  <div className="text-[11px] text-slate-500">내 결제</div>
                  <div className="mt-1 text-[15px] font-semibold text-slate-900">
                    {money(summary.myPaid)}원
                  </div>
                </div>
                <div className="rounded-[14px] border border-orange-100 bg-white px-4 py-4">
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

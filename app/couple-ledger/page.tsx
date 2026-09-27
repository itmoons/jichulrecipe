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
        "rounded-xl border border-[#dfe6e2] bg-white shadow-sm",
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
      <div className="relative h-[68px] w-[68px] overflow-hidden rounded-full border border-orange-100 bg-[#f1f8f4] sm:h-[78px] sm:w-[78px]">
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
    <div className="rounded-xl border border-[#dfe6e2] bg-[#f8fafc] px-4 py-3">
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
      className="group block rounded-xl border border-[#dfe6e2] bg-white p-5 transition hover:-translate-y-[1px] hover:border-[#9fcdb7] hover:bg-[#f8fafc] shadow-sm"
    >
      <div className="flex h-full min-h-[190px] flex-col justify-between sm:min-h-[140px]">
        <div className="flex items-start justify-between gap-3">
          <div className="text-[28px]">{icon}</div>
          <div className="rounded-full border border-orange-100 bg-[#f1f8f4] px-3 py-1 text-[11px] font-semibold text-orange-700">
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
        <div className="h-2 rounded-full bg-[#1f7a5b]" style={{ width: `${width}%` }} />
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
                className="inline-flex items-center justify-center rounded-[14px] bg-[#1f7a5b] px-5 py-3 text-[14px] font-medium text-white transition hover:bg-[#1f7a5b]"
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
                className="inline-flex items-center justify-center rounded-[14px] bg-[#1f7a5b] px-5 py-3 text-[14px] font-medium text-white transition hover:bg-[#1f7a5b]"
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
    <main className="min-h-screen bg-[#f8fafc] px-4 py-7 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[1320px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.14em] text-[#1f7a5b]">SHARED MONEY</p>
            <h1 className="mt-1 text-[26px] font-bold tracking-[-0.05em] text-slate-900">우리의 공동 지출</h1>
          </div>
          <Link href="/couple-settings" className="rounded-lg border border-[#e2e5e1] bg-white px-3.5 py-2 text-[12px] font-semibold text-slate-600 transition hover:bg-[#f1f8f4]">공동 장부 설정</Link>
        </div>

        <section className="overflow-hidden rounded-xl bg-[#1f7a5b] text-white shadow-sm">
          <div className="grid gap-8 px-6 py-7 sm:px-9 sm:py-9 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <div className="flex items-center gap-2 text-[12px] font-semibold text-white/75"><span className="h-2 w-2 rounded-full bg-[#9bd6bd]" /> 두 사람이 함께 기록 중</div>
              <p className="mt-7 text-[13px] font-medium text-white/75">이번 달 공동 지출</p>
              <div className="mt-1 text-[36px] font-bold tracking-[-0.06em] sm:text-[44px]">{money(summary.total)}<span className="ml-1 text-[18px] font-semibold">원</span></div>
              <p className="mt-3 text-[13px] text-white/75">{summary.count}건을 함께 기록했어요. 필요한 지출은 바로 추가해보세요.</p>
              <Link href="/couple-ledger/entry" className="mt-6 inline-flex rounded-lg bg-white px-4 py-3 text-[13px] font-bold text-[#176247] transition hover:bg-[#eaf5ef]">+ 공동 지출 기록</Link>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg border border-[#e2e5e1] bg-white/10 p-4 ">
              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-[11px] text-white/65">내가 결제한 금액</p>
                <p className="mt-2 text-[20px] font-bold tracking-[-0.04em]">{money(summary.myPaid)}원</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-[11px] text-white/65">상대가 결제한 금액</p>
                <p className="mt-2 text-[20px] font-bold tracking-[-0.04em]">{money(summary.partnerPaid)}원</p>
              </div>
              <div className="col-span-2 flex items-center justify-between rounded-xl bg-white/10 px-4 py-3">
                <span className="text-[12px] text-white/70">가장 많이 쓴 항목</span>
                <span className="text-[13px] font-bold">{summary.topCategory}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <Surface className="overflow-hidden border-[#e2e5e1] shadow-none">
            <div className="flex items-center justify-between border-b border-[#edf3ef] px-5 py-4 sm:px-6">
              <div><h2 className="text-[16px] font-bold tracking-[-0.03em] text-slate-900">최근 공동 지출</h2><p className="mt-1 text-[11px] text-slate-500">함께 기록한 내역을 최신순으로 확인하세요.</p></div>
              <Link href="/couple-ledger/calendar" className="text-[12px] font-bold text-[#1f7a5b]">전체 보기</Link>
            </div>
            {sharedList.length === 0 ? (
              <div className="px-6 py-14 text-center"><p className="text-[14px] font-semibold text-slate-800">첫 공동 지출을 기록해보세요.</p><p className="mt-2 text-[12px] text-slate-500">기록하면 두 사람의 소비 흐름을 정리해드려요.</p><Link href="/couple-ledger/entry" className="mt-5 inline-flex rounded-lg bg-[#1f7a5b] px-3.5 py-2.5 text-[12px] font-bold text-white">지출 추가</Link></div>
            ) : (
              <div className="divide-y divide-[#edf3ef]">
                {sharedList.slice(0, 5).reverse().map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                    <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-slate-800">{item.memo || item.category || "공동 지출"}</p><p className="mt-1 text-[11px] text-slate-500">{item.category || "기타"} · {item.expense_date}</p></div>
                    <p className="shrink-0 text-[14px] font-bold text-slate-900">{money(Number(item.amount))}원</p>
                  </div>
                ))}
              </div>
            )}
          </Surface>

          <Surface className="border-[#e2e5e1] p-5 shadow-none sm:p-6">
            <div className="flex items-start justify-between"><div><h2 className="text-[16px] font-bold tracking-[-0.03em] text-slate-900">소비 비중</h2><p className="mt-1 text-[11px] text-slate-500">이번 달 카테고리별 합계예요.</p></div><Link href="/couple-ledger/analytics" className="rounded-lg bg-[#f1f8f4] px-2.5 py-2 text-[11px] font-bold text-[#176247]">분석 보기</Link></div>
            <div className="mt-7 space-y-5">
              {summary.topCategories.length === 0 ? <p className="py-7 text-center text-[12px] text-slate-500">아직 분석할 지출이 없어요.</p> : summary.topCategories.map((row) => <BarRow key={row.label} label={row.label} amount={row.amount} max={chartMax} />)}
            </div>
          </Surface>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Link href="/couple-ledger/entry" className="rounded-xl border border-[#e2e5e1] bg-white p-5 transition hover:border-[#8ec9ae] hover:bg-[#f7faf8]"><p className="text-[12px] font-bold text-[#1f7a5b]">01</p><p className="mt-5 text-[15px] font-bold text-slate-900">지출 기록</p><p className="mt-1 text-[12px] text-slate-500">오늘의 공동 지출을 추가해요.</p></Link>
          <Link href="/couple-ledger/calendar" className="rounded-xl border border-[#e2e5e1] bg-white p-5 transition hover:border-[#8ec9ae] hover:bg-[#f7faf8]"><p className="text-[12px] font-bold text-[#1f7a5b]">02</p><p className="mt-5 text-[15px] font-bold text-slate-900">달력으로 보기</p><p className="mt-1 text-[12px] text-slate-500">날짜별 소비를 한눈에 확인해요.</p></Link>
          <Link href="/couple-ledger/analytics" className="rounded-xl border border-[#e2e5e1] bg-white p-5 transition hover:border-[#8ec9ae] hover:bg-[#f7faf8]"><p className="text-[12px] font-bold text-[#1f7a5b]">03</p><p className="mt-5 text-[15px] font-bold text-slate-900">소비 분석</p><p className="mt-1 text-[12px] text-slate-500">두 사람의 소비 흐름을 살펴봐요.</p></Link>
        </div>
      </div>
    </main>
  );
}

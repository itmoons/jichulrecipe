"use client";

import Link from "next/link";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type CoupleLedgerNavTab = "entry" | "calendar" | "analytics";

export default function CoupleLedgerNav({
  active,
  className,
}: {
  active: CoupleLedgerNavTab;
  className?: string;
}) {
  const baseClass =
    "inline-flex items-center justify-center rounded-[12px] px-4 py-2.5 text-[12px] sm:text-[13px] font-medium transition";

  return (
    <div className={cx("flex flex-wrap items-center gap-2 sm:gap-2.5", className)}>
      <Link
        href="/couple-ledger"
        className="inline-flex items-center justify-center rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-[12px] sm:text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
      >
        메인
      </Link>

      <Link
        href="/couple-ledger/entry"
        className={cx(
          baseClass,
          active === "entry"
            ? "bg-[#1f7a5b] text-white hover:bg-[#1f7a5b]"
            : "border border-[#c6e2d4] bg-white text-[#1f7a5b] hover:bg-[#f1f8f4]"
        )}
      >
        기록
      </Link>

      <Link
        href="/couple-ledger/calendar"
        className={cx(
          baseClass,
          active === "calendar"
            ? "bg-[#1f7a5b] text-white hover:bg-[#1f7a5b]"
            : "border border-[#c6e2d4] bg-white text-[#1f7a5b] hover:bg-[#f1f8f4]"
        )}
      >
        달력
      </Link>

      <Link
        href="/couple-ledger/analytics"
        className={cx(
          baseClass,
          active === "analytics"
            ? "bg-[#1f7a5b] text-white hover:bg-[#1f7a5b]"
            : "border border-[#c6e2d4] bg-white text-[#1f7a5b] hover:bg-[#f1f8f4]"
        )}
      >
        분석
      </Link>

      <Link
        href="/couple-settings"
        className="inline-flex items-center justify-center rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-[12px] sm:text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
      >
        설정
      </Link>
    </div>
  );
}
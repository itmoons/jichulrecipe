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
            ? "bg-[#ff8a3d] text-white hover:bg-[#ff8a3d]"
            : "border border-[#fed7aa] bg-white text-[#ff8a3d] hover:bg-[#fff7ed]"
        )}
      >
        기록
      </Link>

      <Link
        href="/couple-ledger/calendar"
        className={cx(
          baseClass,
          active === "calendar"
            ? "bg-[#ff8a3d] text-white hover:bg-[#ff8a3d]"
            : "border border-[#fed7aa] bg-white text-[#ff8a3d] hover:bg-[#fff7ed]"
        )}
      >
        달력
      </Link>

      <Link
        href="/couple-ledger/analytics"
        className={cx(
          baseClass,
          active === "analytics"
            ? "bg-[#ff8a3d] text-white hover:bg-[#ff8a3d]"
            : "border border-[#fed7aa] bg-white text-[#ff8a3d] hover:bg-[#fff7ed]"
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
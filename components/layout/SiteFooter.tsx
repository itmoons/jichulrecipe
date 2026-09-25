"use client";

import Image from "next/image";
import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white ">
      <div className="mx-auto w-full max-w-[980px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-6 sm:gap-8 md:flex-row md:items-start md:justify-between">
          {/* 브랜드 */}
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <Image
                  src="/logo/logo.png"
                  alt="지출레시피 로고"
                  width={28}
                  height={28}
                  style={{ width: "28px", height: "28px" }}
                />
              </div>

              <div>
                <p className="text-[15px] font-bold tracking-[-0.03em] text-slate-800">
                  지출레시피
                </p>
                <p className="text-[12px] text-slate-500">
                  기록이 쉬워지는 가계부
                </p>
              </div>
            </div>
          </div>

          {/* 링크 */}
          <div className="grid grid-cols-2 gap-6 sm:gap-8">
            <div>
              <p className="mb-3 text-[12px] font-bold text-slate-800 sm:text-[13px]">
                바로가기
              </p>
              <div className="flex flex-col gap-2 text-[12px] text-slate-500 sm:text-[13px]">
                <Link href="/" className="transition hover:text-slate-800">
                  홈
                </Link>
                <Link
                  href="/dashboard"
                  className="transition hover:text-slate-800"
                >
                  대시보드
                </Link>
                <Link
                  href="/dashboard/calendar"
                  className="transition hover:text-slate-800"
                >
                  달력
                </Link>
                <Link
                  href="/calculators"
                  className="transition hover:text-slate-800"
                >
                  계산기
                </Link>
              </div>
            </div>

            <div>
              <p className="mb-3 text-[12px] font-bold text-slate-800 sm:text-[13px]">
                안내
              </p>
              <div className="flex flex-col gap-2 text-[12px] text-slate-500 sm:text-[13px]">
                <Link
                  href="/sign-in"
                  className="transition hover:text-slate-800"
                >
                  로그인
                </Link>
                <Link
                  href="/sign-up"
                  className="transition hover:text-slate-800"
                >
                  회원가입
                </Link>
                {/* <Link
                  href="/sign-in"
                  className="transition hover:text-slate-800"
                >
                  개인정보처리방침
                </Link>
                <Link
                  href="/terms"
                  className="transition hover:text-slate-800"
                >
                  이용약관
                </Link> */}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4 sm:mt-8 sm:pt-5">
          <div className="flex flex-col gap-2 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:text-[12px]">
            <p>© {new Date().getFullYear()} 지출레시피. All rights reserved.</p>
            <p>매일의 소비를 더 가볍고 선명하게.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

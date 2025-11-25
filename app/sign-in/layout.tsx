// src/app/sign-in/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

const SITE_NAME = "지출레시피";
const SITE_URL = "https://jichulrecipe.vercel.app";
const PAGE_URL = `${SITE_URL}/sign-in`;
const OG_IMAGE = `${SITE_URL}/og-image.png`; // 있으면 좋고, 없어도 동작은 함

export const metadata: Metadata = {
  title: `로그인 | ${SITE_NAME}`,
  description:
    "지출레시피 로그인 페이지입니다. 월별 지출 내역을 입력하고, 자동 분석된 소비 레시피를 바로 확인해 보세요. 사회초년생을 위한 지출 분석과 예산 레시피 제공.",
  alternates: {
    canonical: PAGE_URL,
  },
  keywords: [
    "지출레시피 로그인",
    "지출 레시피",
    "지출 분석 서비스",
    "가계부 로그인",
    "소비 패턴 분석",
    "월별 지출 분석",
    "사회초년생 지출 관리",
    "예산 관리 서비스",
  ],
  openGraph: {
    title: `로그인 - ${SITE_NAME}`,
    description:
      "지출레시피에 로그인하고, 월별 지출 데이터를 기반으로 자동으로 생성되는 소비 레시피를 확인해 보세요.",
    url: PAGE_URL,
    siteName: SITE_NAME,
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `로그인 | ${SITE_NAME}`,
    description:
      "지출레시피에 로그인하면 월별 지출을 분석한 나만의 소비 레시피를 확인할 수 있습니다.",
    images: [OG_IMAGE],
  },
  robots: {
    index: true, // 로그인 페이지도 인덱싱 허용 (서비스 소개 텍스트가 있어서 유입용으로 좋음)
    follow: true,
  },
};

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-2xl items-center px-4 py-10">
      <div className="w-full rounded-2xl bg-white p-8 shadow-lg border border-slate-100">
        {/* 상단 인트로 영역 (SEO용 텍스트 포함) */}
        <section className="mb-8 space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            {SITE_NAME} 로그인
          </h1>
          <p className="text-sm leading-relaxed text-slate-600">
            월별 지출 내역을 입력하면, 지출레시피가{" "}
            <strong className="font-semibold">
              소비 패턴을 자동 분석하고 레시피처럼 구조화해 보여줍니다.
            </strong>{" "}
            사회초년생·직장인의 지출 관리, 예산 설계, 소비 습관 점검에
            최적화된 지출 분석 서비스입니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-500">
            <li>월별 지출 데이터를 기반으로 한 소비 패턴 분석</li>
            <li>식비·교통비·고정비 등 카테고리별 지출 구조 시각화</li>
            <li>데이터를 바탕으로 한 지출 레시피 제안</li>
          </ul>
        </section>

        {/* 로그인 폼 */}
        <section aria-label="지출레시피 로그인 폼" className="space-y-6">
          <form className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-800"
              >
                이메일
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                placeholder="이메일을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-800"
              >
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            <button
              type="submit"
              className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600 active:scale-[0.99]"
            >
              지출레시피 로그인
            </button>
          </form>

          {/* 하단 안내 / 회원가입 유도 영역 */}
          <div className="space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
            <p>
              아직 <span className="font-semibold">지출레시피</span>를
              처음 사용하나요?
            </p>
            <p>
              간단한 회원가입 후 월별 지출 내역을 입력하면,{" "}
              <span className="font-semibold">
                나만의 지출 분석 리포트와 소비 레시피
              </span>
              를 확인할 수 있습니다.
            </p>
            <div className="flex items-center justify-between pt-2">
              <Link
                href="/sign-up"
                className="text-[11px] font-semibold text-indigo-500 hover:underline"
              >
                계정이 없어요 · 회원가입하기
              </Link>
              <Link
                href="/"
                className="text-[11px] text-slate-500 hover:underline"
              >
                지출레시피 서비스 소개 보기
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

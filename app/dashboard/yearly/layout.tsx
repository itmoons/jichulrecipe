// src/app/dashboard/yearly/layout.tsx
import type { Metadata } from "next";

const SITE_NAME = "지출레시피";
const SITE_URL = "https://jichulrecipe.vercel.app";
const PAGE_URL = `${SITE_URL}/dashboard/yearly`;
const OG_IMAGE = `${SITE_URL}/og-image.png`; // 있으면 사용

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "연도별 지출 패턴 분석",
    template: `%s | ${SITE_NAME}`,
  },

  description:
    "한 해 12개월의 지출 레시피를 한 번에 비교하는 연도별 지출 패턴 분석 페이지입니다. 월별 예산과 실제 지출 흐름을 연간 그래프로 보면서 소비 습관을 점검할 수 있습니다.",

  keywords: [
    "지출레시피",
    "연도별 지출 분석",
    "연간 지출 패턴",
    "연간 예산 분석",
    "12개월 지출 비교",
    "소비 습관 분석",
    "연간 가계부 통계",
    "연도별 예산 관리",
  ],

  alternates: {
    canonical: PAGE_URL,
  },

  openGraph: {
    title: "연도별 지출 패턴 분석 – 지출레시피",
    description:
      "12개월 지출 레시피를 연간 기준으로 비교해 보는 연도별 지출 패턴 분석 대시보드입니다.",
    url: PAGE_URL,
    siteName: SITE_NAME,
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "연도별 지출 패턴 분석 대시보드",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "연도별 지출 패턴 분석 | 지출레시피",
    description:
      "한 해 12개월 지출 레시피를 비교하며 소비 패턴과 예산 사용 흐름을 분석하는 지출레시피 연간 대시보드입니다.",
    images: [OG_IMAGE],
  },

  robots: {
    index: true,
    follow: true,
  },

  category: "finance",
};

export default function YearlyDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

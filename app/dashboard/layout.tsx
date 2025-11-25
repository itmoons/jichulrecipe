// src/app/dashboard/layout.tsx
import type { Metadata } from "next";

const SITE_NAME = "지출레시피";
const SITE_URL = "https://jichulrecipe.vercel.app";
const PAGE_URL = `${SITE_URL}/dashboard`;
const OG_IMAGE = `${SITE_URL}/og-image.png`; // 있으면 사용

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "월별 지출 레시피 대시보드",
    template: `%s | ${SITE_NAME}`,
  },

  description:
    "이번 달 지출 데이터를 한눈에 확인하는 월별 지출 레시피 대시보드입니다. 세후 월급 대비 고정비·생활비·추가 지출 비율을 도넛 차트와 카드 형태로 분석해 보여줍니다.",

  keywords: [
    "지출레시피",
    "월별 지출 대시보드",
    "지출 분석",
    "월별 예산 분석",
    "소비 패턴 분석",
    "가계부 대시보드",
    "이번 달 지출",
    "예산 사용률",
    "카테고리별 지출",
  ],

  alternates: {
    canonical: PAGE_URL,
  },

  openGraph: {
    title: "월별 지출 레시피 대시보드 – 지출레시피",
    description:
      "세후 월급, 고정비, 생활비, 추가 지출을 종합해 이번 달 지출 레시피를 시각화한 대시보드입니다.",
    url: PAGE_URL,
    siteName: SITE_NAME,
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "월별 지출 레시피 대시보드",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "월별 지출 레시피 대시보드 | 지출레시피",
    description:
      "이번 달 지출 구조와 예산 사용률을 도넛 차트와 카드로 보여주는 지출레시피 대시보드입니다.",
    images: [OG_IMAGE],
  },

  robots: {
    index: true,
    follow: true,
  },

  category: "finance",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

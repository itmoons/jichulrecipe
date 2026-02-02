// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";

const SITE_NAME = "지출레시피";
const SITE_URL = "https://www.jiculrecipe.com";
const OG_IMAGE = `${SITE_URL}/og-image.png`; // optional, 있으면 더 좋음

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },

  description:
    "지출레시피는 월별 지출 내역을 입력하면 소비 패턴을 자동 분석하여 '레시피' 형식으로 정리해주는 스마트 지출 분석 서비스입니다. 소비 구조를 한눈에 이해하고, 더 나은 지출 전략을 설계할 수 있습니다.",

  keywords: [
    "지출레시피",
    "지출 분석",
    "소비 패턴 분석",
    "지출 레시피",
    "예산 관리",
    "소비 분석",
    "월별 지출 분석",
    "사회초년생 지출",
    "가계부 분석",
    "지출 구조 해석",
  ],

  alternates: {
    canonical: SITE_URL,
  },

  verification: {
    google: "RAjkr0_ylgNzStxYF2VE4HNNWU9hVEaBqX6jHMaijiY",
  },

  openGraph: {
    title: SITE_NAME,
    description:
      "월별 지출 데이터를 입력하면 소비 패턴을 자동 분석해서 '레시피'처럼 정리해주는 지출레시피.",
    url: SITE_URL,
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
    title: SITE_NAME,
    description:
      "지출 데이터를 기반으로 월별 소비 패턴을 분석하고 레시피 형태로 정리해주는 서비스",
    images: [OG_IMAGE],
  },

  authors: [{ name: SITE_NAME }],
  category: "finance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}

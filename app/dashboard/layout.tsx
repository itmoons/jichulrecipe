// src/app/dashboard/analysis/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import React from "react";

const SITE_NAME = "지출레시피";
const SITE_URL = "https://www.jiculrecipe.com";
const PAGE_URL = `${SITE_URL}/dashboard`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;

const GTM_ID = "GTM-KP9QNXS6"; // 페이지 단위 추적이 필요 없으면 제거하세요

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "지출 분석",
    template: `%s | ${SITE_NAME}`,
  },

  description:
    "월별·카테고리별 지출을 한눈에 분석하고, 고정비/생활비/추가지출 비중과 추이를 확인하는 지출레시피 대시보드 기능입니다.",

  keywords: [
    "지출 분석",
    "가계부 분석",
    "월별 지출",
    "카테고리별 지출",
    "고정비",
    "생활비",
    "예산 사용률",
    "소비 패턴",
    "지출레시피",
  ],

  alternates: {
    canonical: PAGE_URL,
  },

  openGraph: {
    title: "지출 분석 – 지출레시피",
    description:
      "월별·카테고리별 지출 흐름과 고정비 비중, 예산 사용률을 시각화해 소비 패턴을 점검하는 분석 대시보드입니다.",
    url: PAGE_URL,
    siteName: SITE_NAME,
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "지출 분석 대시보드",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "지출 분석 | 지출레시피",
    description:
      "월별·카테고리별 지출을 분석해 고정비/생활비 비중과 추이를 확인하는 지출레시피 대시보드입니다.",
    images: [OG_IMAGE],
  },

  // ✅ 로그인 후 페이지: 검색엔진 인덱싱 차단(권장)
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },

  category: "finance",
};

export default function AnalysisDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* ✅ (선택) 이 페이지에서만 GTM 로딩이 필요하면 유지
          보통은 루트(src/app/layout.tsx)에 한 번만 넣는 게 더 안정적입니다. */}
      <Script
        id="gtm-head"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `,
        }}
      />

      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>

      {children}
    </>
  );
}

// src/app/dashboard/calendar/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import React from "react";

const SITE_NAME = "지출레시피";
const SITE_URL = "https://www.jiculrecipe.com";
const PAGE_URL = `${SITE_URL}/dashboard/calendar`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;

const GTM_ID = "GTM-KP9QNXS6"; // 페이지 단위로 GTM이 꼭 필요 없으면 제거하세요

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "지출 달력",
    template: `%s | ${SITE_NAME}`,
  },

  description:
    "날짜별로 지출·수입·저축 기록을 달력에서 한눈에 확인하고, 항목별 메모와 카테고리 분류로 소비 흐름을 정리하는 지출레시피 대시보드 기능입니다.",

  keywords: [
    "지출 달력",
    "가계부 달력",
    "달력 가계부",
    "날짜별 지출",
    "지출 기록",
    "지출 메모",
    "카테고리별 지출",
    "지출레시피",
  ],

  alternates: {
    canonical: PAGE_URL,
  },

  openGraph: {
    title: "지출 달력 – 지출레시피",
    description:
      "날짜별 지출·수입·저축을 달력에서 확인하고, 항목별 메모/카테고리로 소비 내역을 정리하는 대시보드 기능입니다.",
    url: PAGE_URL,
    siteName: SITE_NAME,
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "지출 달력",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "지출 달력 | 지출레시피",
    description:
      "날짜별 지출·수입·저축을 달력에서 확인하고 기록을 정리하는 지출레시피 기능입니다.",
    images: [OG_IMAGE],
  },

  // ✅ 로그인 후 개인화 페이지이므로 인덱싱 차단 권장
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

export default function CalendarDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* ✅ (선택) 이 페이지에서만 GTM 로딩이 필요하면 유지
          보통은 루트(src/app/layout.tsx)에 한 번만 넣는 것이 운영상 더 안정적입니다. */}
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

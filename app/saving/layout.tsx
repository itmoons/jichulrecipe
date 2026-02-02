// src/app/dashboard/savings/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import React from "react";

const SITE_NAME = "지출레시피";
const SITE_URL = "https://www.jiculrecipe.com";
const PAGE_URL = `${SITE_URL}/dashboard/saving`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;

const GTM_ID = "GTM-KP9QNXS6"; // 페이지 단위 GTM이 필요 없으면 제거하세요

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "적금 관리",
    template: `%s | ${SITE_NAME}`,
  },

  description:
    "적금·저축 목표를 등록하고 월 납입액, 자동이체일, 목표금액 대비 진행률을 한눈에 관리하는 지출레시피 대시보드 기능입니다.",

  keywords: [
    "적금 관리",
    "저축 관리",
    "저축 목표",
    "목표금액",
    "월 납입",
    "자동이체",
    "자산 관리",
    "가계부",
    "지출레시피",
  ],

  alternates: {
    canonical: PAGE_URL,
  },

  openGraph: {
    title: "적금 관리 – 지출레시피",
    description:
      "적금/저축 목표를 설정하고 월 납입, 자동이체일, 목표 대비 진행률을 관리하는 대시보드 기능입니다.",
    url: PAGE_URL,
    siteName: SITE_NAME,
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "적금 관리",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "적금 관리 | 지출레시피",
    description:
      "저축 목표와 월 납입액, 자동이체일, 진행률을 관리하는 지출레시피 적금 관리 기능입니다.",
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

export default function SavingsDashboardLayout({
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

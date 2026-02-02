// src/app/dashboard/gyeongjosa/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import React from "react";

const SITE_NAME = "지출레시피";
const SITE_URL = "https://www.jiculrecipe.com";
const PAGE_URL = `${SITE_URL}/dashboard/gifts`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;

const GTM_ID = "GTM-KP9QNXS6"; // 필요 없으면 제거하세요

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  // ✅ 앱 내부 기능 페이지 제목 (브라우저 탭/공유용)
  title: {
    default: "축의금·부조금(경조사비) 관리",
    template: `%s | ${SITE_NAME}`,
  },

  description:
    "결혼식·장례식·돌잔치 등 경조사비(축의금/부조금)를 기록하고, 월·연간 누적과 추이를 확인하는 대시보드 기능입니다.",

  keywords: [
    "축의금",
    "부조금",
    "경조사비",
    "경조사비 기록",
    "경조사비 관리",
    "가계부",
    "지출 분석",
  ],

  alternates: {
    canonical: PAGE_URL,
  },

  openGraph: {
    title: "축의금·부조금(경조사비) 관리 – 지출레시피",
    description:
      "경조사비를 기록하고 누적/추이를 확인하는 지출레시피 대시보드 기능입니다.",
    url: PAGE_URL,
    siteName: SITE_NAME,
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "축의금·부조금(경조사비) 관리 대시보드",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "축의금·부조금(경조사비) 관리 | 지출레시피",
    description:
      "경조사비를 기록하고 월·연간 누적 및 추이를 확인하는 대시보드 기능입니다.",
    images: [OG_IMAGE],
  },

  // ✅ 핵심: 로그인 후 페이지는 인덱싱 막는 게 정석
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

export default function GyeongjosaDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* ✅ 이 페이지에서만 GTM 필요하면 유지 / 아니면 이 블록 삭제 */}
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

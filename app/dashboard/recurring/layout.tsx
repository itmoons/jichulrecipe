// src/app/dashboard/recurring/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import React from "react";

const SITE_NAME = "지출레시피";
const SITE_URL = "https://www.jiculrecipe.com";
const PAGE_URL = `${SITE_URL}/dashboard/recurring`; // ✅ 정기납부 경로로 맞추세요
const OG_IMAGE = `${SITE_URL}/og-image.png`;

const GTM_ID = "GTM-KP9QNXS6";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "정기납부 관리",
    template: `%s | ${SITE_NAME}`,
  },

  description:
    "정기 적금·구독·월 고정비 등 정기납부 항목을 한 번에 관리하는 지출레시피 정기납부 페이지입니다. 자동이체/납부일/금액을 정리해 월별 고정비를 안정적으로 관리할 수 있습니다.",

  keywords: [
    "지출레시피",
    "정기납부",
    "정기결제",
    "고정비 관리",
    "구독 관리",
    "자동이체",
    "적금 관리",
    "월 고정비",
  ],

  alternates: {
    canonical: PAGE_URL,
  },

  openGraph: {
    title: "정기납부 관리 – 지출레시피",
    description:
      "정기 적금·구독·월 고정비를 한 번에 관리하고 월별 고정비를 분석하는 정기납부 페이지입니다.",
    url: PAGE_URL,
    siteName: SITE_NAME,
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "정기납부 관리",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "정기납부 관리 | 지출레시피",
    description:
      "정기 적금·구독·월 고정비를 정리하고 자동이체/납부일을 관리하는 정기납부 페이지입니다.",
    images: [OG_IMAGE],
  },

  robots: {
    index: true,
    follow: true,
  },

  category: "finance",
};

export default function RecurringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* ✅ GTM (Head 역할) - 하위 layout에서는 html/head를 직접 만들지 않습니다 */}
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

      {/* ✅ noscript: 원칙은 body 바로 아래지만, 하위 layout에선 불가 → 최상단 배치 */}
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

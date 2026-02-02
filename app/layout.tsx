// src/app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";

const SITE_NAME = "지출레시피";
const SITE_URL = "https://www.jiculrecipe.com";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

const GTM_ID = "GTM-KP9QNXS6";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  // ✅ 검색 의도형 타이틀: "가계부" + "무료" + 핵심 베네핏(분석)
  title: {
    default: "지출레시피 | 무료 가계부 · 지출분석 · 소비습관 진단",
    template: `%s | ${SITE_NAME}`,
  },

  // ✅ SERP(검색 결과)에서 클릭을 부르는 설명: 기능 나열보다 "문제 해결" 중심
  description:
    "무료 가계부 지출레시피로 지출/수입을 기록하고, 카테고리·월별 통계와 소비습관 분석까지 한 번에. 자동 분류와 대시보드로 예산 관리가 쉬워집니다.",

  // ✅ 핵심 키워드: 브랜드 + 헤드키워드(가계부) + 의도 키워드(지출분석/예산관리)
  keywords: [
    "가계부",
    "무료 가계부",
    "가계부 앱",
    "가계부 사이트",
    "지출 분석",
    "소비 패턴 분석",
    "예산 관리",
    "월별 지출",
    "카테고리별 지출",
    "고정비 관리",
    "정기결제 관리",
    "지출레시피",
  ],

  alternates: {
    canonical: SITE_URL,
  },

  // ✅ GSC HTML태그 인증을 쓰는 경우(이미 사용 중)
  verification: {
    google: "RAjkr0_ylgNzStxYF2VE4HNNWU9hVEaBqX6jHMaijiY",
  },

  // ✅ 크롤링/표시 확장(필수급): index 허용 + 스니펫/프리뷰 확대
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  // ✅ 브랜드 노출 보강
  applicationName: SITE_NAME,
  category: "finance",

  openGraph: {
    title: "지출레시피 | 무료 가계부 · 지출분석 · 소비습관 진단",
    description:
      "지출/수입 기록만 하면 자동으로 소비 패턴을 분석해 ‘지출 레시피’로 정리해주는 무료 가계부 서비스.",
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    locale: "ko_KR",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "지출레시피 - 무료 가계부 · 지출분석",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "지출레시피 | 무료 가계부 · 지출분석 · 소비습관 진단",
    description:
      "무료 가계부로 지출/수입을 기록하고 월별·카테고리별 통계와 소비습관 분석까지 한 번에.",
    images: [OG_IMAGE],
  },

  // ✅ 작성자 표기는 SEO 영향은 작지만 신뢰 신호로 무난
  authors: [{ name: SITE_NAME }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ✅ 구조화 데이터(JSON-LD): 검색엔진이 "이 사이트가 무엇인지" 더 잘 이해하게 만듦
  const jsonLdWebSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "ko-KR",
    description:
      "무료 가계부 지출레시피: 지출/수입 기록, 월별·카테고리 통계, 소비습관 분석, 예산 관리",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const jsonLdOrganization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo/logo.png`,
  };

  return (
    <html lang="ko">
      <head>
        {/* ✅ JSON-LD (구조화 데이터) */}
        <Script
          id="jsonld-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
        />
        <Script
          id="jsonld-org"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
        />

        {/* ✅ GTM (Head) */}
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
      </head>

      <body className="min-h-screen bg-slate-50 text-slate-900">
        {/* ✅ GTM (noscript) - body 바로 아래 */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        <SiteHeader />
        {children}
      </body>
    </html>
  );
}

// src/app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { GoogleAnalytics } from "@next/third-parties/google";
import { ToasterHost } from "@/components/ui/toaster-host";
import SiteFooter from "@/components/layout/SiteFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SiteSidebar } from "@/components/layout/SiteSidebar";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "100 900",
  display: "swap",
});

const SITE_NAME = "지출레시피";
const SITE_URL = "https://www.jiculrecipe.com";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

const GTM_ID = "GTM-KP9QNXS6";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "지출레시피 | 무료 가계부 · 지출분석 · 소비습관 진단",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "무료 가계부 지출레시피로 지출/수입을 기록하고, 카테고리·월별 통계와 소비습관 분석까지 한 번에. 자동 분류와 대시보드로 예산 관리가 쉬워집니다.",
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
  verification: {
    google: "RAjkr0_ylgNzStxYF2VE4HNNWU9hVEaBqX6jHMaijiY",
    other: process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
      ? { "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION }
      : undefined,
  },
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
  authors: [{ name: SITE_NAME }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLdWebSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "ko-KR",
    description:
      "무료 가계부 지출레시피: 지출/수입 기록, 월별·카테고리 통계, 소비습관 분석, 예산 관리",
  };

  const jsonLdOrganization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo/logo.png`,
  };

  const jsonLdApplication = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    inLanguage: "ko-KR",
    isAccessibleForFree: true,
    description: "수입·지출 기록, 월별 소비 분석, 정기 지출 및 저축 목표 관리를 제공하는 무료 웹 가계부입니다.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <html lang="ko" className={pretendard.variable}>
      <GoogleAnalytics gaId="G-762XP39BW8" />
      <head>
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
        <Script
          id="jsonld-application"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdApplication) }}
        />

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
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-762XP39BW8"></script>
      </head>

      <body className="min-h-screen bg-[#f5f8f6] pb-20 text-slate-900 font-sans lg:pb-0">
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        <SiteSidebar />
        <div className="xl:pl-60">
          {/* 모바일·태블릿에서만 상단 메뉴를 제공하고, 데스크톱은 왼쪽 사이드바로 통합한다. */}
          <div className="xl:hidden"><SiteHeader /></div>
          {children}
          <ToasterHost />
          <SiteFooter />
        </div>
        <MobileBottomNav />
      </body>
    </html>
  );
}

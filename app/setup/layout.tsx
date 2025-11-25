// src/app/setup/layout.tsx
import type { Metadata } from "next";

const SITE_NAME = "지출레시피";
const SITE_URL = "https://jichulrecipe.vercel.app";
const PAGE_URL = `${SITE_URL}/setup`;
const OG_IMAGE = `${SITE_URL}/og-image.png`; // 있으면 사용, 없으면 나중에 추가해도 됨

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "기본 레시피 만들기",
    template: `%s | ${SITE_NAME}`,
  },

  description:
    "세후 월급, 월세·대출, 적금·카드·교통·식비 등 생활비를 월별로 입력하면 12개월 지출 레시피를 설계해 주는 준비 단계입니다. 연도별·월별로 예산을 설정하고 나만의 지출 레시피북을 만드는 지출레시피 세팅 페이지입니다.",

  keywords: [
    "지출레시피",
    "기본 레시피 만들기",
    "예산 레시피",
    "월별 예산 설정",
    "연도별 지출 계획",
    "지출 레시피",
    "지출 분석",
    "예산 관리",
    "사회초년생 예산",
    "12개월 지출 계획",
    "가계부 예산 설정",
  ],

  alternates: {
    canonical: PAGE_URL,
  },

  openGraph: {
    title: "기본 레시피 만들기 – 지출레시피",
    description:
      "세후 월급과 고정비, 생활비를 월별로 입력해 12개월 지출 레시피를 설계하는 페이지입니다. 연도별·월별 예산 구조를 한눈에 정리하고 비교해 보세요.",
    url: PAGE_URL,
    siteName: SITE_NAME,
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "지출레시피 기본 레시피 만들기",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "기본 레시피 만들기 | 지출레시피",
    description:
      "월별 지출 예산을 입력하고 나만의 지출 레시피를 설계하는 지출레시피 세팅 페이지입니다.",
    images: [OG_IMAGE],
  },

  robots: {
    index: true, // 이 페이지 자체도 유입용으로 인덱싱 허용
    follow: true,
  },

  category: "finance",
};

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 루트 layout.tsx에서 이미 <html>과 <body>를 감싸고 있으므로
  // 여기서는 단순 래퍼만 두면 된다.
  return <>{children}</>;
}

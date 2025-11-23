// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: {
    default: "지출레시피",
    template: "%s | 지출레시피",
  },
  description:
    "사회초년생을 위한 지출 레시피. 세후 월급만 입력하면 맞춤 예산을 레시피처럼 알려드립니다.",
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

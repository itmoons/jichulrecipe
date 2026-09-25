import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "오늘의 메모 | 지출레시피",
  robots: { index: false, follow: false },
};

export default function MemosLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";
import CalculatorHubClient from "./CalculatorHubClient";
import { SITE_URL } from "@/lib/calculators/seo";

const title = "무료 돈 계산 도구 30개 이상 | 생활비·대출·예산 계산기 - 지출레시피";
const description = "생활비, 구독료, 예산, 대출 이자, 실수령액 등 일상에서 필요한 돈 계산을 무료로 확인하세요. 목적에 맞는 계산기를 고르고 입력값과 가정을 함께 살펴볼 수 있습니다.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: `${SITE_URL}/calculators` },
  openGraph: { title, description, url: `${SITE_URL}/calculators`, siteName: "지출레시피", locale: "ko_KR", type: "website" },
};

export default function CalculatorsPage() {
  return <CalculatorHubClient />;
}

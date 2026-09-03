import type { Metadata } from "next";
import { CalculatorSeoFrame } from "@/components/calculators/CalculatorSeoFrame";
import { getCalculatorMetadata } from "@/lib/calculators/seo";

export function generateMetadata(): Metadata {
  return getCalculatorMetadata("refinance-compare");
}

export default function CalculatorLayout({ children }: { children: React.ReactNode }) {
  return <CalculatorSeoFrame slug="refinance-compare">{children}</CalculatorSeoFrame>;
}
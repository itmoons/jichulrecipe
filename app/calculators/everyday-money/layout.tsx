import type { Metadata } from "next";
import { CalculatorSeoFrame } from "@/components/calculators/CalculatorSeoFrame";
import { getCalculatorMetadata } from "@/lib/calculators/seo";

export function generateMetadata(): Metadata {
  return getCalculatorMetadata("everyday-money");
}

export default function CalculatorLayout({ children }: { children: React.ReactNode }) {
  return <CalculatorSeoFrame slug="everyday-money">{children}</CalculatorSeoFrame>;
}
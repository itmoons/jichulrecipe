import type { Metadata } from "next";
import { CalculatorSeoFrame } from "@/components/calculators/CalculatorSeoFrame";
import { getCalculatorMetadata } from "@/lib/calculators/seo";

export function generateMetadata(): Metadata {
  return getCalculatorMetadata("prepayment-fee-breakeven");
}

export default function CalculatorLayout({ children }: { children: React.ReactNode }) {
  return <CalculatorSeoFrame slug="prepayment-fee-breakeven">{children}</CalculatorSeoFrame>;
}
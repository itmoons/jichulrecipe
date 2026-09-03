import type { Metadata } from "next";
import { CalculatorSeoFrame } from "@/components/calculators/CalculatorSeoFrame";
import { getCalculatorMetadata } from "@/lib/calculators/seo";

export function generateMetadata(): Metadata {
  return getCalculatorMetadata("cutback-goal");
}

export default function CalculatorLayout({ children }: { children: React.ReactNode }) {
  return <CalculatorSeoFrame slug="cutback-goal">{children}</CalculatorSeoFrame>;
}
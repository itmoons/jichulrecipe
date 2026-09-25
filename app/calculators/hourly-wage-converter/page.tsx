import { CalculatorSeoFrame } from "@/components/calculators/CalculatorSeoFrame";
import { QuickMathTools } from "@/components/calculators/QuickMathTools";
import { getCalculatorMetadata } from "@/lib/calculators/seo";

export const metadata = getCalculatorMetadata("hourly-wage-converter");

export default function Page() {
  return <CalculatorSeoFrame slug="hourly-wage-converter"><QuickMathTools kind="hourly-wage-converter" /></CalculatorSeoFrame>;
}

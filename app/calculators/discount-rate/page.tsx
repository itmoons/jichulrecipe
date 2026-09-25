import { CalculatorSeoFrame } from "@/components/calculators/CalculatorSeoFrame";
import { QuickMathTools } from "@/components/calculators/QuickMathTools";
import { getCalculatorMetadata } from "@/lib/calculators/seo";

export const metadata = getCalculatorMetadata("discount-rate");

export default function Page() {
  return <CalculatorSeoFrame slug="discount-rate"><QuickMathTools kind="discount-rate" /></CalculatorSeoFrame>;
}

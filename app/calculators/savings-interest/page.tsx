import { CalculatorSeoFrame } from "@/components/calculators/CalculatorSeoFrame";
import { QuickMathTools } from "@/components/calculators/QuickMathTools";
import { getCalculatorMetadata } from "@/lib/calculators/seo";

export const metadata = getCalculatorMetadata("savings-interest");

export default function Page() {
  return <CalculatorSeoFrame slug="savings-interest"><QuickMathTools kind="savings-interest" /></CalculatorSeoFrame>;
}

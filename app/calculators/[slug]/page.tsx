import { notFound } from "next/navigation";
import { calculatorAliases } from "@/lib/calculators/routes";
import { getCalculatorMetadata } from "@/lib/calculators/seo";
import { CalculatorSeoFrame } from "@/components/calculators/CalculatorSeoFrame";
import Salary from "../net-pay-insurance/page";
import Loan from "../loan-payment/page";
import Dsr from "../dsr-lite/page";
import Fixed from "../fixed-cost-ratio/page";
import Subscription from "../subscription-total/page";
import Emergency from "../emergency-fund-timeline/page";
import Food from "../food-budget-cap/page";
import Budget from "../monthly-budget-split/page";

const pages = { salary: Salary, "loan-interest": Loan, dsr: Dsr, "fixed-cost": Fixed, subscription: Subscription, "emergency-fund": Emergency, "food-budget": Food, "monthly-budget": Budget };
export const dynamicParams = false;
export function generateStaticParams() { return Object.keys(calculatorAliases).map(slug => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!calculatorAliases[slug]) notFound();
  return getCalculatorMetadata(calculatorAliases[slug]);
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const Calculator = pages[slug as keyof typeof pages];
  if (!Calculator) notFound();
  return <CalculatorSeoFrame slug={calculatorAliases[slug]}><Calculator /></CalculatorSeoFrame>;
}

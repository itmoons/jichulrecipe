export const calculatorAliases: Record<string, string> = {
  salary: "net-pay-insurance",
  "loan-interest": "loan-payment",
  dsr: "dsr-lite",
  "fixed-cost": "fixed-cost-ratio",
  subscription: "subscription-total",
  "emergency-fund": "emergency-fund-timeline",
  "food-budget": "food-budget-cap",
  "monthly-budget": "monthly-budget-split",
};

export function canonicalCalculatorSlug(slug: string) {
  return Object.keys(calculatorAliases).find(key => calculatorAliases[key] === slug) ?? slug;
}

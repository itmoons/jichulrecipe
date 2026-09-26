type Item = { amount: number; category?: string; subcategory?: string; label?: string; source?: string; rule_id?: number };
type Day = { date: string; incomeTotal: number; savingTotal: number; expenseItems: Item[] };
export function diagnoseSpending(days: Day[], today: string) {
  const recorded = days.filter(day => day.date <= today);
  const income = recorded.reduce((sum, day) => sum + Math.max(0, day.incomeTotal), 0);
  const savings = recorded.reduce((sum, day) => sum + Math.max(0, day.savingTotal), 0);
  const items = recorded.flatMap(day => day.expenseItems).filter(item => item.amount > 0);
  const text = (item: Item) => `${item.category ?? ""} ${item.subcategory ?? ""} ${item.label ?? ""}`;
  const sum = (predicate: (item: Item) => boolean) => items.filter(predicate).reduce((total, item) => total + item.amount, 0);
  const food = sum(item => /식비|식사|장보기|외식|배달|카페/.test(text(item)));
  const subscriptions = sum(item => /구독|OTT|넷플릭스|유튜브|멤버십/i.test(text(item)));
  const fixed = sum(item => item.source === "recurring" || typeof item.rule_id === "number" || /월세|주거|관리비|통신|보험|구독|대출/.test(text(item)));
  const ratio = (amount: number) => income > 0 ? amount / income * 100 : null;
  return [
    { label: "식비 / 소득", value: ratio(food), amount: food, message: income <= 0 ? "소득을 기록하면 비중을 확인할 수 있어요" : food / income > 0.3 ? "식비 지출을 점검해보세요" : "식비 비중을 확인하고 예산을 조정하세요", href: "/calculators/food-budget" },
    { label: "고정비 / 소득", value: ratio(fixed), amount: fixed, message: income <= 0 ? "소득을 기록하면 비중을 확인할 수 있어요" : fixed / income > 0.5 ? "고정비 비중이 높아요" : "고정비 항목을 정기적으로 확인하세요", href: "/calculators/fixed-cost" },
    { label: "구독료", value: null, amount: subscriptions, message: subscriptions > 0 ? "최근 사용하지 않은 구독이 있는지 확인하세요" : "구독으로 분류된 기록이 없어요", href: "/calculators/subscription" },
    { label: "저축률", value: ratio(savings), amount: savings, message: income <= 0 ? "소득을 기록하면 비중을 확인할 수 있어요" : savings / income < 0.1 ? "저축 여력을 점검해보세요" : "지금의 저축 계획을 꾸준히 점검하세요", href: "/calculators/monthly-budget" },
  ];
}

export function savingsInterest(monthlyDeposit: number, annualRate: number, months: number) {
  const deposit = Math.max(0, monthlyDeposit);
  const rate = Math.max(0, annualRate) / 100;
  const count = Math.max(0, Math.floor(months));
  const principal = deposit * count;
  // 매월 초 납입, 단리, 세전 기준의 추정치.
  const interest = deposit * rate / 12 * count * (count + 1) / 2;
  return { principal, interest, total: principal + interest };
}

export function discountRate(originalPrice: number, salePrice: number) {
  const original = Math.max(0, originalPrice);
  const sale = Math.max(0, salePrice);
  return {
    saved: original - sale,
    rate: original > 0 ? (original - sale) / original * 100 : 0,
  };
}

export function hourlyWageConverter(hourlyWage: number, hoursPerDay: number, daysPerWeek: number) {
  const weekly = Math.max(0, hourlyWage) * Math.max(0, hoursPerDay) * Math.max(0, daysPerWeek);
  const annual = weekly * 52;
  return { weekly, monthly: annual / 12, annual };
}

export type InsightDay = {
  date: string;
  expenseTotal: number;
  expenseItems: { id: string; label: string; category?: string; amount: number; source?: string; rule_id?: number }[];
};
type Range = { firstKey: string; lastKey: string };
const dayMs = 86400000;
const timestamp = (key: string) => Date.parse(`${key}T00:00:00Z`);
const duration = (range: Range) => Math.round((timestamp(range.lastKey) - timestamp(range.firstKey)) / dayMs) + 1;
const endAfter = (first: string, days: number) => new Date(timestamp(first) + (days - 1) * dayMs).toISOString().slice(0, 10);

export function buildInsights(current: InsightDay[], previous: InsightDay[], range: Range, previousRange: Range, today: string) {
  const elapsed = Math.max(0, Math.min(duration(range), Math.round((timestamp(today) - timestamp(range.firstKey)) / dayMs) + 1));
  const comparableDays = Math.min(elapsed, duration(previousRange));
  const currentEnd = comparableDays ? endAfter(range.firstKey, comparableDays) : null;
  const previousEnd = comparableDays ? endAfter(previousRange.firstKey, comparableDays) : null;
  const currentDays = current.filter(d => d.date >= range.firstKey && d.date <= range.lastKey && d.date <= today);
  const left = currentDays.filter(d => currentEnd && d.date <= currentEnd);
  const right = previous.filter(d => previousEnd && d.date >= previousRange.firstKey && d.date <= previousEnd);
  const sum = (days: InsightDay[]) => days.reduce((s, d) => s + d.expenseTotal, 0);
  const total = sum(currentDays);
  const currentTotal = sum(left);
  const previousTotal = sum(right);
  const canCompare = left.length > 0 && right.length > 0;
  const categories = (days: InsightDay[]) => {
    const totals = new Map<string, number>();
    for (const day of days) for (const item of day.expenseItems) {
      const category = item.category?.trim() || '미분류';
      totals.set(category, (totals.get(category) ?? 0) + item.amount);
    }
    return totals;
  };
  const a = categories(left), b = categories(right);
  const changes = [...new Set([...a.keys(), ...b.keys()])].map(category => ({
    category, current: a.get(category) ?? 0, previous: b.get(category) ?? 0,
    delta: (a.get(category) ?? 0) - (b.get(category) ?? 0),
  })).filter(c => c.delta !== 0).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  const items = currentDays.flatMap(d => d.expenseItems.map(item => ({ ...item, date: d.date })));
  const recurring = items.filter(i => i.source === 'recurring' || typeof i.rule_id === 'number' || /^(?:rec-|rr:)\d+/.test(i.id)).reduce((s, i) => s + i.amount, 0);
  const largest = items.filter(i => i.amount > 0).sort((x, y) => y.amount - x.amount).slice(0, 3);
  return {
    total, currentTotal, previousTotal, canCompare, changes, recurring, largest,
    delta: currentTotal - previousTotal,
    percent: previousTotal > 0 ? (currentTotal - previousTotal) / previousTotal * 100 : null,
    comparableDays, currentEnd, previousEnd, currentRecords: left.length, previousRecords: right.length,
    largestShare: total > 0 ? largest.reduce((s, i) => s + i.amount, 0) / total * 100 : 0,
  };
}

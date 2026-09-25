const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../lib/dashboard-insights.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { buildInsights } = context.exports;
const range = { firstKey: '2026-03-01', lastKey: '2026-03-31' };
const prev = { firstKey: '2026-02-01', lastKey: '2026-02-28' };
const day = (date, amount, category = '식비', extra = {}) => ({ date, expenseTotal: amount, expenseItems: [{ id: date, label: '', amount, category, ...extra }] });

test('진행 중인 기간은 같은 경과 일수만 비교하고 미래 기록을 제외한다', () => {
  const result = buildInsights([day('2026-03-01', 150), day('2026-03-20', 999)], [day('2026-02-01', 100), day('2026-02-20', 999)], range, prev, '2026-03-10');
  assert.equal(result.currentTotal, 150);
  assert.equal(result.previousTotal, 100);
  assert.equal(result.percent, 50);
  assert.equal(result.total, 150);
  assert.equal(result.comparableDays, 10);
});
test('31일과 28일은 28일까지 비교하되 선택 기간 전체 합계는 유지한다', () => {
  const result = buildInsights([day('2026-03-01', 150), day('2026-03-31', 50)], [day('2026-02-01', 100)], range, prev, '2026-04-01');
  assert.equal(result.currentEnd, '2026-03-28');
  assert.equal(result.currentTotal, 150);
  assert.equal(result.total, 200);
});
test('월급일 기준에도 경과 일수를 적용한다', () => {
  const result = buildInsights([], [], { firstKey: '2026-08-25', lastKey: '2026-09-24' }, { firstKey: '2026-07-25', lastKey: '2026-08-24' }, '2026-09-03');
  assert.equal(result.comparableDays, 10);
  assert.equal(result.previousEnd, '2026-08-03');
});
test('직전 기록 없음과 기록된 0원은 구분한다', () => {
  assert.equal(buildInsights([day('2026-03-01', 10)], [], range, prev, '2026-03-05').canCompare, false);
  const zero = buildInsights([day('2026-03-01', 10)], [day('2026-02-01', 0)], range, prev, '2026-03-05');
  assert.equal(zero.canCompare, true);
  assert.equal(zero.percent, null);
});
test('새 카테고리와 사라진 카테고리, 정기 메타와 상위 지출을 집계한다', () => {
  const result = buildInsights([day('2026-03-01', 200, '주거', { source: 'recurring' }), day('2026-03-02', 100, '식비')], [day('2026-02-01', 50, '교통')], range, prev, '2026-03-05');
  assert.equal(result.changes[0].category, '주거');
  assert.equal(result.changes.find(c => c.category === '교통').delta, -50);
  assert.equal(result.recurring, 200);
  assert.equal(result.largest[0].amount, 200);
  assert.equal(result.largestShare, 100);
});
test('미래 기간에는 비교할 경과 일수가 없다', () => {
  const result = buildInsights([], [], range, prev, '2026-02-20');
  assert.equal(result.comparableDays, 0);
  assert.equal(result.currentEnd, null);
  assert.equal(result.canCompare, false);
});

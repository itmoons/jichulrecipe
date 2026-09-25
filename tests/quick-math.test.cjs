const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../lib/calculators/quick-math.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { savingsInterest, discountRate, hourlyWageConverter } = context.exports;

test('적금 단리 계산은 월초 납입 횟수를 반영한다', () => {
  const result = savingsInterest(300000, 3.5, 12);
  assert.equal(result.principal, 3600000);
  assert.ok(Math.abs(result.interest - 68250) < 0.001);
  assert.equal(result.total, 3668250);
  assert.equal(savingsInterest(300000, 0, 12).interest, 0);
});

test('할인율은 정가를 기준으로 계산하고 가격 상승은 음수로 표시한다', () => {
  assert.deepEqual({ ...discountRate(100000, 75000) }, { saved: 25000, rate: 25 });
  assert.equal(discountRate(100000, 110000).rate, -10);
  assert.equal(discountRate(0, 1000).rate, 0);
});

test('시급 환산은 주 52주를 12개월로 나눈 세전 예상액이다', () => {
  assert.deepEqual({ ...hourlyWageConverter(10000, 8, 5) }, { weekly: 400000, monthly: 5200000 / 3, annual: 20800000 });
});

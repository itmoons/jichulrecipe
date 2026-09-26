const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
function load(file) {
  const full = path.resolve(root, file);
  const source = fs.readFileSync(full, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const context = { exports: {}, require: ref => load(path.relative(root, path.resolve(path.dirname(full), ref + ".ts"))) };
  vm.runInNewContext(compiled, context);
  return context.exports;
}
const { calculatorSlugs } = load("lib/calculators/seo.ts");
const { calculatorAliases } = load("lib/calculators/routes.ts");
const { getCalculatorContent } = load("lib/calculators/content.ts");

test("모든 계산기의 설명은 300~800자, 예시와 FAQ 3개를 포함한다", () => {
  for (const slug of calculatorSlugs) {
    const content = getCalculatorContent(slug);
    assert.ok(content.description.length >= 300 && content.description.length <= 800, slug + ": " + content.description.length);
    assert.ok(content.example, slug);
    assert.equal(content.faqs.length, 3);
  }
});

test("8개 신규 URL의 정적 HTML은 H1 1개와 SEO 본문·canonical을 포함한다", () => {
  const titles = new Set();
  for (const slug of Object.keys(calculatorAliases)) {
    const html = fs.readFileSync(path.join(root, ".next/server/app/calculators", slug + ".html"), "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, slug);
    assert.ok(html.includes('href="https://www.jiculrecipe.com/calculators/' + slug + '"'), slug);
    assert.ok(html.includes("계산 예시") && html.includes("자주 묻는 질문"), slug);
    assert.ok(!html.includes('content="noindex'), slug);
    titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
  }
  assert.equal(titles.size, 8);
});

test("소득 없는 기록은 비율을 단정하지 않고 미래 지출은 제외한다", () => {
  const { diagnoseSpending } = load("lib/spending-diagnosis.ts");
  const rows = diagnoseSpending([{ date: "2026-09-01", incomeTotal: 0, savingTotal: 0, expenseItems: [{ amount: 100, category: "구독" }] }, { date: "2026-10-01", incomeTotal: 999, savingTotal: 0, expenseItems: [] }], "2026-09-26");
  assert.equal(rows[0].value, null);
  assert.equal(rows[2].amount, 100);
});

test("고정비 50% 초과와 저축률 10% 미만은 점검 안내를 표시한다", () => {
  const { diagnoseSpending } = load("lib/spending-diagnosis.ts");
  const rows = diagnoseSpending([{ date: "2026-09-01", incomeTotal: 1000000, savingTotal: 50000, expenseItems: [{ amount: 600000, category: "주거" }] }], "2026-09-26");
  assert.equal(rows[1].message, "고정비 비중이 높아요");
  assert.equal(rows[3].message, "저축 여력을 점검해보세요");
});

test("정적 사이트맵에는 대표 주소가 있고 계산기 robots 차단이 없다", () => {
  const sitemap = fs.readFileSync(path.join(root, ".next/server/app/sitemap.xml.body"), "utf8");
  const robots = fs.readFileSync(path.join(root, ".next/server/app/robots.txt.body"), "utf8");
  for (const [slug, legacy] of Object.entries(calculatorAliases)) {
    assert.ok(sitemap.includes(`/calculators/${slug}</loc>`));
    assert.ok(!sitemap.includes(`/calculators/${legacy}</loc>`));
  }
  assert.ok(!/Disallow: \/calculators/.test(robots));
});

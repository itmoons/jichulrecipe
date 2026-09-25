const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');

// A minimal hook scheduler exercises the real hook without a browser or backend writes.
function harness() {
  let cursor = 0;
  const slots = [], effects = [], timers = new Map();
  let id = 0;
  const changed = (a, b) => !a || a.some((v, i) => v !== b[i]);
  const react = {
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(value) { const i = cursor++; if (!slots[i]) slots[i] = { value }; return [slots[i].value, v => { slots[i].value = v; }]; },
    useCallback(fn, deps) { const i = cursor++; if (!slots[i] || changed(slots[i].deps, deps)) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || changed(slots[i].deps, deps)) { const prior = slots[i]; slots[i] = { deps }; effects.push(() => { prior?.cleanup?.(); slots[i].cleanup = fn(); }); } },
  };
  const target = { addEventListener() {}, removeEventListener() {} };
  const context = {
    exports: {}, require: () => react,
    window: { ...target, setTimeout(fn, delay) { timers.set(++id, { fn, delay }); return id; }, clearTimeout(i) { timers.delete(i); } },
    document: target,
  };
  const source = fs.readFileSync(require.resolve('../app/hooks/useDraftAutosave.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
  return {
    render(value, enabled, save) { cursor = 0; const result = context.exports.useDraftAutosave(value, enabled, save); while (effects.length) effects.shift()(); return result; },
    tick() { const tasks = [...timers.values()]; timers.clear(); tasks.sort((a,b) => a.delay-b.delay).forEach(t => t.fn()); },
    unmount() { slots.forEach(s => s?.cleanup?.()); },
  };
}
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

test('초기 로딩과 조회 결과는 자동 저장하지 않는다', async () => {
  const h = harness(), writes = [], save = async v => { writes.push(v); };
  h.render('empty', false, save); h.tick(); await settle();
  h.render('server', true, save); h.tick(); await settle();
  assert.equal(writes.length, 0);
});
test('빠른 입력은 마지막 값만 저장한다', async () => {
  const h = harness(), writes = [], save = async v => { writes.push(v); };
  h.render('start', true, save);
  h.render('first', true, save);
  h.render('last', true, save);
  h.tick(); await settle();
  assert.deepEqual(writes, ['last']);
});
test('저장 중 입력과 수동 저장은 직렬화한다', async () => {
  const h = harness(), writes = [];
  let release;
  const save = async v => { writes.push(v); if (v === 'first') await new Promise(resolve => { release = resolve; }); };
  h.render('start', true, save);
  const a = h.render('first', true, save);
  const first = a.flush();
  const b = h.render('last', true, save);
  const second = b.flush();
  assert.equal(first, second);
  assert.deepEqual(writes, ['first']);
  release();
  assert.equal(await first, true);
  assert.deepEqual(writes, ['first', 'last']);
});
test('실패한 내용을 유지하고 재시도한다', async () => {
  const h = harness(); let attempts = 0;
  const save = async () => { if (++attempts === 1) throw new Error('offline'); };
  h.render('start', true, save);
  const edit = h.render('draft', true, save);
  assert.equal(await edit.flush(), false);
  assert.equal(await edit.flush(), true);
  assert.equal(attempts, 2);
});
test('한글 조합 중에는 저장하지 않고 완료 후 저장한다', async () => {
  const h = harness(), writes = [], save = async v => { writes.push(v); };
  const initial = h.render('start', true, save);
  initial.onCompositionStart();
  const edit = h.render('한', true, save);
  h.tick(); await settle();
  assert.equal(await edit.flush(), false);
  assert.equal(writes.length, 0);
  edit.onCompositionEnd(); h.render('한글', true, save); h.tick(); await settle();
  assert.deepEqual(writes, ['한글']);
});
test('페이지를 벗어나면 예약된 저장을 취소한다', async () => {
  const h = harness(), writes = [], save = async v => { writes.push(v); };
  h.render('start', true, save); h.render('draft', true, save);
  h.unmount(); h.tick(); await settle();
  assert.equal(writes.length, 0);
});

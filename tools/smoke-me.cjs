// 自分の健康メモの作成ツールの動作確認（Playwright）
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + path.resolve('docs/me/index.html')); await p.waitForTimeout(300);
  const r = {};
  r.blankStatus = await p.textContent('#status');
  await p.fill('#p-year', '1958'); await p.check('#st-allergies-none'); await p.check('#st-medications-some');
  await p.fill('#medications-0-name', 'アムロジピン錠5mg'); await p.click('#sec-medications details.src summary'); await p.selectOption('#medications-0-sb', 'ai');
  r.unchecked = await p.textContent('#status');
  await p.check('#medications-0-sc'); r.checked = await p.textContent('#status');
  const out = await p.evaluate(() => JSON.parse(document.getElementById('json').textContent));
  r.out = { allergies: out.allergies, med: out.medications, hasConditions: 'conditions' in out, person: out.person };
  await p.fill('#v-onset', '昨夜から'); await p.fill('#v-where', '頭の右側'); await p.fill('#v-quality', 'ずきずき'); r.sheet = (await p.textContent('#sheet')).slice(0, 120);
  // 例の読み込みと往復
  const ex = fs.readFileSync('examples/personal/v0.1/my-health.json', 'utf8');
  await p.click('#tab-load'); await p.fill('#pasteBox', ex); await p.click('#loadPaste');
  r.roundtrip = await p.evaluate(j => JSON.stringify(OpenIntakePersonal.build()) === JSON.stringify(j), JSON.parse(ex));
  await p.click('#tab-sheet'); await p.click('#showBtn'); await p.waitForTimeout(150);
  await p.screenshot({ path: '/tmp/oi-me-show.png' }); await p.click('#exitShow');
  await p.emulateMedia({ media: 'print' }); await p.screenshot({ path: '/tmp/oi-me-print.png', fullPage: true }); await p.emulateMedia({ media: 'screen' });
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(150);
  r.overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await p.setViewportSize({ width: 1280, height: 900 }); await p.screenshot({ path: '/tmp/oi-me-desk.png' });
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();

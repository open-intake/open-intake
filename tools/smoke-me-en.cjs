// 自分の健康メモの作成ツール（英語版）の動作確認（Playwright）。画面に日本語が残っていないかも見る
const { chromium } = require('playwright'); const path = require('path');
const JA = /[぀-ヿ㐀-鿿]/;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + path.resolve('docs/en/me/index.html')); await p.waitForTimeout(300);
  const r = { ja: [] };
  const scan = async where => { const t = await p.evaluate(() => document.body.innerText.replace("日本語", "") + [...document.querySelectorAll('[placeholder],[aria-label],option')].map(e => (e.placeholder || '') + (e.getAttribute('aria-label') || '') + e.textContent).join(' ')); const m = t.match(new RegExp(JA.source + '.{0,20}', 'g')); if (m) r.ja.push(where + ': ' + m.slice(0, 5).join(' | ')); };
  r.blankStatus = await p.textContent('#status'); await scan('blank');
  await p.getByText('See an example').click(); await p.waitForTimeout(150);
  r.exampleStatus = await p.textContent('#status'); await scan('example');
  await p.fill('#v-onset', 'last night'); r.sheet = (await p.textContent('#sheet')).slice(0, 400);
  await p.click('#tab-json'); await p.selectOption('#scope', 'stage1');
  r.stage1Keys = await p.evaluate(() => Object.keys(JSON.parse(document.getElementById('json').textContent)));
  r.saveLabel = await p.textContent('#saveJson'); await scan('json');
  await p.click('#tab-load'); await p.fill('#pasteBox', '{"spec":"x"}'); await p.click('#loadPaste'); await scan('load');
  r.download = await p.getAttribute('a[download]', 'href');
  await p.click('#tab-sheet'); await p.screenshot({ path: '/tmp/oi-me-en.png', fullPage: true });
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(150);
  r.overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
  if (r.ja.length || errs.length || r.overflow > 0) process.exit(1);
})();

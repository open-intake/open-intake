const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve('docs/index.html'));
  await p.waitForTimeout(500);
  const r = {};
  r.status = await p.textContent('#status');
  r.exampleFile = await p.evaluate(j => { const v = OpenIntake.validate(j); return { E: v.E.map(x=>x.code), W: v.W.map(x=>x.code) }; }, JSON.parse(fs.readFileSync('examples/v0.1/clinic-intake.json','utf8')));
  r.formEqualsExample = await p.evaluate(j => { const a = OpenIntake.build(OpenIntake.normalize(j).doc); return JSON.stringify(a) === JSON.stringify(j); }, JSON.parse(fs.readFileSync('examples/v0.1/clinic-intake.json','utf8')));
  // 空にする → エラーが出る
  await p.click('text=空にする'); r.blank = await p.textContent('#status');
  await p.fill('#f-name', 'テスト医院'); await p.fill('#f-tel', '03-1111-2222'); await p.fill('#f-pref', '大阪府'); await p.fill('#f-city', '大阪市');
  await p.check('[data-dept="内科"]'); await p.fill('#f-bk-0-t', '06-0000-0000');
  r.filled = await p.textContent('#status');
  // 問診票を足して、条件つきの質問を作る
  await p.click('text=＋ 空の問診票');
  await p.fill('#f-q-0-title', '腹痛の問診票'); await p.fill('#f-q-0-q1-t', '吐き気はありますか');
  await p.selectOption('#f-q-0-q1-ty', 'boolean');
  await p.click('text=＋ 質問を足す'); await p.fill('#f-q-0-q2-t', 'いつからですか');
  await p.selectOption('#f-q-0-q2-cq', 'q1'); await p.selectOption('#f-q-0-q2-cv', 'false');
  const out = await p.evaluate(() => JSON.parse(document.getElementById('json').textContent));
  r.q2 = out.questionnaires[0].item[1];
  r.afterQ = await p.textContent('#status');
  // 時刻の逆転
  await p.fill('#f-hr-0-o', '13:00'); await p.fill('#f-hr-0-c', '12:00');
  r.badTime = (await p.textContent('#issues')).slice(0, 120);
  // 貼り付け → 読み込み
  await p.click('#tab-load'); await p.fill('#pasteBox', '```json\n' + fs.readFileSync('examples/v0.1/clinic-intake.json','utf8') + '\n```');
  await p.click('#loadPaste'); r.loaded = await p.inputValue('#f-name'); r.loadedStatus = await p.textContent('#status');
  await p.fill('#pasteBox', '{ "spec": "open-intake", }'); await p.click('#checkPaste'); r.badJson = (await p.textContent('#pasteIssues')).slice(0, 60);
  // 狭い画面で横スクロールが出ないか
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(200);
  r.overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await p.screenshot({ path: '/tmp/oi-shot-phone.png', fullPage: false });
  await p.setViewportSize({ width: 1280, height: 900 }); await p.screenshot({ path: '/tmp/oi-shot-desktop.png' });
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();

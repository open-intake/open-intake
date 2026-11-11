// 作成ツールの英語版と、地域プロファイルの切り替えの動作確認（Playwright）
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + path.resolve('docs/en/maker/index.html')); await p.waitForTimeout(400);
  const r = {};
  r.title = await p.title();
  r.status = await p.textContent('#status');
  r.profile = await p.inputValue('#f-profile');
  r.exampleErrors = await p.evaluate(() => OpenIntakeValidate.validate(OpenIntake.build(OpenIntake.normalize(JSON.parse(document.getElementById('json').textContent)).doc)).E.map(e => e.code));
  r.redFlagsFirst = await p.evaluate(() => JSON.parse(document.getElementById('json').textContent).safety.redFlags[0]);
  await p.selectOption('#f-profile', 'gb');
  r.afterGb = await p.evaluate(() => { const j = JSON.parse(document.getElementById('json').textContent); return [j.profile.id, j.clinic.address.addressCountry, j.safety.redFlags.length, j.safety.emergency.slice(0, 40)]; });
  await p.selectOption('#f-profile', 'us'); r.npiField = await p.$$eval('input[id^="f-id-"]', els => els.length);
  await p.selectOption('#f-profile', 'jp'); r.jpTemplateButtons = await p.$$eval('button', bs => bs.map(b => b.textContent).filter(t => t.startsWith('+ ')).slice(-3));
  await p.click('#tab-view'); r.view = (await p.textContent('#view')).slice(0, 80);
  await p.click('#mode-schedule'); r.schedStatus = await p.textContent('#status');
  await p.click('#tab-issues'); await p.click('text=Clear'); r.blankIssues = (await p.textContent('#issues')).slice(0, 140);
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(200);
  r.overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await p.screenshot({ path: '/tmp/oi-en-phone.png' }); await p.setViewportSize({ width: 1280, height: 900 }); await p.click('#mode-intake'); await p.click('#tab-json'); await p.screenshot({ path: '/tmp/oi-en-desk.png' });
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();

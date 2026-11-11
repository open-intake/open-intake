// v0.4 の欄が、作成ツールで読み込んで書き出しても消えないか（日本語版・英語版）
// 使い方: node tools/smoke-v04.cjs
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const strip = o => { const c = JSON.parse(JSON.stringify(o)); delete c.updated; delete c.policy; delete c.specVersion; return c; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const diff = (a, b, p = '') => {
  if (same(a, b)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object') return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(k => diff(a[k], b[k], p + '.' + k));
  return [`${p}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`];
};
(async () => {
  const b = await chromium.launch(); let fail = 0;
  for (const page of ['docs/maker/index.html', 'docs/en/maker/index.html']) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + path.resolve(page)); await p.waitForTimeout(400);
    const json = () => p.evaluate(() => JSON.parse(document.getElementById('json').textContent));
    const r = { page };
    for (const [mode, file] of [['intake', 'clinic-intake.json'], ['schedule', 'clinic-schedule.json']]) {
      await p.click('#mode-' + mode); await p.waitForTimeout(100);
      const src = JSON.parse(fs.readFileSync('examples/v0.4/' + file, 'utf8'));
      await p.click('#tab-json'); await p.click('#tab-load'); await p.fill('#pasteBox', JSON.stringify(src), { timeout: 5000 }); await p.click('#loadPaste'); await p.waitForTimeout(150);
      const out = await json();
      r[mode] = { specVersion: out.specVersion, status: (await p.textContent('#status')).trim().slice(0, 60), lost: diff(strip(src), strip(out)) };
      if (out.specVersion !== '0.4' || r[mode].lost.length) fail++;
    }
    // 画面から v0.4 の欄を変えられるか: 1行目の受け付け方を「予約の人だけ」に
    await p.click('#mode-intake'); await p.waitForTimeout(100);
    await p.selectOption('#f-hr-0-en', 'appointment');
    await p.fill('#f-hr-0-rc', '11:30'); await p.dispatchEvent('#f-hr-0-rc', 'input');
    let out = await json();
    r.edit = { entry: out.clinic.openingHours[0].entry, reception: out.clinic.openingHours[0].reception };
    if (r.edit.entry !== 'appointment' || r.edit.reception?.closes !== '11:30') fail++;
    // 「書かない」に戻すと欄が消える
    await p.selectOption('#f-hr-0-en', ''); out = await json();
    r.cleared = !('entry' in out.clinic.openingHours[0]); if (!r.cleared) fail++;
    // 完全予約制
    await p.selectOption('#f-appt', 'true'); out = await json(); r.appt = out.clinic.appointmentRequired; if (r.appt !== true) fail++;
    await p.click('#tab-view'); r.view = (await p.textContent('#view')).replace(/\s+/g, ' ').slice(0, 400);
    await p.setViewportSize({ width: 390, height: 800 }); await p.click('#tab-json').catch(() => {}); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(process.env.TEMP || '/tmp', `oi-v04-${page.includes('/en/') ? 'en' : 'ja'}-phone.png`), fullPage: true });
    r.errs = errs; if (errs.length) fail++;
    console.log(JSON.stringify(r, null, 1)); await p.close();
  }
  await b.close(); console.log(fail ? `不合格 ${fail}` : '合格'); process.exit(fail ? 1 : 0);
})();

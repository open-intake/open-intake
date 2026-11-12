// 作成ツールの通し確認（日本語版・英語版）。v0.4・v0.5 の例を読み込んで書き出しても欄が消えないか、
// 対象を絞った行が scopedOpeningHours に分かれるか、確かめた日・閉院・サイト用の出力が動くか
// 使い方: node tools/smoke.cjs   （playwright が要る）
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { isNarrowed } = require('../src/validate.js');
const strip = o => { const c = JSON.parse(JSON.stringify(o)); delete c.updated; delete c.policy; delete c.specVersion; return c; };
// 0.4 のファイルは、絞った行が scopedOpeningHours・scopedExceptions に移るのが正しい
const to05 = o => {
  const c = strip(o);
  if (c.clinic && Array.isArray(c.clinic.openingHours)) {
    const all = [...c.clinic.openingHours, ...(c.clinic.scopedOpeningHours || [])];
    c.clinic.openingHours = all.filter(x => !isNarrowed(x)); const sc = all.filter(isNarrowed);
    delete c.clinic.scopedOpeningHours; if (sc.length) c.clinic.scopedOpeningHours = sc;
    // 書き出しの順に並べ直す（openingHours の次に scopedOpeningHours）
    const k = Object.keys(c.clinic), out = {}; for (const x of k) { if (x === 'scopedOpeningHours') continue; out[x] = c.clinic[x]; if (x === 'openingHours' && sc.length) out.scopedOpeningHours = sc; } c.clinic = out;
  }
  if (Array.isArray(c.exceptions)) {
    const all = [...c.exceptions, ...(c.scopedExceptions || [])], sc = x => x.department !== undefined || x.service !== undefined;
    const k = Object.keys(c), out = {}; for (const x of k) { if (x === 'scopedExceptions') continue; if (x === 'exceptions') { if (all.some(y => !sc(y))) out.exceptions = all.filter(y => !sc(y)); if (all.some(sc)) out.scopedExceptions = all.filter(sc); } else out[x] = c[x]; }
    return out;
  }
  return c;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const diff = (a, b, p = '') => {
  if (same(a, b)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object') return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(k => diff(a[k], b[k], p + '.' + k));
  return [`${p}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`];
};
(async () => {
  const b = await chromium.launch(); let fail = 0;
  const bad = (r, what) => { fail++; (r.fail = r.fail || []).push(what); };
  for (const page of ['docs/maker/index.html', 'docs/en/maker/index.html']) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + path.resolve(page)); await p.waitForTimeout(400);
    const json = () => p.evaluate(() => JSON.parse(document.getElementById('json').textContent));
    const load = async (mode, src) => {
      await p.click('#mode-' + mode); await p.waitForTimeout(100);
      await p.click('#tab-load'); await p.fill('#pasteBox', JSON.stringify(src), { timeout: 5000 }); await p.click('#loadPaste'); await p.waitForTimeout(150);
      await p.click('#tab-json'); return json();
    };
    const r = { page };
    for (const v of ['v0.4', 'v0.5']) for (const [mode, file] of [['intake', 'clinic-intake.json'], ['schedule', 'clinic-schedule.json']]) {
      const src = JSON.parse(fs.readFileSync(`examples/${v}/${file}`, 'utf8'));
      const out = await load(mode, src);
      const lost = diff(to05(src), strip(out));
      r[v + ' ' + mode] = { specVersion: out.specVersion, status: (await p.textContent('#status')).trim().slice(0, 60), lost };
      if (out.specVersion !== '0.5' || lost.length) bad(r, v + ' ' + mode);
    }
    // 閉院した医療機関の例
    { const src = JSON.parse(fs.readFileSync('examples/v0.5/clinic-intake-closed.json', 'utf8')); const out = await load('intake', src); const lost = diff(strip(src), strip(out)); r.closed = { lost }; if (lost.length) bad(r, 'closed'); }
    // 画面から: 例を読み込み直し、1行目に「初診だけ」を付けると scopedOpeningHours に移る
    const ex = JSON.parse(fs.readFileSync('examples/v0.5/clinic-intake.json', 'utf8')); let out = await load('intake', ex);
    const n0 = out.clinic.openingHours.length, s0 = (out.clinic.scopedOpeningHours || []).length;
    const setSel = (sel, v) => p.$eval(sel, (el, v) => { el.value = v; el.dispatchEvent(new Event('change')); }, v);
    await setSel('#f-hr-0-vt', 'first'); out = await json();
    r.scopedMove = [n0, s0, out.clinic.openingHours.length, (out.clinic.scopedOpeningHours || []).length];
    if (out.clinic.openingHours.length !== n0 - 1 || out.clinic.scopedOpeningHours.length !== s0 + 1) bad(r, 'scopedMove');
    await setSel('#f-hr-0-vt', ''); out = await json();
    // 「変更なし・今日確かめた」
    await p.click('text=' + (page.includes('/en/') ? 'No changes, checked today' : '変更なし・今日確かめた')); out = await json();
    const t = new Date(); const today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    r.verified = out.verified; if (out.verified !== today) bad(r, 'verified');
    // 閉院を選ぶと、時間と予約が空になる。戻すと元に戻る
    await setSel('#f-st', 'closed'); out = await json();
    r.statusClosed = [out.status?.state, out.clinic.openingHours.length, out.clinic.booking.length];
    if (out.status?.state !== 'closed' || out.clinic.openingHours.length || out.clinic.booking.length || out.clinic.scopedOpeningHours) bad(r, 'statusClosed');
    await setSel('#f-st', ''); out = await json(); if (out.status || out.clinic.openingHours.length !== n0) bad(r, 'statusBack');
    // 予約の基盤と入口
    await p.click('#tab-json');
    // 確かめの表とサイト用の出力
    await p.click('#tab-view'); r.weekRows = await p.evaluate(() => document.querySelectorAll('#view table tbody tr').length); if (r.weekRows < 8) bad(r, 'weekTable');
    await p.click('#tab-web');
    const ldText = await p.textContent('#ldOut'), html = await p.textContent('#htmlOut');
    const ld = JSON.parse(ldText.replace(/^<script[^>]*>/, '').replace(/<\/script>\s*$/, ''));
    r.ld = { type: ld['@type'], hours: (ld.openingHoursSpecification || []).length, special: (ld.specialOpeningHoursSpecification || []).length };
    if (ld['@type'] !== 'MedicalClinic' || !r.ld.hours) bad(r, 'jsonld');
    r.htmlHead = html.slice(0, 80); if (!html.startsWith('<section class="open-intake"')) bad(r, 'html');
    // 見出しは画面の言葉になる（中身は例の医療機関のものなので日本語のまま）
    if (!html.includes(page.includes('/en/') ? '<h3>Opening hours</h3>' : '<h3>診療時間</h3>')) bad(r, 'html-labels');
    await p.setViewportSize({ width: 390, height: 800 }); await p.click('#tab-json').catch(() => {}); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(process.env.TEMP || '/tmp', `oi-v05-${page.includes('/en/') ? 'en' : 'ja'}-phone.png`), fullPage: true });
    r.errs = errs; if (errs.length) bad(r, 'errors');
    console.log(JSON.stringify(r, null, 1)); await p.close();
  }
  await b.close(); console.log(fail ? `不合格 ${fail}` : '合格'); process.exit(fail ? 1 : 0);
})();

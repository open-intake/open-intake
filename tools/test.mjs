// テスト: node tools/test.mjs（依存なし）
// 1. 各版の例（examples/<版>/）がエラーなしで通る ＝ 新旧の版が混ざっても困らないことの確認（SPEC.md §8）
// 2. わざと壊したファイルが、決まった番号のエラーで止まる
// 3. docs/ が原稿から作り直した結果と一致している
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { validate, SUPPORTED_VERSIONS } = require("../src/validate.js");

let fail = 0, pass = 0;
const ok = (cond, name, detail = "") => { if (cond) pass++; else { fail++; console.error("✗ " + name + (detail ? "\n    " + detail : "")); } };
const codes = r => r.E.map(x => x.code);

// 1. 各版の例
for (const ver of fs.readdirSync("examples")) {
  for (const f of fs.readdirSync(path.join("examples", ver)).filter(f => f.endsWith(".json"))) {
    const p = path.join("examples", ver, f), doc = JSON.parse(fs.readFileSync(p, "utf8"));
    const r = validate(doc);
    ok(r.E.length === 0, `${p} がエラーなしで通る`, JSON.stringify(r.E));
    ok(doc.specVersion === ver.replace(/^v/, ""), `${p} の specVersion がフォルダ名と合う`);
  }
}
ok(SUPPORTED_VERSIONS.includes("0.1"), "検査器が 0.1 に対応している");

// 2. 壊したファイル
const base = () => JSON.parse(fs.readFileSync("examples/v0.1/clinic-intake.json", "utf8"));
const broken = [
  ["E1", d => { d.spec = "other"; }],
  ["E2", d => { d.updated = "2026/11/10"; }],
  ["E3", d => { d.clinic.name = ""; }],
  ["E4", d => { d.clinic.departments = []; }],
  ["E5", d => { d.clinic.openingHours[0].opens = "13:00"; d.clinic.openingHours[0].closes = "12:00"; }],
  ["E6", d => { d.clinic.booking = [{ method: "web" }]; }],
  ["E7", d => { d.safety.noDiagnosis = false; }],
  ["E7", d => { delete d.safety; }],
  ["E8", d => { d.questionnaires[0].item = []; }],
  ["E9", d => { d.questionnaires[0].item[1].linkId = "q1"; }],
  ["E10", d => { d.questionnaires[0].item[0].answerOption = []; }],
  ["E11", d => { d.questionnaires[0].item[5].enableWhen[0].question = "q99"; }],
];
for (const [code, breakIt] of broken) { const d = base(); breakIt(d); const r = validate(d); ok(codes(r).includes(code), `${code} で止まる`, JSON.stringify(codes(r))); }

// 臨時の情報（v0.2）を壊す
const sbase = () => JSON.parse(fs.readFileSync("examples/v0.2/clinic-schedule.json", "utf8"));
const sbroken = [
  ["S1", d => { d.specVersion = "two"; }],
  ["S3", d => { delete d.validUntil; }],
  ["S3", d => { d.validUntil = "2026-01-01"; }],
  ["S4", d => { d.exceptions[0].from = "2026-12-31"; d.exceptions[0].to = "2026-12-01"; }],
  ["S4", d => { d.exceptions[0].hours = []; }],
  ["S4", d => { d.exceptions[2].status = "holiday"; }],
  ["S5", d => { delete d.doctorSchedule[0].department; delete d.doctorSchedule[0].name; }],
  ["S5", d => { delete d.doctorSchedule[0].days; }],
  ["S6", d => { d.onCall[0].kind = "day"; }],
  ["S7", d => { d.notices[0].text = ""; }],
];
for (const [code, breakIt] of sbroken) { const d = sbase(); breakIt(d); const r = validate(d); ok(codes(r).includes(code), `臨時の情報: ${code} で止まる`, JSON.stringify(codes(r))); }
{ const d = sbase(); d.onCall[0].opens = "18:00"; d.onCall[0].closes = "08:00"; ok(validate(d).E.length === 0, "当番は翌朝までの時間を書ける"); }
{ const d = sbase(); d.validUntil = "2020-01-01"; d.updated = "2019-12-01"; ok(validate(d).W.some(w => w.code === "W7"), "期限切れは W7"); }

// 正規のファイルの一覧（files）
{ const d = JSON.parse(fs.readFileSync("examples/v0.2/clinic-intake.json", "utf8"));
  d.files.push({ role: "schedule", url: "/b.json" }); ok(codes(validate(d)).includes("E12"), "同じ役割のファイルが2つなら E12");
  d.files = [{ role: "future-role", url: "/x.json" }]; const r = validate(d); ok(r.E.length === 0 && r.W.some(w => w.code === "W11"), "知らない役割は注意（W11）だけ");
  d.files = [{ role: "schedule", url: "/a b.json" }]; ok(codes(validate(d)).includes("E12"), "空白を含む URL は E12"); }

// 年代ごとの救急の目安
{ const d = JSON.parse(fs.readFileSync("examples/v0.2/clinic-intake.json", "utf8"));
  ok(Object.keys(d.safety.redFlagsByAge).join() === "older,child", "v0.2 の例に高齢者とこどもの目安がある");
  ok(d.safety.redFlags.length === 31 && d.safety.redFlagsByAge.older.items.length === 24 && d.safety.redFlagsByAge.child.items.length === 23, "目安の項目数が原文（おとな31・高齢者24・こども23）と合う");
  d.safety.redFlagsByAge.child.items = []; ok(codes(validate(d)).includes("E7"), "年代の目安が空なら E7");
  d.safety.redFlagsByAge = { teen: { items: ["x"] } }; const r = validate(d); ok(r.E.length === 0 && r.W.some(w => w.code === "W13"), "知らない年代は注意（W13）だけ"); }

// 得意分野（focus）
{ const d = JSON.parse(fs.readFileSync("examples/v0.2/clinic-intake.json", "utf8"));
  ok(Array.isArray(d.clinic.focus) && d.clinic.focus.length > 0, "v0.2 の例に得意分野がある");
  d.clinic.focus[0].areas = []; ok(codes(validate(d)).includes("E13"), "得意分野の内容が空なら E13");
  d.clinic.focus = [{ department: "眼科", areas: ["白内障"] }]; const r = validate(d); ok(r.E.length === 0 && r.W.some(w => w.code === "W14"), "診療科の一覧にない科は注意（W14）");
  const wc = x => validate(x).W.map(w => w.code);
  d.clinic.focus = [{ areas: Array.from({ length: 11 }, (_, i) => "分野" + i) }]; ok(wc(d).includes("W17"), "得意分野が10個を超えると注意（W17）");
  d.clinic.focus = [{ areas: ["糖尿病"] }]; ok(!wc(d).includes("W17"), "得意分野が少なければ W17 は出ない");
  d.clinic.notHandled = ["入院", "抗凝固薬を飲んでいる方"]; ok(wc(d).includes("W18"), "対応していないことに患者の薬の書き方があると注意（W18）");
  d.clinic.notHandled = ["入院", "6歳未満の小児"]; ok(!wc(d).includes("W18"), "診療・年齢層だけなら W18 は出ない"); }

// 使い方の決まり（policy）
{ const d = JSON.parse(fs.readFileSync("examples/v0.2/clinic-intake.json", "utf8"));
  ok(d.policy && d.policy.url && d.policy.summary, "例に決まりの場所と要点（policy）がある");
  d.policy = { summary: "x" }; ok(codes(validate(d)).includes("E14"), "policy に url がなければ E14"); }

// v0.3: 地域プロファイル・地域の一覧・識別番号
// 版ごとの写し（v0.5）: 今の中身と同じ写しが profiles/archive/<id>-<updated>.json にある
for (const f of fs.readdirSync("profiles").filter(f => f.endsWith(".json"))) { const d = JSON.parse(fs.readFileSync("profiles/" + f, "utf8")), a = `profiles/archive/${d.id}-${d.updated}.json`; ok(fs.existsSync(a) && fs.readFileSync(a, "utf8") === fs.readFileSync("profiles/" + f, "utf8"), `profiles/${f} の版ごとの写し（${a}）が今の中身と同じ`); }
for (const f of fs.readdirSync("profiles").filter(f => f.endsWith(".json"))) { const r = validate(JSON.parse(fs.readFileSync("profiles/" + f, "utf8"))); ok(r.E.length === 0, `profiles/${f} がエラーなしで通る`, JSON.stringify(r.E)); }
{ const d = JSON.parse(fs.readFileSync("examples/v0.3/clinic-intake.json", "utf8"));
  d.clinic.identifiers[0].value = "123"; ok(codes(validate(d)).includes("E15"), "医療機関コードが10桁でなければ E15");
  d.clinic.identifiers = [{ system: "http://hl7.org/fhir/sid/us-npi", value: "1234567890" }]; ok(validate(d).E.length === 0, "URI の体系の識別番号は通る");
  d.clinic.geo = { latitude: 120, longitude: 0 }; ok(codes(validate(d)).includes("E15"), "緯度が範囲外なら E15");
  delete d.clinic.geo; d.profile = { url: "x" }; ok(codes(validate(d)).includes("E16"), "profile に id がなければ E16"); }
{ const d = JSON.parse(fs.readFileSync("examples/v0.3/clinic-directory.json", "utf8"));
  d.entries[1].url = d.entries[0].url; ok(codes(validate(d)).includes("D4"), "地域の一覧で url が重なれば D4");
  d.entries = []; ok(codes(validate(d)).includes("D4"), "地域の一覧が空なら D4"); }
{ const d = JSON.parse(fs.readFileSync("profiles/jp.json", "utf8")); delete d.questionnaires[0].url; ok(codes(validate(d)).includes("P4"), "基本形に url がなければ P4"); }

// 自分の健康メモ（PERSONAL.md）
{ const base = () => JSON.parse(fs.readFileSync("examples/personal/v0.1/my-health.json", "utf8"));
  const r0 = validate(base()); ok(r0.E.length === 0 && r0.W.some(w => w.code === "H6"), "健康メモの例が通り、AI の書き起こしの未確認は H6", JSON.stringify(r0));
  let d = base(); d.selfReported = false; ok(codes(validate(d)).includes("H3"), "selfReported が true でなければ H3");
  d = base(); d.medications[0].name = ""; ok(codes(validate(d)).includes("H4"), "薬の名前が空なら H4");
  d = base(); d.allergies[0].severity = "very"; ok(codes(validate(d)).includes("H4"), "決まっていない重さは H4");
  d = base(); d.conditions[0].since = "2020/04"; ok(codes(validate(d)).includes("H5"), "日付の形が違えば H5");
  d = base(); d.person.name = "山田"; ok(validate(d).W.some(w => w.code === "H7"), "person に氏名があれば H7"); }
{ const base = () => JSON.parse(fs.readFileSync("examples/personal/v0.1/my-health.json", "utf8"));
  let d = base(); delete d.allergies; delete d.medications; delete d.conditions; delete d.procedures; delete d.immunizations; delete d.pregnancy; delete d.lifestyle; delete d.notes; delete d.person;
  ok(validate(d).E.length === 0, "段階1（受診先の好み）だけでも正しいファイル");
  d = base(); d.preferences.regularClinics[0].rating = 3; ok(validate(d).W.some(w => w.code === "H10"), "かかりつけに評価があれば H10");
  d = base(); d.preferences.pastClinics = [{ name: "x", rating: 2 }]; ok(validate(d).W.some(w => w.code === "H10"), "過去の医療機関の欄があれば H10");
  d = base(); d.preferences.priorities.push("price"); ok(codes(validate(d)).includes("H9"), "決まっていない重視することは H9");
  d = base(); d.preferences.priorities.push("reputation"); ok(codes(validate(d)).includes("H9"), "評判（reputation）は重視することに使えない（H9）");
  d = base(); d.preferences.availability[0].from = "13:00"; d.preferences.availability[0].to = "12:00"; ok(codes(validate(d)).includes("H9"), "時間帯の前後が逆なら H9");
  d = base(); d.preferences.homeArea.streetAddress = "1-2-3"; ok(validate(d).W.some(w => w.code === "H7"), "番地を書けば H7"); }

// v0.4: 受付の時間・診療科・用途・初診と再診・受け付け方・予約の時間
{ const v4 = () => JSON.parse(fs.readFileSync("examples/v0.4/clinic-intake.json", "utf8"));
  const wc = x => validate(x).W.map(w => w.code);
  let d = v4(); ok(d.clinic.openingHours.some(h => h.reception && h.entry) && d.clinic.booking.some(b => b.hours), "v0.4 の例に受付の時間・受け付け方・予約の時間がある");
  d = v4(); d.clinic.openingHours[0].reception = { opens: "12:00", closes: "11:00" }; ok(codes(validate(d)).includes("E5"), "受付の始まりが締め切りより後なら E5");
  d = v4(); d.clinic.openingHours[0].reception = {}; ok(codes(validate(d)).includes("E5"), "受付の時間が空なら E5");
  d = v4(); d.clinic.openingHours[0].reception = { closes: "13:00" }; ok(validate(d).E.length === 0 && wc(d).includes("W19"), "受付の締め切りが診療の終わりより後なら注意（W19）だけ");
  d = v4(); d.clinic.openingHours[0].reception = { closes: d.clinic.openingHours[0].opens }; ok(validate(d).E.length === 0 && wc(d).includes("W19"), "受付の締め切りが診療の始まり以前なら注意（W19）");
  d = v4(); d.clinic.openingHours[0].entry = "closed"; ok(codes(validate(d)).includes("E5"), "決まっていない受け付け方は E5");
  d = v4(); d.clinic.openingHours[0].visitType = "new"; ok(codes(validate(d)).includes("E5"), "決まっていない visitType は E5");
  d = v4(); d.clinic.openingHours[4].weeksOfMonth = [0, 6]; ok(codes(validate(d)).includes("E5"), "第何週が 1〜5 でなければ E5");
  d = v4(); d.clinic.openingHours[1].mayEndEarly = "yes"; ok(codes(validate(d)).includes("E5"), "mayEndEarly が真偽でなければ E5");
  d = v4(); d.clinic.openingHours[3].department = "眼科"; ok(validate(d).E.length === 0 && wc(d).includes("W20"), "診療科の一覧にない科は注意（W20）");
  d = v4(); d.clinic.openingHours[3].service = ["dialysis"]; ok(validate(d).E.length === 0 && wc(d).includes("W21"), "知らない用途は注意（W21）だけ");
  d = v4(); d.clinic.appointmentRequired = "unknown"; ok(codes(validate(d)).includes("E17"), "appointmentRequired が真偽でなければ E17");
  d = v4(); d.clinic.booking[1].hours[0].opens = "19:00"; ok(codes(validate(d)).includes("E6"), "予約の受付時間の前後が逆なら E6");
  d = v4(); d.clinic.booking[0].mode = "lottery"; ok(codes(validate(d)).includes("E6"), "決まっていない予約の取り方は E6");
  d = v4(); d.specVersion = "0.3"; ok(validate(d).E.length === 0, "v0.4 の欄を持つファイルを 0.3 と書いても壊れない（知らない版の欄として読める）"); }
{ const s4 = () => JSON.parse(fs.readFileSync("examples/v0.4/clinic-schedule.json", "utf8"));
  let d = s4(); const x = d.exceptions.find(e => e.entry === "none"); x.entry = "stop"; ok(codes(validate(d)).includes("S4"), "臨時の変更の受け付け方が決まっていない値なら S4");
  d = s4(); d.exceptions.find(e => e.status === "closed").entry = "none"; const r = validate(d); ok(r.E.length === 0 && r.W.some(w => w.code === "W22"), "休診に受け付け方を書くと注意（W22）"); }

// v0.5: 対象を絞った行の置き場所・確かめた日・閉院・予約の基盤の入口・地域の一覧の発行者
{ const v5 = () => JSON.parse(fs.readFileSync("examples/v0.5/clinic-intake.json", "utf8"));
  const wc = x => validate(x).W.map(w => w.code);
  const today = new Date().toISOString().slice(0, 10), daysAgo = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  let d = v5(); ok(d.clinic.scopedOpeningHours.length > 0 && !wc(d).includes("W23"), "v0.5 の例は絞った行を scopedOpeningHours に置き、W23 が出ない");
  d = v5(); d.clinic.openingHours.push(d.clinic.scopedOpeningHours[0]); ok(validate(d).E.length === 0 && wc(d).includes("W23"), "0.5 で絞った行を openingHours に置くと注意（W23）");
  d = v5(); d.clinic.openingHours.push({ days: ["Mo"], opens: "15:00", closes: "18:00", entry: "none" }); ok(wc(d).includes("W23"), "0.5 で新しい受付をしない行を openingHours に置くと W23");
  d = v5(); d.clinic.openingHours.push({ days: ["Mo"], opens: "15:00", closes: "18:00", entry: "appointment" }); ok(!wc(d).includes("W23"), "予約の人だけの行は openingHours に置いてよい");
  d = JSON.parse(fs.readFileSync("examples/v0.4/clinic-intake.json", "utf8")); ok(!wc(d).includes("W23"), "0.4 のファイルの絞った行は W23 にならない（今も有効）");
  d = v5(); d.clinic.openingHours = []; ok(validate(d).E.length === 0, "scopedOpeningHours があれば openingHours は空でもよい");
  d = v5(); d.clinic.openingHours = []; d.clinic.scopedOpeningHours = []; ok(codes(validate(d)).includes("E5"), "どちらも空なら E5");
  d = v5(); d.clinic.scopedOpeningHours[0].opens = "16:00"; ok(codes(validate(d)).includes("E5"), "scopedOpeningHours の時刻の前後が逆なら E5");
  d = v5(); d.verified = "2026/11/12"; ok(codes(validate(d)).includes("E18"), "verified の形が違えば E18");
  d = v5(); d.verified = "2000-01-01"; ok(codes(validate(d)).includes("E18"), "verified が updated より前なら E18");
  d = v5(); d.verified = "2999-01-01"; ok(codes(validate(d)).includes("E18"), "verified が今日より後なら E18");
  d = v5(); d.updated = daysAgo(400); d.verified = today; ok(!wc(d).includes("W2"), "updated が古くても verified が新しければ W2 は出ない");
  d = v5(); d.updated = daysAgo(200); delete d.verified; ok(wc(d).includes("W2"), "確かめた日から180日を過ぎれば W2");
  d = v5(); d.status = { state: "gone" }; ok(codes(validate(d)).includes("E19"), "決まっていない status は E19");
  d = v5(); d.status = { state: "moved", movedTo: "https://example.com/new clinic" }; ok(codes(validate(d)).includes("E19"), "movedTo に空白があれば E19");
  d = v5(); d.status = { state: "closed" }; ok(validate(d).E.length === 0 && wc(d).includes("W26"), "閉院なのに診療時間が残っていれば W26");
  d = JSON.parse(fs.readFileSync("examples/v0.5/clinic-intake-closed.json", "utf8")); ok(validate(d).E.length === 0 && !wc(d).includes("W26"), "閉院の例は診療時間と予約が空でも通る");
  d = v5(); d.profile.sha256 = "ABC"; ok(codes(validate(d)).includes("E20"), "profile.sha256 の形が違えば E20");
  d = v5(); d.clinic.handles = Array.from({ length: 16 }, (_, i) => "症状" + i); ok(wc(d).includes("W24"), "handles が15個を超えれば W24");
  d = v5(); d.clinic.booking[0].endpoints = [{ type: "mcp", url: "http://example.com/mcp" }]; ok(codes(validate(d)).includes("E6"), "予約の入口が https でなければ E6");
  d = v5(); d.clinic.booking[0].endpoints = [{ type: "graphql", url: "https://example.com/x" }]; ok(codes(validate(d)).includes("E6"), "決まっていない入口の種類は E6");
  d = v5(); d.clinic.booking[0].platform = { name: "例の予約", id: "123", url: "https://example.net/" }; d.clinic.booking[0].endpoints = [{ type: "mcp", url: "https://example.net/mcp" }]; ok(validate(d).E.length === 0, "予約の基盤と入口を書ける"); }
{ const s5 = () => JSON.parse(fs.readFileSync("examples/v0.5/clinic-schedule.json", "utf8"));
  const wc = x => validate(x).W.map(w => w.code);
  let d = s5(); ok(d.scopedExceptions.length > 0 && !wc(d).includes("W23"), "v0.5 の臨時の例は絞った変更を scopedExceptions に置く");
  d = s5(); d.exceptions.push(d.scopedExceptions[0]); ok(wc(d).includes("W23"), "0.5 で絞った臨時の変更を exceptions に置くと W23");
  d = s5(); d.scopedExceptions[0].status = "pause"; ok(codes(validate(d)).includes("S4"), "scopedExceptions も S4 で検査する");
  d = s5(); delete d.scopedExceptions[0].department; delete d.scopedExceptions[0].service; ok(wc(d).includes("W23"), "絞っていない変更を scopedExceptions に置くと W23"); }
{ const d = JSON.parse(fs.readFileSync("examples/v0.5/clinic-directory.json", "utf8")); delete d.publisher.url; ok(validate(d).W.some(w => w.code === "W25"), "地域の一覧に発行者のサイトがなければ W25"); }

// 読む側の問題集（conformance/。v0.5）: 形と、ファイルの場所・中身が正しいか（答えの判定はしない）
{
  const C = JSON.parse(fs.readFileSync("conformance/cases.json", "utf8")), ids = new Set();
  ok(Array.isArray(C.cases) && C.cases.length >= 20, "問題集に20問以上ある");
  const H = JSON.parse(fs.readFileSync("conformance/cases-holdout.json", "utf8"));
  ok(Array.isArray(H.cases) && H.cases.length >= 12, "未見の問が12問以上ある");
  const lang = x => x && typeof x.ja === "string" && x.ja && typeof x.en === "string" && x.en;
  for (const c of C.cases.concat(H.cases)) {
    ok(/^[CH]\d{2}$/.test(c.id) && !ids.has(c.id), `問題 ${c.id} の id が重ならない`); ids.add(c.id);
    ok(!isNaN(Date.parse(c.now)) && lang(c.patient) && Array.isArray(c.must) && c.must.length && c.must.every(lang) && Array.isArray(c.mustNot) && c.mustNot.every(lang) && (c.context === undefined || lang(c.context)), `問題 ${c.id} の形（now・patient・must・mustNot は日英）`);
    for (const [u, f] of Object.entries(c.files || {})) {
      const there = fs.existsSync(f); ok(/^https:\/\//.test(u) && there, `問題 ${c.id} のファイル ${f} がある`);
      if (there) { const r = validate(JSON.parse(fs.readFileSync(f, "utf8"))); ok(r.E.length === 0, `問題 ${c.id} の ${f} がエラーなしで通る`, JSON.stringify(r.E)); }
      // 「架空」と書くと、読む AI が実在しないとして答えを控える（2026-11 の結果）。架空であることは README に書く
      ok(f.startsWith("conformance/files/") && !fs.readFileSync(f, "utf8").includes("架空"), `問題 ${c.id} の ${f} は問題集の中の写しで、「架空」と書いていない`);
    }
  }
}

// 読む側の参考の道具（src/brief.js）: 問題集の「今の状況のまとめ」が、記録した版（conformance/briefs/）と同じ
// まとめの文を変えたら、briefs/ を作り直し、問題集を解かせ直す（conformance/criteria.md「確かめ直すとき」）
{
  const { brief } = require("../src/brief.js");
  for (const file of ["conformance/cases.json", "conformance/cases-holdout.json"].filter(f => fs.existsSync(f))) {
    const C = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const c of C.cases) {
      ok(c.register === undefined || c.register === null || ["phone", "closed", "match"].includes(c.register.type), `問題 ${c.id} の register の形`);
      const files = {}; for (const [u, f] of Object.entries(c.files)) files[u] = JSON.parse(fs.readFileSync(f, "utf8"));
      let s = ""; try { s = brief(files, c.now, { register: c.register || null }); } catch (e) { s = "ERROR " + e.message; }
      ok(s.startsWith("【読む側のアプリが") && s.includes("- 答えの書き方") || s.includes("- 状態:"), `問題 ${c.id} のまとめが作れる`, s.slice(0, 200));
      const g = `conformance/briefs/${c.id}.txt`;
      if (fs.existsSync(g)) ok(s === fs.readFileSync(g, "utf8"), `問題 ${c.id} のまとめが ${g} と同じ`);
    }
  }
  // 祝日・曜日の計算（2026-11-23 は月曜の祝日、2027-01-11 は成人の日）
  const one = { "https://example.com/clinic-intake.json": JSON.parse(fs.readFileSync("conformance/files/clinic-intake.json", "utf8")) };
  ok(brief(one, "2026-11-23T10:00:00+09:00").includes("11月23日（月・祝）"), "まとめの日付に、曜日と祝日が付く");
  ok(brief(one, "2027-01-11T10:00:00+09:00").includes("1月11日（月・祝）"), "成人の日を祝日として扱う");
  ok(brief(one, "2026-11-23T10:00:00+09:00", { holidays: [] }).includes("11月23日（月）"), "祝日の一覧はアプリが渡せる");
  // 未見の問（holdout3）で見つかった足りないところ: 全体の臨時の変更でなくなったふだんの時間（§6b）と、受付が終わったあとの当番・ほかの医療機関（§5 の決まり17 (c)）
  {
    const two = { ...one, "https://example.com/clinic-schedule.json": JSON.parse(fs.readFileSync("conformance/files/clinic-schedule.json", "utf8")) };
    const d18 = brief(two, "2026-12-18T08:52:00+09:00"), d26 = brief(two, "2026-12-26T10:00:00+09:00"), d18b = brief(two, "2026-12-18T13:00:00+09:00");
    ok(d18.includes("ふだんの 15:00〜18:30 の診療は、今日は臨時の情報で置き換わっていて、ない") && d18.includes("今日の午後は休診です"), "全体の臨時の変更でなくなったふだんの午後を、休診と渡す");
    ok(!d26.includes("ふだんの時間との違い"), "臨時の時間がふだんの時間と重なるときは、なくなった時間を渡さない");
    ok(d18b.includes("今日一日を「休診」とは書かない"), "午後の休診と、今日一日の休診を分ける");
    const fri = brief(one, "2026-11-27T18:01:00+09:00");
    ok(fri.includes("当番やほかの医療機関に相談できること"), "受付が終わったとき、当番やほかの医療機関も渡す");
  }
  // 未見の問（holdout4）で見つかった足りないところ: 予約の取り方（mode、§4）と、名簿との結びつき（§3d）
  {
    const ep = { "https://example.com/clinic-intake.json": JSON.parse(fs.readFileSync("conformance/files/endpoints.json", "utf8")) };
    ok(brief(ep, "2027-01-25T09:18:00+09:00").includes("（当日の順番取り。日時を決める予約ではない"), "予約の方法が当日の順番取り（mode: queue）だと渡す");
    const ph = brief(one, "2026-12-23T14:12:00+09:00", { register: { type: "phone", value: "03-0000-0001" } });
    ok(ph.includes("名簿 03-0000-0001") && ph.includes("公的な名簿とは結びついていない情報です」とも添える"), "名簿と照らしても、逆にたどれていなければ結びついていないと渡す");
    const lk = brief(one, "2026-12-23T14:12:00+09:00", { register: { type: "match", linked: true } });
    ok(!lk.includes("結びついていない"), "名簿から逆にたどれた（linked）ときは、結びついていないと渡さない");
  }
  // 未見の問（holdout1）で見つかった誤りを直したこと
  const fri = brief(one, "2026-11-27T18:01:00+09:00"), fri2 = brief(one, "2026-11-27T19:00:00+09:00"), thu = brief(one, "2026-11-26T16:10:00+09:00");
  ok(!fri.includes("金曜の午後は") && fri.includes("受付は 18:00 で締め切りました") && fri.includes("受付を済ませた人"), "午後の診療がある日に受付が終わっても「午後は休診」と書かせない");
  ok(!fri2.includes("金曜の午後は") && !fri2.includes("続いています"), "診療が終わったあとも「午後は休診」と書かせない");
  ok(thu.includes("木曜の午後は、ふだんの診療時間に書かれていません"), "午後の行がない日は「午後は休診」の型を出す");
  const two = { ...one, "https://example.com/clinic-schedule.json": JSON.parse(fs.readFileSync("conformance/files/clinic-schedule.json", "utf8")) };
  ok(brief(two, "2026-12-31T08:20:00+09:00").includes("2026年12月29日〜2027年1月3日"), "臨時の休診の期間をまとめに書く");
  ok(brief(two, "2027-01-11T14:35:00+09:00").includes("closedNote"), "祝日の行がないとき、休診の説明（closedNote）を渡す");
  ok(brief(one, "2026-11-21T08:40:00+09:00").includes("早めに受付を終えることがあります"), "行の注（土曜は早めに受付を終えることがある）を渡す");
  // 未見の問（holdout2）で見つかった誤りを直したこと: 全体の臨時の変更は、その日の対象を絞った行も置き換える（§6b）
  const d26 = brief(two, "2026-12-26T13:40:00+09:00"), d12 = brief(two, "2026-12-12T13:40:00+09:00");
  ok(!d26.includes("- 今日の対象を絞った時間:") && d26.includes("置き換わっていて、ない"), "全体の臨時の変更がある日は、対象を絞った時間を今日の時間として渡さない");
  ok(d12.includes("- 今日の対象を絞った時間: 14:00〜16:00"), "臨時の変更がない第2土曜は、対象を絞った時間を渡す");
  const ep = { "https://example.com/clinic-intake.json": JSON.parse(fs.readFileSync("conformance/files/endpoints.json", "utf8")) };
  ok(brief(ep, "2026-11-30T09:25:00+09:00").includes("送る項目は、入口の手順を読むまで分からない"), "予約の入口で送る項目がまだ分からないことを渡す");
  // 受付の始まり・締め切りが書かれていないときは、診療の時刻で埋めない（SPEC §4）
  const tue = brief(one, "2026-11-17T14:00:00+09:00"), d18 = brief(two, "2026-12-18T12:40:00+09:00");
  ok(tue.includes("受付 18:00 まで（受付の始まりは書かれていない）") && !tue.includes("受付 15:00〜"), "受付の始まりが書かれていない行に、始まりの時刻を書かない");
  ok(!d18.includes("12:30 で締め切りました") && d18.includes("今日の全員向けの診療は 12:30 で終わりました"), "受付の締め切りが書かれていない臨時の変更で「締め切りました」と書かせない");
}

// まとめを、仕様書の決まりから別に組んだ計算と照らす（tools/check-brief.mjs。AI を使わない）
// 問題集のファイルと、作った医療機関のファイルで、2026年11月〜2027年2月の日付と、時刻の境目を総当たりにする
{
  const { sweep, makeClinic } = await import("./check-brief.mjs");
  const read = f => JSON.parse(fs.readFileSync(f, "utf8"));
  const sets = ["clinic-intake.json", "v0.4-clinic-intake.json"].map(m => ({ "https://example.com/clinic-intake.json": read(`conformance/files/${m}`), "https://example.com/clinic-schedule.json": read("conformance/files/clinic-schedule.json") }));
  for (let i = 0; i < 12; i++) sets.push(makeClinic(900 + i));
  let n = 0; const found = [];
  for (const f of sets) { const r = sweep(f, "2026-11-01", "2027-02-28"); n += r.n; for (const [k, v] of r.found) found.push(`${k}: ${v.example}`); }
  ok(found.length === 0, `まとめが仕様書の決まりからの計算と合う（${n} 組）`, found.slice(0, 5).join(" | "));
}

// 新しい版・知らないキーはエラーにしない
{ const d = base(); d.specVersion = "0.9"; d.futureKey = { a: 1 }; d.clinic.futureField = "x"; const r = validate(d);
  ok(r.E.length === 0 && r.W.some(w => w.code === "W6"), "新しい版と知らないキーは注意（W6）だけ", JSON.stringify(r)); }

// 指示書の「出力の形」の例が、エラーなしで通る（AI が例をまねても壊れたファイルにならないこと）
for (const f of ["AI_INSTRUCTIONS_SCHEDULE.md", "AI_INSTRUCTIONS_SCHEDULE.en.md"]) {
  const md = fs.readFileSync(f, "utf8"), blocks = [...md.matchAll(/```json\n([\s\S]*?)\n```/g)].map(x => x[1]);
  ok(blocks.length === 1, `${f} に出力の形の例が1つある`);
  for (const b of blocks) { let d = null; try { d = JSON.parse(b); } catch (e) { ok(false, `${f} の例が JSON として読める`, String(e)); continue; }
    const r = validate(d); ok(d.spec === "open-intake-schedule" && r.E.length === 0, `${f} の例がエラーなしで通る`, JSON.stringify(r.E)); }
}

// 3. docs/ が最新
try { execFileSync(process.execPath, ["tools/build.mjs", "--check"], { stdio: "pipe" }); ok(true, "docs/ が最新"); }
catch (e) { ok(false, "docs/ が最新", String(e.stderr || e)); }

console.log(`${pass} 件合格・${fail} 件不合格`);
process.exit(fail ? 1 : 0);

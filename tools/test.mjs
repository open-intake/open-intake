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

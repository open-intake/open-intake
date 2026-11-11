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
  d.clinic.focus = [{ department: "眼科", areas: ["白内障"] }]; const r = validate(d); ok(r.E.length === 0 && r.W.some(w => w.code === "W14"), "診療科の一覧にない科は注意（W14）"); }

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

// 新しい版・知らないキーはエラーにしない
{ const d = base(); d.specVersion = "0.9"; d.futureKey = { a: 1 }; d.clinic.futureField = "x"; const r = validate(d);
  ok(r.E.length === 0 && r.W.some(w => w.code === "W6"), "新しい版と知らないキーは注意（W6）だけ", JSON.stringify(r)); }

// 3. docs/ が最新
try { execFileSync(process.execPath, ["tools/build.mjs", "--check"], { stdio: "pipe" }); ok(true, "docs/ が最新"); }
catch (e) { ok(false, "docs/ が最新", String(e.stderr || e)); }

console.log(`${pass} 件合格・${fail} 件不合格`);
process.exit(fail ? 1 : 0);

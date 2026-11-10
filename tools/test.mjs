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

// 新しい版・知らないキーはエラーにしない
{ const d = base(); d.specVersion = "0.9"; d.futureKey = { a: 1 }; d.clinic.futureField = "x"; const r = validate(d);
  ok(r.E.length === 0 && r.W.some(w => w.code === "W6"), "新しい版と知らないキーは注意（W6）だけ", JSON.stringify(r)); }

// 3. docs/ が最新
try { execFileSync(process.execPath, ["tools/build.mjs", "--check"], { stdio: "pipe" }); ok(true, "docs/ が最新"); }
catch (e) { ok(false, "docs/ が最新", String(e.stderr || e)); }

console.log(`${pass} 件合格・${fail} 件不合格`);
process.exit(fail ? 1 : 0);

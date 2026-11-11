// サイトを組み立てる。トップ（docs/index.html）と作成ツール（docs/maker/index.html）。
//   node tools/build.mjs          → docs/ を書き出す（GitHub Pages はここを配る）
//   node tools/build.mjs --check  → docs/ が原稿から作った結果と1バイトも違わないかだけ見る
// 埋め込むもの: src/validate.js（検査器）、AI_INSTRUCTIONS.md の「ここから〜ここまで」（指示文）
// 写すもの: schema/ と examples/（サイトから URL で引けるように）
import fs from "node:fs";
import path from "node:path";

const check = process.argv.includes("--check");
const read = f => fs.readFileSync(f, "utf8");
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const md = read("AI_INSTRUCTIONS.md");
const m = /## ここから（AI に貼り付ける文）\n([\s\S]*?)\n## ここまで/.exec(md);
if (!m) throw new Error("AI_INSTRUCTIONS.md に「ここから」「ここまで」が見つかりません");
const src = read("src/generator.src.html");
for (const mark of ["<!--PROMPT-->", "/*VALIDATE*/"]) if (!src.includes(mark)) throw new Error(`src/generator.src.html に ${mark} がありません`);
const validateJs = read("src/validate.js");
if (validateJs.includes("</script")) throw new Error("validate.js に </script が含まれています");
// 地域プロファイル（作成ツールに埋め込む）
const PROFILE_ORDER = ["jp", "us", "gb", "au", "ca", "ca-bc"];
const profileFiles = fs.readdirSync("profiles").filter(f => f.endsWith(".json"));
const profiles = profileFiles.map(f => JSON.parse(read("profiles/" + f)))
  .sort((a, b) => (PROFILE_ORDER.indexOf(a.id) + 1 || 99) - (PROFILE_ORDER.indexOf(b.id) + 1 || 99));
const profilesJs = JSON.stringify(profiles).replace(/</g, "\\u003c");

// 英語版: 対訳表（src/i18n/en.tsv）で、日本語の画面の文を置き換える
const JA_CHARS = /[\u3040-\u30ff\u3400-\u9fff\uff01-\uff5e「」、。・〜]/;
function translate(text, table, where) {
  // 日本語の注釈は英語版では取り除く（CSS の /* … */、JS の行末・行全体の // …）
  text = text.replace(/\/\*[\s\S]*?\*\//g, c => /[\u3040-\u9fff]/.test(c) ? "" : c).replace(/(^|\s)\/\/ [^\n]*[\u3040-\u9fff][^\n]*/gm, "$1");
  for (const [ja, en] of table) text = text.split(ja).join(en);
  const left = text.split("\n").map((l, i) => [i + 1, l]).filter(([, l]) => JA_CHARS.test(l));
  if (left.length) throw new Error(`${where} の英語版に日本語が残っています（src/i18n/en.tsv に足してください）:\n` + left.slice(0, 15).map(([n, l]) => `  ${n}: ${l.trim().slice(0, 140)}`).join("\n"));
  return text;
}
const table = read("src/i18n/en.tsv").split("\n").filter(l => l && !l.startsWith("#")).map(l => { const i = l.indexOf("\t"); if (i < 0) throw new Error("en.tsv にタブのない行: " + l); return [l.slice(0, i), l.slice(i + 1)]; });
function makeMaker(lang) {
  let s = src, v = validateJs, prompt = esc(m[1].trim()), locale = read(`src/locale.${lang}.js`);
  if (lang === "en") {
    s = translate(s.replace("<!--PROMPT-->", "@@PROMPT@@"), table, "src/generator.src.html").replace("@@PROMPT@@", "<!--PROMPT-->");
    v = translate(v, table, "src/validate.js");
    const pe = /## Start of the text to paste\n([\s\S]*?)\n## End of the text to paste/.exec(read("AI_INSTRUCTIONS.en.md"));
    if (!pe) throw new Error("AI_INSTRUCTIONS.en.md に「Start/End of the text to paste」がありません");
    prompt = esc(pe[1].trim());
  }
  return s.replace("<!--PROMPT-->", () => prompt).replace("/*VALIDATE*/", () => v).replace("/*LOCALE*/", () => locale).replace("/*PROFILES*/[]", () => profilesJs);
}
const body = makeMaker("ja");

const page = (b, lang = "ja") => `<!doctype html>\n<html lang="${lang}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<style>[hidden]{display:none!important}body{margin:0}</style>\n</head>\n<body>\n${b}\n</body>\n</html>\n`;
const outputs = new Map();
outputs.set("docs/maker/index.html", page(body));   // 作成ツール
outputs.set("docs/en/maker/index.html", page(makeMaker("en"), "en"));   // 作成ツールの英語版
{ // 自分の健康メモの作成ツール（患者の側）と、その AI 向けの指示書
  const md = read("AI_INSTRUCTIONS_PERSONAL.md");
  const pick = name => { const r = new RegExp(`## ここから（${name}）\\n([\\s\\S]*?)\\n## ここまで（${name}）`).exec(md); if (!r) throw new Error(`AI_INSTRUCTIONS_PERSONAL.md に「ここから（${name}）」がありません`); return esc(r[1].trim()); };
  const ps = read("src/personal.src.html");
  for (const mark of ["<!--PROMPT_MAKE-->", "<!--PROMPT_USE-->", "/*VALIDATE*/"]) if (!ps.includes(mark)) throw new Error(`src/personal.src.html に ${mark} がありません`);
  outputs.set("docs/me/index.html", page(ps.replace("<!--PROMPT_MAKE-->", () => pick("作るとき")).replace("<!--PROMPT_USE-->", () => pick("体調が悪いとき")).replace("/*VALIDATE*/", () => validateJs)));
  outputs.set("docs/me/AI_INSTRUCTIONS_PERSONAL.md", md);
  // 英語版: 画面の文は対訳表（src/i18n/en.tsv）で、指示文は AI_INSTRUCTIONS_PERSONAL.en.md から
  const mdEn = read("AI_INSTRUCTIONS_PERSONAL.en.md");
  const pickEn = name => { const r = new RegExp(`## Start \\(${name}\\)\\n([\\s\\S]*?)\\n## End \\(${name}\\)`).exec(mdEn); if (!r) throw new Error(`AI_INSTRUCTIONS_PERSONAL.en.md に「Start (${name})」がありません`); return esc(r[1].trim()); };
  const psEn = translate(ps.replace("<!--PROMPT_MAKE-->", "@@PM@@").replace("<!--PROMPT_USE-->", "@@PU@@"), table, "src/personal.src.html");
  outputs.set("docs/en/me/index.html", page(psEn.replace("@@PM@@", () => pickEn("creating")).replace("@@PU@@", () => pickEn("unwell")).replace("/*VALIDATE*/", () => translate(validateJs, table, "src/validate.js")), "en"));
  outputs.set("docs/en/me/AI_INSTRUCTIONS_PERSONAL.en.md", mdEn);
}
outputs.set("docs/index.html", page(read("src/index.src.html")));   // トップ（取り組みの説明）
{ // 英語版のトップ: 日本語版と同じ <style> を使い、本文だけ差し替える
  const ja = read("src/index.src.html"), st = ja.slice(ja.indexOf("<style>"), ja.indexOf("</style>") + 8);
  const fonts = ja.match(/<link rel="stylesheet"[^>]+>/)[0];
  const head = `<title>Open Intake</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<meta name="description" content="An open JSON format that lets clinics publish correct information on their own website, so that patients' AI assistants can match them with the right clinic.">\n<link rel="alternate" hreflang="ja" href="../">\n<link rel="alternate" hreflang="en" href="./">\n<link rel="preconnect" href="https://fonts.googleapis.com">\n${fonts}\n`;
  outputs.set("docs/en/index.html", page(head + st + "\n\n" + read("src/index.en.body.html"), "en"));
}
outputs.set("docs/.nojekyll", "");
const copyTree = (from, to) => { for (const e of fs.readdirSync(from, { withFileTypes: true })) {
  const a = path.join(from, e.name), b = path.join(to, e.name);
  if (e.isDirectory()) copyTree(a, b); else outputs.set(b.split(path.sep).join("/"), read(a));
} };
copyTree("schema", "docs/schema");
copyTree("examples", "docs/examples");
copyTree("profiles", "docs/profiles");

let stale = [];
for (const [f, text] of outputs) {
  const cur = fs.existsSync(f) ? read(f) : null;
  if (cur === text) continue;
  if (check) { stale.push(f); continue; }
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, text);
  console.log("wrote", f);
}
if (check) {
  if (stale.length) { console.error("docs/ が古いままです。node tools/build.mjs を走らせてください:\n  " + stale.join("\n  ")); process.exit(1); }
  console.log("docs/ は最新です");
}

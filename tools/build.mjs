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
const body = src.replace("<!--PROMPT-->", () => esc(m[1].trim())).replace("/*VALIDATE*/", () => validateJs);

const page = b => `<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<style>[hidden]{display:none!important}body{margin:0}</style>\n</head>\n<body>\n${b}\n</body>\n</html>\n`;
const outputs = new Map();
outputs.set("docs/maker/index.html", page(body));   // 作成ツール
outputs.set("docs/index.html", page(read("src/index.src.html")));   // トップ（取り組みの説明）
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

// 判定の資料を作る: node tools/judge-input.mjs <答えのフォルダ> <出力ファイル> [問題のファイル]
// Builds the judging document: node tools/judge-input.mjs <answers dir> <out file> [cases file]
//
// 答えのフォルダには <id>.md（読む側の AI の答え）を置く。出力の文の前に conformance/judge-prompt.txt を付けて、
// 答えたモデルと別の系統の AI 二つに渡す（conformance/criteria.md の 5）。判定は {"cases":[{"id","must","mustNot","verdict","note"}]} の JSON で返る
import fs from "node:fs";
import path from "node:path";

export function judgeInput(cases, dir, title = path.basename(dir)) {
  const out = [`# 判定の資料（${title}）`, ""];
  for (const c of cases) {
    const a = fs.readFileSync(path.join(dir, c.id + ".md"), "utf8").trim();
    out.push(`## ${c.id}`, `- 今: ${c.now}`, `- 患者の言葉: ${c.patient.ja}`);
    if (c.context) out.push(`- ほかに分かっていること: ${c.context.ja}`);
    out.push("- must（全部要る）:", ...c.must.map((x, i) => `  - M${i + 1}: ${x.ja}`));
    out.push("- mustNot（1つでもあれば×）:", ...c.mustNot.map((x, i) => `  - N${i + 1}: ${x.ja}`));
    out.push("", "### 答え", "", "````", a, "````", "");
  }
  return out.join("\n") + "\n";
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) {
  const [dir, outFile, file = "conformance/cases.json"] = process.argv.slice(2);
  if (!dir || !outFile) { console.error("使い方: node tools/judge-input.mjs <答えのフォルダ> <出力ファイル> [問題のファイル]"); process.exit(2); }
  const C = JSON.parse(fs.readFileSync(file, "utf8"));
  fs.writeFileSync(outFile, judgeInput(C.cases, dir));
  console.log(`${C.cases.length} 問の判定の資料を ${outFile} に書いた`);
}

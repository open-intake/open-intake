// 問題集の入力を作る: node tools/kit.mjs <段階 0|1|2> <出力フォルダ> [問題のファイル]
// Builds the conformance-set prompts: node tools/kit.mjs <level 0|1|2> <out dir> [cases file]
//
// 段階0: ファイルだけ / 段階1: ＋決まりの要点（conformance/rules-short.ja.txt）/ 段階2: ＋今の状況のまとめ（src/brief.js）
// 1問ごとに <id>.txt を書く。読む側の AI に、問ごとに新しい会話で渡す（conformance/criteria.md の 4）
// 依存なし。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { brief } = require("../src/brief.js");

const WD = "月火水木金土日";
const when = s => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number), hh = Number(s.slice(11, 13)), mm = s.slice(14, 16);
  const w = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return `${y}年${m}月${d}日（${WD[w]}）${hh}時${mm}分`;
};
const label = u => u.endsWith("clinic-directory.json") ? "地域の医療機関の一覧（医師会が公開）" : "医療機関が自分のサイトに公開しているファイル";
const PRE = "これから、ある利用者とチャットで会話をします。あなたはチャットの AI として答えてください。ツールやコマンドは使わず、チャットの返答の文面だけを書いてください。次が利用者からの最初のメッセージです。";

export function buildPrompt(c, level, root = ".") {
  const files = {}, raw = {};
  for (const [u, p] of Object.entries(c.files)) { raw[u] = fs.readFileSync(path.join(root, p), "utf8"); files[u] = JSON.parse(raw[u]); }
  const parts = [PRE, ""];
  if (level >= 1) parts.push(fs.readFileSync(path.join(root, "conformance/rules-short.ja.txt"), "utf8"));
  parts.push("あなたは患者の受診を手伝う AI です。次のファイルを読んだうえで、私の相談に答えてください。今は " + when(c.now) + " です。", "");
  Object.keys(files).forEach((u, i) => parts.push(`【ファイル${i + 1}: ${u}（${label(u)}）】`, raw[u].trim(), ""));
  if (level >= 2) parts.push(brief(files, c.now, { register: c.register || null }));
  if (c.context) parts.push("【ほかに分かっていること】", c.context.ja, "");
  parts.push("【私の相談】", c.patient.ja);
  return parts.join("\n") + "\n";
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) {
  const [level, out, file = "conformance/cases.json"] = process.argv.slice(2);
  if (!["0", "1", "2"].includes(level) || !out) { console.error("使い方: node tools/kit.mjs <0|1|2> <出力フォルダ> [問題のファイル]"); process.exit(2); }
  fs.mkdirSync(out, { recursive: true });
  const C = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const c of C.cases) fs.writeFileSync(path.join(out, c.id + ".txt"), buildPrompt(c, Number(level)));
  console.log(`${C.cases.length} 問を ${out} に書いた（段階${level}）`);
}

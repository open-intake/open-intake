/*
 * オープン問診票（Open Intake）の検査器 — SPEC.md §7 の規則をそのまま書いたもの。
 * ブラウザでは作成サイトに埋め込まれ（グローバル OpenIntakeValidate）、node では require で読める。
 * 互換の決まり（SPEC.md §8）: 知らないキーは見ない。古い版のファイルもエラーにしない。
 * License: Apache-2.0
 */
var OpenIntakeValidate = (function () {
"use strict";
const SUPPORTED_VERSIONS = ["0.1"];
const DAY_KEYS = ["Mo","Tu","We","Th","Fr","Sa","Su","PH"];
const TYPE_KEYS = ["group","boolean","choice","open-choice","string","text","integer","decimal","date","display"];
const CHOICE = new Set(["choice","open-choice"]);
function validate(o) {
  const E = [], W = [];
  const err = (code, msg, where) => E.push({ code, msg, where });
  const warn = (code, msg, where) => W.push({ code, msg, where });
  const isStr = v => typeof v === "string" && v.trim() !== "";
  const isObj = v => v && typeof v === "object" && !Array.isArray(v);
  const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!isObj(o)) { err("E1", "JSON の一番外側がオブジェクト（{ }）ではありません。", "$"); return { E, W }; }
  if (o.spec !== "open-intake") err("E1", "spec は \"open-intake\" にしてください。", "spec");
  if (!isStr(o.specVersion)) err("E1", "specVersion（例: \"0.1\"）がありません。", "specVersion");
  else if (!/^\d+\.\d+$/.test(o.specVersion)) err("E1", "specVersion は \"0.1\" のような形にしてください。", "specVersion");
  else if (!SUPPORTED_VERSIONS.includes(o.specVersion)) warn("W6", `specVersion ${o.specVersion} は、この検査器（${SUPPORTED_VERSIONS.join("・")} に対応）より新しい版です。知らないキーは無視して検査しました。`, "specVersion");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.updated || "")) err("E2", "updated は YYYY-MM-DD の形の日付にしてください。", "updated");
  else { const age = (Date.now() - new Date(o.updated + "T00:00:00").getTime()) / 864e5; if (age > 365) warn("W2", "最後に確かめた日（updated）が1年以上前です。内容を確かめて日付を新しくしてください。", "updated"); }
  const c = o.clinic;
  if (!isObj(c)) err("E3", "clinic（医療機関の情報）がありません。", "clinic");
  else {
    if (!isStr(c.name)) err("E3", "医療機関の名前が空です。", "clinic.name");
    if (!isStr(c.telephone)) err("E3", "電話番号が空です。", "clinic.telephone");
    else if (!/^[0-9+()\- ]{6,}$/.test(c.telephone)) warn("W1", "電話番号に数字・ハイフン以外の文字が入っています。", "clinic.telephone");
    if (isStr(c.url) && !/^https:\/\//.test(c.url)) warn("W1", "ホームページの URL が https で始まっていません。", "clinic.url");
    const a = c.address;
    if (!isObj(a) || !isStr(a.addressRegion)) err("E3", "都道府県が空です。", "clinic.address.addressRegion");
    if (!isObj(a) || !isStr(a.addressLocality)) err("E3", "市区町村が空です。", "clinic.address.addressLocality");
    if (isObj(a) && isStr(a.postalCode) && !/^\d{3}-?\d{4}$/.test(a.postalCode)) warn("W1", "郵便番号は 100-0000 の形にしてください。", "clinic.address.postalCode");
    if (!Array.isArray(c.departments) || !c.departments.filter(isStr).length) err("E4", "診療科を1つ以上選んでください。", "clinic.departments");
    if (!Array.isArray(c.openingHours) || !c.openingHours.length) err("E5", "診療時間を1つ以上入れてください。", "clinic.openingHours");
    else c.openingHours.forEach((h, i) => {
      const w = `clinic.openingHours[${i}]`;
      if (!Array.isArray(h.days) || !h.days.length) err("E5", `診療時間 ${i+1} 行目: 曜日を選んでください。`, w + ".days");
      else if (h.days.some(x => !DAY_KEYS.includes(x))) err("E5", `診療時間 ${i+1} 行目: 曜日は Mo〜Su と PH だけが使えます。`, w + ".days");
      if (!TIME.test(h.opens || "") || !TIME.test(h.closes || "")) err("E5", `診療時間 ${i+1} 行目: 時刻を 09:00 の形で入れてください。`, w);
      else if (h.opens >= h.closes) err("E5", `診療時間 ${i+1} 行目: 始まり（${h.opens}）が終わり（${h.closes}）より後になっています。`, w);
    });
    if (!Array.isArray(c.booking) || !c.booking.length) err("E6", "予約・受診の方法を1つ以上入れてください。", "clinic.booking");
    else c.booking.forEach((b, i) => {
      const w = `clinic.booking[${i}]`;
      if (!["web","phone","walk-in","other"].includes(b.method)) err("E6", `予約の方法 ${i+1}: method が決まった値（web / phone / walk-in / other）ではありません。`, w + ".method");
      if (b.method === "web" && !isStr(b.url)) err("E6", `予約の方法 ${i+1}: Web 予約のページの URL を入れてください。`, w + ".url");
      if (b.method === "web" && isStr(b.url) && !/^https:\/\//.test(b.url)) warn("W1", `予約の方法 ${i+1}: 予約ページの URL が https で始まっていません。`, w + ".url");
      if (b.method === "phone" && !isStr(b.telephone)) err("E6", `予約の方法 ${i+1}: 予約用の電話番号を入れてください。`, w + ".telephone");
    });
  }
  const s = o.safety;
  if (!isObj(s)) err("E7", "safety（安全のための決まり）がありません。省略できません。", "safety");
  else {
    if (s.noDiagnosis !== true) err("E7", "safety.noDiagnosis は true にしてください。", "safety.noDiagnosis");
    if (!isStr(s.emergency)) err("E7", "緊急時の案内文が空です。", "safety.emergency");
    if (!Array.isArray(s.redFlags) || !s.redFlags.filter(isStr).length) err("E7", "救急の目安になる症状を1つ以上入れてください。", "safety.redFlags");
  }
  if (typeof o.aiNotes === "string" && o.aiNotes.length > 500) warn("W5", `AI へのお願いが長すぎます（${o.aiNotes.length} 字・500 字まで）。`, "aiNotes");
  if (!Array.isArray(o.questionnaires)) err("E8", "questionnaires（問診票の並び）がありません。空なら [] にしてください。", "questionnaires");
  else {
    if (!o.questionnaires.length) warn("W4", "問診票が1つもありません。医院の情報だけでも使えますが、問診票があると受診前の記入に役立ちます。", "questionnaires");
    const qids = new Set();
    o.questionnaires.forEach((q, qi) => {
      const w = `questionnaires[${qi}]`, name = (isObj(q) && isStr(q.title)) ? `「${q.title}」` : `${qi+1} 番目の問診票`;
      if (!isObj(q)) { err("E8", `${name} の形が正しくありません。`, w); return; }
      if (q.resourceType !== "Questionnaire") err("E8", `${name}: resourceType は "Questionnaire" にしてください。`, w + ".resourceType");
      if (!/^[A-Za-z0-9\-.]{1,64}$/.test(q.id || "")) err("E8", `${name}: id は半角英数字とハイフンにしてください（例: fever）。`, w + ".id");
      else if (qids.has(q.id)) err("E8", `${name}: id「${q.id}」がほかの問診票と重なっています。`, w + ".id");
      else qids.add(q.id);
      if (!["draft","active"].includes(q.status)) err("E8", `${name}: status は draft か active にしてください。`, w + ".status");
      else if (q.status === "draft") warn("W3", `${name} は医師の確認前（draft）です。確認が済んだら「使用中」にしてください。`, w + ".status");
      if (!isStr(q.title)) err("E8", `${name}: 問診票の名前が空です。`, w + ".title");
      if (!Array.isArray(q.item) || !q.item.length) { err("E8", `${name}: 質問が1つもありません。`, w + ".item"); return; }
      const seen = new Map();
      const walk = (items, path, depth) => items.forEach((it, i) => {
        const p = `${path}[${i}]`, label = `${name} Q${i+1}`;
        if (!isObj(it)) { err("E8", `${label}: 質問の形が正しくありません。`, p); return; }
        if (!/^[A-Za-z0-9\-._]{1,64}$/.test(it.linkId || "")) err("E9", `${label}: linkId は半角英数字にしてください。`, p + ".linkId");
        else if (seen.has(it.linkId)) err("E9", `${label}: linkId「${it.linkId}」が重なっています。`, p + ".linkId");
        if (!isStr(it.text)) err("E8", `${label}: 質問文が空です。`, p + ".text");
        else if (it.text.length > 200) warn("W5", `${label}: 質問文が長すぎます（${it.text.length} 字・200 字まで）。`, p + ".text");
        if (!TYPE_KEYS.includes(it.type)) err("E10", `${label}: 答え方（type）「${it.type}」は使えません。`, p + ".type");
        if (CHOICE.has(it.type) && (!Array.isArray(it.answerOption) || !it.answerOption.filter(x => isStr(x?.valueString)).length)) err("E10", `${label}: 選択肢を1つ以上入れてください。`, p + ".answerOption");
        if (Array.isArray(it.enableWhen)) it.enableWhen.forEach((ew, k) => {
          const target = seen.get(ew?.question);
          if (!target) err("E11", `${label}: 表示の条件が、それより前にない質問（${ew?.question || "空"}）を指しています。`, `${p}.enableWhen[${k}]`);
          if (!["=","exists"].includes(ew?.operator)) err("E11", `${label}: 表示の条件の operator は "=" か "exists" にしてください。`, `${p}.enableWhen[${k}].operator`);
        });
        if (isStr(it.linkId)) seen.set(it.linkId, it);
        if (Array.isArray(it.item)) { if (depth >= 2) err("E8", `${label}: グループの入れ子は2段までです。`, p + ".item"); walk(it.item, p + ".item", depth + 1); }
      });
      walk(q.item, w + ".item", 1);
    });
  }
  return { E, W };
}
return { validate, SUPPORTED_VERSIONS, DAY_KEYS, TYPE_KEYS };
})();
if (typeof module !== "undefined" && module.exports) module.exports = OpenIntakeValidate;

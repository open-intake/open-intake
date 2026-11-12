/*
 * オープン受診案内（Open Intake）の検査器 — SPEC.md §7 の規則をそのまま書いたもの。
 * ブラウザでは作成サイトに埋め込まれ（グローバル OpenIntakeValidate）、node では require で読める。
 * 互換の決まり（SPEC.md §8）: 知らないキーは見ない。古い版のファイルもエラーにしない。
 * License: Apache-2.0
 */
var OpenIntakeValidate = (function () {
"use strict";
const SUPPORTED_VERSIONS = ["0.1", "0.2", "0.3", "0.4", "0.5"];
// 版が 0.5 以上か（"0.10" のような番号も正しく比べる）
const atLeast = (v, want) => { if (typeof v !== "string") return false; const a = v.split(".").map(Number), b = want.split(".").map(Number); return a[0] !== b[0] ? a[0] > b[0] : (a[1] || 0) >= (b[1] || 0); };
// 対象を絞った行か（v0.5 から scopedOpeningHours・scopedExceptions に置く。SPEC §4）
const isNarrowed = h => !!h && typeof h === "object" && (h.department !== undefined || (Array.isArray(h.service) && !(h.service.length === 1 && h.service[0] === "general")) || h.visitType === "first" || h.visitType === "return" || h.weeksOfMonth !== undefined || h.entry === "none");
const STATUS_STATES = ["closed","moved","withdrawn"];
const ENDPOINT_TYPES = ["mcp","api","other"];
const KNOWN_ROLES = ["schedule"];
// 識別番号の体系（SPEC §4c）。URI か、この表にある名前を使う
const KNOWN_ID_SYSTEMS = { "jp-medical-institution-code": /^\d{10}$/ };
const COUNTRY = /^[A-Z]{2}$/;
const KNOWN_AGE_GROUPS = ["older", "child"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const todayStr = () => { const d = new Date(); const p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; };
const dayDiff = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
const DAY_KEYS = ["Mo","Tu","We","Th","Fr","Sa","Su","PH"];
const TYPE_KEYS = ["group","boolean","choice","open-choice","string","text","integer","decimal","date","display"];
const CHOICE = new Set(["choice","open-choice"]);
// 受け付け方の欄（v0.4 から・SPEC §4 の openingHours・§6b の exceptions）
const KNOWN_SERVICES = ["general","checkup","vaccination","procedure","rehabilitation","other"];
const VISIT_TYPES = ["all","first","return"];
const ENTRIES = ["walk-in","appointment","none"];
const BOOKING_MODES = ["time-slot","queue","request"];
// 受付の時刻・診療科・用途・受け付け方を見る。code はエラーの番号（E5 か S4）
function checkReception(h, w, label, code, err, warn, departments) {
  const isStr = v => typeof v === "string" && v.trim() !== "";
  if (h.reception !== undefined) {
    const r = h.reception;
    if (!r || typeof r !== "object" || Array.isArray(r)) err(code, `${label}: 受付の時間（reception）は { } にしてください。`, w + ".reception");
    else {
      if (r.opens === undefined && r.closes === undefined) err(code, `${label}: 受付の時間に、始まり（opens）か締め切り（closes）を入れてください。`, w + ".reception");
      for (const k of ["opens","closes"]) if (r[k] !== undefined && !TIME_RE.test(r[k])) err(code, `${label}: 受付の時刻を 09:00 の形で入れてください。`, `${w}.reception.${k}`);
      if (TIME_RE.test(r.opens || "") && TIME_RE.test(r.closes || "") && r.opens >= r.closes) err(code, `${label}: 受付の始まり（${r.opens}）が締め切り（${r.closes}）より後になっています。`, w + ".reception");
      if (TIME_RE.test(r.closes || "") && TIME_RE.test(h.closes || "") && r.closes > h.closes) warn("W19", `${label}: 受付の締め切り（${r.closes}）が、診療の終わり（${h.closes}）より後です。間違いでないか確かめてください。`, w + ".reception.closes");
      if (TIME_RE.test(r.closes || "") && TIME_RE.test(h.opens || "") && r.closes <= h.opens) warn("W19", `${label}: 受付の締め切り（${r.closes}）が、診療の始まり（${h.opens}）より前です。ほかの時間の締め切りを写していないか確かめてください。`, w + ".reception.closes");
    }
  }
  if (h.department !== undefined) {
    if (!isStr(h.department)) err(code, `${label}: 診療科（department）は文字にしてください。`, w + ".department");
    else if (Array.isArray(departments) && !departments.includes(h.department)) warn("W20", `${label}: 診療科「${h.department}」が、診療科の一覧にありません。`, w + ".department");
  }
  if (h.service !== undefined) {
    if (!Array.isArray(h.service) || !h.service.length || !h.service.every(isStr)) err(code, `${label}: 用途（service）は文字の配列にしてください。`, w + ".service");
    else h.service.filter(x => !KNOWN_SERVICES.includes(x)).forEach(x => warn("W21", `${label}: 用途「${x}」は、この検査器が知らない値です（読む側は無視します）。`, w + ".service"));
  }
  if (h.visitType !== undefined && !VISIT_TYPES.includes(h.visitType)) err(code, `${label}: visitType は all（すべて）・first（初診）・return（再診）のどれかにしてください。`, w + ".visitType");
  if (h.entry !== undefined && !ENTRIES.includes(h.entry)) err(code, `${label}: entry は walk-in（予約なしでも可）・appointment（予約の人だけ）・none（新しい受付はしない）のどれかにしてください。`, w + ".entry");
}
function validateIntake(o) {
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
  else {
    let last = o.updated;
    if (o.verified !== undefined) {
      if (!(typeof o.verified === "string" && DATE.test(o.verified))) err("E18", "verified（確かめた日）は YYYY-MM-DD の形にしてください。", "verified");
      else if (o.verified < o.updated) err("E18", "確かめた日（verified）が、中身を直した日（updated）より前になっています。", "verified");
      else if (o.verified > todayStr()) err("E18", "確かめた日（verified）が、今日より後になっています。", "verified");
      else last = o.verified;
    }
    const age = (Date.now() - new Date(last + "T00:00:00").getTime()) / 864e5;
    if (age > 180) warn("W2", "最後に確かめた日（updated・verified の新しいほう）から180日を過ぎています。内容を確かめて、変わっていなければ verified を今日にしてください。", o.verified !== undefined ? "verified" : "updated");
  }
  const hasStatus = o.status !== undefined;
  if (hasStatus) {
    const st = o.status;
    if (!isObj(st) || !STATUS_STATES.includes(st.state)) err("E19", "status は state（closed＝閉院・moved＝移転・withdrawn＝ファイルでの案内の終了）を持つ { } にしてください。", "status");
    else {
      if (st.date !== undefined && !(typeof st.date === "string" && DATE.test(st.date))) err("E19", "status.date は YYYY-MM-DD の形にしてください。", "status.date");
      if (st.movedTo !== undefined && (typeof st.movedTo !== "string" || !st.movedTo.trim() || /\s/.test(st.movedTo))) err("E19", "status.movedTo は空白を含まない URL にしてください。", "status.movedTo");
      if (typeof st.note === "string" && st.note.length > 200) warn("W5", `status の補足が長すぎます（${st.note.length} 字・200 字まで）。`, "status.note");
    }
  }
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
    if (isObj(a) && isStr(a.postalCode) && (!a.addressCountry || a.addressCountry === "JP") && !/^\d{3}-?\d{4}$/.test(a.postalCode)) warn("W1", "郵便番号は 100-0000 の形にしてください。", "clinic.address.postalCode");
    if (!Array.isArray(c.departments) || !c.departments.filter(isStr).length) err("E4", "診療科を1つ以上選んでください。", "clinic.departments");
    if (isObj(c.address) && c.address.addressCountry !== undefined && !COUNTRY.test(String(c.address.addressCountry))) err("E15", "国（addressCountry）は ISO 3166-1 の2文字の大文字にしてください（例: JP）。", "clinic.address.addressCountry");
    if (c.identifiers !== undefined) {
      if (!Array.isArray(c.identifiers)) err("E15", "identifiers（識別番号）は配列（[ ]）にしてください。", "clinic.identifiers");
      else c.identifiers.forEach((id, i) => {
        const w = `clinic.identifiers[${i}]`;
        if (!isObj(id) || !isStr(id.system) || !isStr(id.value)) { err("E15", `識別番号 ${i+1}: system（どの体系か）と value（番号）を入れてください。`, w); return; }
        const re = KNOWN_ID_SYSTEMS[id.system];
        if (re && !re.test(id.value)) err("E15", `識別番号 ${i+1}: ${id.system} の番号の形が正しくありません。`, w + ".value");
        if (!re && !/^(https?:|urn:)/.test(id.system)) warn("W15", `識別番号 ${i+1}: system「${id.system}」は、この検査器が知らない名前です。URI（https:// や urn:）で書くことを勧めます。`, w + ".system");
      });
    }
    if (c.geo !== undefined) {
      const g = c.geo, okNum = (v, lo, hi) => typeof v === "number" && isFinite(v) && v >= lo && v <= hi;
      if (!isObj(g) || !okNum(g.latitude, -90, 90) || !okNum(g.longitude, -180, 180)) err("E15", "位置（geo）は、latitude（緯度 -90〜90）と longitude（経度 -180〜180）の数にしてください。", "clinic.geo");
    }
    if (c.focus !== undefined) {
      if (!Array.isArray(c.focus)) err("E13", "focus（得意分野）は配列（[ ]）にしてください。", "clinic.focus");
      else c.focus.forEach((f, i) => {
        const w = `clinic.focus[${i}]`;
        if (!isObj(f) || !Array.isArray(f.areas) || !f.areas.filter(isStr).length) err("E13", `得意分野 ${i+1}: 内容（areas）を1つ以上入れてください。`, w + ".areas");
        else if (isStr(f.department) && Array.isArray(c.departments) && !c.departments.includes(f.department)) warn("W14", `得意分野 ${i+1}: 診療科「${f.department}」が、診療科の一覧にありません。`, w + ".department");
      });
      const nAreas = Array.isArray(c.focus) ? c.focus.reduce((n, f) => n + (isObj(f) && Array.isArray(f.areas) ? f.areas.length : 0), 0) : 0;
      if (nAreas > 10) warn("W17", `得意分野が ${nAreas} 個あります。多く並べると手がかりにならないので、主なものを数個にしてください。`, "clinic.focus");
    }
    if (Array.isArray(c.handles) && c.handles.length > 15) warn("W24", `主に診ている症状（handles）が ${c.handles.length} 個あります。多く並べると手がかりにならないので、主なものにしてください（15個まで）。`, "clinic.handles");
    if (Array.isArray(c.notHandled)) c.notHandled.forEach((x, i) => {
      if (isStr(x) && /(\u98f2\u3093\u3067|\u670d\u7528|\u6301\u75c5|\u65e2\u5f80|\u6cbb\u7642\u4e2d|\u901a\u9662\u4e2d|taking|medication|condition)/i.test(x)) warn("W18", `対応していないこと ${i+1}: 「${x}」は患者の持病や薬についての書き方に見えます。提供していない診療・処置・年齢層だけを書いてください（受け入れを断る掲示にならないように）。`, `clinic.notHandled[${i}]`);
    });
    const scoped = c.scopedOpeningHours;
    if (scoped !== undefined && !Array.isArray(scoped)) err("E5", "scopedOpeningHours（対象を絞った診療時間）は配列（[ ]）にしてください。", "clinic.scopedOpeningHours");
    const nScoped = Array.isArray(scoped) ? scoped.length : 0;
    const v05 = atLeast(o.specVersion, "0.5");
    if (!Array.isArray(c.openingHours) || (!c.openingHours.length && !nScoped && !hasStatus)) err("E5", "診療時間を1つ以上入れてください。", "clinic.openingHours");
    const rows = [];
    if (Array.isArray(c.openingHours)) c.openingHours.forEach((h, i) => rows.push([h, `clinic.openingHours[${i}]`, `診療時間 ${i+1} 行目`, false]));
    if (Array.isArray(scoped)) scoped.forEach((h, i) => rows.push([h, `clinic.scopedOpeningHours[${i}]`, `対象を絞った診療時間 ${i+1} 行目`, true]));
    rows.forEach(([h, w, label, inScoped]) => {
      if (!isObj(h)) { err("E5", `${label}: 形が正しくありません。`, w); return; }
      if (!inScoped && v05 && isNarrowed(h)) warn("W23", `${label}: 診療科・用途・初診か再診か・第何週で絞った行、または新しい受付をしない行です。0.5 からは scopedOpeningHours に置いてください（0.4 を知らない AI が、全員向けの時間と読まないように）。`, w);
      if (!Array.isArray(h.days) || !h.days.length) err("E5", `${label}: 曜日を選んでください。`, w + ".days");
      else if (h.days.some(x => !DAY_KEYS.includes(x))) err("E5", `${label}: 曜日は Mo〜Su と PH だけが使えます。`, w + ".days");
      if (!TIME.test(h.opens || "") || !TIME.test(h.closes || "")) err("E5", `${label}: 時刻を 09:00 の形で入れてください。`, w);
      else if (h.opens >= h.closes) err("E5", `${label}: 始まり（${h.opens}）が終わり（${h.closes}）より後になっています。`, w);
      checkReception(h, w, label, "E5", err, warn, c.departments);
      if (h.mayEndEarly !== undefined && typeof h.mayEndEarly !== "boolean") err("E5", `${label}: mayEndEarly は true か false にしてください。`, w + ".mayEndEarly");
      if (h.weeksOfMonth !== undefined && (!Array.isArray(h.weeksOfMonth) || !h.weeksOfMonth.length || h.weeksOfMonth.some(n => !Number.isInteger(n) || n < 1 || n > 5) || new Set(h.weeksOfMonth).size !== h.weeksOfMonth.length))
        err("E5", `${label}: 第何週（weeksOfMonth）は、1〜5 の数を重ならないように並べてください。`, w + ".weeksOfMonth");
    });
    if (c.appointmentRequired !== undefined && typeof c.appointmentRequired !== "boolean") err("E17", "完全予約制か（appointmentRequired）は true か false にしてください。わからないときは書かないでください。", "clinic.appointmentRequired");
    if (!Array.isArray(c.booking) || (!c.booking.length && !hasStatus)) err("E6", "予約・受診の方法を1つ以上入れてください。", "clinic.booking");
    if (hasStatus && ((Array.isArray(c.openingHours) && c.openingHours.length) || nScoped || (Array.isArray(c.booking) && c.booking.length))) warn("W26", "閉院・移転など（status）を書いたのに、診療時間か予約の方法が残っています。0.5 を知らない AI に古い時間が見えるので、空にすることを勧めます。", "status");
    else c.booking.forEach((b, i) => {
      const w = `clinic.booking[${i}]`;
      if (!["web","phone","walk-in","other"].includes(b.method)) err("E6", `予約の方法 ${i+1}: method が決まった値（web / phone / walk-in / other）ではありません。`, w + ".method");
      if (b.method === "web" && !isStr(b.url)) err("E6", `予約の方法 ${i+1}: Web 予約のページの URL を入れてください。`, w + ".url");
      if (b.method === "web" && isStr(b.url) && !/^https:\/\//.test(b.url)) warn("W1", `予約の方法 ${i+1}: 予約ページの URL が https で始まっていません。`, w + ".url");
      if (b.method === "phone" && !isStr(b.telephone)) err("E6", `予約の方法 ${i+1}: 予約用の電話番号を入れてください。`, w + ".telephone");
      if (b.hours !== undefined) {
        if (!Array.isArray(b.hours) || !b.hours.length) err("E6", `予約の方法 ${i+1}: 予約を受け付ける時間（hours）は配列（[ ]）にしてください。`, w + ".hours");
        else b.hours.forEach((x, k) => {
          const hw = `${w}.hours[${k}]`;
          if (!isObj(x) || !Array.isArray(x.days) || !x.days.length || x.days.some(d => !DAY_KEYS.includes(d))) err("E6", `予約の方法 ${i+1} の受付時間 ${k+1}: 曜日（Mo〜Su・PH）を入れてください。`, hw + ".days");
          if (!isObj(x) || !TIME.test(x.opens || "") || !TIME.test(x.closes || "")) err("E6", `予約の方法 ${i+1} の受付時間 ${k+1}: 時刻を 09:00 の形で入れてください。`, hw);
          else if (x.opens >= x.closes) err("E6", `予約の方法 ${i+1} の受付時間 ${k+1}: 始まり（${x.opens}）が終わり（${x.closes}）より後になっています。`, hw);
        });
      }
      if (b.mode !== undefined && !BOOKING_MODES.includes(b.mode)) err("E6", `予約の方法 ${i+1}: mode は time-slot（時刻の枠）・queue（当日の順番）・request（申し込んで返事を待つ）のどれかにしてください。`, w + ".mode");
      if (b.visitType !== undefined && !VISIT_TYPES.includes(b.visitType)) err("E6", `予約の方法 ${i+1}: visitType は all（すべて）・first（初診）・return（再診）のどれかにしてください。`, w + ".visitType");
      if (b.platform !== undefined && !(isObj(b.platform) && (isStr(b.platform.name) || isStr(b.platform.url)))) err("E6", `予約の方法 ${i+1}: platform（予約の基盤）は、name か url を持つ { } にしてください。`, w + ".platform");
      if (b.endpoints !== undefined) {
        if (!Array.isArray(b.endpoints)) err("E6", `予約の方法 ${i+1}: endpoints は配列（[ ]）にしてください。`, w + ".endpoints");
        else b.endpoints.forEach((x, k) => {
          if (!isObj(x) || !ENDPOINT_TYPES.includes(x.type)) err("E6", `予約の方法 ${i+1} の入口 ${k+1}: type は mcp・api・other のどれかにしてください。`, `${w}.endpoints[${k}].type`);
          if (!isObj(x) || typeof x.url !== "string" || !/^https:\/\/\S+$/.test(x.url)) err("E6", `予約の方法 ${i+1} の入口 ${k+1}: url を https:// で入れてください。`, `${w}.endpoints[${k}].url`);
        });
      }
      if (b.statusUrl !== undefined) { if (!isStr(b.statusUrl) || /\s/.test(b.statusUrl)) err("E6", `予約の方法 ${i+1}: 順番や空きを確かめるページ（statusUrl）の URL が正しくありません。`, w + ".statusUrl"); else if (!/^https:\/\//.test(b.statusUrl)) warn("W1", `予約の方法 ${i+1}: 順番や空きを確かめるページの URL が https で始まっていません。`, w + ".statusUrl"); }
    });
  }
  if (o.policy !== undefined && typeof o.policy !== "string" && !(isObj(o.policy) && isStr(o.policy.url))) err("E14", "policy は、url（決まりの場所）を持つ { } にしてください。", "policy");
  if (o.profile !== undefined && !(isStr(o.profile) || (isObj(o.profile) && isStr(o.profile.id)))) err("E16", "profile（地域プロファイル）は、id を持つ { }（例: {\"id\": \"jp\", \"url\": \"…\"}）にしてください。", "profile");
  if (isObj(o.profile)) {
    if (o.profile.updated !== undefined && !(typeof o.profile.updated === "string" && DATE.test(o.profile.updated))) err("E20", "profile.updated（使ったプロファイルの更新日）は YYYY-MM-DD の形にしてください。", "profile.updated");
    if (o.profile.sha256 !== undefined && !(typeof o.profile.sha256 === "string" && /^[0-9a-f]{64}$/.test(o.profile.sha256))) err("E20", "profile.sha256 は16進の小文字64文字にしてください。", "profile.sha256");
  }
  if (o.files !== undefined) {
    if (!Array.isArray(o.files)) err("E12", "files（正規のファイルの一覧）は配列（[ ]）にしてください。", "files");
    else {
      const roles = new Map();
      o.files.forEach((f, i) => {
        const w = `files[${i}]`;
        if (!isObj(f)) { err("E12", `ファイルの一覧 ${i+1}: 形が正しくありません。`, w); return; }
        if (!isStr(f.role)) err("E12", `ファイルの一覧 ${i+1}: 役割（role）が空です（例: schedule）。`, w + ".role");
        else if (!KNOWN_ROLES.includes(f.role)) warn("W11", `ファイルの一覧 ${i+1}: 役割「${f.role}」は、この検査器が知らないものです（読む側は無視します）。`, w + ".role");
        else if (roles.has(f.role)) err("E12", `ファイルの一覧 ${i+1}: 役割「${f.role}」のファイルが2つあります。1つにしてください。`, w + ".role");
        if (isStr(f.role)) roles.set(f.role, true);
        if (typeof f.url !== "string" || !f.url.trim() || /\s/.test(f.url)) err("E12", `ファイルの一覧 ${i+1}: url は空白を含まない URL にしてください（例: /clinic-schedule.json）。`, w + ".url");
        else if (/^http:\/\//.test(f.url)) warn("W1", `ファイルの一覧 ${i+1}: URL が https で始まっていません。`, w + ".url");
        else if (/^https?:\/\//.test(f.url) && isStr(o.clinic?.url)) {
          try { if (new URL(f.url).host !== new URL(o.clinic.url).host) warn("W12", `ファイルの一覧 ${i+1}: 医療機関のサイトと別のサイトにあります。AI が正規のファイルと確かめにくくなります。`, w + ".url"); } catch (_) {}
        }
      });
    }
  }
  const s = o.safety;
  if (!isObj(s)) err("E7", "safety（安全のための決まり）がありません。省略できません。", "safety");
  else {
    if (s.noDiagnosis !== true) err("E7", "safety.noDiagnosis は true にしてください。", "safety.noDiagnosis");
    if (!isStr(s.emergency)) err("E7", "緊急時の案内文が空です。", "safety.emergency");
    if (!Array.isArray(s.redFlags) || !s.redFlags.filter(isStr).length) err("E7", "救急の目安になる症状を1つ以上入れてください。", "safety.redFlags");
    if (s.redFlagsByAge !== undefined) {
      if (!isObj(s.redFlagsByAge)) err("E7", "safety.redFlagsByAge は、年代ごとの { } にしてください。", "safety.redFlagsByAge");
      else for (const [k, g] of Object.entries(s.redFlagsByAge)) {
        if (!isObj(g) || !Array.isArray(g.items) || !g.items.filter(isStr).length) err("E7", `年代「${k}」の救急の目安に、症状（items）を1つ以上入れてください。`, `safety.redFlagsByAge.${k}`);
        else if (!KNOWN_AGE_GROUPS.includes(k)) warn("W13", `年代「${k}」は、この検査器が知らないものです（older・child が決まっています）。`, `safety.redFlagsByAge.${k}`);
      }
    }
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
      if (q.derivedFrom !== undefined && !(Array.isArray(q.derivedFrom) && q.derivedFrom.every(isStr))) err("E8", `${name}: derivedFrom（元にした問診票の基本形）は URL の配列にしてください。`, w + ".derivedFrom");
      if (!Array.isArray(q.item) || !q.item.length) { err("E8", `${name}: 質問が1つもありません。`, w + ".item"); return; }
      const seen = new Map();
      const walk = (items, path, depth) => items.forEach((it, i) => {
        const p = `${path}[${i}]`, label = `${name} Q${i+1}`;
        if (!isObj(it)) { err("E8", `${label}: 質問の形が正しくありません。`, p); return; }
        if (!/^[A-Za-z0-9\-._]{1,64}$/.test(it.linkId || "")) err("E9", `${label}: linkId は半角英数字にしてください。`, p + ".linkId");
        else if (seen.has(it.linkId)) err("E9", `${label}: linkId「${it.linkId}」が重なっています。`, p + ".linkId");
        if (!isStr(it.text)) err("E8", `${label}: 質問文が空です。`, p + ".text");
        else if (it.text.length > 200) warn("W5", `${label}: 質問文が長すぎます（${it.text.length} 字・200 字まで）。`, p + ".text");
        if (it.derivedFrom !== undefined && !(Array.isArray(it.derivedFrom) && it.derivedFrom.every(isStr))) err("E8", `${label}: derivedFrom は URL の配列にしてください。`, p + ".derivedFrom");
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

// ---------- 臨時の情報（clinic-schedule.json・v0.2 から） ----------
function validateSchedule(o) {
  const E = [], W = [];
  const err = (code, msg, where) => E.push({ code, msg, where });
  const warn = (code, msg, where) => W.push({ code, msg, where });
  const isStr = v => typeof v === "string" && v.trim() !== "";
  const isObj = v => v && typeof v === "object" && !Array.isArray(v);
  const isDate = v => typeof v === "string" && DATE.test(v) && !isNaN(Date.parse(v + "T00:00:00Z"));
  const today = todayStr();
  if (!isObj(o)) { err("S1", "JSON の一番外側がオブジェクト（{ }）ではありません。", "$"); return { E, W }; }
  if (o.spec !== "open-intake-schedule") err("S1", "spec は \"open-intake-schedule\" にしてください。", "spec");
  if (!isStr(o.specVersion) || !/^\d+\.\d+$/.test(o.specVersion)) err("S1", "specVersion（例: \"0.2\"）がありません。", "specVersion");
  else if (!SUPPORTED_VERSIONS.includes(o.specVersion)) warn("W6", `specVersion ${o.specVersion} は、この検査器（${SUPPORTED_VERSIONS.join("・")} に対応）より新しい版です。知らないキーは無視して検査しました。`, "specVersion");
  if (!isDate(o.updated)) err("S2", "updated（更新した日）は YYYY-MM-DD の形にしてください。", "updated");
  if (!isDate(o.validUntil)) err("S3", "validUntil（この情報の有効期限）は YYYY-MM-DD の形で必ず入れてください。", "validUntil");
  else {
    if (isDate(o.updated) && o.validUntil < o.updated) err("S3", "有効期限（validUntil）が更新日より前になっています。", "validUntil");
    if (o.validUntil < today) warn("W7", `有効期限（${o.validUntil}）が過ぎています。AI はこのファイルを使いません。内容を確かめて期限を延ばしてください。`, "validUntil");
    if (isDate(o.updated) && dayDiff(o.updated, o.validUntil) > 180) warn("W8", "有効期限が更新日から半年以上先です。臨時の情報は、短めの期限にして、こまめに見直すことを勧めます。", "validUntil");
  }
  const old = (end, where, label) => { if (isDate(end) && end < today) warn("W9", `${label}は、もう終わった予定です。消してよいか確かめてください。`, where); };
  const hoursOk = (opens, closes, where, label, overnightOk) => {
    if (!TIME_RE.test(opens || "") || !TIME_RE.test(closes || "")) { err("S4", `${label}: 時刻を 09:00 の形で入れてください。`, where); return; }
    if (!overnightOk && opens >= closes) err("S4", `${label}: 始まり（${opens}）が終わり（${closes}）より後になっています。`, where);
  };
  const list = (k) => { if (o[k] === undefined) return []; if (!Array.isArray(o[k])) { err("S1", `${k} は配列（[ ]）にしてください。`, k); return []; } return o[k]; };
  const sv05 = atLeast(o.specVersion, "0.5");
  const exRows = [];
  list("exceptions").forEach((x, i) => exRows.push([x, `exceptions[${i}]`, `臨時の休診・変更 ${i+1}`, false]));
  list("scopedExceptions").forEach((x, i) => exRows.push([x, `scopedExceptions[${i}]`, `絞った臨時の変更 ${i+1}`, true]));
  exRows.forEach(([x, w, label, inScoped]) => {
    if (!isObj(x)) { err("S4", `${label}: 形が正しくありません。`, w); return; }
    if (!isDate(x.from) || !isDate(x.to)) err("S4", `${label}: 期間（from・to）を YYYY-MM-DD で入れてください。`, w);
    else { if (x.from > x.to) err("S4", `${label}: 始まりの日が終わりの日より後になっています。`, w); old(x.to, w, label); }
    if (!["closed","open","changed"].includes(x.status)) err("S4", `${label}: status は closed（休診）・open（臨時に診療）・changed（時間の変更）のどれかにしてください。`, w + ".status");
    if (x.status === "open" || x.status === "changed") {
      if (!Array.isArray(x.hours) || !x.hours.length) err("S4", `${label}: 診療する時間（hours）を入れてください。`, w + ".hours");
      else x.hours.forEach((h, k) => hoursOk(h?.opens, h?.closes, `${w}.hours[${k}]`, `${label} の時間 ${k+1}`, false));
    }
    checkReception(x, w, label, "S4", err, warn, null);
    if (!inScoped && sv05 && (x.department !== undefined || x.service !== undefined)) warn("W23", `${label}: 診療科や用途で絞った臨時の変更です。0.5 からは scopedExceptions に置いてください（0.4 を知らない AI が、全体の変更と読まないように）。`, w);
    if (inScoped && x.department === undefined && x.service === undefined) warn("W23", `${label}: 診療科も用途も書かれていません。全体の変更は exceptions に置いてください。`, w);
    if (x.status === "closed" && (x.reception !== undefined || x.entry !== undefined)) warn("W22", `${label}: 休診（closed）なのに、受付の時間や受け付け方が書いてあります。受付だけを変えるときは changed にしてください。`, w);
  });
  list("doctorSchedule").forEach((x, i) => {
    const w = `doctorSchedule[${i}]`, label = `担当医の予定 ${i+1}`;
    if (!isObj(x)) { err("S5", `${label}: 形が正しくありません。`, w); return; }
    if (!isStr(x.department) && !isStr(x.name)) err("S5", `${label}: 診療科か担当医のどちらかを入れてください。`, w);
    const hasDays = Array.isArray(x.days) && x.days.length, hasDate = isDate(x.date);
    if (!hasDays && !hasDate) err("S5", `${label}: 曜日（days）か日付（date）を入れてください。`, w);
    if (hasDays && x.days.some(d => !DAY_KEYS.includes(d))) err("S5", `${label}: 曜日は Mo〜Su と PH だけが使えます。`, w + ".days");
    hoursOk(x.opens, x.closes, w, label, false);
    if (x.from !== undefined && !isDate(x.from)) err("S5", `${label}: from は YYYY-MM-DD にしてください。`, w + ".from");
    if (x.to !== undefined && !isDate(x.to)) err("S5", `${label}: to は YYYY-MM-DD にしてください。`, w + ".to");
    old(hasDate ? x.date : x.to, w, label);
  });
  list("onCall").forEach((x, i) => {
    const w = `onCall[${i}]`, label = `当番 ${i+1}`;
    if (!isObj(x)) { err("S6", `${label}: 形が正しくありません。`, w); return; }
    if (!isDate(x.date)) err("S6", `${label}: 日付（date）を YYYY-MM-DD で入れてください。`, w + ".date");
    if (!["holiday","night","other"].includes(x.kind)) err("S6", `${label}: kind は holiday（休日の当番）・night（夜間の当番）・other のどれかにしてください。`, w + ".kind");
    hoursOk(x.opens, x.closes, w, label, true);
    old(x.date, w, label);
  });
  list("notices").forEach((x, i) => {
    const w = `notices[${i}]`, label = `お知らせ ${i+1}`;
    if (!isObj(x) || !isStr(x.text)) { err("S7", `${label}: 本文（text）が空です。`, w); return; }
    if (x.text.length > 200) warn("W5", `${label}: 本文が長すぎます（${x.text.length} 字・200 字まで）。`, w + ".text");
    for (const k of ["from","to"]) if (x[k] !== undefined && !isDate(x[k])) err("S7", `${label}: ${k} は YYYY-MM-DD にしてください。`, `${w}.${k}`);
    if (isDate(x.from) && isDate(x.to) && x.from > x.to) err("S7", `${label}: 始まりの日が終わりの日より後になっています。`, w);
    old(x.to, w, label);
  });
  if (!list("exceptions").length && !list("scopedExceptions").length && !list("doctorSchedule").length && !list("onCall").length && !list("notices").length)
    warn("W10", "臨時の情報が1つもありません。予定がないときも、このファイルを置いておけば「臨時の予定は書かれていない」と、更新した日とともに AI に伝わります。急な休診は、その日のうちに足してください。", "$");
  return { E, W };
}

// ---------- 地域の一覧（open-intake-directory・v0.3 から） ----------
function validateDirectory(o) {
  const E = [], W = [];
  const err = (code, msg, where) => E.push({ code, msg, where });
  const warn = (code, msg, where) => W.push({ code, msg, where });
  const isStr = v => typeof v === "string" && v.trim() !== "";
  const isObj = v => v && typeof v === "object" && !Array.isArray(v);
  if (!isObj(o)) { err("D1", "JSON の一番外側がオブジェクト（{ }）ではありません。", "$"); return { E, W }; }
  if (!isStr(o.specVersion) || !/^\d+\.\d+$/.test(o.specVersion)) err("D1", "specVersion（例: \"0.3\"）がありません。", "specVersion");
  else if (!SUPPORTED_VERSIONS.includes(o.specVersion)) warn("W6", `specVersion ${o.specVersion} は、この検査器より新しい版です。`, "specVersion");
  if (!(typeof o.updated === "string" && DATE.test(o.updated))) err("D2", "updated は YYYY-MM-DD の形にしてください。", "updated");
  if (!isObj(o.publisher) || !isStr(o.publisher.name)) err("D3", "publisher.name（この一覧をまとめた団体の名前）を入れてください。", "publisher");
  else if (typeof o.publisher.url !== "string" || !/^https:\/\/\S+$/.test(o.publisher.url)) warn("W25", "publisher.url（まとめた団体の公式のサイト）を https:// で入れてください。読む AI は、一覧の置き場所とこのサイトのドメインが合うかで、発行者を確かめます。", "publisher.url");
  if (!isObj(o.area) || !COUNTRY.test(String(o.area?.addressCountry || ""))) err("D3", "area.addressCountry（国。例: JP）を入れてください。", "area");
  if (!Array.isArray(o.entries) || !o.entries.length) err("D4", "entries（医療機関の一覧）を1件以上入れてください。", "entries");
  else {
    const urls = new Set();
    o.entries.forEach((e, i) => {
      const w = `entries[${i}]`;
      if (!isObj(e) || !isStr(e.name)) err("D4", `${i+1} 件目: 医療機関の名前（name）がありません。`, w);
      if (!isObj(e) || typeof e.url !== "string" || !/^https:\/\/\S+$/.test(e.url)) err("D4", `${i+1} 件目: url（その医療機関の clinic-intake.json の場所）を https:// で入れてください。`, w + ".url");
      else if (urls.has(e.url)) err("D4", `${i+1} 件目: 同じ url がほかにもあります。`, w + ".url"); else urls.add(e.url);
      if (isObj(e) && e.geo !== undefined && !(isObj(e.geo) && typeof e.geo.latitude === "number" && typeof e.geo.longitude === "number")) err("D4", `${i+1} 件目: geo は latitude と longitude の数にしてください。`, w + ".geo");
    });
  }
  if (o.onCall !== undefined) {
    if (!Array.isArray(o.onCall)) err("D5", "onCall（地域の当番表）は配列にしてください。", "onCall");
    else o.onCall.forEach((x, i) => {
      const w = `onCall[${i}]`;
      if (!isObj(x) || !(typeof x.date === "string" && DATE.test(x.date))) err("D5", `当番 ${i+1}: 日付（date）を YYYY-MM-DD で入れてください。`, w);
      if (!isObj(x) || !isStr(x.name)) err("D5", `当番 ${i+1}: 医療機関の名前（name）を入れてください。`, w);
      if (isObj(x) && (!TIME_RE.test(x.opens || "") || !TIME_RE.test(x.closes || ""))) err("D5", `当番 ${i+1}: 時刻を 09:00 の形で入れてください。`, w);
    });
  }
  return { E, W };
}

// ---------- 地域プロファイル（open-intake-profile・v0.3 から） ----------
function validateProfile(o) {
  const E = [], W = [];
  const err = (code, msg, where) => E.push({ code, msg, where });
  const isStr = v => typeof v === "string" && v.trim() !== "";
  const isObj = v => v && typeof v === "object" && !Array.isArray(v);
  if (!isObj(o)) { err("P1", "JSON の一番外側がオブジェクト（{ }）ではありません。", "$"); return { E, W }; }
  if (!isStr(o.id) || !/^[a-z0-9-]{2,32}$/.test(o.id)) err("P1", "id は小文字の英数字とハイフン（例: jp、jp-tokyo）にしてください。", "id");
  if (!isStr(o.specVersion)) err("P1", "specVersion がありません。", "specVersion");
  if (!isObj(o.area) || !COUNTRY.test(String(o.area?.addressCountry || ""))) err("P2", "area.addressCountry（国。例: JP）を入れてください。", "area");
  if (!isObj(o.emergency) || !isStr(o.emergency.message) || !Array.isArray(o.emergency.numbers) || !o.emergency.numbers.length) err("P3", "emergency（緊急時の案内文と番号）を入れてください。", "emergency");
  if (!Array.isArray(o.redFlags) || !o.redFlags.filter(isStr).length) {
    if (o.status === "draft") W.push({ code: "W16", msg: "救急の目安（redFlags）がまだ空です。公的な資料から書き写すまで、このプロファイルは下書きのままにしてください。", where: "redFlags" });
    else err("P3", "redFlags（救急の目安）を1つ以上入れてください。", "redFlags");
  }
  if (o.questionnaires !== undefined) {
    if (!Array.isArray(o.questionnaires)) err("P4", "questionnaires は配列にしてください。", "questionnaires");
    else { const r = validateIntake({ spec: "open-intake", specVersion: o.specVersion, updated: o.updated, clinic: { name: "x", telephone: "000000", address: { addressRegion: "x", addressLocality: "x" }, departments: ["x"], openingHours: [{ days: ["Mo"], opens: "09:00", closes: "10:00" }], booking: [{ method: "walk-in" }] }, safety: { noDiagnosis: true, emergency: "x", redFlags: ["x"] }, questionnaires: o.questionnaires });
      for (const e of r.E) if (e.where.startsWith("questionnaires")) E.push({ ...e, code: "P4" });
      o.questionnaires.forEach((q, i) => { if (!isStr(q?.url)) err("P4", `基本形 ${i+1}: url（ほかのファイルが derivedFrom で指す場所）を入れてください。`, `questionnaires[${i}].url`); }); }
  }
  return { E, W };
}

// ---------- 自分の健康メモ（open-intake-personal・PERSONAL.md） ----------
function validatePersonal(o) {
  const E = [], W = [];
  const err = (code, msg, where) => E.push({ code, msg, where });
  const warn = (code, msg, where) => W.push({ code, msg, where });
  const isStr = v => typeof v === "string" && v.trim() !== "";
  const isObj = v => v && typeof v === "object" && !Array.isArray(v);
  const PDATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
  if (!isObj(o)) { err("H1", "JSON の一番外側がオブジェクト（{ }）ではありません。", "$"); return { E, W }; }
  if (!isStr(o.specVersion)) err("H1", "specVersion（例: \"0.1\"）がありません。", "specVersion");
  if (!(typeof o.updated === "string" && DATE.test(o.updated))) err("H2", "updated（最後に確かめた日）は YYYY-MM-DD の形にしてください。", "updated");
  else if ((Date.now() - Date.parse(o.updated + "T00:00:00")) / 864e5 > 365) warn("H8", "最後に確かめた日（updated）が1年以上前です。薬や持病が変わっていないか確かめてください。", "updated");
  if (o.selfReported !== true) err("H3", "selfReported は true にしてください（本人の申告であるという宣言）。", "selfReported");
  if (o.person !== undefined) {
    if (!isObj(o.person)) err("H4", "person は { } にしてください。", "person");
    else for (const k of Object.keys(o.person)) if (!["birthYear","sex","languages","addressCountry","addressRegion"].includes(k)) warn("H7", `person に「${k}」があります。氏名・住所・番号などは書かないでください。`, "person." + k);
  }
  if (o.preferences !== undefined) {
    const pr = o.preferences;
    if (!isObj(pr)) err("H9", "preferences（受診先の好み）は { } にしてください。", "preferences");
    else {
      if (isObj(pr.homeArea)) for (const k of Object.keys(pr.homeArea)) if (!["addressCountry","addressRegion","addressLocality","nearestStation"].includes(k)) warn("H7", `homeArea に「${k}」があります。番地など細かい住所は書かないでください。`, "preferences.homeArea." + k);
      if (pr.travel !== undefined) {
        if (!isObj(pr.travel)) err("H9", "travel は { } にしてください。", "preferences.travel");
        else {
          if (pr.travel.modes !== undefined && !(Array.isArray(pr.travel.modes) && pr.travel.modes.every(m => ["walk","bicycle","train","bus","car","taxi"].includes(m)))) err("H9", "travel.modes は walk・bicycle・train・bus・car・taxi から選んでください。", "preferences.travel.modes");
          if (pr.travel.maxMinutes !== undefined && !(Number.isInteger(pr.travel.maxMinutes) && pr.travel.maxMinutes > 0)) err("H9", "travel.maxMinutes は 1 以上の整数（分）にしてください。", "preferences.travel.maxMinutes");
        }
      }
      if (pr.availability !== undefined) {
        if (!Array.isArray(pr.availability)) err("H9", "availability は配列（[ ]）にしてください。", "preferences.availability");
        else pr.availability.forEach((a, i) => {
          const w = `preferences.availability[${i}]`;
          if (!isObj(a)) { err("H9", `受診しやすい時間 ${i+1}: 形が正しくありません。`, w); return; }
          if (a.days !== undefined && !(Array.isArray(a.days) && a.days.every(d => DAY_KEYS.includes(d)))) err("H9", `受診しやすい時間 ${i+1}: 曜日は Mo〜Su と PH だけが使えます。`, w + ".days");
          if ((a.from !== undefined && !TIME_RE.test(a.from)) || (a.to !== undefined && !TIME_RE.test(a.to))) err("H9", `受診しやすい時間 ${i+1}: 時刻を 09:00 の形で入れてください。`, w);
          else if (a.from && a.to && a.from >= a.to) err("H9", `受診しやすい時間 ${i+1}: 始まりが終わりより後になっています。`, w);
        });
      }
      if (pr.priorities !== undefined) {
        const P = ["regularDoctor","near","shortWait","openNow","specialty","language","accessibility"];
        if (!Array.isArray(pr.priorities) || pr.priorities.some(x => !P.includes(x)) || new Set(pr.priorities).size !== pr.priorities.length) err("H9", `priorities は ${P.join("・")} から、重ならないように選んでください。`, "preferences.priorities");
      }
      if (pr.pastClinics !== undefined) warn("H10", "pastClinics（過去の医療機関）は、この形式では扱いません。よかったところは regularClinics（かかりつけ）に登録してください。", "preferences.pastClinics");
      for (const k of ["regularClinics"]) {
        if (pr[k] === undefined) continue;
        if (!Array.isArray(pr[k])) { err("H9", `${k} は配列（[ ]）にしてください。`, "preferences." + k); continue; }
        pr[k].forEach((c, i) => {
          const w = `preferences.${k}[${i}]`, label = "かかりつけ " + (i + 1);
          if (!isObj(c) || !isStr(c.name)) { err("H9", `${label}: 医療機関の名前（name）が空です。`, w); return; }
          for (const f of Object.keys(c)) if (!["name","url","department","since","note"].includes(f)) warn("H10", `${label}: 「${f}」があります。医療機関への評価や感想は、この形式では扱いません。消してください。`, `${w}.${f}`);
          for (const f of ["since"]) if (c[f] !== undefined && !PDATE.test(String(c[f]))) err("H5", `${label}: ${f} は YYYY・YYYY-MM・YYYY-MM-DD のどれかにしてください。`, `${w}.${f}`);
        });
      }
    }
  }
  const checkSrc = (x, w, label) => {
    if (x.source === undefined) return;
    if (!isObj(x.source)) { err("H4", `${label}: source は { } にしてください。`, w + ".source"); return; }
    if (x.source.date !== undefined && !PDATE.test(String(x.source.date))) err("H5", `${label}: source.date は YYYY・YYYY-MM・YYYY-MM-DD のどれかにしてください。`, w + ".source.date");
    if (x.source.transcribedBy === "ai" && x.source.checkedByMe !== true) warn("H6", `${label}: AI が書き起こした内容を、まだ本人が確かめていません。原本と見比べてください。`, w + ".source");
  };
  const LISTS = { allergies: ["substance", "アレルギー"], medications: ["name", "薬"], conditions: ["name", "持病・病気"], procedures: ["name", "手術・処置"], immunizations: ["name", "予防接種"] };
  const ENUMS = { severity: ["mild","moderate","severe","unknown"], category: ["medication","food","environment","other"], status: null };
  const STATUS = { medications: ["active","stopped","as-needed"], conditions: ["active","resolved","unknown"] };
  for (const [k, [key, name]] of Object.entries(LISTS)) {
    if (o[k] === undefined) continue;
    if (!Array.isArray(o[k])) { err("H4", `${k} は配列（[ ]）にしてください。ないときは [] と書きます。`, k); continue; }
    o[k].forEach((x, i) => {
      const w = `${k}[${i}]`, label = `${name} ${i+1}`;
      if (!isObj(x) || !isStr(x[key])) { err("H4", `${label}: ${key} が空です。`, w); return; }
      if (k === "allergies") for (const f of ["severity","category"]) if (x[f] !== undefined && !ENUMS[f].includes(x[f])) err("H4", `${label}: ${f} は ${ENUMS[f].join("・")} のどれかにしてください。`, `${w}.${f}`);
      if (STATUS[k] && x.status !== undefined && !STATUS[k].includes(x.status)) err("H4", `${label}: status は ${STATUS[k].join("・")} のどれかにしてください。`, w + ".status");
      for (const f of ["since","until","date"]) if (x[f] !== undefined && !PDATE.test(String(x[f]))) err("H5", `${label}: ${f} は YYYY・YYYY-MM・YYYY-MM-DD のどれかにしてください。`, `${w}.${f}`);
      checkSrc(x, w, label);
    });
  }
  if (typeof o.notes === "string" && o.notes.length > 500) warn("W5", `そのほか伝えたいことが長すぎます（${o.notes.length} 字・500 字まで）。`, "notes");
  return { E, W };
}

// 中身を見て、どちらのファイルかを判断して検査する
function kindOf(o) { const s = o && typeof o === "object" ? o.spec : null; return s === "open-intake-schedule" ? "schedule" : s === "open-intake-directory" ? "directory" : s === "open-intake-profile" ? "profile" : s === "open-intake-personal" ? "personal" : "intake"; }
function validate(o) { const k = kindOf(o); return k === "schedule" ? validateSchedule(o) : k === "directory" ? validateDirectory(o) : k === "profile" ? validateProfile(o) : k === "personal" ? validatePersonal(o) : validateIntake(o); }
return { KNOWN_ROLES, KNOWN_ID_SYSTEMS, isNarrowed, validate, validateDirectory, validateProfile, validatePersonal, validateIntake, validateSchedule, kindOf, SUPPORTED_VERSIONS, DAY_KEYS, TYPE_KEYS };
})();
if (typeof module !== "undefined" && module.exports) module.exports = OpenIntakeValidate;

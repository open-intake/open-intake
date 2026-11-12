// まとめ（src/brief.js）を、仕様書の決まりから別に組んだ計算と照らす検査（AI を使わない）
// Checks the summary (src/brief.js) against a separate computation written from the spec (no AI involved).
//
// 使い方 / Usage:
//   node tools/check-brief.mjs            … 問題集のファイルと、作った医療機関のファイルで、日付・時刻を総当たりにする
//   node tools/check-brief.mjs --seed 7 --clinics 300
// 読み込んで使う / As a module:
//   import { checkBrief, expectState } from "./check-brief.mjs";
//
// ここの計算（expectState）は、brief.js のコードを写さず、仕様書の §4「openingHours の1件」「対象を絞った行の置き場所」
// 「受付の時間と受け付け方の決まり」、§6b「臨時の変更の決まり」から書いた。食い違ったら、どちらが仕様書に合うかを読んで直す。
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { brief, DEFAULT_HOLIDAYS } = require("../src/brief.js");

// ---- 日付と時刻（brief.js とは別に書く） ----
const DAY = 86400000;
const toDate = s => new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));
const ymd = t => t.toISOString().slice(0, 10);
const addDays = (s, n) => ymd(new Date(toDate(s).getTime() + n * DAY));
const diffDays = (a, b) => Math.round((toDate(a) - toDate(b)) / DAY);
const dow = s => ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][toDate(s).getUTCDay()];
const nthInMonth = s => Math.ceil(+s.slice(8, 10) / 7); // その月の n 回目のその曜日（1〜7日が 1）
const mins = s => +s.slice(0, 2) * 60 + +s.slice(3, 5);
const hm = s => `${+s.slice(0, 2)}:${s.slice(3, 5)}`;
const KNOWN_SERVICE = ["general", "checkup", "vaccination", "procedure", "rehabilitation", "other"];

// §4 対象を絞った行の置き場所: 次のどれかを持つ行は、全員向けの時間ではない
export function isScoped(r) {
  if (r.department) return true;
  if (Array.isArray(r.service)) {
    const known = r.service.filter(x => KNOWN_SERVICE.includes(x));
    if (!known.length) return true; // 知らない値しかない行は、一般の外来の時間として使わない
    if (!(known.length === 1 && known[0] === "general")) return true;
  }
  if (r.visitType === "first" || r.visitType === "return") return true;
  if (Array.isArray(r.weeksOfMonth)) return true;
  if (r.entry === "none") return true;
  return false;
}

// §4 祝日: 祝日には PH を含む行だけを使い、曜日の行は使わない
function rowOnDay(r, day, hol) {
  const days = r.days || [];
  if (hol.has(day)) { if (!days.includes("PH")) return false; }
  else if (!days.includes(dow(day))) return false;
  if (Array.isArray(r.weeksOfMonth) && !r.weeksOfMonth.includes(nthInMonth(day))) return false;
  return true;
}

const within = (e, day) => e.from <= day && day <= (e.to || e.from);
const isWholeException = e => !e.department && !(Array.isArray(e.service) && e.service.length);

// 1日ぶんの「全員向けの時間」。kind: rows（行がある）・none（行がない）・closed（臨時の休診）・holiday-unknown（祝日で PH の行も臨時の情報もない）
// 臨時の情報が使えるかは、読む時（今日）で決める。読む時に有効なら、その先の日付の変更も使う
export function generalDay(files, day, hol, readDay = day) {
  const { intake, sched, schedOk } = split(files, readDay);
  if (sched && schedOk) {
    const ex = (sched.exceptions || []).filter(e => within(e, day) && isWholeException(e));
    if (ex.length) {
      const e = ex[0];
      if (e.status === "closed") return { kind: "closed", fromException: true, rows: [] };
      const rows = (e.hours || []).map(h => ({ opens: h.opens, closes: h.closes, ro: (e.reception || {}).opens || null, rc: (e.reception || {}).closes || null }));
      return { kind: rows.length ? "rows" : "none", fromException: true, rows };
    }
  }
  const c = intake.clinic || {};
  const all = (c.openingHours || []).concat(c.scopedOpeningHours || []);
  const rows = all.filter(r => !isScoped(r) && rowOnDay(r, day, hol))
    .map(r => ({ opens: r.opens, closes: r.closes, ro: (r.reception || {}).opens || null, rc: (r.reception || {}).closes || null }))
    .sort((a, b) => mins(a.opens) - mins(b.opens));
  if (!rows.length && hol.has(day)) return { kind: "holiday-unknown", fromException: false, rows: [] };
  return { kind: rows.length ? "rows" : "none", fromException: false, rows };
}

function split(files, day) {
  let intake = null, sched = null;
  for (const o of Object.values(files)) {
    if (o.spec === "open-intake-schedule") sched = o;
    else if (o.spec !== "open-intake-directory") intake = o;
  }
  // §6b validUntil: その日の終わりまで有効
  const schedOk = !!sched && !(sched.validUntil && day > sched.validUntil);
  return { intake, sched, schedOk };
}

// 受付の状態。受付の始まりが書かれていないときは、診療の始まりからを受付中と見る（始まりそのものは「わからない」）
export function rowState(r, nm) {
  const start = r.ro ? mins(r.ro) : mins(r.opens);
  const end = r.rc ? mins(r.rc) : mins(r.closes);
  if (nm < start) return "before";
  if (nm < end) return r.rc ? "accepting" : "open-no-deadline";
  if (nm < mins(r.closes)) return "reception-closed";
  return "over";
}

// まとめが伝えるべきこと
export function expectState(files, nowStr, opts = {}) {
  const hol = new Set(opts.holidays || DEFAULT_HOLIDAYS);
  const day = nowStr.slice(0, 10), nm = mins(nowStr.slice(11, 16));
  const { intake, sched, schedOk } = split(files, day);
  const X = { day, nm };
  if (intake.status) { X.status = intake.status.state; return X; }
  X.schedExpired = !!sched && !schedOk;
  X.today = generalDay(files, day, hol);
  X.today.states = X.today.rows.map(r => rowState(r, nm));
  X.tomorrow = generalDay(files, addDays(day, 1), hol, day);
  // 対象を絞った行: 全体の臨時の変更がある日は、置き換わってない（§6b）
  const c = intake.clinic || {};
  const scopedRows = (c.openingHours || []).concat(c.scopedOpeningHours || []).filter(r => isScoped(r) && rowOnDay(r, day, hol));
  const wholeToday = schedOk && (sched.exceptions || []).some(e => within(e, day) && isWholeException(e));
  X.scopedReplaced = wholeToday && scopedRows.length > 0;
  X.scoped = wholeToday ? [] : scopedRows.map(r => `${hm(r.opens)}〜${hm(r.closes)}`).sort();
  // 次に全員向けの受付が開くとき（今が受付中なら、なし）。15日先まで
  X.next = null;
  if (!X.today.states.some(s => s === "accepting" || s === "open-no-deadline")) {
    for (let k = 0; k < 15 && !X.next; k++) {
      const d = addDays(day, k), g = k === 0 ? X.today : generalDay(files, d, hol, day);
      if (g.kind === "holiday-unknown") { X.next = { day: d, unknown: true }; break; }
      for (const r of g.rows) {
        const start = r.ro ? mins(r.ro) : mins(r.opens);
        if (k > 0 || nm < start) { X.next = { day: d, opens: r.opens }; break; }
      }
    }
  }
  return X;
}

// ---- まとめの文を読む ----
const RX_ROW = /診療 (\d{1,2}:\d\d)〜(\d{1,2}:\d\d)・受付 ([^→／]*?)(?: → ([^／]*))?(?= ／|$)/g;
function parseRows(s) {
  const out = [];
  for (const m of s.matchAll(RX_ROW)) {
    const rec = m[3];
    const ro = (rec.match(/^(\d{1,2}:\d\d)(?:〜| から)/) || [])[1] || null;
    const rc = (rec.match(/〜(\d{1,2}:\d\d)/) || rec.match(/(\d{1,2}:\d\d) まで/) || [])[1] || null;
    out.push({ opens: m[1], closes: m[2], ro, rc, state: (m[4] || "").trim() });
  }
  return out;
}
const pad = s => (s && s.length === 4 ? "0" + s : s);
const stateOf = t => t.startsWith("まだ") ? "before" : t.startsWith("今は受付中") ? "accepting" : t.startsWith("今は診療中") ? "open-no-deadline" : t.startsWith("受付は") ? "reception-closed" : t.startsWith("終わった") ? "over" : "?" + t;

export function readBrief(text) {
  const L = text.split("\n");
  const get = p => L.find(x => x.startsWith(p));
  const B = {};
  B.status = /^- 状態: .*閉院/.test(get("- 状態:") || "") ? "closed" : /^- 状態: .*移転/.test(get("- 状態:") || "") ? "moved" : null;
  B.schedExpired = /有効期限 .* を過ぎている/.test(get("- 臨時の情報:") || "");
  const t = get("- 今日の全員向けの時間");
  B.today = !t ? null : / なし（/.test(t) || /: なし/.test(t) ? { kind: /臨時の休診/.test(t) ? "closed" : /祝日/.test(t) ? "holiday-unknown" : "none", rows: [] }
    : { kind: "rows", fromException: /臨時の情報による/.test(t), rows: parseRows(t.slice(t.indexOf(": ") + 2)) };
  const tm = get("- 明日 ");
  B.tomorrow = !tm ? null : /: なし/.test(tm) ? { kind: /臨時の休診/.test(tm) ? "closed" : /祝日/.test(tm) ? "holiday-unknown" : "none", rows: [] }
    : { kind: "rows", rows: parseRows(tm.slice(tm.indexOf(": ") + 2)) };
  B.scoped = L.filter(x => x.startsWith("- 今日の対象を絞った時間:")).map(x => x.match(/: (\d{1,2}:\d\d〜\d{1,2}:\d\d)/)[1]).sort();
  B.scopedReplaced = L.some(x => x.startsWith("- ふだんの対象を絞った時間") && x.includes("置き換わって"));
  const n = get("- 次に全員向けの時間が開くとき:");
  B.next = !n ? null : (() => { const m = n.match(/: (\d+)月(\d+)日（[^）]*）(?: 診療 (\d{1,2}:\d\d)〜)?/); return { m: +m[1], d: +m[2], opens: m[3] || null, unknown: /わからない/.test(n) }; })();
  B.closedHalf = L.find(x => /は、ふだんの診療時間に書かれていません（休診です）/.test(x)) || null;
  B.deadlineSaid = (L.join("\n").match(/今日の全員向けの受付は (\d{1,2}:\d\d) で締め切りました/) || [])[1] || null;
  return B;
}

// ---- 照らす ----
export function checkBrief(files, nowStr, opts = {}) {
  const P = [];
  let text;
  try { text = brief(files, nowStr, opts); } catch (e) { return [["error", String(e.message)]]; }
  const X = expectState(files, nowStr, opts), B = readBrief(text);
  const bad = (k, msg) => P.push([k, msg]);
  if (X.status) { if (B.status !== X.status) bad("status", `${X.status} を伝えていない`); return P; }
  if (X.schedExpired !== B.schedExpired) bad("expired", `臨時の情報の期限切れ: 期待 ${X.schedExpired}・まとめ ${B.schedExpired}`);
  const sameRows = (xs, bs, what) => {
    const kx = xs.map(r => `${hm(r.opens)}〜${hm(r.closes)}`).join(","), kb = bs.map(r => `${r.opens}〜${r.closes}`).join(",");
    if (kx !== kb) { bad(what + "-rows", `${what}の行: 期待 [${kx}]・まとめ [${kb}]`); return false; }
    xs.forEach((r, i) => {
      const b = bs[i];
      if ((r.ro ? hm(r.ro) : null) !== b.ro) bad(what + "-reception-start", `${what} ${kx}: 受付の始まり 期待 ${r.ro ? hm(r.ro) : "書かれていない"}・まとめ ${b.ro || "なし"}`);
      if ((r.rc ? hm(r.rc) : null) !== b.rc) bad(what + "-reception-end", `${what} ${kx}: 受付の締め切り 期待 ${r.rc ? hm(r.rc) : "書かれていない"}・まとめ ${b.rc || "なし"}`);
    });
    return true;
  };
  // 今日
  if (!B.today) bad("today", "今日の全員向けの時間の行がない");
  else {
    if (X.today.kind !== B.today.kind) bad("today-kind", `今日: 期待 ${X.today.kind}・まとめ ${B.today.kind}`);
    else if (X.today.kind === "rows") {
      if (X.today.fromException !== B.today.fromException) bad("today-source", `今日の時間の出どころ: 期待 ${X.today.fromException ? "臨時" : "ふだん"}`);
      if (sameRows(X.today.rows, B.today.rows, "今日"))
        X.today.states.forEach((s, i) => { const b = stateOf(B.today.rows[i].state); if (s !== b) bad("today-state", `今日 ${hm(X.today.rows[i].opens)}〜: 状態 期待 ${s}・まとめ ${b}`); });
    }
  }
  // 「◯曜の午後は休診」と「受付は ◯ で締め切りました」
  const later = X.today.rows.filter(r => mins(r.opens) > X.nm);
  if (B.closedHalf && later.length) bad("closed-half", `「休診です」と書かせるが、このあと ${hm(later[0].opens)} からの全員向けの時間がある`);
  if (B.closedHalf && /午後/.test(B.closedHalf) && X.today.rows.some(r => mins(r.opens) >= 720)) bad("closed-half", "「午後は休診」と書かせるが、午後の全員向けの行がある");
  if (B.deadlineSaid) {
    const passed = X.today.rows.filter(r => r.rc && mins(r.rc) <= X.nm);
    if (!passed.length) bad("deadline", `「${B.deadlineSaid} で締め切りました」と書かせるが、締め切りを過ぎた行がない`);
    else if (hm(passed[passed.length - 1].rc) !== B.deadlineSaid && !passed.some(r => hm(r.rc) === B.deadlineSaid)) bad("deadline", `締め切りの時刻が違う（${B.deadlineSaid}）`);
    if (later.length) bad("deadline", `「締め切りました」だけでなく、このあと ${hm(later[0].opens)} からの時間がある`);
  }
  // 明日
  if (!B.tomorrow) bad("tomorrow", "明日の行がない");
  else if (X.tomorrow.kind !== B.tomorrow.kind) bad("tomorrow-kind", `明日: 期待 ${X.tomorrow.kind}・まとめ ${B.tomorrow.kind}`);
  else if (X.tomorrow.kind === "rows") sameRows(X.tomorrow.rows, B.tomorrow.rows, "明日");
  // 対象を絞った行
  if (X.scoped.join(",") !== B.scoped.join(",")) bad("scoped", `今日の対象を絞った時間: 期待 [${X.scoped}]・まとめ [${B.scoped}]`);
  if (X.scopedReplaced !== B.scopedReplaced) bad("scoped-replaced", `全体の臨時の変更で置き換わったこと: 期待 ${X.scopedReplaced}`);
  // 次
  const nx = X.next, nb = B.next;
  if (!!nx !== !!nb) bad("next", `次に開くとき: 期待 ${nx ? nx.day + (nx.unknown ? " わからない" : " " + hm(nx.opens)) : "なし（今が受付中）"}・まとめ ${nb ? `${nb.m}/${nb.d} ${nb.opens || (nb.unknown ? "わからない" : "")}` : "なし"}`);
  else if (nx && (+nx.day.slice(5, 7) !== nb.m || +nx.day.slice(8, 10) !== nb.d || (!nx.unknown && hm(nx.opens) !== nb.opens) || !!nx.unknown !== nb.unknown))
    bad("next", `次に開くとき: 期待 ${nx.day} ${nx.unknown ? "わからない" : hm(nx.opens)}・まとめ ${nb.m}/${nb.d} ${nb.opens || (nb.unknown ? "わからない" : "")}`);
  return P;
}

// ---- 作った医療機関のファイル（種つきの乱数） ----
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
export function makeClinic(seed) {
  const R = rng(seed), pick = a => a[Math.floor(R() * a.length)], chance = p => R() < p;
  const t = (h, m = 0) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const someDays = () => { const d = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].filter(() => chance(0.55)); if (chance(0.25)) d.push("PH"); return d.length ? d : ["Mo"]; };
  const reception = (o, c) => { const k = pick(["both", "both", "closes", "opens", "none"]); const x = {};
    if (k === "both" || k === "opens") x.opens = t(o - 1, 45); if (k === "both" || k === "closes") x.closes = t(c - 1, 30); return k === "none" ? undefined : x; };
  const row = (o, c, extra = {}) => { const r = { days: someDays(), opens: t(o), closes: t(c) }; const rc = reception(o, c); if (rc) r.reception = rc; return Object.assign(r, extra); };
  const ver = chance(0.2) ? "0.4" : "0.5";
  const general = [row(9, 12), row(pick([14, 15]), pick([17, 18, 19]))];
  if (chance(0.3)) general.push(row(9, 12, { service: ["general"] }));
  if (chance(0.3)) general.push(row(13, 14, { visitType: "all" }));
  const scoped = [];
  if (chance(0.5)) scoped.push(row(14, 16, { department: "内科", weeksOfMonth: [pick([1, 2, 3, 4, 5])] }));
  if (chance(0.4)) scoped.push(row(13, 15, { service: ["vaccination"], entry: "appointment" }));
  if (chance(0.3)) scoped.push(row(12, 13, { entry: "none" }));
  if (chance(0.2)) scoped.push(row(16, 17, { service: ["future-thing"] }));
  const clinic = { name: "テスト診療所", telephone: "03-0000-0000", url: "https://example.com/", openingHours: general, closedNote: "日曜・祝日は休診" };
  if (ver === "0.5") clinic.scopedOpeningHours = scoped; else clinic.openingHours = general.concat(scoped);
  const intake = { spec: "open-intake", specVersion: ver, updated: "2026-11-10", clinic, booking: [] };
  const files = { "https://example.com/clinic-intake.json": intake };
  if (chance(0.8)) {
    const base = "2026-12-01", ex = [], sx = [];
    let d = 0;
    for (let i = 0; i < 4; i++) {
      d += 1 + Math.floor(R() * 9); const from = addDays(base, d), to = chance(0.3) ? addDays(from, 1 + Math.floor(R() * 3)) : from; d += diffDays(to, from);
      const st = pick(["closed", "changed", "open"]);
      const e = { from, to, status: st, note: "臨時" };
      if (st !== "closed") { e.hours = chance(0.3) ? [{ opens: t(9), closes: t(12) }, { opens: t(14), closes: t(16) }] : [{ opens: t(9), closes: t(pick([11, 12, 13])) }]; if (e.hours.length === 1) { const rc = reception(9, 12); if (rc) e.reception = rc; } } // 時間帯が2つの変更に受付を1つだけ書く形は、仕様書で未決（§10b）
      if (chance(0.2)) { e.department = "小児科"; (ver === "0.5" ? sx : ex).push(e); } else ex.push(e);
    }
    files["https://example.com/clinic-schedule.json"] = { spec: "open-intake-schedule", specVersion: ver, updated: "2026-11-10", validUntil: pick(["2026-12-20", "2027-01-31"]), exceptions: ex, scopedExceptions: sx };
  }
  return files;
}

// ---- 総当たり ----
function boundaryTimes(files) {
  const set = new Set(["00:00", "08:00", "12:00", "13:00", "23:59"]);
  const add = s => { if (!s) return; const m = mins(s); for (const x of [m - 1, m, m + 1]) if (x >= 0 && x < 1440) set.add(t2(x)); };
  const t2 = x => `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
  for (const o of Object.values(files)) {
    const c = o.clinic || {};
    for (const r of (c.openingHours || []).concat(c.scopedOpeningHours || [])) { add(r.opens); add(r.closes); add((r.reception || {}).opens); add((r.reception || {}).closes); }
    for (const e of (o.exceptions || []).concat(o.scopedExceptions || [])) { for (const h of e.hours || []) { add(h.opens); add(h.closes); } add((e.reception || {}).opens); add((e.reception || {}).closes); }
  }
  return [...set].sort();
}
export function sweep(files, fromDay, toDay, opts = {}) {
  const found = new Map(); let n = 0;
  const times = boundaryTimes(files);
  for (let d = fromDay; d <= toDay; d = addDays(d, 1)) for (const tm of times) {
    n++;
    for (const [k, msg] of checkBrief(files, `${d}T${tm}:00+09:00`, opts)) {
      if (!found.has(k)) found.set(k, { count: 0, example: `${d} ${tm}: ${msg}` });
      found.get(k).count++;
    }
  }
  return { n, found };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (k, v) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : v; };
  const read = f => JSON.parse(fs.readFileSync(f, "utf8"));
  const sets = [];
  const main = ["clinic-intake.json", "endpoints.json", "promo.json", "v0.4-clinic-intake.json"];
  for (const m of main) sets.push([`files/${m} ＋ clinic-schedule.json`, { "https://example.com/clinic-intake.json": read(`conformance/files/${m}`), "https://example.com/clinic-schedule.json": read("conformance/files/clinic-schedule.json") }]);
  sets.push(["files/clinic-intake.json だけ", { "https://example.com/clinic-intake.json": read("conformance/files/clinic-intake.json") }]);
  const seed = arg("--seed", 1), nc = arg("--clinics", 200);
  for (let i = 0; i < nc; i++) sets.push([`作ったファイル seed ${seed * 100000 + i}`, makeClinic(seed * 100000 + i)]);
  const total = new Map(); let n = 0;
  for (const [name, files] of sets) {
    const r = sweep(files, "2026-11-01", "2027-02-28"); n += r.n;
    for (const [k, v] of r.found) { if (!total.has(k)) total.set(k, { count: 0, example: `${name}: ${v.example}`, sets: 0 }); const T = total.get(k); T.count += v.count; T.sets++; }
  }
  console.log(`照らした組: ${n}（ファイルの組 ${sets.length}）`);
  if (!total.size) console.log("食い違いなし");
  for (const [k, v] of [...total].sort((a, b) => b[1].count - a[1].count)) console.log(`${k}: ${v.count} 件（${v.sets} 組）例 ${v.example}`);
  process.exit(total.size ? 1 : 0);
}

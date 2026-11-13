# 方針と今の案・ロードマップ / Policy, current plan and roadmap

[English below](#english)

2026年11月13日の作成（v0.6）。作者の方針を書いたもので、日付の約束はしません。**v0.6 は企画の版で、ファイルの形式は 0.5 のまま**です（医療機関がファイルを直す必要はありません）。次の形式の版は急ぎません。

## 方針: 小さいモデルの発展に合わせて、企画を広げていく

1. **小さいモデルを基準にする**。一般の人が使う AI は、サービスに組み込まれた軽いモデルであることが多いからです（2026年11月なら Haiku・Luna・Flash 相当）。
2. **仕様書には、先に決めておくが、まだ使わない機能を書いてよい**。ただし、読む側がその機能を使い始めるのは、問題集（[`conformance/`](conformance/)）で基準（[`criteria.md`](conformance/criteria.md)）を満たしてからにします。
3. **広げる順番は、版の日付ではなく、問題集の結果で決める**。小さいモデルが育って基準を満たす機能が増えたら、「使ってよい」と書く機能を増やします（対応レベル V1 → V2 → V3。下のロードマップ）。また、読む側の手助けを減らしても満たせるようになったら、手助けを軽くします（段階2 → 段階1 → 段階0）。
4. **医療の中身は、医療に携わる方に決めていただく**。救急の目安や問診票の中身に頼る機能は、医療者の確認が済むまでは「とりあえず」のままにします（[REVIEW.md](REVIEW.md)）。
5. **確かめ直す**。モデルの版、読む側の決まり（§5）、まとめの中身、問題集のどれかが変わったら、解かせ直して結果を載せます。
6. **対応レベルは、ほかの人の意見も聞きながら磨く**。患者さんへの効果が同じなら、AI が基準を満たしやすい形（ファイルの書き方・まとめ・決まりの要点・レベルの区切り方）を選びます。ただし、基準をゆるめたり、問題集の問だけに合わせたりはしません。安全に関わる問は外さず、未見の問で確かめます。

## 今の案（2026年11月）

| 項目 | 今 |
|---|---|
| ファイルの形式 | `specVersion` 0.5（企画の版 v0.6 でも変えていない）。次の形式の版で足す候補は [SPEC.md](SPEC.md) §10 にまとめてある |
| 読む側の標準のやり方 | 段階2: ファイル ＋ 決まりの要点（[`rules-short.ja.txt`](conformance/rules-short.ja.txt)）＋ 今の状況のまとめ（[`src/brief.js`](src/brief.js)）。作り方は SPEC §8 |
| V1 案内（区分 A） | 20問では、小さいモデル3系統が3回とも基準を満たした（9回目・10回目）。まとめを直すときに見ていない12問（未見の問）では、1組目で3回とも満たしたのは Haiku だけ、まとめを直したあとの2組目〜7組目では、どのモデルも満たさなかった（holdout2〜holdout7）。17回目のあとの8組目（holdout8）では、Haiku と Luna がどちらも3回とも満たしたが、まとめを変えずに解かせた9組目（holdout9）でも、足りないところを足した18回目・19回目のあとの10組目・11組目（holdout10・holdout11）でも、どちらも満たさなかった。20回目のあとの12組目（holdout12）では、Luna が3回とも満たし、Haiku は満たさなかった。**まだ「使ってよい」とは書かない**（[結果](conformance/results-2026-11.md)） |
| V2・V3（区分 B〜D） | 予約の入口を代わりに使う・問診票を一緒に作る・候補を事実で並べる。問がまだないので**使わない** |
| 医療者の確認 | [REVIEW.md](REVIEW.md) でお願いしている。**まだ返事はない** |
| 言語 | まとめの言い方の型と決まりの要点は日本語だけ |
| 記録 | 渡した文・答え・判定は、すべて [`runs/2026-11/`](runs/2026-11/) に公開している |

## ロードマップ: 対応レベル V1・V2・V3（日付は決めない）

規格のどこまでを読む側が使ってよいかを、**対応レベル**（V1・V2・V3）で示します。各レベルは、規格の範囲と、それに対応する問題集の組です。小さいモデルがそのレベルの問題集で基準（[`criteria.md`](conformance/criteria.md)）を満たしたら、この企画として「V◯ を使ってよい」と書きます。

- 対応レベルは、**ファイルの形式の版（`specVersion`、今は 0.5）とは別のもの**です。V1 は「形式の 1.0」ではありません。各レベルに、使う形式の版の下限を書きます
- 上のレベルは、下のレベルを含みます（V2 は V1 の問も満たす）
- 読む側の手助けの段階（段階0・1・2）とは組にして書きます（例:「V1・段階2」）。一つのアプリが自分のモデルで満たしたときは、「このアプリは V1・段階2 に対応」と書いてかまいません

| レベル | 規格の範囲 | 対応する問題集 | ほかに要ること | 今 |
|---|---|---|---|---|
| **V1 案内** | 形式 0.5 以上。診療時間・受付・対象を絞った時間・臨時の情報・閉院や移転・当番・名簿との食い違い・情報の古さ、救急の目安があれば 119番を先に（§5 の決まり。区分 A） | `cases.json`（C01〜C20）＋ 未見の問 | — | 20問では3系統が満たした（11回目まで）。未見の問では、1組目（holdout1）は Haiku だけ、2組目（holdout2）はどのモデルも満たさなかった。2組目で見つかったまとめの誤り（全体の臨時の変更がある日の、対象を絞った時間）を直した。そのあと、まとめを仕様書の決まりと照らす検査（[`tools/check-brief.mjs`](tools/check-brief.mjs)、AI を使わない）を足し、受付の時刻を診療の時刻で埋めていた誤りなども直した。直したまとめで20問を解かせ直した12回目では、Haiku と Luna が3回とも基準を満たした（Flash は道具が使えなくなったので外した）。新しい未見の問の3組目（holdout3）では、× はなかったが、どちらのモデルも基準を満たさなかった（○ が 12問中 6〜8）。その足りないところ（受付のあとの当番・ほかの医療機関、臨時の変更で午後が休診）を足した13回目では、20問で2つとも満たし、4組目（holdout4）では ○ が増えたが（12問中 6〜12）、どちらも満たさなかった。次の候補（当日の順番取り・名簿との結びつき）を足した14回目では、20問で2つとも満たし、5組目（holdout5）では、Luna が3回とも 12問中 10 で、基準に1問足りなかった。次の候補（対象を絞った時間の週の指定と受付の締め切り）を足した15回目では、20問で 120 の答えがすべて ○ で、6組目（holdout6）では、どちらも満たさなかった。次の候補（救急の目安を先に確かめること・予約の入口の場所・今日診てもらえるかの電話・臨時の変更の受け方）を足した16回目では、20問で2つとも満たし、7組目（holdout7）では、どちらも満たさなかった。見つかったまとめの誤り（移転・閉院のファイルで名簿の結果を渡していない）と次の候補（年代を聞くこと・有効期限の終わり）を直した17回目では、20問で2つとも満たし、8組目（holdout8）で2つとも3回とも満たした。まとめを変えずに解かせた9組目（holdout9）でも、足りないところを足した18回目・19回目のあとの10組目・11組目（holdout10・holdout11）でも、どちらも満たさなかった。20回目のあとの12組目（holdout12）では、Luna が3回とも満たし、Haiku は満たさなかった。**まだ「使ってよい」とは書かない** |
| **V2 手続き** | V1 ＋ 予約の入口を代わりに使う（`booking.platform`・`endpoints`。区分 B）、問診票を一緒に作る（`questionnaires`。区分 C） | B・C の問（まだない。C は C19 だけ）＋ 未見の問 | B は予約システムの側の確かめ。C は医療者による問診票と救急の目安の確認（[REVIEW.md](REVIEW.md)） | 問がないので**使わない** |
| **V3 選ぶ手伝い** | V2 ＋ 地域の一覧から候補を事実で並べる（区分 D）、ほかの言語・ほかの地域プロファイル | D の問、各言語・地域の問 ＋ 未見の問 | 地域プロファイルを育てる人、その言語のまとめと決まりの要点 | 問がないので**使わない** |

### どのレベルにもかかわること

| こと | 中身 |
|---|---|
| 医療者の確認 | 救急の目安・問診票・安全の決まりを、医療に携わる方に見ていただく。それまでは、これらに頼る中身は「とりあえず」のまま |
| 地域での試し | 1つの地域（医師会か自治体と診療所5〜10）で、置くと案内が良くなるかを測り、結果を載せる |
| 手助けを軽く | 新しい小さいモデルで、段階1・段階0でも解かせる。満たせば、その段階も標準の選択肢にする |
| 続ける仕組み | まとめを仕様書の決まりと照らす検査（[`tools/check-brief.mjs`](tools/check-brief.mjs)。テストで回す）、判定の自動化、モデルが変わるたびの確かめ直し、結果の置き場所（今は [`runs/`](runs/)） |
| 基準の見直し | 9割・3回・安全の問の選び方が妥当か。基準が拾わない誤り（答えの中の食い違い、まとめを写した事実の誤り）をどう見るか |

### きっかけと、すること

| きっかけ | すること |
|---|---|
| 新しい小さいモデルが出た | 問題集を段階0・1・2で解かせ直し、結果を載せる |
| 読む側が間違えた例が見つかった | 問を足す（[`conformance/README.md`](conformance/README.md)「問題を足すとき」） |
| まとめの文を変えた | `conformance/briefs/` を作り直し、問題集を解かせ直す |
| 医療者から意見が来た | 救急の目安・問診票・安全の決まりに反映し、関わる問を見直す |
| 未見の問を一度使った | その問は「見た問」として扱い、次の未見の問を用意する |

## ほかの人が試す・問を提案する

- **試す**: 問題集（[`conformance/`](conformance/)）・まとめ（[`src/brief.js`](src/brief.js)）・渡す文と判定の資料を作る道具（`tools/kit.mjs`・`tools/judge-input.mjs`）・判定役への指示（[`judge-prompt.txt`](conformance/judge-prompt.txt)）は公開しています。ほかのモデルや、自分のアプリのやり方で解かせた結果を、GitHub の Issue でお知らせください。結果の表と、できれば答えも添えてください
- **判定に異議を出す**: [`runs/2026-11/`](runs/2026-11/) の判定に異議があれば、Issue でお知らせください。答えを読み直し、変えるときは結果に書きます
- **問を提案する**: 読む側が間違えそうな場面を、Issue で提案してください（[`conformance/README.md`](conformance/README.md)「問題を足すとき」）。いただいた問の一部は、次の未見の問にするため、使うまで公開しないことがあります。使ったあとは、結果と一緒に公開します
- 架空の医療機関のファイルだけを使ってください。実在の医療機関の情報や、個人の情報は入れないでください

## 残っていること（2026年11月）

- 問題集の基準が、答えの中の食い違いを拾わないことがある（例: 予防接種の新しい予約を止めている期間に、冒頭で「電話して予約してください」と書いてから、止めていると書く答えが ○ になった）
- 判定役の AI によって、1〜3問ずつ判定が割れる。割れた問は作者の側で読んで決めている
- 問・まとめ・判定の一部を同じ系統の AI（Claude）と作っている。未見の問は別の系統（Astra）に下書きさせた
- 未見の問で見つかったまとめの誤り（受付が終わったあとの「◯曜の午後は休診」など）は直した（2026-11-13）。直したまとめでは、まだ解かせ直していない
- 問題集の基準が、まとめを写した事実の誤り（上の「金曜の午後は休診」）を拾わない

---

## English

Written on 13 November 2026 (v0.6). This is the author's policy, not a promise of dates. **v0.6 is a project version; the file format stays at 0.5** (clinics do not need to change their files). The next format version is not urgent.

### Policy: grow the project as small models improve

1. **Take small models as the baseline**, because most people use AI through light models built into other services (Haiku, Luna and Flash class, as of November 2026).
2. **The spec may describe features in advance that are not used yet**. A reader starts using such a feature only after it meets the criteria ([`criteria.md`](conformance/criteria.md)) in the conformance set ([`conformance/`](conformance/)).
3. **Results of the conformance set, not release dates, decide the order of growth**. As small models improve and meet the criteria for more features, more features are marked "may be used" (conformance levels V1 → V2 → V3; see the roadmap below). When they meet the criteria with less help from the reader, the help is reduced (level 2 → level 1 → level 0).
4. **Medical content is for medical professionals to decide**. Features that depend on emergency signs or questionnaire content stay "provisional" until medical professionals have checked them ([REVIEW.md](REVIEW.md)).
5. **Check again** whenever the model version, the reader rules (§5), the summary or the conformance set changes, and publish the results.
6. **Refine the conformance levels with input from others**. Where the effect for patients is the same, choose the form that makes it easiest for AI to meet the criteria (how files are written, the summary, the key rules, how the levels are divided). But do not loosen the criteria or fit the form to the conformance cases alone. Keep the safety cases, and check on unseen cases.

### Current plan (November 2026)

| Item | Now |
|---|---|
| File format | `specVersion` 0.5 (unchanged in project version v0.6). Candidates for the next format version are listed in [SPEC.en.md](SPEC.en.md) §10 |
| Standard reader approach | Level 2: the files + the key rules ([`rules-short.ja.txt`](conformance/rules-short.ja.txt)) + the current-situation summary ([`src/brief.js`](src/brief.js)). How it is made: SPEC §8 |
| V1 Guidance (group A) | On the 20 cases, small models from three families met the criteria in all 3 runs (rounds 9 and 10). On cases not seen while changing the summary (unseen cases), only Haiku met them in all 3 runs on the first set, and no model met them on the second to seventh sets, after the summary was fixed (holdout2 to holdout7). On the eighth set, after round 17 (holdout8), Haiku and Luna both met them in all 3 runs, but neither met them on the ninth set, with the summary unchanged (holdout9), nor on the tenth and eleventh sets, after the gaps were filled in rounds 18 and 19 (holdout10 and holdout11). On the twelfth set, after round 20 (holdout12), Luna met them in all 3 runs and Haiku did not. **Not yet described as "may be used"** ([results](conformance/results-2026-11.md)) |
| V2 and V3 (groups B to D) | Using a booking endpoint on the patient's behalf, filling a questionnaire together, listing candidates by facts. No questions yet, so **not used** |
| Review by medical professionals | Requested in [REVIEW.md](REVIEW.md). **No reply yet** |
| Language | The wording patterns and the key rules are in Japanese only |
| Records | All prompts, answers and judgments are published in [`runs/2026-11/`](runs/2026-11/) |

### Roadmap: conformance levels V1, V2, V3 (no dates)

What readers may use from the spec is shown as **conformance levels** (V1, V2, V3). Each level pairs a part of the spec with the conformance cases that test it. When small models meet the criteria ([`criteria.md`](conformance/criteria.md)) on a level's cases, the project says "V(n) may be used".

- Conformance levels are **separate from the file format version (`specVersion`, now 0.5)**. V1 is not "format 1.0". Each level states the minimum format version it uses
- A higher level includes the lower ones (V2 must also meet the V1 cases)
- Levels are stated together with the level of reader help (levels 0, 1, 2), for example "V1 at help level 2". An app that meets the criteria with its own model may say "this app supports V1 at help level 2"

| Level | Part of the spec | Conformance cases | Also needed | Now |
|---|---|---|---|---|
| **V1 Guidance** | Format 0.5 or later. Hours, reception, narrowed hours, temporary notices, closed or moved, on-call duty, mismatches with the register, age of information, and 119 first when warning signs appear (the §5 rules; group A) | `cases.json` (C01–C20) + unseen cases | — | Three families met the criteria on the 20 cases (up to round 11). On the unseen cases, only Haiku did on the first set (holdout1), and no model did on the second set (holdout2). The summary error found in the second set (narrowed hours on a day with a whole-day temporary change) was fixed. After that, a check of the summary against the spec rules ([`tools/check-brief.mjs`](tools/check-brief.mjs), no AI involved) was added, and further errors were fixed, such as filling in reception times with the opening times. With the fixed summary, the 20 cases were run again in round 12, and Haiku and Luna met the criteria in all 3 runs (Flash was dropped because its tool can no longer be used). On the third set of unseen cases (holdout3) there was no ×, but neither model met the criteria (6 to 8 ○ of 12). In round 13, with those gaps filled (on-call or other clinics after reception ends; an afternoon closed by a temporary change), both met the criteria on the 20 cases; on the fourth set (holdout4) there were more ○ (6 to 12 of 12), but neither met them. In round 14, with the next candidates filled (the same-day queue; the link to the register), both met the criteria on the 20 cases; on the fifth set (holdout5) Luna had 10 of 12 in all 3 runs, one short of the criteria. In round 15, with that candidate filled (the week restriction and reception deadline of narrowed hours), all 120 answers on the 20 cases were ○; on the sixth set (holdout6) neither met the criteria. In round 16, with those candidates filled, both met the criteria on the 20 cases; on the seventh set (holdout7) neither met them. In round 17, with the summary error found there (the register result not passed on for a moved or closed file) fixed and the next candidates (asking the age group; the end of the expiry day) filled, both met the criteria on the 20 cases, and on the eighth set (holdout8) both met them in all 3 runs. Neither met them on the ninth set, with the summary unchanged (holdout9), nor on the tenth and eleventh sets, after rounds 18 and 19 (holdout10 and holdout11). On the twelfth set, after round 20 (holdout12), Luna met them in all 3 runs and Haiku did not. **Not yet described as "may be used"** |
| **V2 Actions** | V1 + using a booking endpoint on the patient's behalf (`booking.platform`, `endpoints`; group B) and filling a questionnaire together (`questionnaires`; group C) | Cases for B and C (none yet; C has only C19) + unseen cases | For B, a check from the booking-system side. For C, review of the questionnaires and emergency signs by medical professionals ([REVIEW.md](REVIEW.md)) | No cases yet, so **not used** |
| **V3 Helping to choose** | V2 + listing candidates from a regional list by facts (group D), other languages and other regional profiles | Cases for D and for each language or region + unseen cases | People to grow regional profiles; a summary and key rules in that language | No cases yet, so **not used** |

#### Across all levels

| Item | What |
|---|---|
| Medical review | Ask medical professionals to look at the emergency signs, questionnaires and safety rules. Until then, content that relies on them stays "provisional" |
| Regional trial | Measure in one region (a medical association or local government and 5 to 10 clinics) whether the files improve guidance, and publish the results |
| Less help | Run new small models at help levels 1 and 0 as well. If they meet the criteria, make that level a standard option too |
| Keeping it going | A check of the summary against the spec rules ([`tools/check-brief.mjs`](tools/check-brief.mjs), run by the tests), automated judging, re-checking whenever models change, a place for results (now [`runs/`](runs/)) |
| Reviewing the criteria | Whether 90%, 3 runs and the choice of safety cases are right. How to treat errors the criteria do not catch (contradictions inside an answer, false facts copied from the summary) |

#### Triggers

| When | Do |
|---|---|
| A new small model is released | Run the conformance set again at levels 0, 1 and 2, and publish the results |
| A reader is found making a mistake | Add a case ([`conformance/README.md`](conformance/README.md), "Adding cases") |
| The summary text changes | Rebuild `conformance/briefs/` and run the conformance set again |
| Feedback comes from medical professionals | Reflect it in the emergency signs, questionnaires and safety rules, and review the related cases |
| A set of unseen cases has been used once | Treat those cases as seen, and prepare the next unseen cases |

### Testing by others, proposing cases

- **Test**: the conformance set ([`conformance/`](conformance/)), the summary ([`src/brief.js`](src/brief.js)), the tools that build the prompts and the judging document (`tools/kit.mjs`, `tools/judge-input.mjs`) and the judge instructions ([`judge-prompt.txt`](conformance/judge-prompt.txt)) are published. Please report results with other models or with your own app's approach as a GitHub Issue, with the results table and, if possible, the answers
- **Object to a judgment**: if you disagree with a judgment in [`runs/2026-11/`](runs/2026-11/), please open an Issue. The answer will be read again, and any change will be noted in the results
- **Propose cases**: please propose situations where a reader might go wrong, as an Issue ([`conformance/README.md`](conformance/README.md), "Adding cases"). Some proposed cases may be kept private until used, so that they can serve as the next unseen cases. After use, they are published with the results
- Please use fictional clinic files only. Do not include information about real clinics or personal information

### Still open (November 2026)

- The criteria sometimes miss a contradiction inside an answer (for example, during the period when new vaccination bookings are stopped, an answer that opens with "please call to book" and only then says bookings are stopped was marked ○)
- Judges disagree on 1 to 3 cases per run. The author's side reads those answers and decides
- Some of the cases, the summary and the judging were made with AI from the same family (Claude). The unseen cases were drafted by another family (Astra)
- The summary errors found on the unseen cases (such as "(day) afternoon is closed" after reception has ended) were fixed on 13 November 2026. The fixed summary has not been run on models yet
- The criteria do not catch false facts copied from the summary (the "Friday afternoon is closed" above)

# 方針と今の案・ロードマップ / Policy, current plan and roadmap

[English below](#english)

2026年11月13日の作成。作者の方針を書いたもので、日付の約束はしません。**次の版（v0.6）は急ぎません。**

## 方針: 小さいモデルの発展に合わせて、企画を広げていく

1. **小さいモデルを基準にする**。一般の人が使う AI は、サービスに組み込まれた軽いモデルであることが多いからです（2026年11月なら Haiku・Luna・Flash 相当）。
2. **仕様書には、先に決めておくが、まだ使わない機能を書いてよい**。ただし、読む側がその機能を使い始めるのは、問題集（[`conformance/`](conformance/)）で基準（[`criteria.md`](conformance/criteria.md)）を満たしてからにします。
3. **広げる順番は、版の日付ではなく、問題集の結果で決める**。小さいモデルが育って基準を満たす機能が増えたら、「使ってよい」と書く機能を増やします。また、読む側の手助けを減らしても満たせるようになったら、手助けを軽くします（段階2 → 段階1 → 段階0）。
4. **医療の中身は、医療に携わる方に決めていただく**。救急の目安や問診票の中身に頼る機能は、医療者の確認が済むまでは「とりあえず」のままにします（[REVIEW.md](REVIEW.md)）。
5. **確かめ直す**。モデルの版、読む側の決まり（§5）、まとめの中身、問題集のどれかが変わったら、解かせ直して結果を載せます。

## 今の案（2026年11月）

| 項目 | 今 |
|---|---|
| ファイルの形式 | v0.5（公開済み）。v0.6 で足す候補は [SPEC.md](SPEC.md) §10 にまとめてある |
| 読む側の標準のやり方 | 段階2: ファイル ＋ 決まりの要点（[`rules-short.ja.txt`](conformance/rules-short.ja.txt)）＋ 今の状況のまとめ（[`src/brief.js`](src/brief.js)）。作り方は SPEC §8 |
| 区分 A（案内） | 20問では、小さいモデル3系統が3回とも基準を満たした（9回目・10回目）。まとめを直すときに見ていない12問（未見の問）では、3回とも満たしたのは Haiku だけだった。**まだ「使ってよい」とは書かない**（[結果](conformance/results-2026-11.md)） |
| 区分 B〜D | 予約の入口を代わりに使う・問診票を一緒に作る・候補を事実で並べる。問がまだないので**使わない** |
| 医療者の確認 | [REVIEW.md](REVIEW.md) でお願いしている。**まだ返事はない** |
| 言語 | まとめの言い方の型と決まりの要点は日本語だけ |
| 記録 | 渡した文・答え・判定は、すべて [`runs/2026-11/`](runs/2026-11/) に公開している |

## ロードマップ（段ごと。日付は決めない）

各段は「進む条件」を満たしたら進めます。条件を満たさないうちは、前の段のままにします。

| 段 | すること | 進む条件 |
|---|---|---|
| 1. 今 | 区分 A を段階2で。まとめの道具と問題集を公開した。未見の問（holdout1）で見つかったまとめの誤りを直し、新しい未見の問（holdout2）で確かめる。基準（9割・3回・安全の問の選び方）が妥当かを確かめる | 未見の問でも、小さいモデル2系統以上が基準を満たす（holdout1 では Haiku だけ） |
| 2. 医療者の確認 | 救急の目安・問診票・安全の決まりを、医療に携わる方に見ていただく。1つの地域（医師会か自治体と診療所5〜10）で、置くと案内が良くなるかを測る | 医療者の意見を反映する。地域での試しの結果を載せる |
| 3. 区分 B〜D の問 | 予約の入口を代わりに使う（B）、問診票を一緒に作る（C）、候補を事実で並べる（D）の問を作り、小さいモデルで解かせる | その区分で、小さいモデル2系統以上が段階2で基準を満たす（B は予約システムの側の確認も要る） |
| 4. 手助けを軽く | 新しい小さいモデルで、段階1・段階0でも解かせる | 段階1（または0）で基準を満たせば、その段階も標準の選択肢にする |
| 5. 言語と地域 | 英語のまとめ・問題集、ほかの地域プロファイル | その言語・地域の問で基準を満たす |
| 6. 続ける仕組み | 判定の自動化、モデルが変わるたびの確かめ直し、結果の置き場所 | — |

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
- まとめの誤り: 受付がその日の分を終えたあとにも「◯曜の午後は休診」の型を出す。`closedNote`・休診の期間・予約で送る項目がまだ分からないことを渡していない（未見の問で見つかった）
- 問題集の基準が、まとめを写した事実の誤り（上の「金曜の午後は休診」）を拾わない

---

## English

Written on 13 November 2026. This is the author's policy, not a promise of dates. **The next version (v0.6) is not urgent.**

### Policy: grow the project as small models improve

1. **Take small models as the baseline**, because most people use AI through light models built into other services (Haiku, Luna and Flash class, as of November 2026).
2. **The spec may describe features in advance that are not used yet**. A reader starts using such a feature only after it meets the criteria ([`criteria.md`](conformance/criteria.md)) in the conformance set ([`conformance/`](conformance/)).
3. **Results of the conformance set, not release dates, decide the order of growth**. As small models improve and meet the criteria for more features, more features are marked "may be used". When they meet the criteria with less help from the reader, the help is reduced (level 2 → level 1 → level 0).
4. **Medical content is for medical professionals to decide**. Features that depend on emergency signs or questionnaire content stay "provisional" until medical professionals have checked them ([REVIEW.md](REVIEW.md)).
5. **Check again** whenever the model version, the reader rules (§5), the summary or the conformance set changes, and publish the results.

### Current plan (November 2026)

| Item | Now |
|---|---|
| File format | v0.5 (published). Candidates for v0.6 are listed in [SPEC.en.md](SPEC.en.md) §10 |
| Standard reader approach | Level 2: the files + the key rules ([`rules-short.ja.txt`](conformance/rules-short.ja.txt)) + the current-situation summary ([`src/brief.js`](src/brief.js)). How it is made: SPEC §8 |
| Group A (guidance) | On the 20 cases, small models from three families met the criteria in all 3 runs (rounds 9 and 10). On 12 cases not seen while changing the summary (unseen cases), only Haiku met them in all 3 runs. **Not yet described as "may be used"** ([results](conformance/results-2026-11.md)) |
| Groups B to D | Using a booking endpoint on the patient's behalf, filling a questionnaire together, listing candidates by facts. No questions yet, so **not used** |
| Review by medical professionals | Requested in [REVIEW.md](REVIEW.md). **No reply yet** |
| Language | The wording patterns and the key rules are in Japanese only |
| Records | All prompts, answers and judgments are published in [`runs/2026-11/`](runs/2026-11/) |

### Roadmap (stages, no dates)

Each stage moves on when its condition is met. Until then, the previous stage stays.

| Stage | What | Condition to move on |
|---|---|---|
| 1. Now | Group A at level 2. The summary tool and the conformance set are published. Fix the summary error found on the unseen cases (holdout1), then check on new unseen cases (holdout2). Check whether the criteria (90%, 3 runs, the choice of safety cases) are right | Small models from at least two families meet the criteria on unseen cases too (only Haiku on holdout1) |
| 2. Medical review | Ask medical professionals to look at the emergency signs, questionnaires and safety rules. Measure in one region (a medical association or local government and 5 to 10 clinics) whether the files improve guidance | Reflect their feedback. Publish the results of the regional trial |
| 3. Questions for groups B to D | Write cases for using a booking endpoint (B), filling a questionnaire together (C) and listing candidates by facts (D), and run small models on them | Small models from at least two families meet the criteria for that group at level 2 (B also needs a check from the booking-system side) |
| 4. Less help | Run new small models at levels 1 and 0 as well | If they meet the criteria at level 1 (or 0), make that level a standard option too |
| 5. Languages and regions | An English summary and conformance set; other regional profiles | The criteria are met on cases for that language or region |
| 6. Keeping it going | Automated judging, re-checking whenever models change, a place for results | — |

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
- Summary errors: it gives the "(day) afternoon is closed" pattern even after the day's reception has ended. It does not pass on the `closedNote`, closure periods, or that the items to send for booking are not known yet (found on the unseen cases)
- The criteria do not catch false facts copied from the summary (the "Friday afternoon is closed" above)

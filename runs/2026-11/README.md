# 問題集を解かせた記録（2026年11月） / Test logs (November 2026)

[English below](#english)

[問題集](../../conformance/)を AI に解かせたときの、渡した文・答え・判定のすべてです。数のまとめと分かったことは [`results-2026-11.md`](../../conformance/results-2026-11.md) にあります。

2026年11月13日から公開しています。それまでは「答えの全文と判定の記録は作者の手元にある」としていましたが、ほかの人が確かめ直したり、判定をやり直したりできるように公開することにしました。

## 中身

| フォルダ | 回 | 何を試したか |
|---|---|---|
| `round1/` | 1回目 | Fable・Astra・Carbon に、ファイルだけを渡した（`0_やり方と記録表.md` に問と結果の表） |
| `round2/` | 2回目 | 患者向けの指示書も渡した。`判定の読み合わせ.md` に、判定が割れた所の決め方 |
| `round3/` | 3回目 | 小さいモデル（Haiku・Luna・Flash）。`kit-a` はファイルだけ、`kit-b` は指示書つき |
| `round4/` | 4回目 | 小さいモデルで、手助けの形を比べた。C 決まりの要点、D ファイルの `policy.summary`、E 今の状況のまとめ、F は C と E（段階2） |
| `round5/`〜`round9/` | 5〜9回目 | F を3回ずつ。回ごとにまとめを直した |
| `round10-pre/` | 10回目の前の試し | まとめを直したところに関わる問だけを先に解かせた |
| `round10/` | 10回目 | 20問すべてを3回ずつ |
| `holdout1/` | 未見の問 | まとめを直すときに見ていない12問（[`cases-holdout.json`](../../conformance/cases-holdout.json) の H01〜H12）。1回だけ使った |
| `round11/` | 11回目 | holdout1 で見つかったまとめの誤りを直して、20問すべてを3回ずつ |
| `holdout2/` | 未見の問の2組目 | 11回目のまとめで、見ていない12問（H13〜H24）。1回だけ使った。Flash の3回目の H20・H21・H24 は、道具のエラーで答えがない（空のファイル）。Luna は2つ目の判定役が使えず、`judge2/` にない |
| `round12/` | 12回目 | まとめを仕様書の決まりと照らす検査で直して、20問すべてを3回ずつ。Haiku と Luna だけ（Flash は道具が使えなくなった）。Luna の `judge2/` は Fable の判定 |
| `holdout3/` | 未見の問の3組目 | 12回目のまとめで、見ていない12問（H25〜H36）。1回だけ使った。Haiku と Luna。Luna の `judge2/` は Fable の判定 |
| `round13/` | 13回目 | holdout3 で見つかった足りないところをまとめに足して、20問すべてを3回ずつ。Luna の `judge2/` は Fable の判定 |
| `holdout4/` | 未見の問の4組目 | 13回目のまとめで、見ていない12問（H37〜H48）。1回だけ使った。Luna の `judge2/` は Fable の判定 |
| `round14/` | 14回目 | holdout4 で見つかった足りないところをまとめに足して、20問すべてを3回ずつ。Luna の `judge2/` は Fable の判定 |
| `holdout5/` | 未見の問の5組目 | 14回目のまとめで、見ていない12問（H49〜H60）。1回だけ使った。Luna の `judge2/` は Fable の判定 |
| `round15/` | 15回目 | holdout5 で見つかった足りないところをまとめに足して、20問すべてを3回ずつ。Luna の `judge2/` は Fable の判定 |
| `holdout6/` | 未見の問の6組目 | 15回目のまとめで、見ていない12問（H61〜H72）。1回だけ使った。Luna の `judge2/` は Fable の判定 |
| `round16/` | 16回目 | holdout6 で見つかった足りないところをまとめに足して、20問すべてを3回ずつ。Luna の `judge2/` は Fable の判定 |
| `holdout7/` | 未見の問の7組目 | 16回目のまとめで、見ていない12問（H73〜H84）。1回だけ使った。Luna の `judge2/` は Fable の判定 |
| `round17/` | 17回目 | holdout7 で見つかったまとめの誤りを直し、足りないところを足して、20問すべてを3回ずつ。Luna の `judge2/` は Fable の判定 |
| `holdout8/` | 未見の問の8組目 | 17回目のまとめで、見ていない12問（H85〜H96）。1回だけ使った。Luna の `judge2/` は Fable の判定 |
| `holdout9/` | 未見の問の9組目 | 17回目のまとめ（変えていない）で、見ていない12問（H97〜H108）。1回だけ使った。Luna の `judge2/` は Fable の判定 |

各回のフォルダの中:

- `kit*/` … AI に渡した文（問ごとに1つ。ここに書いてあることが、AI が見たもののすべて）
- `out-<モデル>-<形><回>/` … 答え（問ごとに `<id>.md`）
- `judge/` … Claude の判定。`judge2/` … 答えたモデルと別の系統の AI の判定。`in-*.md` は判定役に渡した資料（1回目は `judge/` にまとめて置いた）
- `final*.json` … 2つの判定が割れた所を、作者の側で答えを読んで決めたあとの判定（`holdout2/finalH2.json`・`holdout3/finalH3.json`・`holdout4/finalH4.json` は、どう読んでも合否が変わらなかったので、厳しいほうの判定を残した。`holdout5/finalH5.json` は、合否が割れた Luna の H58 を読んで決めた。結果は厳しいほうの判定と同じ。`holdout6/finalH6.json`・`holdout7/finalH7.json` も、どう読んでも合否が変わらなかったので、厳しいほうの判定を残した。`holdout8/finalH8.json` は、合否が割れた Haiku の 1回目 H95・2回目 H88・H89 を読んで ○ とした（理由は結果のページ）。`holdout9/finalH9.json` は、合否が割れた Luna の H99（3回）を読んで △ を残した。`-` は答えなし）

入れていないもの: 道具が出した生の記録（実行のログ・エラーの出力）。

このフォルダは、ファイルが多いので、Zenodo のアーカイブ（Release の ZIP）には入れていません。GitHub のこのフォルダで見てください。答えと判定の中身は、上のファイルにすべてあります。

## 注意

- ファイルの中の医療機関・住所・電話番号はすべて架空です（例: みどり台内科クリニック、03-0000-0000）。`#7119`・`#8000` は実在の公的な電話相談です
- 答えは AI が書いたもので、医療の助言ではありません。間違った答えも、そのまま残しています
- AI の答えは同じ問でも揺れます。モデルの版が変わると、結果も変わります

## 確かめ直す・問を提案する

- 同じ条件で解かせるには、`node tools/kit.mjs 2 <出力フォルダ>` で渡す文を作り、問ごとに新しい会話で渡します。判定の資料は `node tools/judge-input.mjs <答えのフォルダ> <出力ファイル>` で作り、[`judge-prompt.txt`](../../conformance/judge-prompt.txt) を前に付けます（[`criteria.md`](../../conformance/criteria.md) の 4・5）
- 結果や、判定への異議、新しい問の案は、GitHub の Issue でお寄せください。新しい問の案の一部は、次の「未見の問」にするため、使うまで公開しないことがあります（[ROADMAP.md](../../ROADMAP.md)）

---

## English

These are all the prompts, answers and judgments from running the [conformance set](../../conformance/) on AI models. The counts and findings are in [`results-2026-11.md`](../../conformance/results-2026-11.md).

Published from 13 November 2026. Until then the results said "the full answers and judging records are kept by the author (not published)". They are now published so that others can check them again or redo the judging.

### Contents

| Folder | Round | What was tried |
|---|---|---|
| `round1/` | Round 1 | Fable, Astra and Carbon got the files only (`0_やり方と記録表.md` has the cases and a results table) |
| `round2/` | Round 2 | The patient-facing instructions were added. `判定の読み合わせ.md` shows how split judgments were settled |
| `round3/` | Round 3 | Small models (Haiku, Luna, Flash). `kit-a` is files only, `kit-b` adds the instructions |
| `round4/` | Round 4 | Small models with forms of help: C the key rules, D `policy.summary` in the file, E the current-situation summary, F both C and E (level 2) |
| `round5/` to `round9/` | Rounds 5 to 9 | F, 3 runs each. The summary was revised each round |
| `round10-pre/` | Pre-test for round 10 | Only the cases affected by the summary change |
| `round10/` | Round 10 | All 20 cases, 3 runs each |
| `holdout1/` | Unseen cases | 12 cases not seen while tuning the summary ([`cases-holdout.json`](../../conformance/cases-holdout.json), H01–H12). Used once |
| `round11/` | Round 11 | All 20 cases, 3 runs each, after fixing the summary errors found in holdout1 |
| `holdout2/` | Second set of unseen cases | 12 cases not seen (H13–H24), with the round 11 summary. Used once. For Flash run 3, H20, H21 and H24 have no answer because of a tool error (empty files). Luna has no `judge2/` files because its second judge could not be used |
| `round12/` | Round 12 | All 20 cases, 3 runs each, after fixing the summary with a check against the spec rules. Haiku and Luna only (the tool for Flash can no longer be used). Luna's `judge2/` holds Fable's verdicts |
| `holdout3/` | Third set of unseen cases | 12 cases not seen (H25–H36), with the round 12 summary. Used once. Haiku and Luna. Luna's `judge2/` holds Fable's verdicts |
| `round13/` | Round 13 | All 20 cases, 3 runs each, after filling the summary gaps found in holdout3. Luna's `judge2/` holds Fable's verdicts |
| `holdout4/` | Fourth set of unseen cases | 12 cases not seen (H37–H48), with the round 13 summary. Used once. Luna's `judge2/` holds Fable's verdicts |
| `round14/` | Round 14 | All 20 cases, 3 runs each, after filling the summary gaps found in holdout4. Luna's `judge2/` holds Fable's verdicts |
| `holdout5/` | Fifth set of unseen cases | 12 cases not seen (H49–H60), with the round 14 summary. Used once. Luna's `judge2/` holds Fable's verdicts |
| `round15/` | Round 15 | All 20 cases, 3 runs each, after filling the summary gap found in holdout5. Luna's `judge2/` holds Fable's verdicts |
| `holdout6/` | Sixth set of unseen cases | 12 cases not seen (H61–H72), with the round 15 summary. Used once. Luna's `judge2/` holds Fable's verdicts |
| `round16/` | Round 16 | All 20 cases, 3 runs each, after filling the summary gaps found in holdout6. Luna's `judge2/` holds Fable's verdicts |
| `holdout7/` | Seventh set of unseen cases | 12 cases not seen (H73–H84), with the round 16 summary. Used once. Luna's `judge2/` holds Fable's verdicts |
| `round17/` | Round 17 | All 20 cases, 3 runs each, after fixing the summary error found in holdout7 and filling the gaps. Luna's `judge2/` holds Fable's verdicts |
| `holdout8/` | Eighth set of unseen cases | 12 cases not seen (H85–H96), with the round 17 summary. Used once. Luna's `judge2/` holds Fable's verdicts |
| `holdout9/` | Ninth set of unseen cases | 12 cases not seen (H97–H108), with the round 17 summary (unchanged). Used once. Luna's `judge2/` holds Fable's verdicts |

In each round folder:

- `kit*/` … the prompts given to the AI (one per case; this is everything the AI saw)
- `out-<model>-<form><run>/` … the answers (`<id>.md` per case)
- `judge/` … judgments by Claude. `judge2/` … judgments by an AI from a family other than the answering model. `in-*.md` are the documents given to the judges (round 1 keeps both in `judge/`)
- `final*.json` … the judgments after the author's side read the answers where the two judges disagreed (`holdout2/finalH2.json`, `holdout3/finalH3.json` and `holdout4/finalH4.json` keep the stricter verdict, because no reading would change any result; `holdout5/finalH5.json` was decided after reading Luna's H58, where the result depended on the judge, and matches the stricter verdict; `holdout6/finalH6.json` and `holdout7/finalH7.json` keep the stricter verdict, because no reading would change any result; `holdout8/finalH8.json` was decided after reading Haiku's H95 in run 1 and H88 and H89 in run 2, where the result depended on the judge, and marks them ○ (reasons on the results page); `holdout9/finalH9.json` keeps △ on Luna's H99 (3 runs) after reading them; `-` means no answer)

Not included: raw tool output (run logs, error output). The answers and judgments themselves are all in the files above.

This folder has many files, so it is not in the Zenodo archive (the Release ZIP). View it in this folder on GitHub.

### Notes

- All clinics, addresses and phone numbers in the files are fictional (for example みどり台内科クリニック, 03-0000-0000). `#7119` and `#8000` are real public telephone advice lines in Japan
- The answers were written by AI and are not medical advice. Wrong answers are kept as they are
- AI answers vary even on the same case. Results change when model versions change

### Checking again, proposing cases

- To run under the same conditions, build the prompts with `node tools/kit.mjs 2 <out dir>` and give each in a new conversation. Build the judging document with `node tools/judge-input.mjs <answers dir> <out file>` and put [`judge-prompt.txt`](../../conformance/judge-prompt.txt) in front of it ([`criteria.md`](../../conformance/criteria.md), items 4 and 5)
- Please send results, objections to judgments and new case ideas as GitHub Issues. Some proposed cases may be kept private until used, so that they can serve as the next unseen cases ([ROADMAP.md](../../ROADMAP.md))

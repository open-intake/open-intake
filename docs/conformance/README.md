# 読む側の問題集 / Reader conformance set

[English below](#english)

患者さんの AI やアプリなど、**オープン受診案内のファイルを読む側**が、仕様書 §5 の決まりどおりに答えるかを確かめるための問題集です（v0.5 から）。

## 中身

- `cases.json`: 問題の一覧（20問）。各問に次があります
  - `now`: その時刻（日本時間）に聞かれたとする
  - `files`: 読んだとするファイル。キーはファイルが置かれている URL、値はこのリポジトリの中の場所
  - `context`（ある問だけ）: 公的な名簿を調べた結果など、ファイルの外で分かっていること
  - `patient`: 患者さんの言葉
  - `must`: 答えに必ず含むこと。`mustNot`: 答えに含んではいけないこと
  - `rules`: 当てはまる仕様書の箇所（`§5-20` は §5 の決まり20）
- `cases-holdout.json`: 未見の問（17組・204問。H01〜H12・H13〜H24・H25〜H36・H37〜H48・H49〜H60・H61〜H72・H73〜H84・H85〜H96・H97〜H108・H109〜H120・H121〜H132・H133〜H144・H145〜H156・H157〜H168・H169〜H180・H181〜H192・H193〜H204）。まとめを直すときに見ていない問として、別の系統の AI に下書きさせた。どの組も2026年11月13日に一度、未見の問として使った
- `rules-short.ja.txt`・`briefs/`: 手助けの段階1・2で AI に渡す決まりの要点と、各問の今の状況のまとめ（`src/brief.js` で作ったもの。テストで同じになることを確かめる。まとめの中身は、`tools/check-brief.mjs` で仕様書の決まりと照らす）
- `files/`: 問題で読むファイル。`examples/v0.5/`（と v0.4）の例の写しと、それを少し変えたもの（古い・移転・予約の入口・誘導の文・当番の食い違い）

医療機関・電話番号・URL は、どれも架空のものです。ただし `files/` の中には「架空」と書いていません。書いておくと、読む AI が「実在しないので案内できない」と答えを控えてしまい、確かめたいことが確かめられないためです（2026年11月の結果）。

## 使い方

1. 読む側の AI に、`files` のファイルと、`now`・`context` を渡し、`patient` の言葉で聞く
2. 答えに `must` が全部あり、`mustNot` が1つもなければ合格
3. 判定は人が行うか、別の AI に `must`・`mustNot` と答えを渡して行う。言い回しは問わず、中身が合っていればよい

読む側の AI に渡す文は `node tools/kit.mjs <段階 0|1|2> <出力フォルダ> [問題のファイル]` で作れます（段階0: ファイルだけ、段階1: ＋決まりの要点、段階2: ＋今の状況のまとめ）。1問ごとに新しい会話で渡してください。

問題集はテストの一部（`node tools/test.mjs`）で、ファイルの場所と形が正しいことを確かめています。答えの判定は自動ではしません。

## 結果

- [2026年11月: 大きい AI（Fable・Astra・Carbon）と小さい AI（Haiku・Luna・Flash）で、ファイルだけ・指示書つき・読む側の手助けつきの条件で解いた結果](results-2026-11.md)
- [機能を使い始める基準（とりあえずの案）](criteria.md): 先に決めておいた機能を、読む側が使い始めてよいかを、この問題集で決める

## 問題を足すとき

- 1問で確かめることは1つか2つにする
- 足りない決まりや、読む側が実際に間違えた例を見つけたら、問を足してください（GitHub の Issue でも構いません）
- 患者さんの個人情報や、実在の医療機関の情報は入れない

---

## English

A test set for **readers of Open Intake files** (a patient's AI or app) to check that they answer according to the rules in SPEC §5 (from v0.5).

### Contents

- `cases.json`: the cases (20). Each has
  - `now`: the time of the question (Japan time)
  - `files`: the files the reader has read. Keys are the URLs where the files live; values are paths in this repository
  - `context` (some cases only): what is known outside the files, such as the result of checking a public register
  - `patient`: what the patient says
  - `must`: what the answer must contain. `mustNot`: what it must not contain
  - `rules`: the relevant parts of the specification (`§5-20` is rule 20 in §5)
- `cases-holdout.json`: unseen questions (17 sets, 204 cases: H01–H12, H13–H24, H25–H36, H37–H48, H49–H60, H61–H72, H73–H84, H85–H96, H97–H108, H109–H120, H121–H132, H133–H144, H145–H156, H157–H168, H169–H180, H181–H192 and H193–H204). Drafted by another AI family as questions not seen while tuning the summary. Each set was used once as unseen questions on 13 November 2026
- `rules-short.ja.txt` and `briefs/`: the key rules given to the AI at assistance levels 1 and 2, and the current-situation summary for each case (made with `src/brief.js`; the tests check they stay the same. `tools/check-brief.mjs` checks the content of the summary against the spec rules)
- `files/`: the files the cases read. Copies of the `examples/v0.5/` (and v0.4) examples, and slightly changed versions of them (out of date, moved, booking entry points, promotional text, on-call rosters that differ)

All clinics, phone numbers and URLs are fictional. The files in `files/` do not say "fictional", though: when they did, readers declined to suggest the clinic as a real option, so the case could not check what it was meant to (November 2026 results).

### How to use

1. Give the reader the files in `files`, plus `now` and `context`, and ask in the words of `patient`
2. It passes if the answer contains every `must` and no `mustNot`
3. A person judges, or another AI given `must`, `mustNot` and the answer. Wording does not matter, only content

The text to give a reader AI can be built with `node tools/kit.mjs <level 0|1|2> <out dir> [cases file]` (level 0: the files only, level 1: + the key rules, level 2: + the current-situation summary). Give each case in a new conversation.

The set is part of the tests (`node tools/test.mjs`), which check that the file paths and shapes are correct. Answers are not judged automatically.

### Results

- [November 2026: results with large models (Fable, Astra, Carbon) and small models (Haiku, Luna, Flash), with the files alone, with the AI instructions, and with help from the reader app](results-2026-11.md)
- [Criteria for turning features on (provisional)](criteria.md): this set decides when a reader may start using a feature that was specified in advance

### Adding cases

- Check one or two things per case
- If you find a rule without a case, or a real mistake a reader made, add a case (or open a GitHub issue)
- Do not include patients' personal information or real clinics' information

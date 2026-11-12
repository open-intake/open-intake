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
- `files/`: 問題のために、`examples/v0.5/` の例を少し変えたファイル（古い・移転・予約の入口・誘導の文・当番の食い違い）

医療機関・電話番号・URL は、どれも架空のものです。

## 使い方

1. 読む側の AI に、`files` のファイルと、`now`・`context` を渡し、`patient` の言葉で聞く
2. 答えに `must` が全部あり、`mustNot` が1つもなければ合格
3. 判定は人が行うか、別の AI に `must`・`mustNot` と答えを渡して行う。言い回しは問わず、中身が合っていればよい

問題集はテストの一部（`node tools/test.mjs`）で、ファイルの場所と形が正しいことを確かめています。答えの判定は自動ではしません。

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
- `files/`: slightly changed copies of the `examples/v0.5/` examples (out of date, moved, booking entry points, promotional text, on-call rosters that differ)

All clinics, phone numbers and URLs are fictional.

### How to use

1. Give the reader the files in `files`, plus `now` and `context`, and ask in the words of `patient`
2. It passes if the answer contains every `must` and no `mustNot`
3. A person judges, or another AI given `must`, `mustNot` and the answer. Wording does not matter, only content

The set is part of the tests (`node tools/test.mjs`), which check that the file paths and shapes are correct. Answers are not judged automatically.

### Adding cases

- Check one or two things per case
- If you find a rule without a case, or a real mistake a reader made, add a case (or open a GitHub issue)
- Do not include patients' personal information or real clinics' information

# 変更の記録

形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) にならいます。仕様の版（`specVersion`）と、ツールの変更を分けて書きます。

## [0.1.0] 草案 — 2026-11

### 仕様 v0.1

- 最初の草案。`clinic`（医療機関の情報）、`safety`（安全の決まり）、`questionnaires`（FHIR R4 Questionnaire の部分集合）
- 救急の目安の初期値を、総務省消防庁のパンフレット（大人の項目）の要約にした。出典を `safety.redFlagsSource` に書く
- 版と互換の決まり（§8）: 知らないキーは無視する、既にあるキーの意味は変えない、古い版の例をテストで守る

### ツール

- 作成サイト（`docs/index.html`）: 入力、JSON の出力、チェック、貼り付けた JSON の読み込み
- AI 向けの指示書（`AI_INSTRUCTIONS.md`）。指示文は作成サイトにも埋め込んでいる
- 検査器（`src/validate.js`）とテスト（`tools/test.mjs`）

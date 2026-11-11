# オープン受診案内（Open Intake）

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.24121889.svg)](https://doi.org/10.5281/zenodo.24121889)

**医療機関が JSON ファイルを1つ自分のサイトに置くだけで、患者さんがふだん使っている AI が受診を手伝えるようにする、簡単で開かれた形式です。**

- 患者さんの AI は、この医院がどんな症状を診ているか、いつ開いているか、どう予約するかを正しく読み取れます
- 医院の問診票に沿って会話し、受診の前に問診票を埋める手伝いができます
- 医療機関の側には AI もサーバーも要りません。患者さんの情報をためることもありません

目的は、**医療機関と患者さんのマッチングをよくすること**です。医療機関の格付けや権威づけはしません。どこを受診するかを決めるのは患者さんです。

状態: **v0.2 草案**（2026-11）。旧称: オープン問診票。ファイルの形式としては「**オープン受診案内 JSON**」と呼びます

情報は2つ以上のファイルに分けられます。ほぼ変わらない **固定の情報**（`clinic-intake.json`）と、受付の方が毎週〜毎日直す **臨時の情報**（`clinic-schedule.json`：臨時休診・担当医・当番・お知らせ）です。ファイルごとに編集する人を分けられ、臨時の情報には有効期限があります。

## 作者からのお願い

作者: Taichi Kurihara（[ORCID 0009-0003-0369-9689](https://orcid.org/0009-0003-0369-9689)）

引用するときは DOI [10.5281/zenodo.24121889](https://doi.org/10.5281/zenodo.24121889) をお使いください。いつも最新版を指します。特定の版を示すときは、版ごとの DOI（v0.2.0 は [10.5281/zenodo.24121890](https://doi.org/10.5281/zenodo.24121890)）を使ってください。GitHub の右側の「Cite this repository」からも書式を取れます。

**私は医療者ではありません。** ソフトウェアを作る立場から、この形式を考えました。

- 形式（JSON の形、安全の仕組み、検査）は、作者が責任を持って作ります
- **救急の目安や問診票の中身は、医療に携わる方に決めていただきたいと考えています**

草案はすべて公開しています。医師・看護師・医療事務の方、医療機関のサイトを作っている方からのご意見を特に歓迎します。出し方は [CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。

## 使ってみる

| 方法 | 内容 |
|---|---|
| **説明のページ** | https://open-intake.github.io/open-intake/ ：この取り組みの意義と仕組み |
| **作成ツール** | https://open-intake.github.io/open-intake/maker/ （英語版 https://open-intake.github.io/open-intake/en/maker/ ）：画面に入力すると `clinic-intake.json`・`clinic-schedule.json` ができます。入力内容はブラウザの外に送りません |
| **AI と会話して作る** | [AI_INSTRUCTIONS.md](AI_INSTRUCTIONS.md) の指示文を、ふだん使っている AI に貼り付けます |

できたファイルは、医療機関のサイトのいちばん上（例: `https://example.com/clinic-intake.json`）に置きます。

## ファイル

| ファイル | 中身 |
|---|---|
| [SPEC.md](SPEC.md) | 仕様書（形式、必須の項目、安全の決まり、検査の規則、版と互換の決まり） |
| [schema/](schema/) | JSON Schema（draft 2020-12）。固定の情報・臨時の情報・地域の一覧・地域プロファイル |
| [profiles/](profiles/) | 地域プロファイル（救急の番号・救急の目安・問診票の基本形など）。`jp.json` は最初のたたき台 |
| [MAPPING.md](MAPPING.md) | schema.org・HL7 FHIR との対応表 |
| [examples/](examples/) | 各版の例（架空の医院） |
| [AI_INSTRUCTIONS.md](AI_INSTRUCTIONS.md)・[英語版](AI_INSTRUCTIONS.en.md) | AI と会話してファイルを作るための指示書 |
| `src/` | トップの原稿（`index.src.html`・英語版 `index.en.body.html`）、作成ツールの原稿（`generator.src.html`）、言語ごとのデータ（`locale.*.js`）、英語版の対訳表（`i18n/en.tsv`）、検査器（`validate.js`） |
| `docs/` | 公開されるサイト（トップと作成ツール。**生成物。手で直さない**） |
| [CHANGELOG.md](CHANGELOG.md) | 変更の記録 |

## 開発

依存なしの node だけで動きます。

```bash
node tools/build.mjs
```

```bash
node tools/test.mjs
```

`src/`・`AI_INSTRUCTIONS.md`・`schema/`・`examples/` を直したら、`build.mjs` で `docs/` を作り直してから `test.mjs` を通してください（`docs/` が古いとテストが落ちます）。画面の動作確認は `tools/smoke.cjs`（Playwright）で行えます。

## 大事な注意

- **この形式とツールは診断をしません。** 病名の推定や緊急度の判定はせず、情報を受け渡す形を決めるだけです
- 救急の目安の初期値は、消防庁のパンフレット（令和7年12月発行）の「ためらわず救急車を呼んでほしい症状」を、おとな・高齢者・こどもごとに書き写したものです。**医師の確認はまだ済んでいません**
- 問診票の例は**医師の確認前**です。医療機関は、医師に確認してもらってから公開してください

## ライセンス

- 仕様書と文書: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ja)
- JSON Schema と例: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/deed.ja)
- コード（`src/`・`tools/`・`docs/index.html`）: [Apache-2.0](LICENSE)

詳しくは [LICENSES.md](LICENSES.md) をご覧ください。

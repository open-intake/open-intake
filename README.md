# オープン問診票（Open Intake）

**医療機関が JSON ファイルを1つ自分のサイトに置くだけで、患者さんがふだん使っている AI が受診を手伝えるようにする、簡単で開かれた形式です。**

- 患者さんの AI は、この医院がどんな症状を診ているか、いつ開いているか、どう予約するかを正しく読み取れます
- 医院の問診票に沿って会話し、受診の前に問診票を埋める手伝いができます
- 医療機関の側には AI もサーバーも要りません。患者さんの情報をためることもありません

状態: **v0.2 草案**（2026-11）

情報は2つ以上のファイルに分けられます。ほぼ変わらない **固定の情報**（`clinic-intake.json`）と、受付の方が毎週〜毎日直す **臨時の情報**（`clinic-schedule.json`：臨時休診・担当医・当番・お知らせ）です。ファイルごとに編集する人を分けられ、臨時の情報には有効期限があります。

## 作者からのお願い

**私は医療者ではありません。** ソフトウェアを作る立場から、この形式を考えました。

- 形式（JSON の形、安全の仕組み、検査）は、作者が責任を持って作ります
- **救急の目安や問診票の中身は、医療に携わる方に決めていただきたいと考えています**

草案はすべて公開しています。医師・看護師・医療事務の方、医療機関のサイトを作っている方からのご意見を特に歓迎します。出し方は [CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。

## 使ってみる

| 方法 | 内容 |
|---|---|
| **作成サイト** | https://open-intake.github.io/open-intake/ ：画面に入力すると `clinic-intake.json` ができます。入力内容はブラウザの外に送りません |
| **AI と会話して作る** | [AI_INSTRUCTIONS.md](AI_INSTRUCTIONS.md) の指示文を、ふだん使っている AI に貼り付けます |

できたファイルは、医療機関のサイトのいちばん上（例: `https://example.com/clinic-intake.json`）に置きます。

## ファイル

| ファイル | 中身 |
|---|---|
| [SPEC.md](SPEC.md) | 仕様書（形式、必須の項目、安全の決まり、検査の規則、版と互換の決まり） |
| [schema/](schema/) | JSON Schema（draft 2020-12）。固定の情報と臨時の情報の2つ |
| [examples/](examples/) | 各版の例（架空の医院） |
| [AI_INSTRUCTIONS.md](AI_INSTRUCTIONS.md) | AI と会話してファイルを作るための指示書 |
| `src/` | 作成サイトの原稿（`generator.src.html`）と検査器（`validate.js`） |
| `docs/` | 公開される作成サイト（**生成物。手で直さない**） |
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

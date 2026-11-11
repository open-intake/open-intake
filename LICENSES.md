# ライセンスの内訳

| 対象 | ライセンス | 使うときにしてほしいこと |
|---|---|---|
| `SPEC.md`・`AI_INSTRUCTIONS.md`・`README.md` などの文書 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode.ja) | 出所（「オープン受診案内（Open Intake）」とリポジトリの URL）を書く |
| `schema/`・`examples/` | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/legalcode.ja) | なし（自由に使える） |
| `src/`・`tools/`・`docs/index.html` | [Apache License 2.0](LICENSE) | ライセンスの文と著作権の表示を残す |

## 地域プロファイルの中の引用

`profiles/` の地域プロファイルの**救急の目安（`redFlags`・`redFlagsByAge`）と緊急時の案内の一部は、各地域の公的な機関の資料からの引用**です。出典は各プロファイルの `redFlagsSource` に書いてあります。

- 引用部分の権利は、それぞれの発行者にあります。**この取り組みのライセンス（CC BY 4.0・CC0・Apache-2.0）の対象ではありません**
- 引用は、出典を明示し、救急の判断の目安として必要な範囲（短い症状の列挙）にとどめています
- 各発行者の利用条件は、順に確かめています。転載を禁じている資料（例: 米国救急医学会の「When Your Child Has an Emergency」）は引用せず、参考として名前と URL だけを記録します

救急の目安の初期値は、消防庁「救急車を上手に使いましょう〜救急車 必要なのはどんなとき？〜」（令和7年12月発行）の「ためらわず救急車を呼んでほしい症状」（p.2〜4）を、出典を示して書き写したものです。原文の権利は同庁にあります。

## 名前の使い方

「オープン受診案内」「オープン受診案内 JSON」「Open Intake」の名前は、[SPEC.md](SPEC.md) の検査の規則（§7）でエラーが出ないファイルにだけ使ってください（例: 「オープン受診案内 JSON v0.2 準拠」）。中身の違う形式に同じ名前を付けると、医療機関と患者さんが混乱するためです。

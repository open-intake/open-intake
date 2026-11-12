# 地域プロファイル / Regional profiles

国や地域ごとの基本（救急の番号・救急の目安・識別番号の体系・問診票の基本形）をまとめたファイルです（仕様書 §4d）。
**中身は、それぞれの地域のコミュニティが議論して作り、育てます。** ここにあるのは議論のための出発点です。

| ファイル | 地域 | 状態 |
|---|---|---|
| `jp.json` | 日本 | 下書き。救急の目安は消防庁の資料（令和7年12月発行）から書き写し済み。問診票の基本形（発熱・せき）あり。医師の確認は未了 |
| `us.json` | 米国 | 出発点。緊急の番号、識別番号の体系（NPI）。救急の目安は CDC の脳卒中・心臓発作のサインのみ（書き写し済み）。全般の一覧は未収集 |
| `gb.json` | 英国 | 出発点。緊急の番号（999・112・NHS 111）。救急の目安は、公式の資料の転載許可が出るまで空（`references` にリンク） |
| `au.json` | オーストラリア | 出発点。緊急の番号（000・112・healthdirect）。救急の目安は、healthdirect が転載を認めていないため空（`references` にリンク） |
| `ca.json` | カナダ | 出発点。緊急の番号（911・811・988）。救急の目安は州ごとのプロファイルに置く |
| `ca-bc.json` | カナダ・ブリティッシュコロンビア州 | 出発点。緊急の番号。救急の目安は、州の転載許可が出るまで空（`references` にリンク） |

## 版ごとの写し（v0.5 から）

`archive/<id>-<updated>.json` に、プロファイルの版ごとの写しを置きます。組み立て（`node tools/build.mjs`）が、今の版の写しが無ければ作ります。写しは消さず、書き換えません。
プロファイルの中身を変えたら、`updated` を新しい日付にしてください（同じ日付のまま中身が変わると、組み立てが止まります）。
作成ツールは、医療機関のファイルの `profile` に、写しの `url`・`updated`・`sha256` を書きます（仕様書 §4d）。

## 救急の目安の決め方

- **その地域の公的な資料から、出典（発行者・題名・版・ページ）を付けて書き写す**。記憶や要約で書かない
- **書き写す前に、資料の利用条件を確かめる**。転載に許可が要る資料は、許可が出るまで書き写さず、`references` にリンクだけを置く（[LICENSES.md](../LICENSES.md)）
- 年代で項目が違う場合は `redFlagsByAge` に分ける
- 書き写したら `redFlagsSource` を埋め、その地域の医療者に確認してもらってから `status` を `active` にする

## Starting a profile for your region

Profiles hold region-specific basics: emergency numbers, emergency warning signs, identifier systems and base questionnaires.
Their content is decided by communities in each region. Open an issue on GitHub to start or improve a profile.
Warning signs must be transcribed from an official public source for the region, with the source recorded in `redFlagsSource`.
From v0.5, versioned copies live in `archive/<id>-<updated>.json`. The build creates the copy for the current version and never changes or deletes old ones. Change `updated` whenever you change a profile.

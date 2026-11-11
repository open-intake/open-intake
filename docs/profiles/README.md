# 地域プロファイル / Regional profiles

国や地域ごとの基本（救急の番号・救急の目安・識別番号の体系・問診票の基本形）をまとめたファイルです（仕様書 §4d）。
**中身は、それぞれの地域のコミュニティが議論して作り、育てます。** ここにあるのは議論のための出発点です。

| ファイル | 地域 | 状態 |
|---|---|---|
| `jp.json` | 日本 | 下書き。救急の目安は消防庁の資料（令和7年12月発行）から書き写し済み。問診票の基本形（発熱・せき）あり。医師の確認は未了 |
| `us.json` | 米国 | 出発点。緊急の番号と識別番号の体系（NPI）のみ。救急の目安は公的な資料の書き写し待ち |
| `gb.json` | 英国 | 出発点。緊急の番号（999・112・NHS 111）のみ。救急の目安は書き写し待ち |
| `au.json` | オーストラリア | 出発点。緊急の番号（000・112・healthdirect）のみ。救急の目安は書き写し待ち |
| `ca.json` | カナダ | 出発点。緊急の番号（911・811・988）のみ。救急の目安は書き写し待ち |

## 救急の目安の決め方

- **その地域の公的な資料から、出典（発行者・題名・版・ページ）を付けて書き写す**。記憶や要約で書かない
- 年代で項目が違う場合は `redFlagsByAge` に分ける
- 書き写したら `redFlagsSource` を埋め、その地域の医療者に確認してもらってから `status` を `active` にする

## Starting a profile for your region

Profiles hold region-specific basics: emergency numbers, emergency warning signs, identifier systems and base questionnaires.
Their content is decided by communities in each region. Open an issue on GitHub to start or improve a profile.
Warning signs must be transcribed from an official public source for the region, with the source recorded in `redFlagsSource`.

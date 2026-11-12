# 既存の国際標準との対応表

オープン受診案内 JSON の各項目が、**schema.org** と **HL7 FHIR R4** のどこに当たるかの対応表です。変換の道具を作るとき、また既存の仕組みとつなぐときの手がかりにします。

- 対応は「近いもの」を示します。意味が完全に同じとは限りません
- ⚠ は、対応先がない、または意味が大きく違うもの

## 医療機関の情報（`clinic`）

| オープン受診案内 JSON | schema.org | HL7 FHIR R4 |
|---|---|---|
| `clinic` | `MedicalClinic`（`MedicalOrganization` の下位） | `Organization` ＋ `Location` |
| `clinic.name` | `name` | `Organization.name`・`Location.name` |
| `clinic.url` | `url` | `Organization.telecom`（system=url） |
| `clinic.identifiers[]` | `identifier`（`PropertyValue`） | `Organization.identifier`（`system`・`value` が同じ考え方） |
| `clinic.telephone` | `telephone` | `Organization.telecom`（system=phone） |
| `clinic.address` | `address`（`PostalAddress`。キーの名前は同じ） | `Location.address`（`country`・`postalCode`・`state`・`city`・`line`） |
| `clinic.geo` | `geo`（`GeoCoordinates`。キーの名前は同じ） | `Location.position`（`latitude`・`longitude`） |
| `clinic.access` | ⚠ 直接の項目なし（`description` など） | ⚠ `Location.description` など |
| `clinic.departments` | `medicalSpecialty` | `HealthcareService.specialty` |
| `clinic.focus` | ⚠ `availableService` などで近いことは書ける | `HealthcareService.type`・`HealthcareService.comment` |
| `clinic.openingHours` | `openingHoursSpecification` | `Location.hoursOfOperation`・`HealthcareService.availableTime` |
| `clinic.scopedOpeningHours`（v0.5。対象を絞った時間） | ⚠ `openingHoursSpecification` には対象を書けない（作成ツールの JSON-LD 出力には入れない） | `HealthcareService.availableTime`（診療科・用途ごとの `HealthcareService` に分ける） |
| `clinic.closedNote` | ⚠ | `HealthcareService.availabilityExceptions` |
| `clinic.handles`・`notHandled` | ⚠ | ⚠ `HealthcareService.comment` など |
| `clinic.booking` | `potentialAction`（`ReserveAction`）など | `HealthcareService.appointmentRequired`・`Endpoint` |
| `clinic.booking[].endpoints`（v0.5） | `potentialAction.target`（`EntryPoint`）に近い | `Endpoint`（`connectionType`・`address`） |
| `status`（v0.5。閉院・移転） | ⚠ 閉院を示す標準の項目はない | `Organization.active`（false）・`Location.status`（inactive） |
| `updated`・`verified`（v0.5） | `dateModified` | `meta.lastUpdated` |
| `clinic.languages` | `availableLanguage` | `HealthcareService.communication` |

## 臨時の情報（`clinic-schedule.json`）

| オープン受診案内 JSON | schema.org | HL7 FHIR R4 |
|---|---|---|
| `exceptions`（臨時の休診・時間の変更） | `specialOpeningHoursSpecification`（`validFrom`・`validThrough`） | `HealthcareService.notAvailable`（`during` の期間） |
| `scopedExceptions`（v0.5。診療科・用途で絞った変更） | ⚠ 対象を書けない | 診療科・用途ごとの `HealthcareService.notAvailable` |
| `doctorSchedule` | ⚠ | `PractitionerRole.availableTime` |
| `onCall` | ⚠ | ⚠ `HealthcareService`（期間つき）で近いことは書ける |
| `notices` | ⚠ `SpecialAnnouncement`（用途は限られる） | ⚠ |
| `validUntil` | ⚠ | ⚠（ファイル全体の有効期限という考えは独自） |

予約の空きを機械で読ませる段階では、**SMART Scheduling Links**（HL7。`Location`・`Schedule`・`Slot` を静的ファイルで公開する仕様）との互換を考えます。

## 問診票（`questionnaires`）

問診票は **FHIR R4 の `Questionnaire` の部分集合**で、そのまま正しい FHIR のリソースです。

| オープン受診案内 JSON | HL7 FHIR R4 |
|---|---|
| `questionnaires[]` | `Questionnaire` |
| `url`・`derivedFrom` | `Questionnaire.url`・`Questionnaire.derivedFrom`（地域プロファイルの基本形を指す） |
| `item[].linkId`・`text`・`type`・`required`・`repeats`・`answerOption`・`enableWhen` | 同じ名前の項目 |
| 回答（参考） | `QuestionnaireResponse` |

## 安全・決まり・ファイルの構成

| オープン受診案内 JSON | 対応 |
|---|---|
| `safety`（診断をしない・救急の目安） | ⚠ 対応なし（この形式に独自） |
| `policy`（使用目的と使い方の決まり） | ⚠ 対応なし（独自） |
| `files`（正規のファイルの一覧） | ⚠ 考え方は SMART Scheduling Links の目次ファイル（`$bulk-publish`）に近い |
| `profile`（地域プロファイル） | ⚠ 考え方は FHIR の実装ガイド（国ごとの Profile）に近い |
| `clinic-directory.json`（地域の一覧） | 考え方は FHIR の医療機関名簿（米国 NDH、IHE mCSD）に近い。ただし中央の名簿ではなく、各医療機関のファイルへの索引 |

**この形式に独自なのは**、安全の欄、使い方の決まり、正規のファイルの一覧、臨時の情報の有効期限、地域プロファイルの組み合わせです。それ以外は、できるだけ既存の標準の名前と構造に合わせています。

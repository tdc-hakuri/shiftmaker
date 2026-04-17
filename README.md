# ShiftMaker MVP（Windowsオフライン向け）

## 前提反映（確定回答）
- 1人が同日に「早番 + 遅番」の複数枠勤務: **許可**（同日同枠の重複のみ禁止）
- Excelのスタッフ表記: **名前 + 社員IDの両方**
- 共有フォルダ同時編集: **現場ごとに同時編集禁止**（現場単位ロック）
- 年齢制限ルール: **不要**

---

## 1) 技術スタック提案
- **デスクトップ基盤**: Electron + React + TypeScript
- **UI**: React + TanStack Table + dnd-kit（ドラッグ＆ドロップ編集）
- **状態管理**: Zustand + React Query（ローカルデータ読み書き）
- **永続化**: まずJSON（MVP）。将来SQLiteへ切替可能なRepository層を用意
- **Excel出力**: exceljs（.xlsx生成）
- **ローカルシフト生成**: TypeScript実装の制約充足 + スコアリングGreedy
- **配布**: electron-builder（NSISインストーラ）

### なぜこの構成か
- オフライン要件に適合し、Windows exe配布が容易。
- TypeScriptで業務ルールを厳格に型管理できる。
- JSON開始で実装コストを抑え、SQLite移行余地を確保。

---

## 2) 画面一覧（MVP）とデータモデル

### 画面一覧
1. **初期設定画面**
   - データ保存先（ローカル/UNC）選択
   - 現場・スタッフ・希望休の登録導線
2. **シフト作成画面**
   - 現場選択、期間選択（1週間〜1か月）
   - 「自動作成」実行
3. **シフト編集画面**
   - 横軸: 日付+曜日
   - 縦軸: 役割
   - 枠タブ（早番/遅番など）
   - 右側スタッフ一覧（検索/フィルタ）
   - DnD: 投入・移動・並べ替え・ゴミ箱削除
4. **統計/アラート画面**
   - スタッフ別統計（契約日数差分、曜日偏り、役割偏り、違反回数）
   - 現場別欠員
5. **エクスポート画面**
   - 現場別・期間別Excel出力

### データモデル（実装済み）
- Site / ShiftSlot / demand（日付×枠×役割）
- Staff（複数現場所属可、枠/役割可否）
- TimeOff（FULL_DAY / SLOT_NG）
- RuleConfig（基本曜日厳格モード、最低休日日数、最大連勤）
- ShiftPlan（assignments, vacancyAlerts, policyAlerts）

---

## 3) シフト生成アルゴリズム（ローカル）

### 制約優先順
1. **ハード制約（絶対）**
   - 希望休（FULL_DAY/SLOT_NG）違反禁止
   - 担当不可役割禁止
   - 同日同枠重複禁止
2. **準ハード（設定依存）**
   - 基本勤務曜日: strict=trueで割当禁止 / falseで警告付き許容
3. **ソフト制約（スコア最小化）**
   - 週所定日数との差
   - 曜日偏り
   - 役割偏り
   - 連勤上限超過（大ペナルティ）

### 実装方針
- 日付×現場×枠×役割の需要を順次処理
- 候補スタッフをフィルタし、スコア最小候補を採用
- 候補なしなら欠員アラート
- 許容違反はpolicyAlertsへ理由出力

### テストデータ
- `src/data/sampleData.ts`に2日分の需要、2名スタッフ、slot単位希望休を定義。
- 自動テストで「希望休遵守」「欠員アラート生成」を検証。

---

## 4) MVP実装範囲と段階的拡張

### MVP（このプロトタイプ）
- データモデル
- ローカルシフト自動生成エンジン
- JSON保存（現場単位ロック + 原子的保存）
- Excel .xlsx出力（現場別シート、名前+社員ID表記）
- 最低限のテスト

### 次フェーズ
- React/Electron UI実装（DnD編集・フィルタ・統計画面）
- CSVインポート
- 厳密な週次制約（最低休み回数の違反検知を週単位で実装）
- SQLiteバックエンド + バージョン管理
- 差分比較UI（前回シフトとの差分）

---

## 5) ビルドとインストーラ手順（計画）

### 開発
```bash
npm install
npm run test
npm run start
```

### ビルド
```bash
npm run build
```

### インストーラ（Electron化後）
1. Electron main/preload/rendererを追加
2. `electron-builder`設定（target: nsis, arch: x64）
3. `npm run dist`で`ShiftMaker Setup.exe`生成
4. 社内配布用にバージョニングルールを運用

---

## 実装ファイル構成
- `src/domain/models.ts`: 業務データ型
- `src/engine/scheduler.ts`: 自動割当エンジン
- `src/persistence/store.ts`: JSON保存 + 現場単位排他ロック
- `src/export/excel.ts`: .xlsx出力（名前+社員ID）
- `src/data/sampleData.ts`: サンプル入力
- `src/engine/scheduler.test.ts`: 主要制約テスト
- `src/index.ts`: CLI実行エントリ

---

## 6) 初心者向け：このプロトタイプで使っている技術の説明

### 全体像
このアプリは「**ローカルPCだけでシフトを作る**」ことを目的に、TypeScriptで作られた業務ロジックを中心に構成しています。

- 画面（将来）: Electron + React
- 中核ロジック（今回実装）: TypeScript
- 保存: JSONファイル
- 出力: Excel（.xlsx）

### 各技術をかんたんに

1. **TypeScript**
   - JavaScriptに「型（データの形）」を加えた言語です。
   - 例: スタッフ、現場、希望休などの項目が決まっているため、入力ミスや実装ミスを減らせます。

2. **Node.js**
   - TypeScript/JavaScriptをPC上で実行する土台です。
   - 今回はCLI（コマンド実行）で「自動割当 → 保存 → Excel出力」を動かしています。

3. **シフト自動生成エンジン（独自ロジック）**
   - `src/engine/scheduler.ts`で実装。
   - 希望休などの**守るべき条件（ハード制約）**を優先し、
     その上で週所定日数や偏りを**点数化（スコア）**して最適に近い候補を選びます。
   - これにより、クラウドAIや外部API無しでオフライン生成が可能です。

4. **JSON保存 + ロックファイル**
   - `src/persistence/store.ts`で実装。
   - データを `shift-data.json` として保存。
   - 共有フォルダ利用時の同時編集事故を防ぐため、**現場ごとのロックファイル**を作って排他制御しています。

5. **Excel出力（exceljs）**
   - `src/export/excel.ts`で実装。
   - 各現場をシート分けし、日付×役割の表を `.xlsx` で作成します。
   - スタッフは `名前(staffId)` 形式で出力します。

6. **テスト（node:test）**
   - `src/engine/scheduler.test.ts`で実装。
   - 最低限として「希望休が守られているか」「欠員アラートが出るか」を自動チェックします。

### なぜこの構成が初心者にも扱いやすいか
- まずはJSONファイルベースで単純に動かせる（DB構築が不要）。
- 型（TypeScript）があるので、仕様変更時に壊れた箇所を追いやすい。
- ロジック・保存・出力がファイル単位で分離されており、段階的に機能追加しやすい。

---

## 7) 初心者向け：このソフトを実際に使う手順

> ここでは「まず試す（開発版）」→「運用に近づける（Windows配布）」の順で説明します。


### 必要なソフト一覧（このプロトタイプを使うために必要）

1. **Node.js 20 以上（必須）**
   - このアプリ（現状CLI版）を実行するための本体です。
2. **npm（Node.jsに同梱、必須）**
   - 依存パッケージを入れるために使います（`npm install`）。
3. **Excel閲覧ソフト（推奨）**
   - 出力された `shift-plan.xlsx` を確認するために必要です。
   - 例: Microsoft Excel / LibreOffice Calc。
4. **コマンドライン環境（必須）**
   - Windowsなら PowerShell か コマンドプロンプト。

> 補足: 現時点の実装は「ダブルクリック起動のGUIアプリ」ではなく、コマンド実行で動く開発版です。
> 将来的に Electron 化すると、`ShiftMaker Setup.exe` でインストールして利用できる形になります。

### A. まず試す（開発版）

#### 1. 必要なものを入れる
- **Node.js（推奨: 20以上）**をインストールします。
- コマンドプロンプト（またはPowerShell）を開き、このプロジェクトのフォルダに移動します。

```bash
cd /path/to/shiftmaker
```

#### 2. 依存パッケージを入れる
```bash
npm install
```

#### 3. テストを実行（任意）
```bash
npm run test
```

#### 4. シフトを生成してExcelを書き出す
```bash
npm run start
```

実行が成功すると、`output` フォルダに以下ができます。
- `shift-data.json`（入力データ＋生成結果）
- `shift-plan.xlsx`（Excel出力）

### B. どこを編集すれば自社データで使えるか

最初はサンプルデータが入っています。以下を変更してください。

1. **現場・枠・役割・需要を変える**
   - `src/data/sampleData.ts` の `sites` と `demand` を編集
2. **スタッフ情報を変える**
   - `src/data/sampleData.ts` の `staff` を編集
3. **希望休を入れる**
   - `src/data/sampleData.ts` の `timeOff` を編集
4. **ルールを変える**
   - `src/data/sampleData.ts` の `rules` を編集
5. **作成期間を変える**
   - `src/index.ts` の `generateShiftPlan(..., '開始日', '終了日')` を編集

編集後にもう一度 `npm run start` を実行すると、新しい条件でExcelが再生成されます。

### C. 共有フォルダで使うときのポイント

- このプロトタイプは**現場ごとのロックファイル**で同時編集を防ぎます。
- 同じ現場を同時に編集しようとするとエラーになります（想定動作）。
- 保存先を共有フォルダにする場合は、`output` を共有フォルダ配下に変更して運用します。

### D. よくあるつまずき

1. `npm install` が失敗する
   - 社内ネットワーク制限やプロキシ設定の影響が多いです。
   - 情シスに npm レジストリ（registry.npmjs.org）アクセス可否を確認してください。

2. `npm run test` で `tsx` が見つからない
   - `npm install` が完了していない可能性があります。先に `npm install` を成功させてください。

3. Excelが出ない
   - `npm run start` 実行時のエラーメッセージを確認し、`output` フォルダが作成できる権限があるか確認してください。

### E. 最終的に“アプリとして使う”には（次ステップ）

今はCLI実行（コマンド実行）版です。実際の運用では次を追加します。

- Electron UI（画面）
- インストーラ作成（`ShiftMaker Setup.exe`）
- CSV取込画面、ドラッグ&ドロップ編集画面、統計画面

この順で拡張すると、現場メンバーでも「ダブルクリックで起動して使える」形になります。

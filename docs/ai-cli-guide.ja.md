# AI CLI Guide · 三つの AI コマンドラインツール

[简体中文](ai-cli-guide.md) · [English](ai-cli-guide.en.md) · [Español](ai-cli-guide.es.md) · [Русский](ai-cli-guide.ru.md) · **日本語**

ai-study-kit には三つの AI CLI が組み込まれており、学習素材をループの三つの成果物に変えます：`teach-generate` はコースを、`grill-wrong` は間違えた問題の徹底解説を、`podcast-generate` は復習ポッドキャストを生成します。すべてあなた自身の LLM/TTS API key で駆動し、OpenAI 互換プロトコルのサービスならどれでも使えます（OpenAI / 智谱 GLM / DeepSeek / Kimi / 通義 / 豆包など）。

三つの CLI はリポジトリルートにショートカットコマンドがあり、以下では短い形式で統一します（`node apps/quiz-app/scripts/<スクリプト名>.mjs` と等価）：

| ショートカット | スクリプト | 成果物 |
|----------|------|------|
| `pnpm run ai:teach` | `teach-generate.mjs` | コース HTML（`lessons/*.html`） |
| `pnpm run ai:grill` | `grill-wrong.mjs` | 徹底解説 HTML（`study/wrong-questions/*.html`） |
| `pnpm run ai:podcast` | `podcast-generate.mjs` | ポッドキャストのスクリプト＋逐字稿＋音声（`podcast-out/`） |

---

## クイックスタート

### 1. API key の設定

```bash
cp .env.example .env
# .env を編集。最低 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL の 3 項目を設定
```

プロバイダの選択肢と説明の全体は [`configuration.ja.md`](./configuration.ja.md) を参照してください。

### 2. quiz-app バックエンドの起動（grill に必要）

```bash
pnpm run server  # 別のターミナルで、:8787 で起動
```

### 3. 三つの CLI を実行

```bash
# A. コースを生成（course-spec.json から）
pnpm run ai:teach -- --theme dev-intro

# B. 徹底解説を生成（サーバーから間違えた問題を取得）
pnpm run ai:grill -- --theme dev-intro

# C. ポッドキャストを生成（任意の学習素材から）
pnpm run ai:podcast -- --input examples/dev-intro/lessons/git-basics.html
```

三つの AI CLI はいずれも `--json` に対応しています：人が読むログは stderr に降格し、stdout には結果の JSON（成果物パスのリスト）だけを出力します。他の agent／スクリプトのパイプラインで消費できます（`mastery-report --json` と同じ規約）。noop パス（現在間違えた問題がない場合など）も JSON を出します（`status: "noop"`）。パイプラインでの分岐判断に便利です。

---

## teach-generate — コースを生成

テーマの仕様（mission + resources + audience）を複数節の自己完結型 HTML コースに変えます。

### 入力

`examples/<theme>/course-spec.json`：

```json
{
  "theme": "react-basics",
  "mission": "学び終えたら自力で React コンポーネントライブラリを書けるようになる",
  "audience": "JS の基礎があり、React は初めての開発者",
  "depth": "beginner",                          // beginner | intermediate | advanced
  "lessonsCount": 3,                            // 欲しいレッスン数
  "outline": ["Hooks の基礎", "状態管理", "コンポーネント設計"],  // 任意。未記入なら LLM が自動で分割
  "resources": [                                // 任意。権威ある資料のリンク
    { "title": "React 公式ドキュメント", "url": "https://react.dev" }
  ]
}
```

### 出力

`examples/<theme>/lessons/0001-<slug>.html`、`0002-<slug>.html`...：

- 各節は自己完結型 HTML（リンクは `../assets/styles.css` を共有）
- 構造：h1 + meta + lead + 複数の h2 + callout（重点／警告／コツ）+ quiz-anchor
- 核心機構の模式図：各レッスンに少なくとも 1 枚のインライン SVG。図は大きく文字は少なく、機構だけを描く（ノード＋矢印で流れ／階層／対比を表現）
- 出典のリンクバック：各レッスン末尾の `📚 出典` ブロックに権威あるソースのリンクを列挙——リソース = `course-spec.json` の `resources` と、テーマディレクトリの `RESOURCES.md`（teach ワークフローで定めた権威リソースのリスト）を URL で重複排除して統合したもの。LLM の授業準備の参考にも、ページ末尾の表示にも入ります（「参考資料で概念を作る」原則の成果物面）
- 参考本文のフェッチ（v0.13）：コース生成時に上記リンクの**ページ本文**を LLM の授業準備コンテキストへ取り込みます（「参考資料で概念を作る」を引用層から内容層へ落とし、授業準備の第一根拠にする）。ローカルキャッシュは URL 単位で重複排除（`apps/quiz-app/node_modules/.cache/teach-resources/`）。生成をやり直しても再フェッチしません。個々のソースでフェッチに失敗した場合は URL リスト引用へ自動降格し、コース生成は中断しません
- prev/next リンクで相互に接続

### 使い方

```bash
pnpm run ai:teach -- --theme react-basics
pnpm run ai:teach -- --theme X --lessons 5   # lessonsCount を上書き
pnpm run ai:teach -- --theme X --lang en     # コースを英語で生成
pnpm run ai:teach -- --theme X --json        # 機械可読出力（agent が消費）
```

`--theme` を渡さないときのデフォルトは `dev-intro` です。参考：[`examples/dev-intro/course-spec.json`](https://github.com/jerryjiao/ai-study-kit/blob/main/examples/dev-intro/course-spec.json)。

---

## grill-wrong — 間違えた問題の徹底解説を生成

サーバーからあなたの回答の間違えた問題を取得し、LLM が出題ポイントごとにクラスタリングしてから、クラスタごとに深く展開します。

### 流れ

1. `GET /api/progress` で間違えた問題のリストを取得（`SERVER` 環境変数でバックエンドを指定）
2. `examples/<theme>/questions.json` と突き合わせて完全な問題文を取得
3. LLM が「出題ポイント」ごとに間違えた問題をクラスタリング（例：「git reset vs revert」3 問、「HTTP ステータスコード」2 問）
4. 各クラスタを LLM が深掘りした徹底解説 HTML を生成（核心の違いの表＋意思決定フロー図＋間違いやすいポイントの警告＋バリエーション訓練）
5. `examples/<theme>/study/wrong-questions/cluster-NN-<slug>.html` に書き出し（旧位置 `wrong-questions/` の成果物は自動識別して移行）
6. `examples/<theme>/study/wrong-questions/index.html` の間違え学習センターのメインページを更新
7. **学習者記録を副産物として生成**：LLM は同時に、出題ポイント単位の誤答原因（wrongReasons / advice）を `examples/<theme>/study/records/profile.json` に書き込みます（機械可読。問題 id の重複で同じ出題ポイントとみなして累積マージ）。記録は学習者の私有データで、build では公開されません。次回 `mastery-report` や `/ask-coach` の検出時に自動的に持ち出され、おすすめの理由が「EP-03 を 2 連続で間違い、原因：権限ビットの組み合わせに不慣れ」まで具体化されます。

### 使い方

```bash
# 前提：quiz-app バックエンドが走っていて、既に問題を解き、間違えた問題があること
pnpm run server  # 別のターミナル

pnpm run ai:grill -- --theme react-basics
pnpm run ai:grill -- --max-clusters 5                # 最大 5 クラスタ
pnpm run ai:grill -- --lang es                       # 徹底解説をスペイン語で生成
pnpm run ai:grill -- --json                          # 機械可読出力（agent が消費）
SERVER=http://my-server:8787 pnpm run ai:grill       # リモートの間違えた問題を取得
```

### 間違えた問題の卒業ルール（quiz-app と同一）

| wrongCount | しきい値 | 意味 |
|------------|------|------|
| 1 | 1 回正解 | 新しい間違えた問題。1 回正解すれば外れる |
| 2 | 2 回正解 | 2 回間違えた。連続 2 回正解で卒業 |
| 3+ | 3 回正解 | 高頻度の間違えた問題。連続 3 回正解で卒業 |

---

## mastery-report — 出題ポイント習得度レポート（AI なし）

まとめ解説の伴生ツールです：問題バンク＋回答進捗から、各出題ポイント（問題の `examPoint`、EP-NN）の習得度を**決定論的に導出**します。LLM は不要です。人と agent の共用——人は表を見て、agent は `--json` を食べます（`/ask-coach` の検出スナップショットの「苦手出題ポイント」の行はここから来ています）。

### 判定基準（四状態）

| 状態 | 判定基準 |
|------|------|
| 習得済み | 出題ポイント配下の問題がすべて回答済み、直近が全問正解、未卒業の間違えた問題がなく、マッピングされたフラッシュカードもすべて卒業 |
| 苦手 | 未卒業の間違えた問題がある、または直近に不正解がある |
| 学習中 | 部分回答で否定的証拠なし、または問題は全問正解だがマッピングされたカードが未卒業 |
| 未着手 | 一問も未回答 |

フラッシュカード卒業コンポーネント：`flashcards.json` のカードには任意の `examPoint`（EP-NN。問題バンクと同じ名前空間）を持たせられます。マッピングのある出題ポイントは、習得判定においてこれらのカードが SRS で卒業（`phase = review`）していることも要求します。マッピングのない出題ポイントは影響を受けません——判定基準は自然に純粋な問題次元へ後退します。Web アプリのホームの「出題ポイント習得度」パネルが同じ判定基準をリアルタイム表示します（`src/lib/mastery.ts`）。

レポートは学習者記録（`study/records/profile.json`。grill の副産物）と join します——出題ポイントの行に誤答原因と助言が載ります。出題ポイント名は MISSION.md の配置表からパースします。

### 口頭の四状態（v0.14。`--json` の `oral` フィールド）

口頭回答の履歴（`study/records/oral-attempts.json`。チャット層が逐次追記する口頭問答の明細）にある各口頭目標——配置表の全出題ポイント ∪ 履歴に現れた素の知識ポイント（チャットで新たに学び、まだ問題がない概念）——には、**純粋に口頭チャネルだけ**の四状態があります。判定基準に LLM は一切使いません：

| 状態 | 判定基準 |
|------|------|
| 習得済み | 直近の加重正答率 ≥ 0.85（直近 5 回の重み 0.5/0.7/0.85/0.95/1.0、重みの和で正規化。1 回・2 回は 0.5/0.8 で上限打ち切り——1 回の当て推量で到達できないようにするため） |
| 苦手 | 直近が不正解（否定的証拠を優先）、または加重スコア < 0.5 |
| 学習中 | 回答あり、否定的証拠除外、加重スコアが習得ラインに未達（例：2 回連続正解 = 0.8） |
| 未着手 | 履歴に目標なし |

`oral.weakRanked` が agent に口頭の苦手を指名します。問題バンクの出題ポイントの四状態と合流するときは**否定的証拠を優先**（どちらかが苦手なら苦手）。問題チャネルにデータがある場合は問題を優先し、問題を解いていないときは口頭が最高でも「学習中」まで（効果の検証は問題演習で）。既存の出題ポイント四状態の判定基準（上の表）は一文字も変わりません。

### ナレッジグラフ投影（v0.14。`--graph` / `--write-projection`）

`--graph <graph.json のパス>`（または環境変数 `KNOWFLOW_GRAPH_JSON`）を渡すと、レポートは外部ナレッジベース knowflow のナレッジグラフを読み込み、出題ポイントノードとのマッピング（`study/records/graph-map.json`。agent が提案し、学習者が確認）と組み合わせて**読み取り専用の投影ファイル**を生成します：

```bash
pnpm run mastery -- --graph /path/to/knowflow/graph/graph.json --write-projection
# → graph.json と同じディレクトリに mastery-projection.json を生成：
#   { version: 1, generatedAt, source, nodes: [{ id, mastery, oral: { asked, correct } }] }
```

`--json` の `graph` フィールドにはグラフのシグナルが載ります：ノードの四状態（マッピング済みノード = 問題バンク四状態 ∪ 口頭四状態の合流。未マッピングノード = 純粋な口頭チャネル）、マッピング件数、投影の生成結果。**グラフなし／マッピングなし = 静かに降格**し、純粋な出題ポイント口径になります（`graph.loaded = false`）。故障ではありません。graph.json 本体とナレッジページは一切変更せず、ナレッジベースに書き戻すことは決してありません（ADR-0005 投影ブリッジ）。

**前提関係と推奨順（`graph.weakPrereqs` / `graph.weakOrdered`）**：グラフの辺に関係ラベル（knowflow の関係ラベラーの口径）があるとき、レポートは前提系の関係（前置き／依存／出所／引用／根拠／使用／所属／派生）を「先に学ぶべき」順序にマッピングします——`weakPrereqs` は各苦手出題ポイントの前提チェーン（前提の習得状態を含む）、`weakOrdered` は前提順を尊重した推奨順（前提を先に。推移を含む。ループと relation のない辺は順序付けに参加しない）。おすすめの理由は「EP-12 を演習」から「前提概念 EP-01 がまだ苦手なので、先に補う」まで具体化されます。グラフなし／マッピングなし／前提辺なし → これらのフィールドはなく、静かに降格します。


### 使い方

```bash
pnpm run mastery                                # 人が読める表（デフォルト dev-intro）
pnpm run mastery -- --theme react-basics       # テーマを指定（外部テーマパックのパスも可）
pnpm run mastery -- --json                     # 機械可読（agent の検出用）
pnpm run mastery -- --progress /tmp/p.json     # 進捗ファイルを指定（デフォルトは apps/quiz-app/progress.json。
                                               #  オンラインの進捗を見るには先に curl -sf $SERVER/api/progress -o /tmp/p.json）
pnpm run mastery -- --panorama                  # 出題ポイントパノラマ（v0.13）：講義／演習／習得の三シグナルを day ごとにグループ化＋集計行
                                               #  （講義済み = 学習記録 ∪ 完了したレッスン / 演習済み = 回答または口頭履歴 / 習得 = 四状態の判定基準）
                                               #  --json を加えると agent 向け。skill の「進捗報告」パノラマカードはここから
```

進捗ファイルが存在しない = 空の進捗（すべて未着手）。故障ではありません。

---

## podcast-generate — 復習ポッドキャストを生成

任意の学習素材（コース HTML／問題／徹底解説）を男女二人のナレーターによる対話ポッドキャストに合成します。

### 入力

`--input` でファイルを一つ指定すると、スクリプトが形式を自動判別します：

| 形式 | 処理方法 |
|------|---------|
| `.html` | タグを除去し、タイトルと本文を抽出 |
| `.md` | そのまま |
| `.json`（questions.json） | 各問題を「問題文＋選択肢＋正解＋解説」に整形 |
| `.txt` | そのまま |

### 出力（三点セット。`podcast-out/` へ書き出し）

| ファイル | 内容 |
|------|------|
| `<slug>-script.json` | 対話スクリプト（構造化。title / source / generatedAt / script 配列を含む） |
| `<slug>-transcript.md` | Markdown の逐字稿（👩 女性ナレーター / 👨 男性ナレーターの表記付き） |
| `<slug>.wav` | 合成された双ナレーターの音声（`--no-tts` を除く） |

### 使い方

```bash
# 基本的な使い方
pnpm run ai:podcast -- --input examples/dev-intro/lessons/git-basics.html

# セグメント数とスタイルを制御
pnpm run ai:podcast -- --input examples/dev-intro/questions.json \
  --segments 15 --style interview

# スクリプトだけ生成して音声は合成しない（TTS コストを節約）
pnpm run ai:podcast -- \
  --input examples/dev-intro/study/wrong-questions/cluster-01-*.html --no-tts

# 別の言語でセリフを生成（先に --no-tts でスクリプトを検証。下記「出力言語」を参照）
pnpm run ai:podcast -- --input examples/dev-intro/questions.json --lang ru --no-tts

# 機械可読出力（agent が消費）
pnpm run ai:podcast -- --input examples/dev-intro/questions.json --no-tts --json
```

### スタイルの選択肢（`--style`）

| 値 | スタイル |
|----|------|
| `conversational`（デフォルト） | 二人で気軽に雑談。補い合い、質問し合い、例を出し合う |
| `lecture` | 一方がメインで講じ、もう一方が補足の質問とまとめ |
| `interview` | 一方が専門家役、もう一方がインタビュアー役で質問する |

### TTS の設定

音声の合成には TTS プロバイダの設定が必要です（デフォルトは GLM-TTS）。詳細は [`configuration.ja.md`](./configuration.ja.md) へ。`--no-tts` モードは対話スクリプト＋逐字稿だけを生成し、TTS を呼びません——コスト節約、または後から他の TTS ツール（NotebookLM など）で合成。

---

## 出力言語（`--lang` / `STUDY_LANG`）

三つの CLI はいずれも、**生成コンテンツ**の出力言語を指定できます：

```bash
pnpm run ai:teach   -- --theme X --lang en   # 英語のコース
pnpm run ai:grill   -- --theme X --lang es   # スペイン語の徹底解説
pnpm run ai:podcast -- --input Y --lang ru   # ロシア語のポッドキャストのセリフ

# または環境変数で一律に（.env に設定可）
STUDY_LANG=en pnpm run ai:teach -- --theme X
```

`zh`（デフォルト）/ `en` / `es` / `ru` / `ja` に対応しています。言語のレジストリは [`scripts/lib/langs.mjs`](https://github.com/jerryjiao/ai-study-kit/blob/main/apps/quiz-app/scripts/lib/langs.mjs) にあり、新しい言語の追加はレジストリに一件足すだけです。

挙動の取り決め：

- `--lang` が影響するのは**生成コンテンツ**（コース本文、アウトライン、徹底解説本文、ポッドキャストのセリフ／タイトル）と、生成 HTML の固定テキスト（前のレッスン／次のレッスンのナビゲーション、フッターの説明、`<html lang>` 属性、逐字稿のナレーターの呼び名）だけです；
- CLI 自身のログ／エラーは中国語のままです（操作者はメンテナーであるため）；
- 問題バンクの原文（問題文／選択肢）は翻訳されません——徹底解説の中の引用はそのまま。これは意図的なものです。問題と解説は、あなたが解いた問題と一致していなければならないからです；
- **podcast の注意**：TTS は現在 GLM-TTS しか接続していません。中国語以外のセリフを合成できるかは、プロバイダの多言語対応次第です。まず `--lang X --no-tts` でスクリプトを確認し、TTS の対応を確かめてから音声を合成することをおすすめします。

フロントのクイズアプリ UI の多言語化（上部バーで中/EN/ES/RU/JA を切り替え）は別の機構です。README の「多言語」の節を参照してください。

---

## AI なしでも使える

三つの CLI は**追加能力**であって必須ではありません。ai-study-kit をクイズアプリ＋フラッシュカードツールとしてだけ使いたいなら、LLM を設定せず CLI を走らせなくてもよく、`pnpm dev` だけで十分です。コース解説、間違えた問題の深掘り分析、復習ポッドキャストといった AI 支援の能力が欲しければ、API key 一つでフルセットが解放されます。

---

## 設計哲学

| 設計点 | 選択 | 理由 |
|--------|------|------|
| LLM プロバイダ | OpenAI 互換プロトコル＋baseURL | 一つのコードで国内外のプロバイダの 95% をカバー（OpenAI/GLM/DeepSeek/Kimi/通義/豆包） |
| 設定インターフェース | `.env` の 3 項目（`LLM_BASE_URL` ＋ `LLM_API_KEY` ＋ `LLM_MODEL`） | 最小構成。一ファイルで管理 |
| 堅牢性 | `parseJsonLoose` ＋指数バックオフで 3 回再試行＋明確なエラー | LLM はしばしば「壊れた JSON」を返したりリミットしたりする。耐障害性が必須 |
| テスト | 純粋関数を `lib/` に切り出し、`node:test` で単体テスト | LLM 呼び出し自体は単体テスト不能だが、周辺ロジックはすべてテスト |
| AI クライアントに縛らない | agent skill ではなく CLI にする | ZCode / Claude Code / Cursor のユーザーが誰でも使え、CI でも走らせられる |

テーマワークスペースの構造（`MISSION.md` / `RESOURCES.md` / `lessons/`）と出題規律の一部（選択肢の等長、フォーマットでヒントを与えない）は teach skill のワークフローに由来します。ここに謝意を表します。

方法論の背景の全体は [`methodology.ja.md`](./methodology.ja.md) へ。三つの CLI は方法論の工学的な実装です。

---

## よくある質問

**Q: CLI を走らせると "LLM 配置不完整" と出る**
A: `.env` にフィールドが足りません。`.env.example` を `.env` にコピーし、3 項目を埋めてください：`LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL`。詳細は [`configuration.ja.md`](./configuration.ja.md)。

**Q: LLM が返した JSON のパースに失敗する**
A: 既に `parseJsonLoose` による寛容処理があります（`{...}` の抽出／markdown コードブロックの除去）。それでも失敗するなら、LLM の出力が大きく脱線しています——別の model を試してください（`gpt-4o-mini` / `glm-4.6` / `deepseek-chat` はいずれも安定）。

**Q: TTS の合成がとても遅い**
A: GLM-TTS は 1 セグメント約 5〜10 秒、12 セグメントの対話で約 2 分です。速くしたい場合は `--no-tts` でスクリプトだけ生成し、後から他のツールで合成してください。

**Q: 生成されたコース／徹底解説の質が良くない**
A: `course-spec.json` の `audience` / `depth` / `resources` フィールドを調整してください——対象読者とリソースが具体的であるほど、成果物の質は上がります。粒度を制御するには `--segments`（podcast）や `--lessons`（teach）を変える手もあります。

**Q: Claude / Gemini など、OpenAI 以外のプロトコルのプロバイダを接続したい**
A: 現在の抽象層は OpenAI 互換プロトコルのみサポートしています。Claude にも Gemini にも OpenAI 互換プロキシがあります（LiteLLM Proxy、OpenRouter など）。プロキシ経由で接続してください。将来的にネイティブ adapter を追加する可能性があります。

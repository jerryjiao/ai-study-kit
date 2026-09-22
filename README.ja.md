<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/jerryjiao/ai-study-kit@main/assets/logo.png" width="128" alt="ai-study-kit logo" />
</p>

# ai-study-kit

[简体中文](README.md) · [English](README.en.md) · [Español](README.es.md) · [Русский](README.ru.md) · **日本語**

**一行でインストール**：この一行をあなたの AI（Claude Code、zcode、Cursor など任意のツール）に送るだけで、プロトコルに従ってコーチとサイトのソース一式がインストールされます——clone も不要、コマンドを暗記する必要もありません：

```text
Install ai-study-kit from https://aistudykit.dev/install.md
```

<p align="center">
  <a href="https://aistudykit.dev/"><img src="https://img.shields.io/badge/サイト-online-blue" alt="公式サイト" /></a>
  <a href="https://github.com/jerryjiao/ai-study-kit/actions/workflows/deploy-site.yml"><img src="https://github.com/jerryjiao/ai-study-kit/actions/workflows/deploy-site.yml/badge.svg" alt="デプロイ状況" /></a>
  <img src="https://img.shields.io/badge/i18n-5%E8%A8%80%E8%AA%9E-blue" alt="UI は 5 言語" />
  <a href="https://github.com/jerryjiao/ai-study-kit/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://github.com/jerryjiao/ai-study-kit/commits/main/"><img src="https://img.shields.io/github/last-commit/jerryjiao/ai-study-kit" alt="last commit" /></a>
</p>

🌐 [公式サイト](https://aistudykit.dev/) · ▶️ [オンラインデモ](https://aistudykit.dev/demo/) · 📖 [はじめ方](https://aistudykit.dev/ja/get-started/)

**ひとことでいうと**：AI に「X を学びたい」と伝えるだけ——コーチがあなたと出題ポイントをすり合わせ、問題とレッスンを書き起こし、身につくまで繰り返し鍛えてくれます。問題バンクを用意する必要はありません。残りはツールが、コース・フラッシュカード・間違えた問題の分析を備えた完全な学習アプリに仕上げます。

---

## 👋 誰のためのものか

| 今していること | 向いているか |
|----------------|--------------|
| 🧑‍💻 **開発者が新しい技術を学ぶ**（React / K8s / Rust） | ✅ AI がドキュメントの要点を問題にしてくれます。クイズ＋フラッシュカードで定着 |
| 📚 **試験対策の復習**（教科 / 大学院入試 / 資格試験） | ✅ 過去問があればそのまま取り込み、なければ AI に出題ポイントから作問してもらう |
| 🎯 **面接対策**（基礎知識 / システムデザイン） | ✅ どんな面接か一言伝えれば、AI がコースと問題を作り、間違えた問題の見直しに付き合います |
| 🗂️ **「出題ポイント」のあるものなら何でも**（コンプライアンス / 手順 / 用語） | ✅ 「問題＋答え」に分解できるものは学べます |
| ❌ 完成済みの問題バンクが欲しい（「Java の問題 500 問」のようなもの） | ❌ 本ツールに既成の問題集はありません——ただし AI があなたの出題ポイントに合わせて一式作成できます（ご自身の API キーで） |

インストール後にまず動かして試してみたいですか？以下の clone ルートへどうぞ。

---

## 🚀 デモを動かす（clone ルート、開発者向け）

```bash
git clone https://github.com/jerryjiao/ai-study-kit
cd ai-study-kit && pnpm install && pnpm dev
# ブラウザで http://localhost:5173 を開く
```

git＋Linux のサンプルテーマが同梱されています：**クイズ**（単一選択／複数選択／正誤判定。提出すると即採点、間違えた問題は自動的に記録）、**フラッシュカード**（SM-2 間隔反復、Anki のアルゴリズムと互換）、**コース**（自己完結型の HTML 講義）。これはあくまでデモです。実際の使用では自分のテーマに差し替えてください（次のセクション参照）。

---

## 🧭 次に何を学べばいいか迷ったら？`/ask-coach`

プラグインをインストール（または `pnpm run skill:install` で `~/.agents/skills/` へ導入）した後は、毎回の学習をここから始めます。コマンドは 5 つ：`/ask-coach` はコーチに次の一手を尋ねます（スナップショット＋推奨＋実行のガイド）、`/study-coach` は座ったらすぐ学習、`/study-doctor` はワンクリック健康診断、`/study-recap` は間違えた問題の徹底解説へ直行、`/study-podcast` はポッドキャスト生成へ直行。

`/ask-coach` はまず**学習状態をスキャン**し（進捗、期限の来たフラッシュカード、間違えた問題、AI 設定）、いま最もやるべきことを 1 つ推奨します。選んだ後は一歩ずつ実行に付き添います——初期化からデプロイまで、13 のフローをすべてカバー。詳細は [`docs/ai-study-kit.ja.md`](docs/ai-study-kit.ja.md) を参照してください。

---

## 🔧 自分のテーマに差し替える

**React の基礎**を学ぶ例です。操作するのは `examples/` 以下のファイルだけで、アプリのコードには触れません：

1. **テーマディレクトリをコピー**：`cp -r examples/dev-intro examples/react-basics`（リポジトリ外に置くこともできます。パスに区切り文字が含まれていれば外部テーマパックとして扱われます。[`docs/adr/0004`](docs/adr/0004-external-theme-packs.md) 参照）
2. **問題バンクを編集** `questions.json`：問題は純粋な JSON で、1 レコード＝問題文＋選択肢＋正解＋解説（完全なスキーマは [`apps/quiz-app/src/types.ts`](apps/quiz-app/src/types.ts) の `Question` インターフェースを参照）：

   ```json
   {
     "id": "R-001",
     "type": "single",
     "source": "react-basics",
     "topic": "react-basics",
     "question": "React の useState は何を返しますか？",
     "options": {
       "A": "現在の state の値",
       "B": "state を更新する関数",
       "C": "配列 [state, setState]",
       "D": "オブジェクト { state, setState }"
     },
     "answer": ["C"],
     "analysis": "useState は [state, setState] の 2 要素配列を返します。通常は配列の分割代入として使います。"
   }
   ```

3. **フラッシュカードを編集** `flashcards.json`：表に問い、裏に展開——同じくらいシンプルです
4. **切り替え**：`EXAMPLE_THEME=react-basics pnpm dev`、再読み込みで反映
5. **（任意）コースと見た目**：コースは `lessons/*.html`、ホームのグルーピング／表示名などは `theme-config.json`（[`docs/theming.ja.md`](docs/theming.ja.md) 参照）。未設定なら適切にフォールバックします
6. **検証の 4 点セット**：`pnpm run scan`（ゼロリーク）＋ `pnpm test` ＋ `pnpm run build` ＋ `python3 scripts/bidirectional-check.py examples/react-basics/`（四つの整合）

**手で問題を書きたくない？** `/ask-coach` を入れた状態で「react-basics 用の問題バンクを一式作って」と伝えるだけです——エージェントはまず出題ポイント配置表であなたとすり合わせを行い、確認後に表どおり問題とカードを作成し、3 つの品質検証を自動で通してから納品します。手作業のルートはあくまでメインであり、配置表は人間とエージェントの間の契約です。

---

## 🤖 AI にコース／間違えた問題の徹底解説／ポッドキャストを作らせる

リポジトリには 3 つの AI コマンドラインツールが組み込まれています（LLM は OpenAI 互換プロトコルなら何でも動作します。TTS は現在 GLM-TTS に対応）：

| CLI | 何をするか | 成果物 |
|-----|------------|--------|
| `teach-generate.mjs` | テーマの仕様を複数セクションの HTML コースに構成する | `lessons/*.html` |
| `grill-wrong.mjs` | 間違えた問題を出題ポイントごとにクラスタリングして深掘りする | `wrong-questions/*.html` ＋ 出題ポイント別の誤りプロファイル |
| `podcast-generate.mjs` | 任意の学習素材を男女 2 人のナレーターによる音声番組に合成する | `.wav` ＋ 台本 JSON ＋ 文字起こし |

設定は `cp .env.example .env` のあと `LLM_BASE_URL / LLM_API_KEY / LLM_MODEL` を埋めるだけです（詳細は [`docs/configuration.ja.md`](docs/configuration.ja.md)）。実行方法とパラメータは [`docs/ai-cli-guide.ja.md`](docs/ai-cli-guide.ja.md) を参照してください。

> 💡 **AI なしでも使えます**。3 つの CLI は追加機能です。クイズアプリ＋フラッシュカードだけでよければ、LLM を設定せず、CLI を実行しなくても、`pnpm dev` で十分です。

---

## 🌍 多言語

本 README は 5 言語で同構です（上部の言語バーで切り替え）。**UI** は 中文 / English / Español / Русский / 日本語 をワンクリックで切り替えられ、初回アクセス時はブラウザの言語で自動選択され、設定は端末間で同期されます。**AI が生成するコンテンツ**は `--lang zh|en|es|ru|ja` で出力言語を指定します。辞書と検証の仕組みは [`apps/quiz-app/src/i18n/`](apps/quiz-app/src/i18n/) にあります。

---

## 🎯 このツールを使う理由

| ai-study-kit を使わない | ai-study-kit を使う |
|--------------------------|----------------------|
| **Anki** はフラッシュカードに強いが、クイズサイトも、間違えた問題の徹底解説も、コースもない | 1 つのアプリに 6 つの学習成果物が揃い、同じ出題ポイントを軸に整合 |
| **Quizlet** は問題もカードもあるが、クローズドな SaaS でデータが手元に残らない | オープンソースの MIT。データはローカル＋あなたのサーバーにあり、アカウント不要で端末間同期 |
| **Notion のメモ**は記録はできるが演習はできず、間隔反復のアルゴリズムもない | Anki 互換の SM-2 ＋ Anki 学習ステップのアルゴリズムを内蔵 |
| **問題集の PDF / Word** は読むだけで、採点も正答率の統計もできない | 自動採点、間違えた問題の記録、正答率の統計、SRS スケジューリング |
| **ChatGPT に直接聞く**と知識が散らばり、学習パスができない | AI が散らばった知識を体系的なコース＋問題バンク＋フラッシュカードに構造化 |

**中核の差別化は四つの整合のループ**：コースで講義する出題ポイント、問題で問う出題ポイント、フラッシュカードで覚える出題ポイント、徹底解説で深掘りする出題ポイント——すべてが同じ知識ポイントを軸に揃います（詳細は [`docs/four-alignment.ja.md`](docs/four-alignment.ja.md)）。

---

## 📚 ドキュメントガイド

すべてのドキュメントが 5 言語で存在し、上部の言語バーで相互にリンクします（简体中文 / English / Español / Русский / 日本語）。

| ドキュメント | ここで学べること |
|--------------|------------------|
| [`docs/methodology.ja.md`](docs/methodology.ja.md) | 学習方法論：アウトライン → 参考資料 → 演習 |
| [`docs/four-alignment.ja.md`](docs/four-alignment.ja.md) | 四つの整合の原則。コース／問題／フラッシュカード／間違えた問題がどう連携するか |
| [`docs/bidirectional-check.ja.md`](docs/bidirectional-check.ja.md) | 自動検証スクリプト（問題 ↔ コース ↔ フラッシュカードの相互チェック） |
| [`docs/ai-cli-guide.ja.md`](docs/ai-cli-guide.ja.md) | 3 つの AI CLI（teach/grill/podcast）の完全な使い方 |
| [`docs/ai-study-kit.ja.md`](docs/ai-study-kit.ja.md) | `/ask-coach` 学習コーチ：インストール、コマンド一式、ルーティング、拡張 |
| [`docs/configuration.ja.md`](docs/configuration.ja.md) | `.env` の設定（LLM プロバイダー＋TTS プロバイダー） |
| [`docs/theming.ja.md`](docs/theming.ja.md) | テーマの見た目の設定、theme-config.json のフィールド表 |
| [`AGENTS.md`](AGENTS.md) | AI 協作のコンベンション（プロジェクト構造 / コマンド / レッドライン）（中国語） |
| [`examples/dev-intro/`](examples/dev-intro/) | git＋Linux の完全なサンプル：問題＋フラッシュカード＋コース＋徹底解説 |

---

## 🛠️ 開発とデプロイ

```bash
pnpm install        # 依存関係をインストール
pnpm run dev        # ローカル開発（フロントエンド :5173 ＋ バックエンド :8787）
pnpm test           # テスト
pnpm run scan       # ゼロリークスキャン
pnpm run check:alignment  # 四つの整合の検証
pnpm run skill:install    # 学習コーチのコマンドを ~/.agents/skills/ へインストール
```

コマンドの全表、本番デプロイ（pm2）、端末間同期の仕組みについては、[`AGENTS.md`](AGENTS.md) と[公式サイトのドキュメント](https://aistudykit.dev/ja/)を参照してください。

---

## 🤝 コントリビュート

PR と issue を歓迎します。PR を出す前に 4 つお願いします。

1. `pnpm run scan` を実行してゼロリークを確認
2. `pnpm test` を実行してすべてのテストが通ることを確認
3. 成果物（コース／問題／フラッシュカード／間違えた問題）を変更したら、必ず [`bidirectional-check`](docs/bidirectional-check.ja.md) を実行
4. commit メッセージは [Conventional Commits](https://www.conventionalcommits.org/) に従う

---

## 📄 License

[MIT](LICENSE) © ai-study-kit コントリビューター

---

## 🙏 謝辞

- コンテンツパックのワークスペース構造（MISSION → RESOURCES → lessons の組織化）と出題の規律（選択肢の長さを揃える、フォーマットでヒントを与えない）は [Matt Pocock の teach skill](https://github.com/mattpocock) から借用しています。決定の経緯は [`docs/adr/0001-agent-authored-questions-not-cli.md`](docs/adr/0001-agent-authored-questions-not-cli.md) を参照
- データループ（インタラクションの痕跡 → 学習者に関する事実 → 推奨への還元）と口頭習得度の定式化（直近加重正答率＋信頼度のキャップ、決定論的で LLM 不使用）は [DeepTutor](https://github.com/HKUDS/DeepTutor) から着想を得ています。決定の経緯は [`docs/adr/0005-projection-bridge-not-mastery-in-knowflow.md`](docs/adr/0005-projection-bridge-not-mastery-in-knowflow.md) を参照
- コーチの声の規律（口語レジスターの基盤、`skills/references/voice.md`）は [辞達（cida）](https://github.com/mizzlelover/cida)（作者：谁是专家（mizzlelover）、MIT License）から蒸留・再構成したものです。決定の経緯は [`docs/adr/0008-distill-rewrite-not-runtime-dep.md`](docs/adr/0008-distill-rewrite-not-runtime-dep.md) を参照
- 間隔反復アルゴリズムは [Anki の SM-2 実装](https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html)を参考にしています
- サンプルテーマ（dev-intro）の git 知識は [Pro Git Book](https://git-scm.com/book/ja/v2)（公式、無料）を参考にしています

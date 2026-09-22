# Configuration · 設定ガイド

[简体中文](configuration.md) · [English](configuration.en.md) · [Español](configuration.es.md) · [Русский](configuration.ru.md) · **日本語**

三つの AI CLI の `.env` 設定説明です。設定するものはわずかです：LLM プロバイダを一つ選び（OpenAI / GLM / DeepSeek / Kimi / 通義 / 豆包）、ポッドキャストを作りたいときは TTS を追加（現在は GLM-TTS のみ）。すべて OpenAI 互換プロトコルで動くため、プロバイダの切り替えは変数三つだけで済みます。

---

## TL;DR

```bash
cp .env.example .env
# .env を編集。最低 3 項目設定する：
# LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4   （または下記のいずれか）
# LLM_API_KEY=your-key
# LLM_MODEL=glm-4.6                                   （または対応する model 名）
```

設定したら `node apps/quiz-app/scripts/teach-generate.mjs --theme dev-intro` を実行して検証します。

---

## LLM プロバイダの選定

すべてのプロバイダは OpenAI 互換プロトコルで接続します——コードは `openai` npm パッケージの `baseURL` パラメータで切り替えます。

### 国内向けのおすすめ

| プロバイダ | baseURL | おすすめ model | 特徴 |
|----------|---------|-----------|------|
| **智谱 GLM**（おすすめ） | `https://open.bigmodel.cn/api/paas/v4` | `glm-4.6` | 中国語に強く、安くて安定、TTS も同じ key |
| **DeepSeek** | `https://api.deepseek.com/v1` | `deepseek-chat` | 国内で最安、コードに強い |
| **月之暗面 Kimi** | `https://api.moonshot.cn/v1` | `moonshot-v1-32k` | 長いコンテキスト |
| **阿里通義千問** | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` | 阿里エコシステム |
| **字节豆包** | `https://ark.cn-beijing.volces.com/api/v3` | `doubao-pro-32k` | 字節エコシステム |

### 海外向けのおすすめ

| プロバイダ | baseURL | おすすめ model |
|----------|---------|-----------|
| **OpenAI** | `https://api.openai.com/v1` | `gpt-4o-mini`（コスパ）/ `gpt-4o`（品質） |

### Claude / Gemini など非 OpenAI プロトコル

現在、ネイティブプロトコルはサポートしていません。OpenAI 互換プロキシ経由で接続します：

- **LiteLLM Proxy**：オープンソース、自己ホスト、100+ プロバイダのプロトコルを統一
- **OpenRouter**：SaaS、統一インターフェース、従量課金

将来的に Anthropic / Google のネイティブ adapter を追加する可能性があります。

---

## 間違えた問題の取得サーバー（SERVER、任意）

`grill-wrong.mjs` は quiz-app バックエンドの `/api/progress` から間違えた問題を取得します。デフォルトではローカルの `http://localhost:8787` に接続します。ローカルの CLI を自前でデプロイしたオンラインサーバーに向けたいときは、ここを変更します：

```bash
SERVER=https://your-server.example.com node apps/quiz-app/scripts/grill-wrong.mjs --theme your-theme
```

他の CLI（teach / podcast）はネットワーク経由でデータを取得しないため、この変数は使いません。

---

## 出力言語（STUDY_LANG、任意）

三つの AI CLI の**生成コンテンツ**の言語。`zh`（デフォルト）/ `en` / `es` / `ru` / `ja` に対応しています：

```bash
STUDY_LANG=en   # .env に設定、または CLI 実行時に一時的に STUDY_LANG=es node ...
```

コマンドラインの `--lang` パラメータはこの環境変数より優先されます。生成されるコース／徹底解説／ポッドキャストの内容と、HTML の固定テキストにのみ影響し、CLI のログは中国語のままです。podcast の TTS の多言語対応はプロバイダ次第です（まず `--no-tts` で確認することをおすすめします）。詳細は [`ai-cli-guide.ja.md`](./ai-cli-guide.ja.md) の「出力言語」の節を参照してください。

---

## TTS プロバイダの設定（podcast-generate のみ必要）

現在サポートしているのは **GLM-TTS**（智谱）だけです。今後 OpenAI TTS / ElevenLabs を追加する予定です。

### 設定

```bash
TTS_PROVIDER=glm-tts              # デフォルト値、省略可
GLM_TTS_API_KEY=your-glm-key      # LLM に GLM を使っている場合、LLM_API_KEY が自動的に再利用されます
TTS_MALE_VOICE=male                # 任意。デフォルト male
TTS_FEMALE_VOICE=female            # 任意。デフォルト female
```

### ボイスの選択肢

GLM-TTS がサポートする voice の値（詳細は[公式ドキュメント](https://docs.bigmodel.cn/cn/guide/models/sound-and-video/glm-tts)）：

| voice の値 | スタイル |
|----------|------|
| `male` / `female` | 汎用の男性／女性ボイス（CLI のデフォルト。最初の一歩におすすめ） |
| `彤彤` / `小陈` / `锤锤` / `jam` / `kazi` / `douji` / `luodo` | 具体的なボイス名 |

ボイスによってアカウント権限が異なる場合があります。まず `male` / `female` で動作を確認してから、具体的なボイスを試してください。

### TTS を設定したくない場合

`--no-tts` で podcast-generate を実行すると、対話スクリプトと逐字稿（トランスクリプト）だけを生成します。音声は後から他のツール（NotebookLM、オンライン TTS サービスなど）で合成できます。

---

## 完全な .env テンプレート

[`.env.example`](https://github.com/jerryjiao/ai-study-kit/blob/main/.env.example) を参照してください。コピーして値を埋めます：

```bash
cp .env.example .env
```

---

## 設定の読み込み機構

- CLI 起動時、`scripts/lib/llm.mjs` が二か所の `.env` を自動読み込みします：リポジトリルート（`ai-study-kit/.env`）と `apps/quiz-app/.env`。前者が優先されます。
- 必須項目が一つでも欠けているとき、CLI は何が欠けていてどう設定するかを明確に表示して `exit(1)` します——途中まで走って失敗することはありません。
- API key が git に入ることは決してありません（`.gitignore` が `.env` を除外済み）。

---

## 設定の検証

このコマンドで LLM 設定を検証します：

```bash
node -e "
import('./apps/quiz-app/scripts/lib/llm.mjs').then(async (m) => {
  const r = await m.chat([{ role: 'user', content: '回复\"OK\"两个字' }]);
  console.log('LLM response:', r);
});
"
```

期待される出力は `LLM response: OK` のようなものです。エラーになった場合はエラーメッセージを確認してください——たいていは key が無効か、baseURL の書き間違いです。

TTS の検証：

```bash
node -e "
import('./apps/quiz-app/scripts/lib/tts.mjs').then(async (m) => {
  const r = await m.synthesize({ text: '测试', gender: 'female' });
  console.log('TTS bytes:', r.audio.length);
});
"
```

期待される出力は `TTS bytes: 数値`（数万〜数十万）です。

---

## よくある設定ミス

| エラーメッセージ | 原因 | 解決策 |
|---------|------|------|
| `LLM 配置不完整` | `.env` にフィールドが足りない | `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` がすべて埋まっているか確認 |
| `401 Unauthorized` | API key が無効または期限切れ | key を再生成する |
| `404 Not Found` | baseURL の書き間違い | プロバイダのドキュメントを確認し、baseURL の末尾が `/v1` か `/v4` か確認 |
| `model not found` | model 名の間違い | プロバイダのドキュメントを確認。アカウント権限によって使える model が異なる |
| `音色id不存在`（TTS） | voice の値が誤りまたは未対応 | `male` / `female` にフォールバック |
| `connect ETIMEDOUT` | 国内から OpenAI など海外サービスへのアクセス | 国内プロバイダに切り替えるか、プロキシを設定 |

---

## セキュリティ上の注意

- `.env` は `.gitignore` 済みで、git に入ることはありません
- API key をコードやドキュメントに書き込ま**ない**こと
- key を誤ってコミットしてしまった場合は、すぐにプロバイダの管理画面で失効させ、新しい key を生成してください
- サーバーにデプロイするときは、サーバーの環境変数か secret manager を使い、`.env` ファイルを転送しないこと

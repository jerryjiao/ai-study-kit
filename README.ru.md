<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/jerryjiao/ai-study-kit@main/assets/logo.png" width="128" alt="ai-study-kit logo" />
</p>

# ai-study-kit

[简体中文](README.md) · [English](README.en.md) · [Español](README.es.md) · **Русский**

> Превратите любой банк вопросов в полный цикл обучения — тренажёр + курсы + карточки + подробный разбор ошибок + интервальное повторение, с синхронизацией прогресса между устройствами. Демо запускается за 5 минут, адаптация под вашу тему — за 30.

<p align="center">
  <a href="https://jerryjiao.github.io/ai-study-kit/"><img src="https://img.shields.io/badge/site-online-blue" alt="Сайт" /></a>
  <a href="https://github.com/jerryjiao/ai-study-kit/actions/workflows/deploy-site.yml"><img src="https://github.com/jerryjiao/ai-study-kit/actions/workflows/deploy-site.yml/badge.svg" alt="Статус деплоя" /></a>
  <img src="https://img.shields.io/badge/i18n-4%20%D1%8F%D0%B7%D1%8B%D0%BA%D0%B0-blue" alt="Интерфейс на 4 языках" />
  <a href="https://github.com/jerryjiao/ai-study-kit/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://github.com/jerryjiao/ai-study-kit/commits/main/"><img src="https://img.shields.io/github/last-commit/jerryjiao/ai-study-kit" alt="last commit" /></a>
</p>

🌐 [Сайт](https://jerryjiao.github.io/ai-study-kit/) · ▶️ [Живое демо](https://jerryjiao.github.io/ai-study-kit/demo/) · 📖 [Быстрый старт](https://jerryjiao.github.io/ai-study-kit/ru/get-started/)

---

## 👋 Кому это подходит

| Вы… | Подходит |
|------|---------|
| 🧑‍💻 **Разработчик, осваивающий новый стек** (React / K8s / Rust) | ✅ Сверните официальную документацию в вопросы, прорешайте их и закрепите карточками |
| 📚 **Готовитесь к экзамену** (предмет / вступительный / сертификат) | ✅ Ваш реальный банк вопросов + сгенерированные ИИ разборы ошибок |
| 🎯 **Готовитесь к собеседованию** (базы / системный дизайн) | ✅ Пишете вопросы сами, ИИ генерирует курсы, повторение — по SRS |
| 🗂️ **Учите что угодно с «пунктами экзамена»** (комплаенс / процессы / термины) | ✅ Если материал раскладывается на «вопрос + ответ», его можно учить |
| ❌ Ищете готовый банк вопросов («500 вопросов по Java») | ❌ Это **каркас**: ни одного готового вопроса внутри — вопросы приносите вы или генерируете их с ИИ |

**Одной фразой**: это **каркас**, а не банк вопросов. Вы приносите вопросы; инструмент превращает их в учебное приложение с курсами, карточками и разбором ошибок.

---

## 🚀 Демо за 5 минут

```bash
git clone https://github.com/jerryjiao/ai-study-kit
cd ai-study-kit
pnpm install
pnpm dev
# откройте http://localhost:5173
```

**Что вы увидите** (пример темы dev-intro: git + основы Linux):

| Вкладка сверху | Что показывает |
|---------|-------------|
| **Тесты** | 10 вопросов по git/Linux (один вариант / несколько / верно-неверно), проверка мгновенная. Ошибки попадают в тетрадь ошибок, верные ответы показывают объяснение |
| **Карточки** | 4 карточки интервального повторения SM-2. Оценивайте again / hard / good / easy — алгоритм совместим с Anki |
| **Курсы** | 2 самодостаточных HTML-урока (три зоны git; каталоги и права в Linux) со схемами ASCII и врезками-предупреждениями |

> Это просто демо. **Ни один материал dev-intro вам не пригодится** — вы замените его темой, которую реально изучаете.

---

## 🧭 Не знаете, за что взяться? Установите `/study-coach`

Всё, что описано ниже — смена темы, генерация курсов, прорешивание, разборы ошибок, подкасты, деплой — запоминать не нужно. В репозитории есть **команда учебного тренера**, с которой можно начинать каждое занятие:

```bash
pnpm run skill:install     # установит в ~/.agents/skills/study-coach
# перезапустите AI CLI (или откройте новую сессию) и введите /study-coach
```

Сначала он **сканирует ваше учебное состояние** (текущая тема, запасы вопросов/карточек/курсов, прогресс, срок карточек, число ошибок, конфигурация ИИ), затем **советует одно самое полезное действие прямо сейчас** — начать новую тему, повторить срок-карточки, порешать вопросы или собрать накопленные ошибки в подробный разбор — а после выбора **ведёт вас по шагам**. Девять сценариев покрывают всё: от инициализации проекта до деплоя. (Сами сценарии написаны по-китайски; см. [`docs/study-coach.md`](docs/study-coach.md).)

---

## 🔧 Переделайте под свою тему за 30 минут

Рабочий пример: учим **основы React**. Вы трогаете только файлы в `examples/` — **код `apps/quiz-app/` не меняется**.

### Шаг 1 · Скопируйте каталог темы (1 мин)

```bash
cp -r examples/dev-intro examples/react-basics
```

### Шаг 2 · Напишите вопросы (10 мин)

Отредактируйте `examples/react-basics/questions.json` — замените вопросы по git/Linux своими по React. Схема простая:

```json
{
  "id": "R-001",                      // глобально уникальный стабильный id (по нему хранится прогресс)
  "type": "single",                    // single | multi | judge
  "source": "react-basics",            // метка источника вопроса
  "topic": "react-basics",             // группировка по темам (главная группирует по ней)
  "question": "Что возвращает useState в React?",
  "options": {
    "A": "Текущее значение состояния",
    "B": "Функция обновления состояния",
    "C": "Массив [state, setState]",
    "D": "Объект { state, setState }"
  },
  "answer": ["C"],
  "analysis": "useState возвращает массив из двух элементов: текущее состояние и функцию-обновлятор. Обычно используется с деструктуризацией: const [count, setCount] = useState(0)."
}
```

Все поля — в интерфейсе `Question` файла [`apps/quiz-app/src/types.ts`](apps/quiz-app/src/types.ts).

### Шаг 3 · Напишите карточки (5 мин)

Отредактируйте `examples/react-basics/flashcards.json`:

```json
{
  "id": "FC-R-01",
  "front": "Что возвращает useState?",
  "back": "Массив [state, setState].\n\nИспользование: const [count, setCount] = useState(0).",
  "source": "react-basics",
  "topic": "react-basics"
}
```

### Шаг 4 · Переключите тему (1 мин)

```bash
EXAMPLE_THEME=react-basics pnpm dev
# обновите страницу — ваши вопросы по React уже внутри
```

### Шаг 5 · (Необязательно) Курсы + группировка на главной (10 мин)

- **Курсы**: замените `examples/react-basics/lessons/*.html` своими (ИИ может помочь — следующий раздел). Заодно укажите `COURSE_URL` в `apps/quiz-app/src/pages/Courses.tsx` на `/study/react-basics/index.html`.
- **Группировка**: поправьте `TOPIC_ORDER` в `apps/quiz-app/src/lib/topicOrder.ts` — замените `'git-basics', 'linux-commands'` на свои темы.

### Шаг 6 · Проверка (2 мин)

```bash
pnpm run scan       # скан брендов (0 находок = чисто)
pnpm test           # все 5 тестовых файлов должны пройти
pnpm run build      # сборка должна пройти
python3 scripts/bidirectional-check.py examples/react-basics/  # проверка согласованности четвёрки
```

**Готово.** Вы ни разу не тронули React-код — только JSON и HTML.

---

## 🤖 Дальше: пусть ИИ делает курсы / разборы ошибок / подкасты

К этому моменту у вас уже есть рабочее приложение. Настоящая ценность ai-study-kit — **полный цикл обучения с ИИ**: курсы и разборы ошибок не пишутся руками, их генерирует ИИ.

В репозитории три консольных инструмента с ИИ:

| CLI | Что делает | Вход | Выход |
|-----|-------|------|------|
| **`teach-generate.mjs`** | Разворачивает спецификацию темы в многосекционные HTML-курсы | `examples/<theme>/course-spec.json` | `lessons/0001-*.html` и т.д. |
| **`grill-wrong.mjs`** | После прорешивания группирует ошибки по пунктам экзамена и подробно раскрывает каждую группу | ошибки из `/api/progress` | `wrong-questions/cluster-*.html` |
| **`podcast-generate.mjs`** | Превращает любой учебный материал в подкаст с двумя ведущими | любой материал (HTML/MD/JSON) | `.wav` + сценарий JSON + расшифровка MD |

**Работает с любым OpenAI-совместимым LLM**: Zhipu GLM (рекомендуется в материковом Китае) / OpenAI / DeepSeek / Kimi / Qwen / Doubao. TTS пока поддерживает GLM-TTS.

### Конфигурация

```bash
cp .env.example .env
# отредактируйте .env — как минимум LLM_BASE_URL / LLM_API_KEY / LLM_MODEL
# подробности в docs/configuration.md (на китайском)
```

### Запуск трёх CLI

```bash
# сначала поднимите backend quiz-app (grill-wrong его требует)
pnpm run server

# 1. сгенерировать курсы
node apps/quiz-app/scripts/teach-generate.mjs --theme react-basics

# 2. после прорешивания — разбор ошибок
node apps/quiz-app/scripts/grill-wrong.mjs --theme react-basics

# 3. превратить урок в подкаст
node apps/quiz-app/scripts/podcast-generate.mjs \
  --input examples/react-basics/lessons/0001-hooks.html
```

**Типичный цикл**:

```
1. Выбираете тему + собираете авторитетные источники (книги / документация / видео)
2. Пишете course-spec.json → teach-generate создаёт lessons/*.html (системное изложение)
3. Вопросы пишете сами → questions.json (проверка практикой)
4. Прорешиваете → ошибки попадают в тетрадь ошибок
5. grill-wrong → HTML с подробным разбором ошибок
6. podcast-generate → повторяете на слух по дороге
```

Полное описание CLI, параметры и FAQ — в [`docs/ai-cli-guide.md`](docs/ai-cli-guide.md) (на китайском). Детали конфигурации — в [`docs/configuration.md`](docs/configuration.md) (на китайском).

> 💡 **ИИ необязателен**: три CLI — это дополнительные возможности. Если нужен только тренажёр + карточки, LLM можно вообще не настраивать — достаточно `pnpm dev`.

---

## 🌍 Языки

**Этот README**: 简体中文 / [English](README.en.md) / [Español](README.es.md) / [Русский](README.ru.md) — переключение сверху.

**Интерфейс**: переключение в один клик между **中文 / English / Español / Русский** в верхней панели.

- При первом входе язык выбирается по браузеру; затем предпочтение синхронизируется между устройствами (тот же LWW-механизм, что у темы)
- `<html lang>` и заголовок страницы следуют языку (удобно для скринридеров и переводчиков)
- Словари лежат в [`apps/quiz-app/src/i18n/locales/`](apps/quiz-app/src/i18n/locales/); en/es/ru привязаны типами к набору ключей zh — не хватает ключа, сборка падает; тесты полноты ключей и плейсхолдеров — вторая страховка

**Контент, сгенерированный ИИ**: все три CLI принимают язык вывода:

```bash
node apps/quiz-app/scripts/teach-generate.mjs   --theme X --lang en  # курсы на английском
node apps/quiz-app/scripts/grill-wrong.mjs      --theme X --lang es  # разборы ошибок на испанском
node apps/quiz-app/scripts/podcast-generate.mjs --input Y --lang ru  # диалоги подкаста на русском
# или задайте STUDY_LANG=en в .env как значение по умолчанию (zh/en/es/ru)
```

`--lang` влияет на генерируемый контент и фиксированные тексты HTML (навигация, подвал, `<html lang>`). Логи CLI остаются на китайском; сам банк вопросов не переводится. См. раздел «输出语言» в [`docs/ai-cli-guide.md`](docs/ai-cli-guide.md).

> **Язык ваших вопросов и карточек** определяют ваши данные — в `examples/<theme>/*.json` что написали, то и показывается. Хотите полностью русскоязычный сайт? Пишите вопросы по-русски и генерируйте курсы с `--lang ru`. Инструмент вас не привязывает.

---

## 🎯 Зачем этот инструмент

| Без ai-study-kit | С ai-study-kit |
|-------------------|-----------------|
| **Anki**: отличные карточки, но нет тренажёра, разборов ошибок и курсов | 5 учебных артефактов в одном приложении, все на одном наборе пунктов экзамена |
| **Quizlet**: вопросы и карточки есть, но это закрытый SaaS — данные не ваши | Open source MIT; данные у вас локально + на вашем сервере; синхронизация без аккаунтов |
| **Заметки в Notion**: зафиксировать можно, а практики и интервального повторения нет | Встроенный SM-2, совместимый с Anki, + учебные шаги Anki |
| **PDF / Word с вопросами**: только чтение — без проверки и статистики | автопроверка, тетрадь ошибок, статистика точности, планировщик SRS |
| **Просто спрашивать ChatGPT**: знания разрозненны, маршрута нет | ИИ структурирует разрозненное в системные курсы + вопросы + карточки |

**Главная отличительная черта**: **цикл согласованности четвёрки** — пункты экзамена, которые объясняют курсы, проверяют вопросы, закрепляют карточки и раскрывают разборы ошибок, — один и тот же набор (см. [docs/four-alignment.md](docs/four-alignment.md), [русская версия на сайте](https://jerryjiao.github.io/ai-study-kit/ru/method/four-alignment/)). Закончили урок — соответствующие вопросы уже рядом; ошиблись — разбор в одной команде от вас.

---

## 📚 Документация

> Документация репозитория написана на китайском. На [сайте](https://jerryjiao.github.io/ai-study-kit/) есть английские переводы ключевых страниц о методе; остальные откатываются к китайскому с плашкой. Автоперевод в браузере справляется с этими документами вполне сносно.

| Документ | Чему научитесь |
|------|-----------|
| [Methodology](https://jerryjiao.github.io/ai-study-kit/en/method/methodology/) | программа → материалы → вопросы (на английском) |
| [Four alignment](https://jerryjiao.github.io/ai-study-kit/en/method/four-alignment/) | как курсы / вопросы / карточки / разборы держатся согласованно (на английском) |
| [`docs/ai-cli-guide.md`](docs/ai-cli-guide.md) | полное использование трёх ИИ-CLI (на китайском) |
| [`docs/study-coach.md`](docs/study-coach.md) | `/study-coach`: установка, маршрутизация, расширение (на китайском) |
| [`docs/configuration.md`](docs/configuration.md) | `.env`: провайдеры LLM + TTS (на китайском) |
| [`docs/bidirectional-check.md`](docs/bidirectional-check.md) | автоматические перекрёстные проверки (на китайском) |
| [`AGENTS.md`](AGENTS.md) | конвенции совместной работы с ИИ: структура / команды / жёсткие правила (на китайском) |
| [`examples/dev-intro/`](examples/dev-intro/) | полный пример: вопросы + карточки + курсы + разборы |

---

## 🛠️ Команды разработки

```bash
# корень репозитория
pnpm install          # установить зависимости
pnpm run dev          # запуск (фронтенд :5173 + бэкенд :8787)
pnpm run build        # сборка (sync:examples + sync:study + tsc + vite)
pnpm test             # прогнать 5 тестовых файлов (130 кейсов)
pnpm run scan         # скан утечек брендов
pnpm run server       # поднять только бэкенд
pnpm start            # build + server
pnpm run skill:install    # установить команду /study-coach
pnpm run check:alignment  # проверка согласованности четвёрки (по умолчанию dev-intro; можно передать каталог темы)

# внутри apps/quiz-app/
npm run qa            # контроль качества банка вопросов (длиннейший вариант / распределение ответов)
npm run sync:examples # ручная синхронизация examples → src/data
npm run sync:study    # ручная синхронизация examples → public/study
```

### Продакшн-деплой

```bash
cd apps/quiz-app
pnpm install && pnpm run build
pnpm exec pm2 start ecosystem.config.cjs
pnpm exec pm2 save

# нестандартный порт
PORT=80 pnpm exec pm2 start ecosystem.config.cjs
```

Подробности деплоя (фиксация cwd для pm2, как работает синхронизация между устройствами и т.д.) — в [`AGENTS.md`](AGENTS.md) (на китайском).

---

## 🤝 Как внести вклад

PR и issues приветствуются. Пожалуйста:

1. Запустите `pnpm run scan` и убедитесь, что он чист
2. Запустите `pnpm test` и убедитесь, что всё проходит
3. Если меняли какие-либо артефакты (курсы / вопросы / карточки / разборы), прогоните и [`bidirectional-check`](docs/bidirectional-check.md)
4. Следуйте [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📄 Лицензия

[MIT](LICENSE) © участники ai-study-kit

---

## 🙏 Благодарности

- Методология вдохновлена [системой навыков Мэтта Покока](https://github.com/mattpocock)
- Алгоритм интервального повторения следует [реализации SM-2 из Anki](https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html)
- Знания по git в примере темы — из [книги Pro Git](https://git-scm.com/book/en/v2) (официальная, бесплатная)

---
title: Превратите любой банк вопросов в полный цикл обучения
description: Открытый каркас, где тесты, курсы, карточки и интервальное повторение выровнены вокруг одних и тех же пунктов экзамена
template: splash
hero:
  tagline: 'Открытый каркас под лицензией MIT. Вопросы могут быть реальными, собранными вами, или написанными ИИ; курсы, карточки, разбор ошибок и интервальное повторение берёт на себя инструмент, а прогресс синхронизируется между устройствами.'
  image:
    html: |
      <div class="ask-shot">
        <div class="ask-shot-bar"><i></i><i></i><i></i></div>
        <div class="ask-shot-body">
          <div class="ask-shot-tabs">
            <span class="on">Тесты</span><span>Карточки</span><span>Курсы</span><span>Ошибки</span>
          </div>
          <div class="ask-shot-q">В git: каков первый шаг, чтобы изменение из рабочего каталога попало в репозиторий?</div>
          <div class="ask-shot-opt"><i></i>A. git push</div>
          <div class="ask-shot-opt ok"><i></i>B. git add ✓</div>
          <div class="ask-shot-opt"><i></i>C. git commit</div>
          <div class="ask-shot-ana">
            Рабочий каталог → индекс (git add) → репозиторий (git commit) → удалённый сервер (git push). Модель трёх областей — ключевая ментальная модель git.
          </div>
          <div class="ask-shot-meta"><i></i>Вопрос 3 / 24 · серия 5</div>
        </div>
      </div>
  actions:
    - text: Открыть демо
      link: /ai-study-kit/demo/
      variant: primary
      icon: rocket
    - text: Быстрый старт
      link: /ai-study-kit/ru/get-started/
      variant: secondary
      icon: right-arrow
    - text: GitHub
      link: https://github.com/jerryjiao/ai-study-kit
      variant: secondary
      icon: github
---

<section class="ask-lead">
  <p class="ask-lead-strip">
    <span>Вопросы — один JSON-файл</span>
    <span>Курсы — самодостаточный HTML</span>
    <span>Карточки — SM-2, совместимый с Anki</span>
  </p>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>Одно приложение — пять учебных артефактов</h2>
    <p>Курсы объясняют, вопросы проверяют, карточки закрепляют — одни и те же знания</p>
  </div>
  <div class="ask-feats">
    <div class="ask-feat"><div class="ico">✅</div><b>Тесты</b><span>Одиночный и множественный выбор, «да/нет»; оценка при отправке; во множественном нужно всё верно</span></div>
    <div class="ask-feat"><div class="ico">📖</div><b>Курсы</b><span>Самодостаточные HTML-уроки со схемами ASCII и врезками</span></div>
    <div class="ask-feat"><div class="ico">🎴</div><b>Карточки</b><span>Ключевые понятия как карточки: спереди вопрос, сзади разбор</span></div>
    <div class="ask-feat"><div class="ico">🔍</div><b>Разбор ошибок</b><span>ИИ группирует ошибки по пунктам экзамена и разбирает каждую</span></div>
    <div class="ask-feat"><div class="ico">⏱️</div><b>Интервальное повторение</b><span>SM-2 планирует повторения; у карточки истёк срок — она встаёт в очередь сама</span></div>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>Кому это нужно</h2>
    <p>В репозитории лежит пример на git и Linux; для реального использования подключите свой банк вопросов</p>
  </div>
  <div class="ask-compare-wrap">
    <table class="ask-compare">
      <tr><th>Чем вы заняты</th><th>Подходит ли</th></tr>
      <tr><td>Разработчик учит новый стек — React или K8s</td><td class="y">✅ Свести документацию в вопросы и закреплять карточками</td></tr>
      <tr><td>Студент готовится к экзамену или сертификации</td><td class="y">✅ Реальный банк вопросов + ИИ-разбор ошибок</td></tr>
      <tr><td>Готовитесь к собеседованию</td><td class="y">✅ Пишете вопросы сами, ИИ делает курсы и разборы</td></tr>
      <tr><td>Учитесь чему угодно с «пунктами экзамена»: регламенты, процессы, термины</td><td class="y">✅ Если раскладывается на вопросы и ответы — этому можно учиться</td></tr>
      <tr><td>Нужен готовый банк вопросов</td><td>❌ Готовых вопросов внутри нет; пишите сами или генерируйте с ИИ</td></tr>
    </table>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>Почему не готовые инструменты</h2>
    <p>В Anki нет тренажёра и разбора ошибок; Quizlet — закрытый SaaS, данные остаются у него</p>
  </div>
  <div class="ask-compare-wrap">
    <table class="ask-compare matrix">
      <tr><th>Инструмент</th><th>Тесты</th><th>Курсы</th><th>Карточки SRS</th><th>Разбор ошибок</th><th>Открытый код</th></tr>
      <tr><td class="tool">Anki</td><td>✗</td><td>✗</td><td class="y">✓</td><td>✗</td><td class="y">✓</td></tr>
      <tr><td class="tool">Quizlet</td><td class="y">✓</td><td>✗</td><td>Частично</td><td>✗</td><td>✗</td></tr>
      <tr><td class="tool">Notion</td><td>✗</td><td>Заметки</td><td>✗</td><td>✗</td><td>✗</td></tr>
      <tr class="us"><td class="tool">ai-study-kit</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>✓ MIT</td></tr>
    </table>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>Три команды — и оно в браузере</h2>
    <p>Работает без настройки ИИ; тренажёр и карточки не зависят от внешних сервисов</p>
  </div>
  <div class="ask-steps">
    <div class="ask-step"><div class="n">1</div>Склонируйте репозиторий<code>git clone https://github.com/jerryjiao/ai-study-kit</code></div>
    <div class="ask-step"><div class="n">2</div>Установите зависимости<code>pnpm install</code></div>
    <div class="ask-step"><div class="n">3</div>Запустите dev-сервер<code>pnpm dev → http://localhost:5173</code></div>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>Не знаете, что учить сегодня?</h2>
    <p>Сменить тему, сгенерировать курсы, пройти тест, разобрать ошибки, задеплоить — эти команды запоминать не нужно, встроенный /ai-study-kit спланирует всё сам</p>
  </div>
  <div class="ask-flow">
    <span class="node">Сканирует ваше состояние обучения</span><span class="arr">→</span>
    <span class="node">Советует одно действие на сейчас</span><span class="arr">→</span>
    <span class="node">Ведёт вас по шагам</span>
  </div>
  <p class="ask-more">
    <code>pnpm run skill:install</code> добавит его в ваш ИИ-CLI; каждая сессия начинается с него ·
    <a href="/ai-study-kit/ru/ai/ai-study-kit/">Как работает /ai-study-kit</a>
  </p>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>Больше, чем тренажёр</h2>
    <p>Внутри — методология, отточенная на реальной учёбе</p>
  </div>
  <div class="ask-flow">
    <span class="node">Программа задаёт объём</span><span class="arr">→</span>
    <span class="node">Материалы строят понятия</span><span class="arr">→</span>
    <span class="node">Вопросы проверяют результат</span>
  </div>
  <p class="ask-more">
    <a href="/ai-study-kit/ru/method/methodology/">Читать методологию целиком</a>
  </p>
</section>

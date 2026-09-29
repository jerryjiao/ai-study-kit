/**
 * ru.ts — строки интерфейса на русском.
 * Тип привязан к набору ключей zh (Record<TKey, string>): не хватает ключа — ошибка компиляции.
 */
import type { TKey } from './zh';

export const ru: Record<TKey, string> = {
  // Глобальное
  'app.title': 'AI Study Kit · Тренажёр',
  'app.loading': 'Загрузка прогресса…',

  // Верхняя панель
  'nav.home': 'Главная',
  'nav.flashcards': 'Карточки',
  'nav.courses': 'Курсы',
  'nav.panorama': 'Панорама',
  'nav.backHome': 'На главную',

  // Главная
  'home.tagline': 'Тренажёр · {total} вопросов · прогресс синхронизируется между устройствами',
  'home.taglineLocal': 'Тренажёр · {total} вопросов · прогресс хранится в этом браузере',
  'home.heroTitle': 'Продолжай — сегодня тоже пройдёшь уровень',
  'home.statAnswered': 'Отвечено',
  'home.statAccuracy': 'Точность',
  'home.statWrong': 'Ошибки',
  'home.statRead': 'Прочитано',
  'home.resumeCta': 'Продолжить',
  'home.wrongRetry': 'Повторить ошибки ({n})',
  'home.random20': 'Случайные {n}',
  'home.byTopic': 'Проходи уровни по темам',
  'home.nowTag': 'Изучается',
  'home.qUnit': 'вопросов',
  'home.extTag': 'Доп. {n}',
  'home.uncategorized': '(Без темы)',

  // Главная · панель плана обучения (показывается только когда у активной темы есть plan.json; критерии в src/lib/plan.ts,
  // синхронизированы с scripts/lib/plan.mjs. Тексты деградации (нет дат / мало данных о темпе / нет контакта) тоже переведены)
  'home.planTitle': 'План обучения',
  'home.planDone': 'Выполнено {done} из {total}',
  'home.planDeadlineIn': 'До дедлайна {n} дн.',
  'home.planDeadlineToday': 'Дедлайн — сегодня',
  'home.planDeadlineOver': 'Дедлайн прошёл {n} дн. назад',
  'home.planPace': 'Темп',
  'home.planBehind': 'Отставание {n} дн.',
  'home.planSlack': 'Запас {n} дн.',
  'home.planDueToday': 'Следующий модуль — сегодня',
  'home.planCleared': 'Все модули по расписанию выполнены',
  'home.planNoCalendar': 'В плане нет дат; темп не с чем сравнить',
  'home.planProjection': 'По темпу последних {window} дн. завершение около {date}',
  'home.planProjSlack': 'Запас {n} дн. до дедлайна',
  'home.planProjDeficit': 'Дефицит {n} дн. до дедлайна',
  'home.planProjNoData': 'Нет завершённых модулей за последние {window} дн.; данных о темпе мало, без прогноза',
  'home.planProjComplete': 'Все модули завершены',
  'home.planGap': 'Последнее занятие {n} дн. назад',
  'home.planNoContact': 'Занятий пока не было',
  'home.planRemaining': 'Осталось модулей: {n}',
  'home.planStatusInProgress': 'В работе',
  'home.planStatusPaused': 'На паузе',

  // Страница панорамы по пунктам экзамена /panorama (v0.25: полоса состава + путь узлов по
  // крупным темам + панель детали с трассой; критерий см. src/lib/panorama.ts)
  'panorama.title': 'Панорама',
  'panorama.taught': 'Изучено',
  'panorama.practiced': 'Отработано',
  'panorama.mastered': 'Освоено',
  'panorama.answered': 'Ответы {answered}/{total}',
  'panorama.oral': 'Устно {correct}/{asked}',
  'panorama.stale': 'Сигналы «изучено/устно» — на момент последней сборки; ответы и освоение — в реальном времени.',
  'panorama.graphHint': 'Связи из проекции графа знаний: сплошные стрелки = предпосылка (изучить сначала), пунктир = связность; узлы = четыре состояния освоения.',
  'panorama.stateMastered': 'Освоено',
  'panorama.stateInProgress': 'В изучении',
  'panorama.stateWeak': 'Слабое',
  'panorama.stateUntouched': 'Не начато',
  'panorama.totalPoints': 'Всего пунктов: {n}',
  'panorama.knowflowLabel': 'Связи предпосылок',
  'panorama.byTopic': 'Пункты по крупным темам',
  'panorama.byTopicHint': 'Один узел = один пункт · Нажмите узел — трасса и вопросы',
  'panorama.topicMasteredPrefix': 'Освоено',
  'panorama.topicEpUnit': 'пунктов',
  'panorama.noEp': 'В этом банке вопросов нет меток пунктов экзамена (examPoint) — освоение недоступно.',
  'panorama.filterAll': 'Все',
  'panorama.filterWeak': 'Только слабые',
  'panorama.filterUnmastered': 'Только не освоенные',
  'panorama.filterAria': 'Фильтр пунктов экзамена',
  'panorama.sheetClose': 'Закрыть',
  'panorama.sheetPractice': 'Отработать этот пункт',
  'panorama.sheetCourse': 'Открыть курс',
  'panorama.statWrongTimes': 'Ошибок: {n}',
  'panorama.statFlash': 'Карточки: {graduated}/{mapped} выпущены',
  'panorama.timelineTitle': 'Трасса обучения',
  'panorama.timelineEmpty': 'Следов обучения пока нет — начните этот пункт кнопками ниже',
  'panorama.tlToday': 'Сегодня',
  'panorama.tlFirst': 'Первое касание',
  'panorama.tlCorrect': 'Верно',
  'panorama.tlWrong': 'Ошибка',
  'panorama.tlWrongRun': '{n} ошибок подряд',
  'panorama.tlFlash': 'Карточка выпущена',
  'panorama.tlMastered': 'Пункт освоен',
  'panorama.tlMasteredSub': 'Все верно + нет незакрытых ошибок',

  // Строка сводки плана на панораме (#93 сохранена; только если у активной темы есть plan.json.
  // Чипы дней плана убраны с этой страницы — spec #110 Q3; полная панель плана — на главной.
  // Критерий src/lib/plan.ts; формулировки темпа переиспользуют ключи home.plan*)
  'panorama.planDone': 'План: выполнено {done} из {total}',

  // Тренировка
  'practice.readMode': 'Режим чтения',
  'practice.layerAll': 'Все',
  'practice.redoSet': 'Пройти заново',
  'practice.redoSetTitle': 'Очистить ответы этого набора и пройти заново',
  'practice.jumpUnanswered': 'К неотвеченным',
  'practice.jumpUnansweredTitle': 'Перейти к первому неотвеченному вопросу набора',
  'practice.rereadSet': 'Перечитать набор',
  'practice.rereadSetTitle': 'Очистить прогресс чтения набора и перечитать',
  'practice.viewPractice': 'Практика',
  'practice.viewRead': 'Чтение',
  'practice.mastered': 'Усвоено {n}',
  'practice.readCount': 'Прочитано {n}',
  'practice.answeredCount': 'Отвечено {n}',
  'practice.noWrong': 'Ошибок пока нет — решите несколько вопросов!',
  'practice.noQuestionsScope': 'В «{name}» нет вопросов.',
  'practice.noQuestions': 'Вопросов нет.',
  'practice.backHome': 'На главную',
  'practice.prev': 'Назад',
  'practice.next': 'Далее',
  'practice.finish': 'Завершить',
  'practice.backToFirst': 'К первому',
  'practice.nextSet': 'Следующий набор: {label}',
  'practice.stayHere': 'Остаться здесь (закрыть)',
  'practice.keepReading': 'Продолжить чтение (закрыть)',
  'practice.labelWrong': 'Ошибки',
  'practice.labelSequential': 'Последовательный режим',
  'practice.labelQuoted': '«{name}»',
  'practice.confirmRedo':
    'Сбросить ответы для {label}? ({n} вопросов, включая верные/неверные и прогресс ошибок. Отменить нельзя. Другие темы и карточки не затрагиваются.)',
  'practice.confirmReread':
    'Перечитать {label}? ({n} вопросов; прогресс чтения набора очищается. Отменить нельзя. Ответы не затрагиваются.)',
  'practice.summaryAria': 'Итоги тренировки',

  // Карточка вопроса
  'q.multi': 'Множественный выбор',
  'q.judge': 'Верно/Неверно',
  'q.single': 'Один вариант',
  'q.difficulty': 'Сложность {level}',
  'q.index': 'Вопрос {n}',
  'q.imageAlt': 'Изображение к вопросу',
  'q.submitSelfEval': 'Отправить (самооценка)',
  'q.submit': 'Отправить',
  'q.correct': 'Верно!',
  'q.wrong': 'Неверно. Правильный ответ: {answer}',
  'q.wrongCountHistory': '· ранее ошибок: {n}',
  'q.wrongCountTotal': '· всего ошибок: {n}',
  'q.streakProgress': 'Верно подряд {streak}/{needed} — ещё {left}, и вопрос уйдёт из ошибок',
  'q.streakLabel': 'Серия верных ответов в ошибках',
  'q.mastered': 'Усвоено — убираем из ошибок',
  'q.dismiss': 'Убрать',
  'q.dismissTitle': 'Убрать из списка ошибок (больше не повторяется)',
  'q.confirmDismiss': 'Убрать этот вопрос из списка ошибок?',
  'q.selfEvalNote': 'Самооценка (без эталонного ответа)',
  'q.analysis': 'Разбор:',
  'opt.correctAnswer': 'Правильный ответ',
  'opt.wrongAnswer': 'Ваш неверный выбор',

  // Диалог подтверждения
  'confirm.cancel': 'Отмена',
  'confirm.ok': 'ОК',
  'confirm.aria': 'Подтверждение',

  // Оценка SRS
  'srs.again': 'Снова',
  'srs.hard': 'Сложно',
  'srs.good': 'Хорошо',
  'srs.easy': 'Легко',
  'srs.aria': 'Оценка',

  // Итоги тренировки
  'summary.tierGood': 'Хорошее усвоение',
  'summary.tierOk': 'Закрепляйте',
  'summary.tierLow': 'Потренируйтесь ещё',
  'summary.title': 'Тренировка завершена · {title}',
  'summary.answered': 'Отвечено',
  'summary.correctCount': 'Верно',
  'summary.wrongCount': 'Ошибки',
  'summary.selfRated': 'Включая {n} с самооценкой (не входят в точность)',
  'summary.totalNote': '{n} вопросов · накопленная точность по теме',
  'summary.backHome': 'На главную',
  'summary.redo': 'Пройти заново',

  // Повторение карточек
  'fc.extraDone': 'Дополнительная практика завершена!',
  'fc.extraDoneNote': 'Вы прошли ещё {n} карточек; оценки сохранены',
  'fc.back': 'К карточкам',
  'fc.todayDone': 'Повторение на сегодня завершено!',
  'fc.todayDoneNote': 'Сегодня повторено карточек: {n}',
  'fc.streak': 'Серия: {n} дн.',
  'fc.nextDue': 'Следующая карточка через {interval}',
  'fc.learningLaterToday': '{n} обучающих карточек будут готовы позже сегодня — возвращайтесь',
  'fc.extraRound': 'Ещё круг (доп. повторение, серия не обновляется)',
  'fc.new': 'Новые',
  'fc.learning': 'Учатся',
  'fc.review': 'Повторение',
  'fc.includesRelearn': '· с {n} повторными',
  'fc.extraTag': '· доп. практика',
  'fc.phaseNew': 'Новая',
  'fc.phaseLearning': 'Обучение {cur}/{total}·{step}m',
  'fc.phaseRelearning': 'Переучивание·{step}m',
  'fc.phaseReview': 'Повторение',
  'fc.hintFlip': 'Нажмите карточку или Space, чтобы перевернуть',
  'fc.hintRate': 'Оцените ниже (или клавиши 1-4)',
  'fc.showAnswer': 'Показать ответ',

  // Панель карточек
  'fch.title': 'Повторение карточек',
  'fch.tagline': 'Интервальное повторение · против забывания · {n} карточек',
  'fch.todayDone': 'Повторение на сегодня готово',
  'fch.start': 'Начать повторение',
  'fch.count': '({n} карточек)',
  'fch.nothingToday': 'Сегодня нет карточек к повторению',
  'fch.rerunAll': 'Пройти все {n} карточек',
  'fch.rerunNote': 'Доп. практика · серия не обновляется · оценки сохраняются',
  'fch.newPerDay': 'Новых карточек в день',
  'fch.save': 'Сохранить',
  'fch.cancel': 'Отмена',

  // Курсы
  'courses.notReady': 'Курсы не готовы',
  'courses.notReadyHint':
    'Содержимое курсов берётся из examples/<theme>/ — выполните pnpm run build (включает sync:study), чтобы синхронизировать его в public/study/.',
  'courses.frameTitle': 'Учебный сайт',
  'courses.index': 'Оглавление уроков',
  'courses.tocCount': ' · {done}/{total}',
  'courses.doneProgress': 'Пройдено уроков {done}/{total}',
  'courses.markDone': '✓ Урок пройден',
  'courses.undoDone': 'Пройден · Отменить',
  'courses.undoDoneTitle': 'Снять отметку «пройден» с этого урока (просмотр урока не засчитывается — только эта кнопка)',
  'courses.goPractice': 'Тренироваться по этому уроку',

  // Баннер синхронизации
  'sync.local': 'Демо-режим: прогресс хранится только в этом браузере, без синхронизации',
  'sync.remoteInvalid': 'Данные прогресса на сервере в устаревшем формате и были проигнорированы — прогресс пока следует за этим браузером; следующее сохранение исправит их автоматически',
  'sync.retrying': 'Повторяем синхронизацию…',
  'sync.error': 'Синхронизация не удалась — сохранено локально. Нажмите, чтобы повторить.',
  'sync.retry': 'Повторить',
  'sync.close': 'Закрыть',

  // Тема оформления
  'theme.light': 'Светлая',
  'theme.dark': 'Тёмная',
  'theme.system': 'Системная',
  'theme.title': 'Сейчас: {label} (нажмите для переключения)',
  'theme.aria': 'Переключить тему, сейчас: {label}',

  // Панель настроек (учебные предпочтения)
  'settings.title': 'Настройки обучения',
  'settings.close': 'Закрыть',
  'settings.extLabel': 'Дополнительные задания',
  'settings.extDesc': 'По умолчанию выключено. Вкл = показать дополнительный слой (вопросы по главам): фильтр слоя в практике, наборы на главной — для проработки слабых тем',
  'settings.autoLabel': 'Автопереход при верном ответе',
  'settings.autoDesc': 'По умолчанию включено. Через 3 с после верного ответа — следующий вопрос; выкл = остаться и прочитать разбор',
  'settings.quotaLabel': 'Новых карточек в день',
  'settings.quotaDesc': 'Максимум новых карточек в день (0-50), синхронизируется со страницей карточек',
  'settings.quotaMinus': 'Уменьшить лимит',
  'settings.quotaPlus': 'Увеличить лимит',
  'settings.syncHint': 'Настройки синхронизируются между устройствами вместе с прогрессом',

  // Панель настроек · сброс данных (v0.25 билет 2: четыре операции сброса из раздела
  // «Управление прогрессом» на главной собраны здесь; действуют только на текущую тему)
  'settings.resetTitle': 'Сброс данных (только текущая тема)',
  'settings.resetPos': 'Сбросить позиции',
  'settings.confirmResetPos':
    'Вернуть все списки тренировки (по дням/темам) к вопросу 1? (Ответы не затрагиваются)',
  'settings.resetWrong': 'Очистить ошибки',
  'settings.confirmResetWrong':
    'Очистить записи об ошибках текущей темы? (Повторение ошибок останется без вопросов; отменить нельзя)',
  'settings.resetRead': 'Очистить чтение',
  'settings.confirmResetRead':
    'Очистить прогресс чтения текущей темы? (Ответы не затрагиваются; отменить нельзя)',
  'settings.resetSrs': 'Очистить карточки',
  'settings.confirmResetSrs':
    'Очистить прогресс карточек текущей темы? Все карточки станут новыми, серия обнулится. Отменить нельзя. (Ответы и чтение не затрагиваются)',
  'settings.resetAllTheme': 'Очистить ВЕСЬ прогресс этой темы (включая карточки)',
  'settings.confirmResetAllTheme':
    'Очистить ВЕСЬ прогресс текущей темы (ответы + ошибки + чтение + карточки)? Отменить нельзя, изменение синхронизируется на все устройства. Другие темы не затрагиваются.',

  // Смена языка
  'lang.aria': 'Переключить язык',
  'lang.title': 'Язык',
};

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
  'nav.quiz': 'Тесты',
  'nav.flashcards': 'Карточки',
  'nav.courses': 'Курсы',
  'nav.backHome': 'На главную',

  // Главная
  'home.tagline': 'Тренажёр · {total} вопросов · прогресс синхронизируется между устройствами',
  'home.taglineLocal': 'Тренажёр · {total} вопросов · прогресс хранится в этом браузере',
  'home.statAnswered': 'Отвечено',
  'home.statAccuracy': 'Точность',
  'home.statWrong': 'Ошибки',
  'home.statRead': 'Прочитано',
  'home.resume': 'Последняя тема',
  'home.resumeGo': 'Продолжить →',
  'home.wrongRetry': 'Повторить ошибки ({n})',
  'home.random20': 'Случайные {n}',
  'home.byTopic': 'Тренировка по темам (нажмите тему, чтобы раскрыть подтемы)',
  'home.progressManage': 'Управление прогрессом',
  'home.coverDetail': 'Покрытие ответами (по пунктам экзамена)',
  'home.uncategorized': '(Без темы)',
  'home.other': 'Прочее',
  'home.resetPos': 'Сбросить позиции',
  'home.confirmResetPos':
    'Вернуть все списки тренировки (по дням/темам) к вопросу 1? (Ответы не затрагиваются)',
  'home.resetWrong': 'Сбросить список ошибок',
  'home.confirmResetWrong':
    'Очистить все записи об ошибках? (Повторение ошибок останется без вопросов; отменить нельзя)',
  'home.resetRead': 'Сбросить прогресс чтения',
  'home.confirmResetRead':
    'Очистить прогресс чтения? (Ответы не затрагиваются; отменить нельзя)',
  'home.resetAll': 'Очистить весь прогресс',
  'home.confirmResetAll':
    'Очистить ВЕСЬ прогресс (ответы + ошибки + чтение)? Отменить нельзя, изменение синхронизируется на все устройства.',

  // Тренировка
  'practice.readMode': 'Режим чтения',
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
  'q.submitSelfEval': 'Отправить (самооценка)',
  'q.submit': 'Отправить',
  'q.correct': 'Верно!',
  'q.wrong': 'Неверно. Правильный ответ: {answer}',
  'q.wrongCountHistory': '· ранее ошибок: {n}',
  'q.wrongCountTotal': '· всего ошибок: {n}',
  'q.streakProgress': 'Верно подряд {streak}/{needed} — ещё {left}, и вопрос уйдёт из ошибок',
  'q.mastered': 'Усвоено — убираем из ошибок',
  'q.dismiss': 'Убрать',
  'q.dismissTitle': 'Убрать из списка ошибок (больше не повторяется)',
  'q.confirmDismiss': 'Убрать этот вопрос из списка ошибок?',
  'q.selfEvalNote': 'Самооценка (без эталонного ответа)',
  'q.analysis': 'Разбор:',
  'opt.correctAnswer': 'Правильный ответ',

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
  'fch.resetAllSrs': 'Сбросить весь прогресс карточек ({n} станут новыми)',
  'fch.confirmResetSrs':
    'Очистить весь прогресс карточек? Все карточки станут новыми, серия обнулится. Отменить нельзя. (Ответы и чтение не затрагиваются)',

  // Курсы
  'courses.notReady': 'Курсы не готовы',
  'courses.notReadyHint':
    'Содержимое курсов берётся из examples/<theme>/ — выполните pnpm run build (включает sync:study), чтобы синхронизировать его в public/study/.',
  'courses.frameTitle': 'Учебный сайт',
  'courses.index': 'Оглавление уроков',
  'courses.readProgress': 'Прочитано {read}/{total}',

  // Баннер синхронизации
  'sync.local': 'Демо-режим: прогресс хранится только в этом браузере, без синхронизации',
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

  // Смена языка
  'lang.aria': 'Переключить язык',
  'lang.title': 'Язык',
};

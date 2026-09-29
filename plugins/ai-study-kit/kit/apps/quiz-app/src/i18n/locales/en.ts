/**
 * en.ts — English UI strings.
 * 类型锚定 zh 的 key 集合（Record<TKey, string>）：漏一个 key 编译直接报错。
 */
import type { TKey } from './zh';

export const en: Record<TKey, string> = {
  // Global
  'app.title': 'AI Study Kit · Practice',
  'app.loading': 'Loading progress…',

  // Top nav
  'nav.home': 'Home',
  'nav.flashcards': 'Flashcards',
  'nav.courses': 'Courses',
  'nav.panorama': 'Panorama',
  'nav.backHome': 'Back to home',

  // Home
  'home.tagline': 'Practice site · {total} questions · progress syncs across devices',
  'home.taglineLocal': 'Practice site · {total} questions · progress is saved in this browser',
  'home.heroTitle': 'Keep going — another level today',
  'home.statAnswered': 'Answered',
  'home.statAccuracy': 'Accuracy',
  'home.statWrong': 'Wrong',
  'home.statRead': 'Read',
  'home.resumeCta': 'Resume',
  'home.wrongRetry': 'Retry wrong ({n})',
  'home.random20': 'Random {n}',
  'home.byTopic': 'Level up by topic',
  'home.nowTag': 'Studying',
  'home.qUnit': 'questions',
  'home.extTag': 'Extra {n}',
  'home.uncategorized': '(Uncategorized)',

  // Home · study plan panel (rendered only when the active theme has a plan.json; criteria in src/lib/plan.ts,
  // kept in sync with scripts/lib/plan.mjs. Degraded-path copy (no dates / not enough pace data / no contact) is translated too)
  'home.planTitle': 'Study plan',
  'home.planDone': '{done}/{total} done',
  'home.planDeadlineIn': '{n} days to deadline',
  'home.planDeadlineToday': 'Deadline is today',
  'home.planDeadlineOver': 'Deadline passed {n} days ago',
  'home.planPace': 'Pace',
  'home.planBehind': '{n} days behind',
  'home.planSlack': '{n} days ahead',
  'home.planDueToday': 'Next unit is due today',
  'home.planCleared': 'All scheduled units done',
  'home.planNoCalendar': 'No scheduled dates in the plan; pace comparison unavailable',
  'home.planProjection': 'At the last {window}-day rate, finishing around {date}',
  'home.planProjSlack': '{n} days ahead of deadline',
  'home.planProjDeficit': '{n} days short of deadline',
  'home.planProjNoData': 'No completions in the last {window} days; not enough pace data, no projection',
  'home.planProjComplete': 'All units completed',
  'home.planGap': '{n} days since last study contact',
  'home.planNoContact': 'No study contact yet',
  'home.planRemaining': '{n} units left',
  'home.planStatusInProgress': 'In progress',
  'home.planStatusPaused': 'Paused',

  // Exam-point panorama page /panorama (taught/practiced/mastered signals + day groups, see src/lib/panorama.ts)
  'panorama.title': 'Exam-point panorama (taught · practiced · mastered)',
  'panorama.summary': 'Taught {taught}/{total} · Practiced {practiced}/{total} · Mastered {mastered}/{total}',
  'panorama.taught': 'Taught',
  'panorama.practiced': 'Practiced',
  'panorama.mastered': 'Mastered',
  'panorama.answered': 'Ans {answered}/{total}',
  'panorama.oral': 'Oral {correct}/{asked}',
  'panorama.wrong': 'Not graduated {n}',
  'panorama.stale': 'Taught/oral signals as of the last build; answers and mastery are live.',
  'panorama.graphHint': 'Edges come from the knowledge-graph projection: solid arrows = prerequisite (learn first), dashed = related; dots = mastery four-state.',
  'panorama.dotMastered': 'Mastered',
  'panorama.dotWeak': 'Weak',
  'panorama.dotInProgress': 'In progress',
  'panorama.dotUntouched': 'Untouched',
  'panorama.noEp': 'This question bank has no exam-point tags (examPoint) — mastery cannot be derived.',
  'panorama.filterAll': 'All',
  'panorama.filterWeak': 'Weak',
  'panorama.filterUnmastered': 'Not mastered',
  'panorama.filterAria': 'Filter exam points',

  // Panorama plan integration (renders only when the active theme has plan.json; summary
  // line + day-card status chips, derived in src/lib/plan.ts, same source as the home plan
  // panel. Pace wording reuses the home.plan* keys)
  'panorama.planDone': 'Plan: {done}/{total} done',
  'panorama.planStatusPlanned': 'Planned',
  'panorama.planStatusInProgress': 'In progress',
  'panorama.planStatusDone': 'Done',
  'panorama.planStatusPaused': 'Paused',

  // Practice
  'practice.readMode': 'Reading mode',
  'practice.layerAll': 'All',
  'practice.redoSet': 'Redo this set',
  'practice.redoSetTitle': 'Clear this set’s answer records and redo it',
  'practice.jumpUnanswered': 'Jump to unanswered',
  'practice.jumpUnansweredTitle': 'Jump to the first unanswered question in this set',
  'practice.rereadSet': 'Re-read this set',
  'practice.rereadSetTitle': 'Clear this set’s reading progress and read it again',
  'practice.viewPractice': 'Practice',
  'practice.viewRead': 'Read',
  'practice.mastered': 'Mastered {n}',
  'practice.readCount': 'Read {n}',
  'practice.answeredCount': 'Answered {n}',
  'practice.noWrong': 'No wrong questions yet — go answer some!',
  'practice.noQuestionsScope': 'No questions in "{name}".',
  'practice.noQuestions': 'No questions.',
  'practice.backHome': 'Back to home',
  'practice.prev': 'Previous',
  'practice.next': 'Next',
  'practice.finish': 'Finish',
  'practice.backToFirst': 'Back to first',
  'practice.nextSet': 'Next set: {label}',
  'practice.stayHere': 'Stay here (close)',
  'practice.keepReading': 'Keep reading (close)',
  'practice.labelWrong': 'Wrong questions',
  'practice.labelSequential': 'All questions',
  'practice.labelQuoted': '"{name}"',
  'practice.confirmRedo':
    'Reset answer records for {label}? ({n} questions, including right/wrong results and wrong-question progress. This cannot be undone. Other topics and flashcards are not affected.)',
  'practice.confirmReread':
    'Re-read {label}? ({n} questions; clears this set’s reading progress. This cannot be undone. Answer records are not affected.)',
  'practice.summaryAria': 'Practice summary',

  // Question card
  'q.multi': 'Multiple choice',
  'q.judge': 'True / False',
  'q.single': 'Single choice',
  'q.difficulty': 'Difficulty {level}',
  'q.index': 'Question {n}',
  'q.imageAlt': 'Question image',
  'q.submitSelfEval': 'Submit (self-graded)',
  'q.submit': 'Submit',
  'q.correct': 'Correct!',
  'q.wrong': 'Incorrect. Correct answer: {answer}',
  'q.wrongCountHistory': '· wrong {n}× before',
  'q.wrongCountTotal': '· {n}× wrong in total',
  'q.streakProgress': '{streak}/{needed} correct in a row — {left} more to drop it from the wrong set',
  'q.mastered': 'Mastered — removed from the wrong set',
  'q.dismiss': 'Remove',
  'q.dismissTitle': 'Remove from the wrong-question set (stops recurring)',
  'q.confirmDismiss': 'Remove this question from the wrong set?',
  'q.selfEvalNote': 'Self-graded (no canonical answer)',
  'q.analysis': 'Explanation:',
  'opt.correctAnswer': 'Correct answer',

  // Confirm dialog
  'confirm.cancel': 'Cancel',
  'confirm.ok': 'OK',
  'confirm.aria': 'Confirm action',

  // SRS rating
  'srs.again': 'Again',
  'srs.hard': 'Hard',
  'srs.good': 'Good',
  'srs.easy': 'Easy',
  'srs.aria': 'Rate',

  // Session summary
  'summary.tierGood': 'Well mastered',
  'summary.tierOk': 'Keep it up',
  'summary.tierLow': 'Practice more',
  'summary.title': 'Practice complete · {title}',
  'summary.answered': 'Answered',
  'summary.correctCount': 'Correct',
  'summary.wrongCount': 'Wrong',
  'summary.selfRated': 'Includes {n} self-graded questions (not counted in accuracy)',
  'summary.totalNote': '{n} questions · cumulative accuracy for this topic',
  'summary.backHome': 'Home',
  'summary.redo': 'Redo this set',

  // Flashcard review
  'fc.extraDone': 'Extra practice complete!',
  'fc.extraDoneNote': 'You went through {n} more cards; ratings recorded',
  'fc.back': 'Back to flashcards',
  'fc.todayDone': 'Today’s review complete!',
  'fc.todayDoneNote': 'Reviewed {n} cards today',
  'fc.streak': '{n}-day streak',
  'fc.nextDue': 'Next card due in {interval}',
  'fc.learningLaterToday': '{n} learning cards are due later today — come back then',
  'fc.extraRound': 'Another round (extra review, streak not updated)',
  'fc.new': 'New',
  'fc.learning': 'Learning',
  'fc.review': 'Due',
  'fc.includesRelearn': '· {n} relearns',
  'fc.extraTag': '· extra practice',
  'fc.phaseNew': 'New',
  'fc.phaseLearning': 'Learning {cur}/{total}·{step}m',
  'fc.phaseRelearning': 'Relearn·{step}m',
  'fc.phaseReview': 'Review',
  'fc.hintFlip': 'Click the card or press Space to flip',
  'fc.hintRate': 'Rate below (or press 1-4)',
  'fc.showAnswer': 'Show answer',

  // Flashcards dashboard
  'fch.title': 'Flashcard review',
  'fch.tagline': 'Spaced repetition · beat forgetting · {n} cards',
  'fch.todayDone': 'Today’s review is done',
  'fch.start': 'Start today’s review',
  'fch.count': '({n} cards)',
  'fch.nothingToday': 'No cards due today',
  'fch.rerunAll': 'Practice all {n} cards',
  'fch.rerunNote': 'Extra practice · streak not updated · ratings still recorded',
  'fch.newPerDay': 'New cards per day',
  'fch.save': 'Save',
  'fch.cancel': 'Cancel',
  'fch.resetAllSrs': 'Reset all flashcard progress ({n} cards back to new)',
  'fch.confirmResetSrs':
    'Clear all flashcard progress? Every card returns to new and the streak resets to zero. This cannot be undone. (Answer/reading progress is not affected)',

  // Courses
  'courses.notReady': 'Courses not ready',
  'courses.notReadyHint':
    'Course content comes from examples/<theme>/ — run pnpm run build (includes sync:study) to sync it into public/study/.',
  'courses.frameTitle': 'Course site',
  'courses.index': 'Lesson index',
  'courses.doneProgress': 'Lessons completed {done}/{total}',
  'courses.markDone': '✓ Lesson done',
  'courses.undoDone': 'Completed · Undo',
  'courses.undoDoneTitle': 'Undo the completed mark for this lesson (opening a lesson never counts — only this button does)',
  'courses.goPractice': "Practice this lesson's questions",

  // Sync banner
  'sync.local': 'Demo mode: progress is saved in this browser only — no server sync',
  'sync.remoteInvalid': 'The progress data on the server is in an outdated format and was ignored — progress follows this browser for now; the next save will repair it automatically',
  'sync.retrying': 'Retrying sync…',
  'sync.error': 'Progress sync failed — saved locally. Tap to retry.',
  'sync.retry': 'Retry',
  'sync.close': 'Close',

  // Theme toggle
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.system': 'System',
  'theme.title': 'Current: {label} (click to switch)',
  'theme.aria': 'Switch theme, current: {label}',

  // Settings sheet (learning preferences)
  'settings.title': 'Learning Preferences',
  'settings.close': 'Close',
  'settings.extLabel': 'Extension Drills',
  'settings.extDesc': 'Off by default. On = show the extension layer (chapter questions): layer filter in practice, extension sets on home — for drilling weak topics',
  'settings.autoLabel': 'Auto-advance on Correct',
  'settings.autoDesc': 'On by default. Jumps to the next question 3s after a correct answer; off = stay to read the explanation',
  'settings.quotaLabel': 'Daily New Cards',
  'settings.quotaDesc': 'Max new flashcards introduced per day (0-50), synced with the flashcards page',
  'settings.quotaMinus': 'Decrease quota',
  'settings.quotaPlus': 'Increase quota',
  'settings.syncHint': 'Preferences sync across devices with your progress',

  // Settings sheet · data reset (v0.25 ticket 2: the four reset entries formerly in the home
  // "Progress management" section live here now; all scoped to the current theme only)
  'settings.resetTitle': 'Data reset (current theme only)',
  'settings.resetPos': 'Reset list positions',
  'settings.confirmResetPos':
    'Move every practice list (by day/topic) back to question 1? (Answer records are not affected)',
  'settings.resetWrong': 'Clear wrong log',
  'settings.confirmResetWrong':
    'Clear the wrong-question records of the current theme? (Wrong-question practice will have nothing to show; this cannot be undone)',
  'settings.resetRead': 'Clear read progress',
  'settings.confirmResetRead':
    'Clear the reading progress of the current theme? (Answer records are not affected; this cannot be undone)',
  'settings.resetAllTheme': 'Clear ALL progress of this theme (incl. flashcards)',
  'settings.confirmResetAllTheme':
    'Clear ALL progress of the current theme (answers + wrong + reading + flashcards)? This cannot be undone and will sync to all your devices. Other themes are not affected.',

  // Language toggle
  'lang.aria': 'Switch language',
  'lang.title': 'Language',
};

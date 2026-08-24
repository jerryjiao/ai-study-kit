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
  'nav.quiz': 'Quiz',
  'nav.flashcards': 'Flashcards',
  'nav.courses': 'Courses',
  'nav.backHome': 'Back to home',

  // Home
  'home.tagline': 'Practice site · {total} questions · progress syncs across devices',
  'home.taglineLocal': 'Practice site · {total} questions · progress is saved in this browser',
  'home.statAnswered': 'Answered',
  'home.statAccuracy': 'Accuracy',
  'home.statWrong': 'Wrong',
  'home.statRead': 'Read',
  'home.resume': 'Last studied',
  'home.resumeGo': 'Resume →',
  'home.wrongRetry': 'Retry wrong ({n})',
  'home.random20': 'Random {n}',
  'home.byTopic': 'Practice by topic (click a topic to expand subtopics)',
  'home.progressManage': 'Progress management',
  'home.coverDetail': 'Answered coverage (per exam point)',
  'home.uncategorized': '(Uncategorized)',
  'home.other': 'Other',
  'home.resetPos': 'Reset list positions',
  'home.confirmResetPos':
    'Move every practice list (by day/topic) back to question 1? (Answer records are not affected)',
  'home.resetWrong': 'Reset wrong-question log',
  'home.confirmResetWrong':
    'Clear all wrong-question records? (Wrong-question practice will have nothing to show; this cannot be undone)',
  'home.resetRead': 'Reset reading progress',
  'home.confirmResetRead':
    'Clear reading progress? (Answer records are not affected; this cannot be undone)',
  'home.resetAll': 'Clear all progress',
  'home.confirmResetAll':
    'Clear ALL progress (answers + wrong + reading)? This cannot be undone and will sync to all your devices.',

  // Practice
  'practice.readMode': 'Reading mode',
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
  'courses.readProgress': 'Read {read}/{total}',

  // Sync banner
  'sync.local': 'Demo mode: progress is saved in this browser only — no server sync',
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

  // Language toggle
  'lang.aria': 'Switch language',
  'lang.title': 'Language',

  // Settings sheet (learning preferences)
  'settings.title': 'Learning preferences',
  'settings.close': 'Close settings',
  'settings.open': 'Open learning preferences',
  'settings.extLabel': 'Extension questions',
  'settings.extDesc': 'Include extension-tier questions in practice (chapter drills; off by default)',
  'settings.autoLabel': 'Auto-advance on correct',
  'settings.autoDesc': 'Jump to the next question 3s after a correct answer',
  'settings.quotaLabel': 'Daily new-card quota',
  'settings.quotaDesc': 'Max new flashcards introduced per day (0-50)',
  'settings.quotaMinus': 'Decrease quota',
  'settings.quotaPlus': 'Increase quota',
  'settings.syncHint': 'Preferences sync with your progress across devices.',
};

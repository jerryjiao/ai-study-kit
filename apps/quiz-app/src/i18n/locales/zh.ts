/**
 * zh.ts — 中文 UI 文案（基准词典）。
 *
 * 约定：
 * - key 用扁平的点分命名（页面/组件.用途），新增文案先加到这里；
 * - 占位符写 {name}，t() 里做字符串替换；
 * - en/es/ru 以 `Record<TKey, string>` 引用本文件的 key 集合——漏翻译会直接编译报错；
 * - i18n.test.ts 会再校验 key 完整性与占位符一致性。
 */
export const zh = {
  // 全局
  'app.title': 'AI Study Kit · 学习练习站',
  'app.loading': '加载进度中…',

  // 顶栏
  'nav.quiz': '答题',
  'nav.flashcards': '闪卡',
  'nav.courses': '课程',
  'nav.backHome': '返回首页',

  // 首页
  'home.tagline': '学习练习站 · 共 {total} 题 · 进度自动跨设备同步',
  'home.statAnswered': '已答',
  'home.statAccuracy': '正确率',
  'home.statWrong': '错题',
  'home.statRead': '已看',
  'home.resume': '上次答到',
  'home.resumeGo': '继续 →',
  'home.wrongRetry': '错题重练（{n}）',
  'home.random20': '随机 20 题',
  'home.byTopic': '按主题练习（点大类展开子主题）',
  'home.progressManage': '进度管理',
  'home.coverDetail': '已答覆盖明细（逐考点）',
  'home.uncategorized': '(未分类)',
  'home.other': '其他',
  'home.resetPos': '重置练习位置',
  'home.confirmResetPos': '把所有练习列表（按天/主题）的位置回到第 1 题？（不影响答题记录）',
  'home.resetWrong': '重置错题记录',
  'home.confirmResetWrong': '清空所有错题记录？（错题重练将没有题目，不可恢复）',
  'home.resetRead': '重置看题进度',
  'home.confirmResetRead': '清空看题进度？（不影响答题记录，不可恢复）',
  'home.resetAll': '清空全部进度',
  'home.confirmResetAll': '清空全部进度（答题 + 错题 + 看题）？此操作不可恢复，且会同步到所有设备。',

  // 练习页
  'practice.readMode': '看题模式',
  'practice.redoSet': '重做本题集',
  'practice.redoSetTitle': '清空本题集答题记录，重新作答',
  'practice.jumpUnanswered': '跳到未答',
  'practice.jumpUnansweredTitle': '跳到本题集第一道未答题',
  'practice.rereadSet': '重看本题集',
  'practice.rereadSetTitle': '清空本题集看题进度，重新看题',
  'practice.viewPractice': '答题',
  'practice.viewRead': '看题',
  'practice.mastered': '已掌握 {n}',
  'practice.readCount': '已看 {n}',
  'practice.answeredCount': '已答 {n}',
  'practice.noWrong': '暂无错题，去做几道题吧！',
  'practice.noQuestionsScope': '「{name}」暂无题目。',
  'practice.noQuestions': '没有题目。',
  'practice.backHome': '返回首页',
  'practice.prev': '上一题',
  'practice.next': '下一题',
  'practice.finish': '完成答题',
  'practice.backToFirst': '回到第一题',
  'practice.nextSet': '下一题集：{label}',
  'practice.stayHere': '留在这里（关闭）',
  'practice.keepReading': '继续看题（关闭）',
  'practice.labelWrong': '错题集',
  'practice.labelSequential': '顺序练习',
  'practice.labelQuoted': '「{name}」',
  'practice.confirmRedo': '重置{label}的答题记录？（{n} 题，含对错与错题进度，不可恢复。不影响其他主题与闪卡。）',
  'practice.confirmReread': '重看{label}？（{n} 题，清除本题集看题进度，不可恢复。不影响其他主题与答题记录。）',
  'practice.summaryAria': '答题总结',

  // 题目卡
  'q.multi': '多选题',
  'q.judge': '判断题',
  'q.single': '单选题',
  'q.difficulty': '难度 {level}',
  'q.index': '第 {n} 题',
  'q.submitSelfEval': '提交（自评）',
  'q.submit': '提交答案',
  'q.correct': '回答正确',
  'q.wrong': '回答错误，正确答案：{answer}',
  'q.wrongCountHistory': '· 历史错 {n} 次',
  'q.wrongCountTotal': '· 累计错 {n} 次',
  'q.streakProgress': '连对 {streak}/{needed}，再答对 {left} 次自动移出错题集',
  'q.mastered': '已掌握，移出错题集',
  'q.dismiss': '移出',
  'q.dismissTitle': '手动移出错题集（不再循环出现）',
  'q.confirmDismiss': '把这题移出错题集？',
  'q.selfEvalNote': '自评题（原图无标准答案）',
  'q.analysis': '解析：',
  'opt.correctAnswer': '正确答案',

  // 确认弹窗
  'confirm.cancel': '取消',
  'confirm.ok': '确定',
  'confirm.aria': '确认操作',

  // SRS 评分
  'srs.again': '重学',
  'srs.hard': '困难',
  'srs.good': '良好',
  'srs.easy': '简单',
  'srs.aria': '评分',

  // 答题总结
  'summary.tierGood': '掌握得不错',
  'summary.tierOk': '继续巩固',
  'summary.tierLow': '多练几轮',
  'summary.title': '答题完成 · {title}',
  'summary.answered': '已答',
  'summary.correctCount': '答对',
  'summary.wrongCount': '答错',
  'summary.selfRated': '含 {n} 道自评题（不计入正确率）',
  'summary.totalNote': '共 {n} 题 · 该主题累计正确率',
  'summary.backHome': '返回首页',
  'summary.redo': '重做本题集',

  // 闪卡复习流程
  'fc.extraDone': '额外练习完成!',
  'fc.extraDoneNote': '本轮又过了 {n} 张，评分已记录',
  'fc.back': '返回闪卡',
  'fc.todayDone': '今日复习完成!',
  'fc.todayDoneNote': '今天复习了 {n} 张',
  'fc.streak': '连续坚持 {n} 天',
  'fc.nextDue': '下一张卡约 {interval}后到期',
  'fc.learningLaterToday': '还有 {n} 张学习卡今天晚些时候到期，到时可继续刷',
  'fc.extraRound': '再练一轮（额外复习，不更新连续天数）',
  'fc.new': '新卡',
  'fc.learning': '学习中',
  'fc.review': '待复习',
  'fc.includesRelearn': '· 含 {n} 张重学',
  'fc.extraTag': '· 额外练习',
  'fc.phaseNew': '新卡',
  'fc.phaseLearning': '学习步 {cur}/{total}·{step}m',
  'fc.phaseRelearning': '重学·{step}m',
  'fc.phaseReview': '复习',
  'fc.hintFlip': '点击卡片或空格翻面',
  'fc.hintRate': '选下方评分（或按 1-4）',
  'fc.showAnswer': '显示答案',

  // 闪卡 dashboard
  'fch.title': '闪卡复习',
  'fch.tagline': '间隔重复 · 科学抗遗忘 · 共 {n} 张',
  'fch.todayDone': '今日复习已完成',
  'fch.start': '开始今日复习',
  'fch.count': '（{n} 张）',
  'fch.nothingToday': '今日无可复习的卡',
  'fch.rerunAll': '再练全部 {n} 张',
  'fch.rerunNote': '额外练习 · 不更新连续天数 · 评分仍记录',
  'fch.newPerDay': '每日新卡数',
  'fch.save': '保存',
  'fch.cancel': '取消',
  'fch.resetAllSrs': '重置全部闪卡进度（{n} 张卡回到新卡）',
  'fch.confirmResetSrs': '清空所有闪卡进度？所有卡将回到新卡状态，连续天数归零，不可恢复。（不影响答题/看题进度）',

  // 课程页
  'courses.notReady': '课程未就绪',
  'courses.notReadyHint':
    '课程内容来自 examples/<theme>/，需先运行 pnpm run build（含 sync:study）同步到 public/study/。',
  'courses.frameTitle': '学习课程',

  // 同步横幅
  'sync.local': '在线演示模式：进度仅保存在此浏览器，不联网同步',
  'sync.retrying': '正在重试同步…',
  'sync.error': '进度同步失败，已暂存本地。点击重试',
  'sync.retry': '重试',
  'sync.close': '关闭',

  // 主题切换
  'theme.light': '浅色模式',
  'theme.dark': '深色模式',
  'theme.system': '跟随系统',
  'theme.title': '当前：{label}（点击切换）',
  'theme.aria': '切换主题，当前{label}',

  // 语言切换
  'lang.aria': '切换语言',
  'lang.title': '语言',
};

export type TKey = keyof typeof zh;

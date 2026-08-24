export type QType = 'single' | 'multi' | 'judge';

/** UI 界面语言（顶栏可切换）。词典在 src/i18n/locales/。 */
export type UiLang = 'zh' | 'en' | 'es' | 'ru';

export interface Question {
  id: string;                 // "GIT-001" | "LNX-002" 等，全局唯一稳定
  source: string;             // 题源标识，自定义（如 "dev-intro"）
  tier?: 'ext';               // 分层标记（可选）：'ext'=拓展层题，练习池默认过滤、设置面板开"拓展题"后放行。无标记=核心层
  topic?: string;
  subtopic?: string;          // 大类下的细分考点（可选，用于主题内分组）
  day?: string;               // 学习日程标签（可选，如 "D1".."D8"，对应主题课表）
  type: QType;                // single | multi | judge
  question: string;
  options: Record<string, string>;  // {"A":"..."} 可到 "L"
  answer: string[];           // ["C"] | ["A","B","D"]；图片题自评模式为 []
  difficulty?: string;        // "易"|"中"|"难"（可选）
  analysis?: string;
  examPoint?: string;
  imageRef?: string;          // "image1.png" 等
  autoGradable?: boolean;     // false = 自评模式
  note?: string;
}

export interface AnswerRecord {
  selected: string[];
  correct: boolean | null;    // null = 未判分/自评
  submittedAt: number;        // Date.now()
  streak?: number;            // 连续答对次数；答错归 0，达到 streakToPass(wrongCount) 阈值移出错题集
  wrongCount?: number;        // 累计答错次数（只增不减）；从未答错则无此字段。与 streak 独立——
                              // streak 衡量"近期掌握"，wrongCount 衡量"历史难度"，互不覆盖。
  /** 墓碑时间戳：reset 类操作"删除"该记录时打上，merge 时与 submittedAt 竞争定序——
   *  墓碑新于记录=已删（读端视为无记录），后续若再次答题（新 submittedAt > 墓碑）则自动复活。
   *  存在是因 writeProgress 是 read-merge-write（防多 tab 并发覆盖），直接删 key 会被旧快照补回。
   *  undefined = 正常记录（向后兼容老 progress.json）。 */
  deletedAt?: number;
  /** 来自"随机20题"沙盒：仅随机模式答错时置 true。
   *  语义：答错进错题本（wrongIds 保留），但不计入主进度统计——
   *  computeStats（已答%/正确率）、首页"已答覆盖明细"、"上次答到"派生均跳过。
   *  这样随机练习是"纯沙盒自测"：不污染系统学习进度，只把错题捞进错题本。
   *  undefined = 正常记录（向后兼容老 progress.json）。 */
  fromRandom?: boolean;
}

// —— 闪卡（间隔重复）——
/** Anki 4 档评分：重学 / 困难 / 良好（默认推荐）/ 简单 */
export type SrsGrade = 'again' | 'hard' | 'good' | 'easy';

/** 卡片所处阶段：
 *  - learning：新卡学习阶段，走 Anki 默认学习步 [1m, 10m]，good 到最后一步才毕业
 *  - relearning：复习卡 lapse（评 again）后重学，走重学步 [10m]
 *  - review：已毕业，进入 SM-2 长期间隔重复 */
export type SrsPhase = 'learning' | 'relearning' | 'review';

/** 一张卡的 SRS 调度状态（SM-2 算法 + Anki 学习步），按卡 id 存进 Progress.srs */
export interface SrsState {
  ease: number;        // 易度因子，初值 2.5，下限 1.3
  interval: number;    // 当前间隔（天）；learning/relearning 阶段 <1（按分钟换算）
  reps: number;        // 连续答对次数；答 again 归 0
  due: number;         // 下次到期时间戳（ms）；≤ now 表示该复习了
  updatedAt: number;   // 最后复习时间戳（ms）— 跨设备合并取新
  phase: SrsPhase;     // 卡片阶段（学习/重学/复习）
  stepIdx: number;     // learning/relearning 阶段当前在第几个学习步（0-based）
  lapses: number;      // 复习阶段答 again 的累计次数（lapse 计数）
  /** 墓碑时间戳：resetSrs"删除"该卡时打上，merge 时与 updatedAt 竞争定序。
   *  机制同 AnswerRecord.deletedAt——直接清 srs:{} 会被旧快照补回，故用墓碑。
   *  undefined = 正常记录。 */
  deletedAt?: number;
}

/** 闪卡：正面提示 + 背面内容，独立于题库（题卡分离） */
export interface Flashcard {
  id: string;          // "FC-001"
  front: string;
  back: string;
  source: string;
  topic: string;
  fromQuestionId?: string;  // 可选软关联：源自某道题
}

export interface SrsMeta {
  /** 今日已引入的新卡数（用于"每日新卡配额"——Anki 防一天灌太多）。
   *  每学一张新卡 +1；跨天（newTodayDate !== 今天）归零重计。 */
  newToday: number;
  /** 记录 newToday 对应的日期（new Date().toDateString()，与 streak 判定一致）。 */
  newTodayDate: string;
}

export interface Progress {
  version: number;            // 固定 1
  answers: Record<string, AnswerRecord>;  // key = question id
  read?: Record<string, number>;          // 看题进度：key=题id，value=已看时间戳(Date.now())
  /** 看题墓碑：key=题id，value=删除时间戳。read 的 value 本身是时间戳无法承载墓碑，单独维护。
   *  读 read 时若 read[id] < readTombstones[id] 视为已删（重看本题集用）。
   *  merge 时两侧墓碑取 max（合并删除意图）。 */
  readTombstones?: Record<string, number>;
  srs?: Record<string, SrsState>;         // 闪卡 SRS 进度：key=卡id(FC-NNN)
  srsMeta?: SrsMeta;                       // 闪卡全局元数据（今日新卡计数等）
  /** 课程已读记录：key="<theme>/<lesson文件名>"（如 "dev-intro/git-basics.html"），
   *  value=已读时间戳（Date.now()）。key 自带主题前缀——多主题天然隔离，切主题互不干扰。
   *  merge 走 per-key max（同 read 字段）。只标记不取消（完成边界是自我追踪口径，无墓碑）。
   *  「课全读」边界 = coursesRead 命中 src/data/courses.json 清单的全部 lesson。 */
  coursesRead?: Record<string, number>;
  /** UI 主题偏好（非学习进度）：'light' | 'dark' | 'system'。
   *  跨设备同步走 mergeProgress（按 themeUpdatedAt 取新，同 srs/newToday 模式）。
   *  本地另有独立的 'ask-theme' key 供内联脚本秒读（见 index.html）。 */
  theme?: 'light' | 'dark' | 'system';
  themeUpdatedAt?: number;                // 主题最后变更时间戳（Date.now()），LWW 仲裁用
  /** UI 语言偏好（非学习进度），跨设备同步同 theme 的 LWW 模式（langUpdatedAt 仲裁）。 */
  lang?: UiLang;
  langUpdatedAt?: number;                 // 语言最后变更时间戳（Date.now()），LWW 仲裁用
  /** 学习偏好（非学习进度，设置面板写入）：拓展开关/答对自动跳题/每日新卡配额。
   *  跨设备同步同 theme 的 LWW 模式（settingsUpdatedAt 仲裁，整块合并不分字段）。 */
  settings?: LearnSettings;
  settingsUpdatedAt?: number;             // 设置最后变更时间戳（Date.now()），LWW 仲裁用
}

/** 学习偏好三件套（SettingsSheet 写入）。全部可选 + 读取侧约定缺省值：
 *  extOn 缺省=关（拓展题默认不进练习池）、autoAdvance 缺省=开、dailyNewCards 缺省=5。 */
export interface LearnSettings {
  /** 拓展题开关：true 时 tier:'ext' 的题进练习池；缺省/ false 时过滤掉。 */
  extOn?: boolean;
  /** 答对 3 秒自动跳下一题：缺省视为 true（保留既有行为）。 */
  autoAdvance?: boolean;
  /** 闪卡每日新卡配额（0-50）：缺省回退 localStorage 'ask-new-per-day'，再缺省 5。 */
  dailyNewCards?: number;
}

export interface Stats {
  total: number;
  answered: number;
  correct: number;
  wrong: number;
  accuracy: number;
}

/** 进度同步状态（纯 UI，不入 Progress 持久化）。
 *  - saved：已同步（或未开始）
 *  - error：POST 失败、已重试 3 次、入队待 flush
 *  - local：本地模式（CONTEXT.md）——启动探测发现无后端，进度仅存本浏览器
 *  由 progressClient 通知，useProgress 维护，SyncStatusBanner 消费。 */
export type SyncStatus = 'saved' | 'error' | 'local';

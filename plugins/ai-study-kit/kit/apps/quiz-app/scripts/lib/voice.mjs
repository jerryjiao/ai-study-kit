/**
 * voice.mjs — AI CLI 生成 prompt 的表达纪律单源（teach / grill / podcast 三 CLI 共用）。
 *
 * 这是「教练说人话」第二刀（issue #82 / ADR-0008）的 CLI 面：三个 AI CLI 的生成
 * prompt 各带一段按产物形态分形的表达纪律——teach 成文体（课程是给几天后回头翻的
 * 学习者读的）、grill 诊断体（错根可指认）、podcast 口播体（产物要过 TTS）——底座
 * （口表语域）三产物共用。skill 层母本与取舍理由在 skills/references/voice.md
 * （§1 底座、§2 快照措辞、§3 对话层、§4 产物成文、§5 排除边界）。
 *
 * ⭐ 双注记防漂移：本文件与 voice.md 是**同一纪律的两个落点**，不能物理单源
 * （理由见下），故改腔调必须双侧同步改——改本文件或改 voice.md §1/§4 条款都要
 * 对齐另一侧，跑 apps/quiz-app/scripts/lib/voice.test.mjs，且 git add 新文件后
 * 重跑 pnpm run sync:plugin 刷 kit 快照（sync 只收 git 跟踪面，未 add 的新文件
 * 会零警告漏出快照）。
 *
 * 不能物理单源的两条理由（写死防漂移）：
 * 1. kit 快照自包含——quiz-app 整体随插件 kit/ 分发进用户项目，CLI 运行时不得读
 *    skills/ 或 ~/.agents/skills/（ADR-0008「不检测、不依赖」，运行时探测与双层
 *    增强两方案已在该 ADR 明拒）；
 * 2. prompt 纪律必须用目标语言写（langs.mjs 头注释的设计原则：目标语言写的指令
 *    约束力更强），voice.md 是中文纪律散文，不是五语词典。
 *
 * 源流注记：纪律机制重写自第三方中文表达引擎 skill「辞达」（cida，MIT License，
 * 作者「谁是专家」mizzlelover）的口表语域底座与 platforms/podcast、
 * platforms/video_script 适配器——重写而非照抄，全部条款用本仓的话与自起术语重述，
 * 不搬其原文行文与内部命名（同 voice.md 头部源流注记先例）。
 *
 * 明确不进（同 voice.md §5 排除边界，防扩散）：
 * - 十维文体参数值（orality:8 / preparedness 等参数体系，ADR-0008 约束 1 永久排除）；
 * - 时长参数原值（「每 10-15 分钟收拢一次」重标定为段数粒度的代码条件，见
 *   RECAP_THRESHOLD）；
 * - 对话稿/独白稿分工条款（kit 已有 --style 三态覆盖，不另立体系）；
 * - 其余平台适配器（generic/wechat/xiaohongshu/zhihu/weibo）——唯播客产物是真
 *   播客（要过 TTS），是 issue #82 预留的唯一例外。
 *
 * recap 注记：收拢触发按**调用方意图段数**判定（opts.targetSegments 严格大于
 * RECAP_THRESHOLD 时拼接），在代码层确定性完成、不交给 LLM 从上下文自估段数；
 * LLM 实际产出允许 ±3 浮动（target=13 可能产出 16 段但无收拢），收拢条款是对
 * 意图值的下限保护、不是产出段数的保证——测试钉的是注入分支语义
 * （voice.test.mjs），别把它当强契约。
 */

/**
 * 中段收拢注入阈值：目标段数严格大于 12 时，podcast 纪律段追加「中段收拢」条款。
 * 12 是 podcast-generate 的默认段数（短脚本不注入收拢）；源流是 cida podcast
 * 适配器的「每 10-15 分钟一个 30 秒小结」——参数不进、机制重标定成段数粒度。
 */
export const RECAP_THRESHOLD = 12;

/**
 * 口表语域底座（voice.md §1 的 prompt 尺寸压缩，五语）——三产物共用的最小集：
 * 开门即入题 / 词落到实物 / 判断钉在依据上 / 分寸跟着判断走 / 先删后改。
 * 「立场先亮」不入（快照推荐行场景）、「先接话头」不入（对话专属，课程与精讲无
 * 对话对象；podcast 的接话头在口播体分形里，不进底座）——取舍理由见 voice.md §1
 * 与本仓 issue #82：底座只收对成文体/诊断体/口播体都成立的最小集。
 */
export const VOICE_BASE = {
  zh: `- 开门即入题：第一句直接给事实、问题或判断——不垫场、不写「随着……」式的大背景。
- 词落到实物：说到的东西要能指认——谁、做什么、成什么样；「很多」「比较重要」这类空泛词换成具体对象和数字。
- 判断钉在依据上：下判断时交代它从哪来；指不出依据的判断不写。
- 分寸跟着判断走：「常见但不总是」「通常」这类限定是判断的一部分，压缩措辞时保留，不丢。
- 先删后改：没有信息量的句子直接删；空话不配被改写得更漂亮。`,
  en: `- Open on substance: the first sentence gives a fact, a question, or a verdict — no warm-up, no "with the development of..." backdrop.
- Anchor every word to a thing: what you name must be identifiable — who does what, with what outcome; replace vague "many" or "important" with concrete objects and numbers.
- Tie every verdict to evidence: when you make a call, say where it comes from; a verdict with no ground to point to does not get written.
- Keep the hedges: qualifiers like "common but not always" or "usually" are part of the verdict itself — they survive compression; do not drop them.
- Delete before rewriting: a sentence with no information in it gets deleted outright; empty phrasing does not earn a prettier rewrite.`,
  es: `- Entra directo al grano: la primera frase da un hecho, una pregunta o un veredicto — sin calentamiento ni fondos tipo «con el desarrollo de...».
- Ancla las palabras a cosas: lo que nombres debe poder señalarse — quién hace qué y con qué resultado; cambia los vagos «muchos» o «importante» por objetos y números concretos.
- Cada veredicto con su base: al afirmar, di de dónde sale; un veredicto sin base señalable no se escribe.
- Conserva los matices: límites como «común pero no siempre» o «normalmente» son parte del veredicto — sobreviven a la compresión, no se tiran.
- Borrar antes de reescribir: la frase sin información se borra directamente; la frase vacía no se gana una reescritura más bonita.`,
  ru: `- Сразу к делу: первое предложение — факт, вопрос или вывод; никаких раскачек и фона в духе «с развитием...».
- Слова привязаны к вещам: всё, о чём вы говорите, должно быть указуемым — кто, что делает, с каким результатом; расплывчатые «много» и «важно» заменяйте конкретными объектами и числами.
- Выводы опираются на основания: делая вывод, показывайте, откуда он; вывод без указуемого основания не пишется.
- Сохраняйте оговорки: «часто, но не всегда», «обычно» — часть самого вывода; при сжатии формулировок оговорки сохраняются, а не выбрасываются.
- Сначала удалить, потом переписывать: предложения без информации удаляются сразу; пустой фразе не полагается более красивая редакция.`,
  ja: `- 冒頭から本題：最初の一文で事実・問い・結論のいずれかを直接出す。前置きや「〜の発展に伴い」型の背景から入らない。
- 言葉を物に結びつける：挙げるものは指せるもの——誰が何をし、どうなるか。「多い」「大事」のような曖昧語は具体の対象と数字に置き換える。
- 結論には根拠を示す：判断を言うとき、どこから来た判断かを添える。指せる根拠のない結論は書かない。
- 限定を守る：「よくあるが常にではない」「通常」のような限定語は判断の一部。圧縮しても残し、落とさない。
- 書き直す前に削る：情報のない文はそのまま削る。空文を綺麗に書き直す価値はない。`,
};

/**
 * 产物分形纪律（五语）：teach 成文体 / grill 诊断体为字符串；podcast 口播体为
 * { base, recap } 两段结构——base 常驻，recap 仅在目标段数超过 RECAP_THRESHOLD
 * 时由 voiceBlock 拼接（收拢并入主播对白，不占独立段）。
 */
export const VOICE_KIND = {
  // 成文体（voice.md §4 的 CLI 面）：课程 HTML 是给回头翻的学习者读的。
  teach: {
    zh: `- 读者是几天后回头翻这一课的学习者：第一个 <h2> 直接给本课落点（这课管什么、从哪下手），不写导入铺垫。
- 行序跟着依赖走：先立主张，再给机制与例子，最后给边界与易错；同一观点收拢到一处说透，不重复铺开。
- 反讲义腔：不写「概念定义 / 主要特征 / 应用场景」式均匀栏目，不写每段「X 是指……」的等长句堆；直接的判断、具体的例子这些讲活的部分保住。`,
    en: `- The reader is a learner flipping back to this lesson days later: the first <h2> goes straight to what this lesson is for and where to start — no warm-up introduction.
- Order rows by dependency: the claim first, then mechanism and examples, then boundaries and pitfalls; gather each point into one place and say it once, properly.
- No textbook voice: no uniform "Definition / Key Features / Use Cases" filler sections, no stacks of same-length "X refers to..." sentences; keep the alive parts — direct verdicts, concrete examples.`,
    es: `- El lector vuelve a esta lección días después: el primer <h2> va directo a para qué sirve la lección y por dónde empezar — sin introducción de calentamiento.
- Ordena por dependencia: primero la afirmación, luego mecanismo y ejemplos, al final límites y trampas; junta cada punto en un solo lugar y dilo una vez, bien dicho.
- Nada de tono de manual: sin secciones uniformes de «Definición / Características / Casos de uso» ni pilas de frases iguales del tipo «X se refiere a...»; conserva lo vivo — veredictos directos, ejemplos concretos.`,
    ru: `- Читатель вернётся к этому уроку через несколько дней: первый <h2> сразу говорит, зачем урок и с чего начать — без разогревающей вводной.
- Порядок — по зависимости: сначала утверждение, затем механизм и примеры, в конце границы и ловушки; каждую мысль соберите в одном месте и скажите один раз, но толково.
- Без лекционного тона: никаких однообразных рубрик «Определение / Основные характеристики / Сценарии применения» и груд равных по длине фраз «X — это...»; живое сохраняйте — прямые выводы и конкретные примеры.`,
    ja: `- 読み手は数日後にこのレッスンを見返す学習者：最初の <h2> は、このレッスンが何を担いどこから手を付けるかを直接出す。導入の前置きを書かない。
- 順序は依存に沿う：先に主張、次に仕組みと例、最後に境界と落とし穴。同じ論点は一箇所に集め、一度だけ言い切る。
- 講義調にしない：「定義／主な特徴／活用場面」式の均質な欄埋めや、毎段「X とは……」の同じ長さの文を並べない。生きた部分——直接の判断と具体例——は残す。`,
  },
  // 诊断体（voice.md §2 的精讲面）：错根可指认，措辞钉死只引用输入记录。
  grill: {
    zh: `- 开头一句话点破本簇错题的共同错根，再展开讲解。
- 每个易错警示指到具体题：引用该题 id、它的实际错选与累计错次——只引用输入里实际给出的记录，不编造没有出现的做题细节。
- 错因落到具体概念/操作：说清混淆了什么、漏了什么；「粗心」「不熟」这类不可行动的归因不算错因。`,
    en: `- Open with one sentence naming the common root of this cluster's mistakes, then expand.
- Every pitfall warning points at a concrete question: cite that question's id, its actual wrong pick and accumulated wrong count — quote only the records the input actually gives, and never invent answering details that are not in it.
- Root causes land on concrete concepts or operations: state exactly what got confused or missed; "careless" or "just unfamiliar" is not an actionable cause.`,
    es: `- Abre con una frase que nombre la raíz común de los errores de este clúster, y después desarrolla.
- Cada advertencia apunta a una pregunta concreta: cita su id, la opción equivocada real y las veces acumuladas de error — cita solo los registros que la entrada realmente da, y nunca inventes detalles de respuesta que no estén ahí.
- Las causas caen en conceptos u operaciones concretas: di exactamente qué se confundió o qué se omitió; «descuido» o «simplemente no lo domina» no es una causa accionable.`,
    ru: `- Начните с одной фразы, называющей общий корень ошибок этого кластера, затем разворачивайте.
- Каждое предупреждение указывает на конкретный вопрос: приведите его id, реальный неверный выбор и накопленное число ошибок — цитируйте только те записи, что входные данные действительно дают, и не выдумывайте деталей ответов, которых там нет.
- Причины ложатся на конкретные понятия или операции: скажите точно, что перепутано или упущено; «невнимательность» или «просто не освоил» — не действенная причина.`,
    ja: `- 冒頭の一文でこのクラスタの誤りの共通根を言い当て、それから展開する。
- 各注意喚起は具体的な問題を指す：その問題 id・実際に選んだ誤り・累計誤答回数を引用する——引用は入力に実際にある記録だけとし、そこにない解答の詳細を捏造しない。
- 誤因は具体的な概念・操作に落とす：何を混同したか、何を見落としたかを言う。「うっかり」「単に慣れていない」は動ける原因ではない。`,
  },
  // 口播体（voice.md §3 对话层纪律 + cida podcast/video_script 蒸馏机制）：
  // 唯一要过 TTS 的产物，故接「写给耳朵」；接话头/预答下一问在此分形、不在底座。
  podcast: {
    zh: {
      base: `- 接住话头再推进：每段先接住前一段——追问、补充、点破——再往前讲；两场独白轮流念稿是失败。
- 预答下一问：讲完一个判断，另一位主播把听众此刻最可能的问题问出口，紧接着回答。
- 话题回环：可以有支线漫游，但支线出口要写回归信号（「说回刚才的 X」）；表层可以像聊天一样松散，主线话题结构不能丢——散漫无收拢是失败形态。
- 密度成串、串间留气口：知识信息成串讲，串与串之间留一句喘息式过渡，不硬切话题。
- 口语真实有尺度：自然的追问与自我修正保留；「呃」「那个」式纯填充不进稿。
- 写给耳朵：句子以一口气念完为上限，拗口就拆；关键命令与数字首次出现时要念得清楚。`,
      recap: `- 中段收拢：脚本过半处，由一位主播用一两句对白点一下已讲的主线（「刚才我们说到了……」）再继续；收拢就是普通对白，不占独立段、不增加段数。`,
    },
    en: {
      base: `- Pick up the thread before moving on: each segment responds to the previous one — follow-up, add, call out — before advancing; two alternating monologues reading their own scripts is a failure.
- Answer the next question: after a verdict, the other host voices the question the listener is most likely to have right now, and answers it.
- Topic return: side trips are welcome, but each detour exits with a return signal ("back to what we were saying about X"); the surface may be as loose as a chat, the underlying topic structure may not — rambling is the failure mode.
- Density in strands, with breaths between: facts come in strands; between strands leave one breathing transition instead of hard cuts.
- Real speech, held to a measure: natural follow-ups and self-corrections stay; pure fillers ("uh", "um") never enter the script.
- Write for the ear: a sentence is as long as one breath — if it stumbles, split it; key commands and numbers are pronounced clearly the first time they appear.`,
      recap: `- Mid-show recap: around the halfway point, one host spends a line or two of dialogue naming the main thread so far ("so far we've covered...") before continuing; the recap is ordinary dialogue — it takes no separate segment and adds nothing to the segment count.`,
    },
    es: {
      base: `- Retoma el hilo antes de avanzar: cada segmento responde al anterior — pregunta, aporta, señala — antes de seguir; dos monólogos alternados leyendo cada uno su guion es un fracaso.
- Responde la siguiente pregunta: tras un veredicto, el otro presentador formula la pregunta que el oyente haría ahora mismo, y la responde.
- Vuelta al tema: las digresiones valen, pero cada desvío sale con una señal de regreso («volviendo a lo que decíamos de X»); la superficie puede ser tan suelta como una charla, la estructura del tema no — divagar es el modo de fallo.
- Densidad en rachas, con respiros entre medias: los datos van en rachas; entre rachas deja una transición que dé aire, en vez de cortes secos.
- Habla real, con medida: las preguntas espontáneas y las autocorrecciones se quedan; los rellenos puros («eh», «este») no entran al guion.
- Escribe para el oído: una frase dura lo que dura una respiración — si trastabilla, pártela; los comandos y números clave se pronuncian claros la primera vez que aparecen.`,
      recap: `- Recuento a mitad de guion: hacia la mitad, un presentador dedica un par de líneas de diálogo a nombrar el hilo principal hasta aquí («hemos hablado de...») antes de seguir; el recuento es diálogo normal — no ocupa un segmento aparte ni suma al conteo de segmentos.`,
    },
    ru: {
      base: `- Подхватите нить, прежде чем идти дальше: каждый сегмент сначала откликается на предыдущий — уточняет, дополняет, подмечает — и только потом развивает; два чередующихся монолога, читающих каждый своё, — провал.
- Ответьте на следующий вопрос: после вывода второй ведущий озвучивает вопрос, который слушатель скорее всего задал бы сейчас, — и отвечает на него.
- Возврат к теме: отступления уместны, но каждый уход в сторону завершается сигналом возврата («вернёмся к тому, что мы говорили о X»); поверхность может быть свободной, как беседа, структура темы — нет; бессвязная болтовня — провальный режим.
- Плотность сгустками, между ними — передышка: факты идут сгустками; между сгустками — переход на выдохе, без резких склеек.
- Живая речь в меру: естественные уточнения и самопоправки остаются; чистые заполнители («э-э», «ну вот») в сценарий не идут.
- Пишите для уха: фраза — на один выдох; спотыкается — разбейте; ключевые команды и числа первый раз произносятся разборчиво.`,
      recap: `- Сводка в середине: примерно на половине сценария один из ведущих парой реплик называет основную нить («до сих пор мы говорили о...») и продолжает; сводка — обычная реплика, она не занимает отдельный сегмент и не прибавляет к числу сегментов.`,
    },
    ja: {
      base: `- 前の話を受けてから進む：各セグメントは前のセグメントに応答——質問、補足、指摘——してから先へ進む。二つの独白が交互にそれぞれの原稿を読み上げる形は失敗。
- 次の問いに先回りする：判断を出したら、相方が聞き手が今まさに持ちそうな質問を口にし、答える。
- 話題の回帰：脱線はあってよいが、各脱線の出口には戻り信号（「さっきの X に戻ると」）を置く。表層は雑談くらいゆるくても、話題の骨格は崩せない——まとまりなく続けるのは失敗形。
- 密度はかたまりで、間に息：知識はかたまりで語り、かたまりの間に一息のつなぎを置く。話題を硬く切り替えない。
- 生きた話し方の尺度：自然な質問や自己訂正は残す。純粋な埋め草（「えー」「あのー」）は脚本に入れない。
- 耳のために書く：一文は息継ぎ一つで読み切れる長さまで。噛む文は割る。重要なコマンドと数字は初出ではっきり発音できるようにする。`,
      recap: `- 中盤のまとめ：脚本の中盤で、片方のパーソナリティが 1〜2 行のセリフでここまでの主線をひとまとめにする（「ここまで○○について話しました」）——それから先へ続ける。まとめは通常のセリフであり、独立したセグメントを取らず、セグメント数にも加えない。`,
    },
  },
};

/**
 * 组装一段产物形态的表达纪律（底座 + kind 分形，空行分隔）。
 *
 * @param {'teach'|'grill'|'podcast'} kind  产物形态（未知值抛错并列出支持项）
 * @param {string} [lang='zh']  纪律文本语言（五语；未知 code 兜底 zh，同 langs.mjs
 *                              langConf 的防御路径——正常路径都应经 resolveLang 校验）
 * @param {object} [opts={}]
 * @param {number} [opts.targetSegments]  podcast 目标段数（调用方意图值）：严格大于
 *        RECAP_THRESHOLD 时拼接「中段收拢」条款；缺省/非数值不拼。teach/grill 忽略 opts。
 * @returns {string}  prompt 内嵌文本（各 builder 以「## 表达纪律」标题包裹）
 */
export function voiceBlock(kind, lang = 'zh', opts = {}) {
  const kindConf = VOICE_KIND[kind];
  if (!kindConf) {
    throw new Error(`未知的表达纪律 kind：${kind}（支持：${Object.keys(VOICE_KIND).join(' / ')}）`);
  }
  const l = kindConf[lang] ? lang : 'zh';
  const kindText = kindConf[l];
  const parts = [VOICE_BASE[l], kindText.base ?? kindText];
  if (kind === 'podcast' && Number(opts.targetSegments) > RECAP_THRESHOLD) {
    parts.push(kindText.recap);
  }
  return parts.join('\n\n');
}

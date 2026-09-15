---
title: 开源刷题工具：把你的题库变成刷题 · 闪卡 · 错题精讲的学习闭环
description: ai-study-kit 是开源刷题工具：收集的真题或 AI 出的题，一键变成刷题站、课程讲解、闪卡复习、错题精讲一体的学习闭环。MIT 协议、可自部署、不配 AI 也能用。
template: splash
hero:
  # H1 是主张句（AI 教练带领 + 练到会）；SERP title（frontmatter title）负责吃搜索词——两者分离靠显式 hero.title
  title: AI 教练带你练到会
  tagline: 题目自己收，或者让 AI 出。错题按考点讲透，到期复习自动排队，进度跨设备同步。免费开源，装个插件对 AI 说「我想学 X」就能开始。
  image:
    html: |
      <div class="ask-shot">
        <div class="ask-shot-bar"><i></i><i></i><i></i></div>
        <div class="ask-shot-body">
          <div class="ask-shot-tabs">
            <span class="on">答题</span><span>闪卡</span><span>课程</span><span>错题</span>
          </div>
          <div class="ask-shot-q">git 中，工作区的修改要进入版本库，第一步是？</div>
          <div class="ask-shot-opt"><i></i>A. git push</div>
          <div class="ask-shot-opt ok"><i></i>B. git add ✓</div>
          <div class="ask-shot-opt"><i></i>C. git commit</div>
          <div class="ask-shot-ana">
            解析：工作区先 add 进暂存区，再 commit 进版本库，最后 push 到远端。三区模型是 git 的核心心智模型。
          </div>
          <div class="ask-shot-meta"><i></i>第 3 / 24 题 · 本轮连对 5</div>
        </div>
      </div>
  actions:
    - text: 在线试用
      link: /demo/
      variant: primary
      icon: rocket
    - text: 快速上手
      link: /get-started/
      variant: secondary
      icon: right-arrow
    - text: GitHub
      link: https://github.com/jerryjiao/ai-study-kit
      variant: secondary
      icon: github
head:
  # 结构化数据：WebSite + SoftwareApplication + FAQPage（与本页 FAQ 区块逐条对应）。
  # 富摘要自 2023 起 FAQ 仅政府/健康站展示，这里的价值在语义明确化与长尾覆盖。
  - tag: script
    attrs:
      type: application/ld+json
    content: |
      {"@context":"https://schema.org","@graph":[
      {"@type":"WebSite","name":"ai-study-kit","url":"https://aistudykit.dev/","inLanguage":"zh-CN","description":"开源刷题工具：把任意题库变成刷题、闪卡、错题精讲一体的学习闭环"},
      {"@type":"SoftwareApplication","name":"ai-study-kit","url":"https://aistudykit.dev/","applicationCategory":"EducationalApplication","operatingSystem":"Web","description":"把任意主题的题库变成完整学习闭环的开源脚手架：答题、课程、闪卡、错题精讲、间隔重复，进度可跨设备同步。","offers":{"@type":"Offer","price":0,"priceCurrency":"USD"},"license":"https://opensource.org/licenses/MIT","codeRepository":"https://github.com/jerryjiao/ai-study-kit","author":{"@type":"Organization","name":"ai-study-kit contributors"}},
      {"@type":"FAQPage","mainEntity":[
      {"@type":"Question","name":"ai-study-kit 免费吗？","acceptedAnswer":{"@type":"Answer","text":"免费。MIT 开源协议，代码与题库格式全部开放，无账号、无订阅、无遥测。"}},
      {"@type":"Question","name":"我没有题库怎么办？","acceptedAnswer":{"@type":"Answer","text":"两种来源：自己整理的真题按 JSON 格式录入；或用内置的三个 AI 命令行工具，按考点排布表让 AI 直产题目，用你自己的 API key。"}},
      {"@type":"Question","name":"支持哪些题型？","acceptedAnswer":{"@type":"Answer","text":"单选、多选、判断。多选必须全对才算对；题目是纯 JSON，不锁任何格式。"}},
      {"@type":"Question","name":"和 Anki 什么关系？","acceptedAnswer":{"@type":"Answer","text":"闪卡复习采用 Anki 兼容的 SM-2 算法（学习步、毕业、遗忘衰减同构），但本工具是刷题 + 课程 + 错题精讲的完整闭环，不是 Anki 插件。"}},
      {"@type":"Question","name":"错题精讲是怎么做的？","acceptedAnswer":{"@type":"Answer","text":"AI 把错题按考点聚类，逐个考点生成精讲页，顺带沉淀考点级错因档案，下一次复习直接点名弱项。"}},
      {"@type":"Question","name":"需要联网或服务器吗？数据存在哪？","acceptedAnswer":{"@type":"Answer","text":"不需要。pnpm dev 本地跑，答题和闪卡全在浏览器里；想跨设备同步时再部署一个小服务器。数据只有两处：本地模式存浏览器，自部署模式存你自己的服务器（一个 JSON 文件），不经任何第三方。"}},
      {"@type":"Question","name":"换成我自己的科目麻烦吗？","acceptedAnswer":{"@type":"Answer","text":"不麻烦。换主题就是换一个目录的 JSON 与 HTML 文件；内置 /ask-coach 学习教练带你从能力大纲到题库走完全流程。"}},
      {"@type":"Question","name":"能把学习内容做成播客听吗？","acceptedAnswer":{"@type":"Answer","text":"能。任一学习素材（课程、题目、错题精讲）都能合成男女双播音频，附带逐字稿；用你自己的 API key 生成，支持四语输出，通勤、运动时被动巩固。"}}
      ]}
      ]}
---

<section class="ask-lead">
  <p class="ask-lead-strip">
    <span>题库是一份 JSON</span>
    <span>课程是自包含 HTML</span>
    <span>闪卡走 Anki 兼容的 SM-2</span>
  </p>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>一个工具包，六个学习产物</h2>
    <p>课讲的、题考的、卡记的，是同一套知识点</p>
  </div>
  <div class="ask-feats">
    <div class="ask-feat"><div class="ico">✅</div><b>答题</b><span>单选、多选、判断，提交即判分，多选要全对</span></div>
    <div class="ask-feat"><div class="ico">📖</div><b>课程</b><span>自包含 HTML 讲义，带 ASCII 示意图和提示框</span></div>
    <div class="ask-feat"><div class="ico">🎴</div><b>闪卡</b><span>核心概念做成卡片，正面提问，背面展开</span></div>
    <div class="ask-feat"><div class="ico">🔍</div><b>错题精讲</b><span>AI 把错题按考点聚类，逐个讲透</span></div>
    <div class="ask-feat"><div class="ico">⏱️</div><b>间隔重复</b><span>SM-2 算法排复习计划，到期自动排队</span></div>
    <div class="ask-feat"><div class="ico">🎧</div><b>播客</b><span>任一学习素材合成男女双播音频，通勤路上听</span></div>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>这是给谁用的</h2>
    <p>项目自带一个 git 和 Linux 的示例主题，正式使用时换成你自己的题库</p>
  </div>
  <div class="ask-compare-wrap">
    <table class="ask-compare">
      <tr><th>你在做什么</th><th>合不合适</th></tr>
      <tr><td>开发者学新技术，比如 React 或 K8s</td><td class="y">✅ 把文档要点抽成题，刷题加闪卡巩固</td></tr>
      <tr><td>学生复习，考研或资格证</td><td class="y">✅ 真题库加 AI 错题精讲</td></tr>
      <tr><td>准备面试</td><td class="y">✅ 自己出题，AI 帮你产课和错题串讲</td></tr>
      <tr><td>学任何有考点的东西，合规、流程、术语</td><td class="y">✅ 能拆成问答就能学</td></tr>
      <tr><td>只想要一套现成题库</td><td>❌ 项目不含真题，题目要自己出或用 AI 生成</td></tr>
    </table>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>为什么不用现成工具</h2>
    <p>Anki 闪卡强，但没有答题站和错题精讲；Quizlet 是闭源 SaaS，数据不在自己手里</p>
  </div>
  <div class="ask-compare-wrap">
    <table class="ask-compare matrix">
      <tr><th>工具</th><th>答题</th><th>课程</th><th>闪卡 SRS</th><th>错题精讲</th><th>开源</th></tr>
      <tr><td class="tool">Anki</td><td>✗</td><td>✗</td><td class="y">✓</td><td>✗</td><td class="y">✓</td></tr>
      <tr><td class="tool">Quizlet</td><td class="y">✓</td><td>✗</td><td>部分</td><td>✗</td><td>✗</td></tr>
      <tr><td class="tool">Notion</td><td>✗</td><td>笔记</td><td>✗</td><td>✗</td><td>✗</td></tr>
      <tr class="us"><td class="tool">ai-study-kit</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>✓ MIT</td></tr>
    </table>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>真实界面长这样</h2>
    <p>下面是在线 demo 的实拍，不是设计稿——点「在线试用」直接上手</p>
  </div>
  <div class="ask-shots">
    <figure class="ask-shot-card">
      <img src="/shots/quiz-zh.png" alt="刷题界面：git 三区模型单选题，答对高亮与逐题解析" loading="lazy" />
      <figcaption>刷题：提交即判分，答错进错题本，逐题解析</figcaption>
    </figure>
    <figure class="ask-shot-card">
      <img src="/shots/wrong-zh.png" alt="错题精讲页面：错题按考点聚类，逐考点讲透" loading="lazy" />
      <figcaption>错题精讲：按考点聚类，逐个讲透薄弱点</figcaption>
    </figure>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>两条命令，交给教练</h2>
    <p>插件自带完整答题站源码——不用 clone，不用记命令</p>
  </div>
  <div class="ask-steps">
    <div class="ask-step"><div class="n">1</div>添加市集<code>/plugin marketplace add https://github.com/jerryjiao/ai-study-kit</code></div>
    <div class="ask-step"><div class="n">2</div>装 ai-study-kit<code>装完对 AI 说「我想学 X」（或 /ask-coach）</code></div>
    <div class="ask-step"><div class="n">3</div>教练接管<code>探测进度 → 推荐今天最该做的 → 带你执行</code></div>
  </div>
  <p class="ask-more">
    用别的工具？<a href="/get-started/">按工具安装矩阵看快速上手</a> · 开发者想本地跑？clone 路线也在那
  </p>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>常见问题</h2>
    <p>关于免费、题库来源、数据归属和 Anki 兼容</p>
  </div>
  <div class="ask-faq">
    <details>
      <summary>免费吗？</summary>
      <p>免费。MIT 开源协议，代码与题库格式全部开放，无账号、无订阅、无遥测。</p>
    </details>
    <details>
      <summary>我没有题库怎么办？</summary>
      <p>两种来源：自己整理的真题按 JSON 格式录入；或用内置的三个 AI 命令行工具，按考点排布表让 AI 直产题目，用你自己的 API key。</p>
    </details>
    <details>
      <summary>支持哪些题型？</summary>
      <p>单选、多选、判断。多选必须全对才算对；题目是纯 JSON，不锁任何格式。</p>
    </details>
    <details>
      <summary>和 Anki 什么关系？</summary>
      <p>闪卡复习采用 Anki 兼容的 SM-2 算法（学习步、毕业、遗忘衰减同构），但本工具是刷题 + 课程 + 错题精讲的完整闭环，不是 Anki 插件。</p>
    </details>
    <details>
      <summary>错题精讲是怎么做的？</summary>
      <p>AI 把错题按考点聚类，逐个考点生成精讲页，顺带沉淀考点级错因档案，下一次复习直接点名弱项。</p>
    </details>
    <details>
      <summary>需要联网或服务器吗？数据存在哪？</summary>
      <p>不需要。pnpm dev 本地跑，答题和闪卡全在浏览器里；想跨设备同步时再部署一个小服务器。数据只有两处：本地模式存浏览器，自部署模式存你自己的服务器（一个 JSON 文件），不经任何第三方。</p>
    </details>
    <details>
      <summary>换成我自己的科目麻烦吗？</summary>
      <p>不麻烦。换主题就是换一个目录的 JSON 与 HTML 文件；内置 /ask-coach 学习教练带你从能力大纲到题库走完全流程。</p>
    </details>
    <details>
      <summary>能把学习内容做成播客听吗？</summary>
      <p>能。任一学习素材（课程、题目、错题精讲）都能合成男女双播音频，附带逐字稿；用你自己的 API key 生成，支持四语输出，通勤、运动时被动巩固。</p>
    </details>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>不知道今天该学什么？</h2>
    <p>换主题、产课、刷题、错题串讲、部署——这些命令不用记，内置的学习教练 /ask-coach 替你安排</p>
  </div>
  <div class="ask-flow">
    <span class="node">扫一遍学习状态</span><span class="arr">→</span>
    <span class="node">推荐现在最该做的一件事</span><span class="arr">→</span>
    <span class="node">带着你执行</span>
  </div>
  <p class="ask-more">
    <code>pnpm run skill:install</code> 装进 AI CLI，之后每次学习从它开始 ·
    <a href="/ai/ai-study-kit/">看 /ask-coach 怎么用</a>
  </p>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>不止是刷题工具</h2>
    <p>内置一套从真实学习实践里沉淀出来的方法论</p>
  </div>
  <div class="ask-flow">
    <span class="node">大纲定考什么</span><span class="arr">→</span>
    <span class="node">材料讲概念</span><span class="arr">→</span>
    <span class="node">做题验效果</span>
  </div>
  <p class="ask-more">
    <a href="/method/methodology/">看方法论的完整说明</a>
  </p>
</section>

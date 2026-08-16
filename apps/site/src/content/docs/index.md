---
title: ai-study-kit
description: 把任意主题的题库变成完整学习闭环的开源脚手架
template: splash
header:
  tagline: 把任意题库，变成完整的学习闭环
  actions:
    - text: ⚡ 在线试玩
      link: /demo/
      variant: primary
      icon: rocket
    - text: 5 分钟上手
      link: /get-started/
      variant: secondary
      icon: right-arrow
---

<div class="ask-hero">
  <div>
    <span class="ask-hero-badge">开源 · MIT · clone 即用</span>
    <h1>你带题来，<br /><span class="ask-gradient-text">工具帮你变成学习 app</span></h1>
    <p class="ask-sub">
      答题、课程、闪卡、错题精讲、间隔重复——围绕同一套考点对齐，进度跨设备同步。
      这是个脚手架，不是题库：任何能拆成「问题 + 答案」的主题都能学。
    </p>
    <div class="ask-cta-row">
      <a class="ask-cta-primary" href="/demo/">⚡ 在线试玩</a>
      <a class="ask-cta-ghost" href="/get-started/">5 分钟上手 →</a>
    </div>
  </div>
  <div class="ask-shot">
    <div class="ask-shot-bar"><i></i><i></i><i></i></div>
    <div class="ask-shot-body">
      <div class="ask-shot-tabs">
        <span class="on">答题</span><span>闪卡</span><span>课程</span><span>错题本</span>
      </div>
      <div class="ask-shot-q">git 中，工作区（working directory）的修改要进入版本库，第一步是？</div>
      <div class="ask-shot-opt"><i></i>A. git push</div>
      <div class="ask-shot-opt ok"><i></i>B. git add ✓</div>
      <div class="ask-shot-opt"><i></i>C. git commit</div>
      <div class="ask-shot-ana">
        解析：工作区 → 暂存区（git add）→ 版本库（git commit）→ 远端（git push）。三区模型是 git 的核心心智模型。
      </div>
    </div>
  </div>
</div>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>一个 app，五个学习产物</h2>
    <p>课讲的、题考的、卡记的、错题深挖的，是同一套知识点</p>
  </div>
  <div class="ask-feats">
    <div class="ask-feat"><div class="ico">✅</div><b>答题</b><span>单选/多选/判断，即答即判，多选全对才算对</span></div>
    <div class="ask-feat"><div class="ico">📖</div><b>课程</b><span>自包含 HTML 讲义，ASCII 示意图 + callout</span></div>
    <div class="ask-feat"><div class="ico">🎴</div><b>闪卡</b><span>Anki 兼容 SM-2 + 学习步调度</span></div>
    <div class="ask-feat"><div class="ico">🔍</div><b>错题精讲</b><span>AI 按考点聚类，逐个深度展开</span></div>
    <div class="ask-feat"><div class="ico">🔄</div><b>进度同步</b><span>无账号跨设备同步，数据在你手里</span></div>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>为什么不用现成工具</h2>
    <p>Anki 闪卡强但没答题站，Quizlet 数据不在手里，Notion 记了不能刷</p>
  </div>
  <div class="ask-compare-wrap">
    <table class="ask-compare">
      <tr><th>工具</th><th>答题</th><th>课程</th><th>闪卡 SRS</th><th>错题精讲</th><th>开源</th></tr>
      <tr><td class="tool">Anki</td><td>—</td><td>—</td><td class="y">✓</td><td>—</td><td class="y">✓</td></tr>
      <tr><td class="tool">Quizlet</td><td class="y">✓</td><td>—</td><td>部分</td><td>—</td><td>—</td></tr>
      <tr><td class="tool">Notion</td><td>—</td><td>笔记</td><td>—</td><td>—</td><td>—</td></tr>
      <tr class="us"><td class="tool">ai-study-kit</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>✓ MIT</td></tr>
    </table>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>三条命令，浏览器见</h2>
    <p>不需要配 AI、不需要数据库，clone 即用</p>
  </div>
  <div class="ask-steps">
    <div class="ask-step"><div class="n">1</div>clone 仓库<code>git clone https://github.com/jerryjiao/ai-study-kit</code></div>
    <div class="ask-step"><div class="n">2</div>安装依赖<code>pnpm install</code></div>
    <div class="ask-step"><div class="n">3</div>启动<code>pnpm dev → http://localhost:5173</code></div>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>不止是刷题工具</h2>
    <p>内置一套经过实践检验的学习方法论</p>
  </div>
  <div class="ask-flow">
    <span class="node">大纲定考什么</span><span class="arr">→</span>
    <span class="node">材料讲概念</span><span class="arr">→</span>
    <span class="node">做题验效果</span>
  </div>
</section>

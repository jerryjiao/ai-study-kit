---
title: 把任意题库变成完整的学习闭环
description: 开源学习脚手架，答题、课程、闪卡、错题精讲、间隔重复围绕同一套考点对齐
template: splash
hero:
  tagline: 开源脚手架，MIT 协议。题目可以是收集的真题，也可以让 AI 出；课程、闪卡、错题精讲和间隔重复由工具负责，进度跨设备同步。
  actions:
    - text: 在线试玩
      link: /ai-study-kit/demo/
      variant: primary
      icon: rocket
    - text: 快速上手
      link: /ai-study-kit/get-started/
      variant: secondary
      icon: right-arrow
    - text: GitHub
      link: https://github.com/jerryjiao/ai-study-kit
      variant: secondary
      icon: github
---

<div class="ask-intro">
  <div class="ask-intro-text">
    <p>
      这个项目把一条学习路径做成了可以自己部署的 web app：大纲定考什么，参考材料讲概念，做题验效果。
      题库是一份 JSON，课程是自包含的 HTML，闪卡走 Anki 兼容的 SM-2 算法。
    </p>
    <p>
      不想装任何东西，先去 <a href="/ai-study-kit/demo/">在线 demo</a> 里答几道题；
      觉得有用，clone 仓库改掉示例主题，就是你在学的东西。
    </p>
  </div>
  <div class="ask-shot">
    <div class="ask-shot-bar"><i></i><i></i><i></i></div>
    <div class="ask-shot-body">
      <div class="ask-shot-tabs">
        <span class="on">答题</span><span>闪卡</span><span>课程</span><span>错题本</span>
      </div>
      <div class="ask-shot-q">git 中，工作区的修改要进入版本库，第一步是？</div>
      <div class="ask-shot-opt"><i></i>A. git push</div>
      <div class="ask-shot-opt ok"><i></i>B. git add ✓</div>
      <div class="ask-shot-opt"><i></i>C. git commit</div>
      <div class="ask-shot-ana">
        解析：工作区先 add 进暂存区，再 commit 进版本库，最后 push 到远端。三区模型是 git 的核心心智模型。
      </div>
    </div>
  </div>
</div>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>一个 app，五个学习产物</h2>
    <p>课讲的、题考的、卡记的，是同一套知识点</p>
  </div>
  <div class="ask-feats">
    <div class="ask-feat"><div class="ico">✅</div><b>答题</b><span>单选、多选、判断，提交即判分，多选要全对</span></div>
    <div class="ask-feat"><div class="ico">📖</div><b>课程</b><span>自包含 HTML 讲义，带 ASCII 示意图和提示框</span></div>
    <div class="ask-feat"><div class="ico">🎴</div><b>闪卡</b><span>核心概念做成卡片，正面提问，背面展开</span></div>
    <div class="ask-feat"><div class="ico">🔍</div><b>错题精讲</b><span>AI 把错题按考点聚类，逐个讲透</span></div>
    <div class="ask-feat"><div class="ico">⏱️</div><b>间隔重复</b><span>SM-2 算法排复习计划，到期自动排队</span></div>
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
    <table class="ask-compare">
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
    <h2>三条命令，浏览器里见</h2>
    <p>不配 AI 也能用，答题站和闪卡不依赖任何外部服务</p>
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
    <p>内置一套从真实学习实践里沉淀出来的方法论</p>
  </div>
  <div class="ask-flow">
    <span class="node">大纲定考什么</span><span class="arr">→</span>
    <span class="node">材料讲概念</span><span class="arr">→</span>
    <span class="node">做题验效果</span>
  </div>
  <p class="ask-more">
    <a href="/ai-study-kit/method/methodology/">看方法论的完整说明</a>
  </p>
</section>

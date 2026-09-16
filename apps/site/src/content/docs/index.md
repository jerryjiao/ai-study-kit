---
title: 开源 AI 学习教练：把任何要考的东西练到会
description: ai-study-kit 是开源 AI 学习教练：对 AI 说「我想学 X」，教练对齐考点、出题产课，带你把要考的东西练到会。不用先准备题库。MIT 协议、可自部署、不配 AI 也能用。
template: splash
hero:
  # H1 与 SERP title 同走「AI 教练 + 练到会」主张（2026-09-16 拍板：不做「刷题工具」定位）；题库/刷题等搜索词由 description 承载。
  # tagline 2026-09-16 二次定稿：叙事翻转「零准备」——「说一句就开学」是主句，收题/不配 AI 降为诚实事实（#75）。
  title: AI 教练带你练到会
  tagline: 对 AI 说一句「我想学 X」：教练先和你对齐考点，再出题、产课，带你一路练到会。不用先准备题库，错题按考点讲透，到期复习自动排队。免费开源，装个插件就能开始。
  image:
    html: |
      <div class="ask-hero-chat">
        <div class="ask-hero-chat-row user"><span>我想学 git 和 Linux 基础</span></div>
        <div class="ask-hero-chat-row coach"><span>好。考点已对齐——题目、卡片、课程都备好了，直接开练</span></div>
      </div>
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
      {"@type":"WebSite","name":"ai-study-kit","url":"https://aistudykit.dev/","inLanguage":"zh-CN","description":"开源 AI 学习教练：对 AI 说「我想学 X」，教练对齐考点、出题产课，带你把要考的东西练到会"},
      {"@type":"SoftwareApplication","name":"ai-study-kit","url":"https://aistudykit.dev/","applicationCategory":"EducationalApplication","operatingSystem":"Web","description":"把任意主题的题库变成完整学习闭环的开源脚手架：答题、课程、闪卡、错题精讲、间隔重复，进度可跨设备同步。","offers":{"@type":"Offer","price":0,"priceCurrency":"USD"},"license":"https://opensource.org/licenses/MIT","codeRepository":"https://github.com/jerryjiao/ai-study-kit","author":{"@type":"Organization","name":"ai-study-kit contributors"}},
      {"@type":"FAQPage","mainEntity":[
      {"@type":"Question","name":"ai-study-kit 免费吗？","acceptedAnswer":{"@type":"Answer","text":"免费。MIT 开源协议，代码与题库格式全部开放，无账号、无订阅、无遥测。"}},
      {"@type":"Question","name":"我没有题库怎么办？","acceptedAnswer":{"@type":"Answer","text":"直接开始就行。对 AI 说「我想学 X」，教练先和你对齐考点排布，然后照表产题、产卡、产课（用你自己的 API key）；自己整理的真题也支持按 JSON 格式录入。"}},
      {"@type":"Question","name":"支持哪些题型？","acceptedAnswer":{"@type":"Answer","text":"单选、多选、判断。多选必须全对才算对；题目是纯 JSON，不锁任何格式。"}},
      {"@type":"Question","name":"和 Anki 什么关系？","acceptedAnswer":{"@type":"Answer","text":"闪卡复习采用 Anki 兼容的 SM-2 算法（学习步、毕业、遗忘衰减同构），但本工具是刷题 + 课程 + 错题精讲的完整闭环，不是 Anki 插件。"}},
      {"@type":"Question","name":"错题精讲是怎么做的？","acceptedAnswer":{"@type":"Answer","text":"AI 把错题按考点聚类，逐个考点生成精讲页，顺带沉淀考点级错因档案，下一次复习直接点名弱项。"}},
      {"@type":"Question","name":"需要联网或服务器吗？数据存在哪？","acceptedAnswer":{"@type":"Answer","text":"不需要。pnpm dev 本地跑，答题和闪卡全在浏览器里；想跨设备同步时再部署一个小服务器。数据只有两处：本地模式存浏览器，自部署模式存你自己的服务器（一个 JSON 文件），不经任何第三方。"}},
      {"@type":"Question","name":"不配 AI 能用吗？","acceptedAnswer":{"@type":"Answer","text":"能。AI 生成是增量能力：只想要答题站 + 闪卡的话，不配 LLM、不跑任何命令，pnpm dev 就够用；题库、闪卡都是纯 JSON，手写永远可行。"}},
      {"@type":"Question","name":"能把学习内容做成播客听吗？","acceptedAnswer":{"@type":"Answer","text":"能。任一学习素材（课程、题目、错题精讲）都能合成男女双播音频，附带逐字稿；用你自己的 API key 生成，支持四语输出，通勤、运动时被动巩固。"}}
      ]}
      ]}
---

<section class="ask-section ask-install-section">
  <div class="ask-section-head">
    <h2>一句话安装，交给你的 AI</h2>
    <p>复制这句话发给 Claude Code、zcode、Cursor 等任意 AI 工具——它会装好教练和建站源码。装完对它说「我想学 X」，今天就能开练</p>
  </div>
  <div class="ask-install">
    <code>请根据 https://aistudykit.dev/install.md，安装 ai-study-kit</code>
    <button class="ask-copy" type="button" data-done="已复制 ✓">复制</button>
  </div>
  <script>
    (function () {
      var box = document.querySelector('.ask-install');
      var btn = box && box.querySelector('.ask-copy');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var text = box.querySelector('code').textContent.trim();
        var done = function () {
          var old = btn.textContent;
          btn.textContent = btn.dataset.done || '✓';
          btn.classList.add('done');
          setTimeout(function () { btn.textContent = old; btn.classList.remove('done'); }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, done);
        } else {
          var ta = document.createElement('textarea');
          ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); } catch (e) {}
          document.body.removeChild(ta); done();
        }
      });
    })();
  </script>
  <p class="ask-more">
    想自己敲命令？<a href="/get-started/">按工具安装矩阵</a> · 开发者想本地跑？clone 路线也在那
  </p>
</section>

<section class="ask-section ask-section--tint">
  <div class="ask-section-head">
    <h2>装完会发生什么</h2>
    <p>四步，从一句话到开练</p>
  </div>
  <div class="ask-steps">
    <div class="ask-step">
      <span class="num">01</span>
      <b>说想学什么</b>
      <span class="desc">对 AI 说「我想学 X」；手头有真题或考纲就一起给它，没有也行</span>
    </div>
    <div class="ask-step">
      <span class="num">02</span>
      <b>和你对考点</b>
      <span class="desc">教练先跟你定：考什么、考多深、出多少题，你确认了才动工</span>
    </div>
    <div class="ask-step">
      <span class="num">03</span>
      <b>生成全套材料</b>
      <span class="desc">题目、课程、闪卡围绕同一套考点，课里讲的题里就考</span>
    </div>
    <div class="ask-step">
      <span class="num">04</span>
      <b>练到会为止</b>
      <span class="desc">提交即判分，错题按考点精讲，复习到期自动排队</span>
    </div>
  </div>
  <p class="ask-more">
    以后每天敲 <code>/ask-coach</code>，教练扫一遍你的进度，推荐现在最该做的一件事 ·
    <a href="/ai/ai-study-kit/">看 /ask-coach 怎么用</a>
  </p>
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

<section class="ask-section ask-section--tint">
  <div class="ask-section-head">
    <h2>一个工具包，六个学习产物</h2>
    <p>课讲的、题考的、卡记的，是同一套知识点</p>
  </div>
  <div class="ask-feats">
    <div class="ask-feat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg></div><b>答题</b><span>单选、多选、判断，提交即判分，多选要全对</span></div>
    <div class="ask-feat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/></svg></div><b>课程</b><span>自包含 HTML 讲义，带示意图和提示框</span></div>
    <div class="ask-feat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/></svg></div><b>闪卡</b><span>核心概念做成卡片，正面提问，背面展开</span></div>
    <div class="ask-feat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg></div><b>错题精讲</b><span>AI 把错题按考点聚类，逐个讲透</span></div>
    <div class="ask-feat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg></div><b>间隔重复</b><span>SM-2 算法排复习计划，到期自动排队</span></div>
    <div class="ask-feat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg></div><b>播客</b><span>任一学习素材合成男女双播音频，通勤路上听</span></div>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>这是给谁用的</h2>
    <p>项目自带一个 git 和 Linux 的示例主题，正式使用时换成你自己在学的东西</p>
  </div>
  <div class="ask-compare-wrap">
    <table class="ask-compare">
      <tr><th>你在做什么</th><th>合不合适</th></tr>
      <tr><td>开发者学新技术，比如 React 或 K8s</td><td class="y">✅ AI 把文档要点抽成题，刷题加闪卡巩固</td></tr>
      <tr><td>学生复习，考研或资格证</td><td class="y">✅ 有真题就录进去，没真题让 AI 按考点出</td></tr>
      <tr><td>准备面试</td><td class="y">✅ 说一句要面什么，AI 产课、产题、带你串错题</td></tr>
      <tr><td>学任何有考点的东西，合规、流程、术语</td><td class="y">✅ 能拆成问答就能学</td></tr>
      <tr><td>只想要一套现成题库</td><td>❌ 本工具不含真题——不过 AI 可以按你的考点现出一套</td></tr>
    </table>
  </div>
</section>

<section class="ask-section ask-section--tint">
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
    <h2>支持哪些 AI CLI</h2>
    <p>三家实测安装，五家经 Agent Plugins 开放标准兼容</p>
  </div>
  <div class="ask-wall">
    <div class="ask-wall-tile b-claude"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"/></svg></span><span class="name">Claude Code</span></div>
    <div class="ask-wall-tile b-text"><span class="logo zmark">zcode</span><span class="name">zcode</span></div>
    <div class="ask-wall-tile b-text"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg></span><span class="name">Codex</span></div>
    <div class="ask-wall-tile b-text"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="m415.035 156.35-151.503-87.4695c-4.865-2.8094-10.868-2.8094-15.733 0l-151.4969 87.4695c-4.0897 2.362-6.6146 6.729-6.6146 11.459v176.383c0 4.73 2.5249 9.097 6.6146 11.458l151.5039 87.47c4.865 2.809 10.868 2.809 15.733 0l151.504-87.47c4.089-2.361 6.614-6.728 6.614-11.458v-176.383c0-4.73-2.525-9.097-6.614-11.459zm-9.516 18.528-146.255 253.32c-.988 1.707-3.599 1.01-3.599-.967v-165.872c0-3.314-1.771-6.379-4.644-8.044l-143.645-82.932c-1.707-.988-1.01-3.599.968-3.599h292.509c4.154 0 6.75 4.503 4.673 8.101h-.007z"/></svg></span><span class="name">Cursor</span><span class="chip">标准兼容</span></div>
    <div class="ask-wall-tile b-text"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M24 22.525H0l12-21.05 12 21.05z"/></svg></span><span class="name">Vercel</span><span class="chip">标准兼容</span></div>
    <div class="ask-wall-tile b-text"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg></span><span class="name">GitHub</span><span class="chip">标准兼容</span></div>
    <div class="ask-wall-tile b-aws"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 304 182">
  <path fill="currentColor" d="M86.4,66.4c0,3.7,0.4,6.7,1.1,8.9c0.8,2.2,1.8,4.6,3.2,7.2c0.5,0.8,0.7,1.6,0.7,2.3c0,1-0.6,2-1.9,3l-6.3,4.2 c-0.9,0.6-1.8,0.9-2.6,0.9c-1,0-2-0.5-3-1.4C76.2,90,75,88.4,74,86.8c-1-1.7-2-3.6-3.1-5.9c-7.8,9.2-17.6,13.8-29.4,13.8 c-8.4,0-15.1-2.4-20-7.2c-4.9-4.8-7.4-11.2-7.4-19.2c0-8.5,3-15.4,9.1-20.6c6.1-5.2,14.2-7.8,24.5-7.8c3.4,0,6.9,0.3,10.6,0.8 c3.7,0.5,7.5,1.3,11.5,2.2v-7.3c0-7.6-1.6-12.9-4.7-16c-3.2-3.1-8.6-4.6-16.3-4.6c-3.5,0-7.1,0.4-10.8,1.3c-3.7,0.9-7.3,2-10.8,3.4 c-1.6,0.7-2.8,1.1-3.5,1.3c-0.7,0.2-1.2,0.3-1.6,0.3c-1.4,0-2.1-1-2.1-3.1v-4.9c0-1.6,0.2-2.8,0.7-3.5c0.5-0.7,1.4-1.4,2.8-2.1 c3.5-1.8,7.7-3.3,12.6-4.5c4.9-1.3,10.1-1.9,15.6-1.9c11.9,0,20.6,2.7,26.2,8.1c5.5,5.4,8.3,13.6,8.3,24.6V66.4z M45.8,81.6 c3.3,0,6.7-0.6,10.3-1.8c3.6-1.2,6.8-3.4,9.5-6.4c1.6-1.9,2.8-4,3.4-6.4c0.6-2.4,1-5.3,1-8.7v-4.2c-2.9-0.7-6-1.3-9.2-1.7 c-3.2-0.4-6.3-0.6-9.4-0.6c-6.7,0-11.6,1.3-14.9,4c-3.3,2.7-4.9,6.5-4.9,11.5c0,4.7,1.2,8.2,3.7,10.6 C37.7,80.4,41.2,81.6,45.8,81.6z M126.1,92.4c-1.8,0-3-0.3-3.8-1c-0.8-0.6-1.5-2-2.1-3.9L96.7,10.2c-0.6-2-0.9-3.3-0.9-4 c0-1.6,0.8-2.5,2.4-2.5h9.8c1.9,0,3.2,0.3,3.9,1c0.8,0.6,1.4,2,2,3.9l16.8,66.2l15.6-66.2c0.5-2,1.1-3.3,1.9-3.9c0.8-0.6,2.2-1,4-1 h8c1.9,0,3.2,0.3,4,1c0.8,0.6,1.5,2,1.9,3.9l15.8,67l17.3-67c0.6-2,1.3-3.3,2-3.9c0.8-0.6,2.1-1,3.9-1h9.3c1.6,0,2.5,0.8,2.5,2.5 c0,0.5-0.1,1-0.2,1.6c-0.1,0.6-0.3,1.4-0.7,2.5l-24.1,77.3c-0.6,2-1.3,3.3-2.1,3.9c-0.8,0.7-2.2,1-3.8,1h-8.6c-1.9,0-3.2-0.3-4-1 c-0.8-0.7-1.5-2-1.9-4L156,23l-15.4,64.4c-0.5,2-1.1,3.3-1.9,4c-0.8,0.7-2.2,1-3.8,1H126.1z M254.6,95.1c-5.2,0-10.4-0.6-15.4-1.8 c-5-1.2-8.9-2.5-11.5-4c-1.6-0.9-2.7-1.9-3.1-2.8c-0.4-0.9-0.6-1.9-0.6-2.8v-5.1c0-2.1,0.8-3.1,2.3-3.1c0.6,0,1.2,0.1,1.8,0.3 c0.6,0.2,1.5,0.6,2.5,1c3.4,1.5,7.1,2.7,11,3.5c4,0.8,7.9,1.2,11.9,1.2c6.3,0,11.2-1.1,14.6-3.3c3.4-2.2,5.2-5.4,5.2-9.5 c0-2.8-0.9-5.1-2.7-7c-1.8-1.9-5.2-3.6-10.1-5.2L246,52c-7.3-2.3-12.7-5.7-16-10.2c-3.3-4.4-5-9.3-5-14.5c0-4.2,0.9-7.9,2.7-11.1 c1.8-3.2,4.2-6,7.2-8.2c3-2.3,6.4-4,10.4-5.2c4-1.2,8.2-1.7,12.6-1.7c2.2,0,4.5,0.1,6.7,0.4c2.3,0.3,4.4,0.7,6.5,1.1 c2,0.5,3.9,1,5.7,1.6c1.8,0.6,3.2,1.2,4.2,1.8c1.4,0.8,2.4,1.6,3,2.5c0.6,0.8,0.9,1.9,0.9,3.3v4.7c0,2.1-0.8,3.2-2.3,3.2 c-0.8,0-2.1-0.4-3.8-1.2c-5.7-2.6-12.1-3.9-19.2-3.9c-5.7,0-10.2,0.9-13.3,2.8c-3.1,1.9-4.7,4.8-4.7,8.9c0,2.8,1,5.2,3,7.1 c2,1.9,5.7,3.8,11,5.5l14.2,4.5c7.2,2.3,12.4,5.5,15.5,9.6c3.1,4.1,4.6,8.8,4.6,14c0,4.3-0.9,8.2-2.6,11.6 c-1.8,3.4-4.2,6.4-7.3,8.8c-3.1,2.5-6.8,4.3-11.1,5.6C264.4,94.4,259.7,95.1,254.6,95.1z"/>
  <path fill="var(--aws-smile, currentColor)" d="M273.5,143.7c-32.9,24.3-80.7,37.2-121.8,37.2c-57.6,0-109.5-21.3-148.7-56.7c-3.1-2.8-0.3-6.6,3.4-4.4 c42.4,24.6,94.7,39.5,148.8,39.5c36.5,0,76.6-7.6,113.5-23.2C274.2,133.6,278.9,139.7,273.5,143.7z"/>
</svg></span><span class="name">AWS</span><span class="chip">标准兼容</span></div>
    <div class="ask-wall-tile b-ms"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="1 1 22 22">
  <path fill="var(--ms-c1, currentColor)" d="M1 1h10v10H1z"/>
  <path fill="var(--ms-c2, currentColor)" d="M12 1h10v10H12z"/>
  <path fill="var(--ms-c3, currentColor)" d="M1 12h10v10H1z"/>
  <path fill="var(--ms-c4, currentColor)" d="M12 12h10v10H12z"/>
</svg></span><span class="name">Microsoft</span><span class="chip">标准兼容</span></div>
  </div>
  <p class="ask-wall-foot">以及其他支持 Agent Plugins 标准或 skills 目录的 AI CLI</p>
</section>

<section class="ask-section ask-section--tint">
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
      <p>直接开始就行。对 AI 说「我想学 X」，教练先和你对齐考点排布，然后照表产题、产卡、产课（用你自己的 API key）；自己整理的真题也支持按 JSON 格式录入。</p>
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
      <summary>不配 AI 能用吗？</summary>
      <p>能。AI 生成是增量能力：只想要答题站 + 闪卡的话，不配 LLM、不跑任何命令，pnpm dev 就够用；题库、闪卡都是纯 JSON，手写永远可行。</p>
    </details>
    <details>
      <summary>能把学习内容做成播客听吗？</summary>
      <p>能。任一学习素材（课程、题目、错题精讲）都能合成男女双播音频，附带逐字稿；用你自己的 API key 生成，支持四语输出，通勤、运动时被动巩固。</p>
    </details>
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
    <a href="/method/methodology/">看方法论的完整说明</a>
  </p>
</section>

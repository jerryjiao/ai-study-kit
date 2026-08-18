# ai-study-kit

把任意主题的题库变成完整学习闭环的开源脚手架：答题、课程、闪卡、错题精讲、间隔重复，进度可跨设备同步。

## Language

**demo（试用站）**:
官网子路径下托管的全功能静态 quiz-app 实例，访客不 clone 仓库即可完整体验；进度绑定单个浏览器，无跨设备同步。
_Avoid_: 演示版、线上版、playground

**本地模式**:
进度 API 不可达时 app 自动进入的形态：进度只存本浏览器、不写服务器，界面明示当前处于该状态。由启动探测自动进入，不是用户手动开关。
_Avoid_: 离线模式、游客模式

**同步模式**:
app 连接进度后端时的默认形态：服务器是进度的唯一权威源，浏览器存储仅作缓存，多端按提交时间合并。
_Avoid_: 在线模式、云同步

**考点排布表**:
MISSION.md 的「## 考点排布表」节——`考点id(EP-NN) | 考点 | 深度 | 题型×题量 | day | 闪卡数` 六列机器可读表。四对齐校验的契约源：考点覆盖、题量/题型/day/闪卡数对账都读它；大纲唯一权威的落盘形态，产题照它直产。
_Avoid_: quiz-spec、题库规格文件（独立文件形态已被 ADR-0001 否决）

**skill（vs CLI）**:
skill 指装进 agent 环境、给 AI 执行的指令包——仓库内只有 `/study-coach` 一个。CLI 指仓库 `apps/quiz-app/scripts/` 下的可执行脚本（teach-generate / grill-wrong / podcast-generate）。两类东西，不混称。
_Avoid_: 把 CLI 叫 skill（旧文档的混称，已纠正）

**主题（theme）**:
`examples/<theme>/` 下的一套完整学习内容包（MISSION / RESOURCES / questions / flashcards / lessons / wrong-questions）。仓库同一时刻只激活一个主题（`EXAMPLE_THEME`，默认 dev-intro）。
_Avoid_: 示例（示例主题特指 dev-intro；用户建的主题不是示例）

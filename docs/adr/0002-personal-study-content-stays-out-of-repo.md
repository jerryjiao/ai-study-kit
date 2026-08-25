---
status: accepted
date: 2026-08-25
---

# 0002 · 个人学习主题内容不入公开仓库，示例只留 dev-intro

`examples/` 的定位是套件的演示载体，不是用户的个人数据盘。软件设计师认证学习主题（`examples/software-designer/`）内容含第三方版权题源（真题 OCR 图片、真题文本），且属个人使用数据而非套件功能——两者都不该出现在开源仓库。我们决定：**该目录从 git 跟踪中移除并加入 .gitignore，目录原地保留在磁盘（内容源、部署构建输入不变）；仓库示例只留 `dev-intro`**。既有历史中已提交的该目录内容用 `git filter-repo` 全量抽除后 force push，不保留历史残留。

## Considered Options

- **只停增量，历史保留**——否决：历史里仍可完整取到全部内容，与「不入公开仓库」的目的相悖；且本仓库唯一维护者自担操作成本，清洗可行。
- **目录物理挪出仓库**——否决：sync-examples、部署构建、课程管线全部以 `examples/<theme>/` 为路径契约，挪动牵连过广；git 层面 untrack 与挪出等效（克隆者均不可见）。

## Consequences

- 全部 commit hash 重写，既有 clone（含部署机）历史分叉，需 `fetch + reset --hard` 重新对齐——部署机磁盘上的该目录是内容源，必须先备份再对齐。
- tag 重打、GitHub release 随新 tag 重锚。
- 克隆本仓库者只有 `dev-intro` 可玩；`examples/software-designer/` 属于本地/部署环境的私有内容，`.gitignore` 规则即此约定的机器可读形式。
- 新个人主题一律照此模式处理：目录放 `examples/` 下可（路径契约不变），但必须 gitignore。

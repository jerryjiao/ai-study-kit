# Bidirectional Check · 双向校验脚本

四对齐原则要能自动验证才有约束力。仓库内置 [`scripts/bidirectional-check.py`](https://github.com/jerryjiao/ai-study-kit/blob/main/scripts/bidirectional-check.py)，把「题 → 课」「大纲 → 题」「闪卡覆盖」三个方向做成一条命令。语义级的「课讲错了」仍靠人工核对（规则见 [`four-alignment.md`](./four-alignment.md)）。

---

## 快速使用

```bash
pnpm run check:alignment                          # 仓库根执行，默认扫 examples/dev-intro/
pnpm run check:alignment -- examples/my-topic/    # 扫指定主题

# 或直接跑 Python
python3 scripts/bidirectional-check.py examples/my-topic/
```

**退出码**：`0` = 全绿（△ 略提算警告，不拦截）；`1` = 存在 ✗（未讲 / 未覆盖 / 对账不符）；`2` = 主题目录不存在。可以直接挂进 CI / 脚本当门。

输出示例（契约模式）：

```
扫描主题: examples/dev-intro
  题数: 10 / 闪卡: 4 / 课程文件: ['git-basics.html', 'linux-basics.html']
  考点排布表: 4 个考点（契约模式）

方向 1 · 题 → 课
  ✓ 暂存区: 课程 14 次命中
方向 2 · 大纲 → 题（排布表对账）
  ✓ EP-01 暂存区: single×3, multi×1, judge×1 共 5 题，day D1 一致
  ✓ 闪卡数对账: 表合计 = 实际 = 4 张
方向 3 · 闪卡覆盖
  ✓ 暂存区: 闪卡已覆盖
  ○ 相对路径: 排布表声明 0 卡（了解级不配卡），跳过

结论: 全绿（△ 为略提警告，不算失败）
```

---

## 契约模式：考点排布表

主题 MISSION.md 带「## 考点排布表」节时走契约模式——考点来自表，不再用内置关键词，**换主题不需要改脚本**：

```markdown
## 考点排布表

| 考点id | 考点 | 深度 | 题型×题量 | day | 闪卡数 |
|--------|------|------|-----------|-----|--------|
| EP-01 | 暂存区 | 掌握 | single×3, multi×1, judge×1 | D1 | 1 |
```

- **考点列填核心关键词**：方向 1/3 按它做子串匹配（课程正文去空格计数、闪卡 front/back/topic），所以要是会出现在课程和题干里的词。
- **深度**：掌握 / 理解 / 了解，人工参考，不参与机器判定。
- **闪卡数 0 = 大纲声明不配卡**：方向 3 跳过该考点（了解级常见）；所有行的闪卡数合计必须等于 flashcards.json 实际张数。

契约模式的判定规则：

- **方向 1（题 → 课）**：每个考点的关键词在课程 HTML（去空格）里命中 ≥3 次算覆盖；1-2 次 △ 略提；0 次 ✗ 必须补讲。
- **方向 2（大纲 → 题，对账）**：题的 `examPoint` 填了不存在的考点 id ✗；漏标只 △ 提醒、该题不参与对账（字段本身不强制，但契约模式建议每题都标）。每个考点的实际题数、题型分布必须等于「题型×题量」列；题的 `day` 必须等于该考点行的 day；闪卡数合计对账。任何不符 ✗。
- **方向 3（闪卡覆盖）**：闪卡数 ≥1 的考点，关键词须在任一闪卡的 front / back / topic 里命中。

---

## 回退模式（无排布表）

MISSION.md 没有排布表的主题回退到高频词扫描：脚本从题干 + 解析里统计**内置关键词**（dev-intro 的 git/Linux 考点词）出现 ≥3 次的概念，再做方向 1/3，并打 ⚠ 告警。老主题不受影响，但建议补排布表——回退模式没有方向 2 对账，考点词也是 dev-intro 的。

---

## 何时跑

任何一处产物变动后必跑（详见 [`four-alignment.md`](./four-alignment.md) 的"什么时候跑校验"）：

1. 生成新课程后
2. 改题的 examPoint / day / 题量后
3. 改 flashcards.json 后
4. grill CLI 跑完一批错题精讲后

---

## 脚本局限

脚本只做**粗粒度扫描**，不能替代人工审阅。它能抓"课程完全没讲 X""题量与大纲不符"这种硬漏洞，抓不到"课程讲了 X 但讲错了"，也抓不到"题和课用同一个词但不是同一个意思"。把它当**第一道防线**，复杂的语义对齐仍需主题作者自己判断。

契约的黑盒测试在 `apps/quiz-app/scripts/lib/bidirectional-contract.test.mjs`（三套 fixture 主题：带表对账正确 / 无表回退 / 对账不符拦截），`pnpm test` 自动跑到。

源码以仓库 [`scripts/bidirectional-check.py`](https://github.com/jerryjiao/ai-study-kit/blob/main/scripts/bidirectional-check.py) 为准。

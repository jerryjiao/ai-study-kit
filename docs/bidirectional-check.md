# Bidirectional Check · 双向校验脚本

四对齐原则要能自动验证才有约束力。仓库内置 [`scripts/bidirectional-check.py`](https://github.com/jerryjiao/ai-study-kit/blob/main/scripts/bidirectional-check.py)，把「题 → 课」和「闪卡覆盖」两个方向做成一条命令。「课 → 题」方向需要主题特定的语义判断，脚本暂不覆盖，靠人工核对（规则见 [`four-alignment.md`](./four-alignment.md)）。

---

## 快速使用

```bash
pnpm run check:alignment                          # 仓库根执行，默认扫 examples/dev-intro/
pnpm run check:alignment -- examples/my-topic/    # 扫指定主题

# 或直接跑 Python
python3 scripts/bidirectional-check.py examples/my-topic/
```

输出示例：

```
扫描主题: examples/dev-intro
  题数: 10
  闪卡: 4
  课程文件: ['git-basics.html', 'linux-basics.html']
  高频考点（≥3 次）: ['git', 'commit', 'chmod', '权限', '暂存区', ...]

方向 1 · 题 → 课
  ✓ git: 课程 18 次命中
  ✓ commit: 课程 6 次命中
  ✓ chmod: 课程 12 次命中
  ...

方向 3 · 闪卡覆盖
  ✓ git: 闪卡已覆盖
  ✓ commit: 闪卡已覆盖
  ...
```

---

## 判定规则

- **方向 1（题 → 课）**：脚本从题干 + 解析里统计考点词出现次数（≥3 次算高频考点），再到课程 HTML（去空格）里数命中次数——≥3 次覆盖，1-2 次略提要补讲，0 次未讲必须补。
- **方向 3（闪卡覆盖）**：高频考点词在任一闪卡的 front / back / topic 里命中，即算已覆盖。

---

## 自定义关键词

考点词不是脚本自动学的，`high_freq_concepts()` 里内置的关键词表是 dev-intro（git + Linux）主题的。**换主题必须换关键词列表**：

- K8s 主题：`deployment` / `service` / `pod` / `ingress` / `configmap` 等
- React 主题：`hook` / `useEffect` / `state` / `props` 等
- 英文单词：不用关键词扫描，直接用 word list

关键词表写在脚本顶部的 `high_freq_concepts()` 函数里，也可以抽成单独的 `keywords.json` 方便持续维护。

---

## 何时跑

任何一处产物变动后必跑（详见 [`four-alignment.md`](./four-alignment.md) 的"什么时候跑校验"）：

1. 生成新课程后
2. 改题的 topic / day 分组后
3. 改 flashcards.json 后
4. grill CLI 跑完一批错题精讲后

---

## 脚本局限

脚本只做**粗粒度扫描**，不能替代人工审阅。它能抓"课程完全没讲 X"这种硬漏洞，抓不到"课程讲了 X 但讲错了"，也抓不到"题和课用同一个词但不是同一个意思"。把它当**第一道防线**，复杂的语义对齐仍需主题作者自己判断。

源码以仓库 [`scripts/bidirectional-check.py`](https://github.com/jerryjiao/ai-study-kit/blob/main/scripts/bidirectional-check.py) 为准。

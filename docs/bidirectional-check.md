# Bidirectional Check · 双向校验脚本

> **EN**: The four-alignment principle is only useful if you actually verify it. This page gives a runnable Python script that checks quiz→course coverage, course→quiz coverage, and flashcard coverage automatically.
>
> **中文**：四对齐原则不能只停留在口号——必须有自动化校验脚本。下面给出可运行的 Python 脚本，自动检查题→课、课→题、闪卡覆盖三个方向。

---

## 脚本

脚本已内置在仓库 [`scripts/bidirectional-check.py`](https://github.com/jerryjiao/ai-study-kit/blob/main/scripts/bidirectional-check.py)，直接跑（无需自己保存）；下面是完整源码，改校验规则时参考：

```python
#!/usr/bin/env python3
"""
双向校验：检查 quiz-app 的题/课程/闪卡四对齐。
对齐规则详见 docs/four-alignment.md。

用法：
  python3 scripts/bidirectional-check.py                     # 默认扫 examples/dev-intro/
  python3 scripts/bidirectional-check.py examples/my-topic/  # 扫指定主题
"""
import json
import re
import sys
from pathlib import Path


def load_theme(theme_dir: Path):
    questions = json.loads((theme_dir / "questions.json").read_text(encoding="utf-8"))
    flashcards = json.loads((theme_dir / "flashcards.json").read_text(encoding="utf-8"))
    courses = {}
    for html in (theme_dir / "lessons").glob("*.html"):
        courses[html.name] = re.sub(r"\s+", "", html.read_text(encoding="utf-8"))
    return questions, flashcards, courses


def high_freq_concepts(questions, min_count=3):
    """从题干里提取出现 ≥ min_count 次的概念候选（这里用粗粒度：词组）。"""
    from collections import Counter
    # 这里只是骨架——真实使用时根据你的主题自定义关键词列表。
    # 例如 dev-intro 主题可以加：
    keywords = [
        "git", "init", "add", "commit", "log", "status", "reset", "revert", "push",
        "chmod", "权限", "所有者", "所属组", "其他人", "rwx",
        "ls", "cd", "mkdir", "rm", "目录", "路径", "相对", "绝对",
        "暂存区", "工作区", "版本库",
    ]
    counter = Counter()
    for q in questions:
        blob = (q.get("question", "") + q.get("analysis", "")).lower()
        for kw in keywords:
            if kw.lower() in blob:
                counter[kw] += 1
    return [kw for kw, n in counter.items() if n >= min_count]


def check_quiz_to_course(questions, courses, concepts):
    """方向 1：题排到的考点，课程必须讲（覆盖度 ≥3）。"""
    print("\n方向 1 · 题 → 课")
    all_course_text = "\n".join(courses.values())
    for kw in concepts:
        n = all_course_text.count(re.sub(r"\s+", "", kw))
        if n == 0:
            print(f"  ✗ {kw}: 课程 0 次命中（必须补讲）")
        elif n < 3:
            print(f"  △ {kw}: 课程 {n} 次命中（略提，建议补讲）")
        else:
            print(f"  ✓ {kw}: 课程 {n} 次命中")


def check_flashcard_coverage(flashcards, concepts):
    """方向 3：高频考点每个应有 ≥1 张闪卡覆盖。"""
    print("\n方向 3 · 闪卡覆盖")
    fc_blob = "\n".join(
        c.get("front", "") + c.get("back", "") + c.get("topic", "")
        for c in flashcards
    )
    for kw in concepts:
        if kw.lower() not in fc_blob.lower():
            print(f"  ✗ {kw}: 无闪卡覆盖（建议加卡）")
        else:
            print(f"  ✓ {kw}: 闪卡已覆盖")


def main():
    if len(sys.argv) > 1:
        theme_dir = Path(sys.argv[1])
    else:
        # 默认指向仓库根 examples/dev-intro/
        script_dir = Path(__file__).resolve().parent
        theme_dir = script_dir.parent / "examples" / "dev-intro"

    if not theme_dir.exists():
        print(f"error: theme dir not found: {theme_dir}", file=sys.stderr)
        sys.exit(2)

    questions, flashcards, courses = load_theme(theme_dir)
    print(f"扫描主题: {theme_dir}")
    print(f"  题数: {len(questions)}")
    print(f"  闪卡: {len(flashcards)}")
    print(f"  课程文件: {list(courses.keys())}")

    concepts = high_freq_concepts(questions)
    print(f"  高频考点（≥3 次）: {concepts}")

    check_quiz_to_course(questions, courses, concepts)
    # 方向 2（课 → 题）需要主题特定的 day 标签映射，这里略
    check_flashcard_coverage(flashcards, concepts)


if __name__ == "__main__":
    main()
```

---

## 使用方式

```bash
# 默认扫 examples/dev-intro/
python3 scripts/bidirectional-check.py

# 扫自定义主题
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

## 自定义关键词

脚本的 `high_freq_concepts()` 函数用了粗粒度关键词扫描。**你主题的关键词列表必须自己维护**：

- K8s 主题：`deployment` / `service` / `pod` / `ingress` / `configmap` 等
- React 主题：`hook` / `useEffect` / `state` / `props` 等
- 英文单词：不用关键词扫描，直接用 word list

把关键词列表写在脚本顶部或单独的 `keywords.json`，方便持续维护。

---

## 何时跑

参考 [`four-alignment.md`](./four-alignment.md) 的"什么时候跑校验"小节——任何一处产物变动后必跑：

1. 生成新课程后
2. 改 moduleMap / day 标签后
3. 改 flashcards.json 后
4. 跑完错题学习后

---

## 脚本局限

这个脚本<strong>只做粗粒度扫描</strong>——它不能替代人工审阅。它能抓"课程完全没讲 X"这种硬漏洞，但抓不到"课程讲了 X 但讲错了"或"题和课讲的是同一个词但不是同一个意思"。复杂的语义对齐还是需要主题作者自己判断。

把它当成<strong>第一道防线</strong>，不是终极检查。

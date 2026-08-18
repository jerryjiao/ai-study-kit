#!/usr/bin/env python3
"""
双向校验：检查 quiz-app 的题/课程/闪卡四对齐。
对齐规则详见 docs/four-alignment.md，脚本说明详见 docs/bidirectional-check.md。

用法：
  python3 scripts/bidirectional-check.py                     # 默认扫 examples/dev-intro/
  python3 scripts/bidirectional-check.py examples/my-topic/  # 扫指定主题

退出码：0 = 全绿（△ 略提算警告，不拦截）；1 = 存在 ✗（未讲 / 未覆盖 / 排布表对账不符）；
        2 = 主题目录不存在。

契约模式：MISSION.md 带「## 考点排布表」节时，考点来自排布表，并追加
  「大纲 → 题」对账（题量 / 题型 / day / 闪卡数）。
回退模式：无排布表的主题退回高频词扫描（keywords 内置 dev-intro 考点词）并打告警——
  建议给主题补排布表，契约化后换主题不再改脚本。
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

BLUEPRINT_HEADING = "## 考点排布表"
BLUEPRINT_HEADERS = ["考点id", "考点", "深度", "题型×题量", "day", "闪卡数"]
TYPES = ("single", "multi", "judge")


def load_theme(theme_dir: Path):
    questions = json.loads((theme_dir / "questions.json").read_text(encoding="utf-8"))
    flashcards = json.loads((theme_dir / "flashcards.json").read_text(encoding="utf-8"))
    courses = {}
    for html in (theme_dir / "lessons").glob("*.html"):
        courses[html.name] = re.sub(r"\s+", "", html.read_text(encoding="utf-8"))
    return questions, flashcards, courses


def parse_blueprint(mission_path: Path):
    """解析 MISSION.md 的考点排布表；无该节返回 None，表存在但坏则抛 ValueError。"""
    if not mission_path.exists():
        return None
    lines = mission_path.read_text(encoding="utf-8").splitlines()
    try:
        start = next(i for i, ln in enumerate(lines) if ln.strip() == BLUEPRINT_HEADING)
    except StopIteration:
        return None

    table_lines = []
    for ln in lines[start + 1:]:
        if ln.strip().startswith("|"):
            table_lines.append(ln)
        elif table_lines:
            break  # 表格已开始，遇到非表行即止——后面其他小节的表不属于排布表
        # 表格开始前的空行/导语跳过
    if not table_lines:
        raise ValueError(f"{BLUEPRINT_HEADING} 节下没有找到表格")

    header = [c.strip() for c in table_lines[0].strip().strip("|").split("|")]
    if not all(h in header for h in BLUEPRINT_HEADERS):
        raise ValueError(
            f"排布表表头缺列：需要 {' | '.join(BLUEPRINT_HEADERS)}，实际 {' | '.join(header)}"
        )
    col = {h: header.index(h) for h in BLUEPRINT_HEADERS}

    rows = []
    for ln in table_lines[1:]:
        if not re.sub(r"[|\-\s:]", "", ln):  # 分隔行
            continue
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        if len(cells) != len(header):
            raise ValueError(f"排布表行列数不齐：{ln.strip()}")
        plan = []
        for item in re.split(r"[,，]", cells[col["题型×题量"]]):
            m = re.fullmatch(r"(single|multi|judge)\s*[×x]\s*(\d+)", item.strip())
            if not m:
                raise ValueError(
                    f"题型×题量格式不合法：{item.strip()}（应为 single×2, judge×1 形式）"
                )
            plan.append((m.group(1), int(m.group(2))))
        rows.append({
            "ep": cells[col["考点id"]],
            "kw": cells[col["考点"]],
            "depth": cells[col["深度"]],
            "plan": plan,
            "day": cells[col["day"]],
            "fc": int(cells[col["闪卡数"]]),
        })
    if not rows:
        raise ValueError("排布表没有数据行")
    return rows


def high_freq_concepts(questions, min_count=3):
    """回退模式：从题干里统计内置关键词（dev-intro 考点词）出现 ≥ min_count 次的概念。"""
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


def check_quiz_to_course(courses, concepts):
    """方向 1：题排到的考点，课程必须讲（覆盖度 ≥3）。返回 ✗ 数。"""
    print("\n方向 1 · 题 → 课")
    all_course_text = "\n".join(courses.values())
    fails = 0
    for kw in concepts:
        n = all_course_text.count(re.sub(r"\s+", "", kw))
        if n == 0:
            print(f"  ✗ {kw}: 课程 0 次命中（必须补讲）")
            fails += 1
        elif n < 3:
            print(f"  △ {kw}: 课程 {n} 次命中（略提，建议补讲）")
        else:
            print(f"  ✓ {kw}: 课程 {n} 次命中")
    return fails


def check_blueprint_alignment(questions, flashcards, rows):
    """方向 2：大纲 → 题对账（题量 / 题型 / day / 闪卡数）。返回 ✗ 数。"""
    print("\n方向 2 · 大纲 → 题（排布表对账）")
    fails = 0
    known_eps = {row["ep"] for row in rows}

    for q in questions:
        ep = q.get("examPoint")
        if ep and ep not in known_eps:
            print(f"  ✗ {q.get('id')}: examPoint {ep} 不在排布表（拼写错误或表缺行）")
            fails += 1
        elif not ep:
            print(f"  △ {q.get('id')}: 未标 examPoint，不参与对账（契约模式建议每题都标）")

    for row in rows:
        qs_ep = [q for q in questions if q.get("examPoint") == row["ep"]]
        issues = []
        if not qs_ep:
            issues.append("无对应题")
        by_type = Counter(q.get("type", "?") for q in qs_ep)
        for t, n in row["plan"]:
            actual = by_type.get(t, 0)
            if actual != n:
                issues.append(f"{t} 计划 {n} 实际 {actual}")
        plan_types = dict(row["plan"])
        for t, actual in by_type.items():
            if t not in plan_types and actual:
                issues.append(f"{t} 不在表的计划里但出现 {actual} 题")
        bad_day = [q.get("id") for q in qs_ep if str(q.get("day", "")) != row["day"]]
        if bad_day:
            issues.append(f"day 与表 {row['day']} 不符：{', '.join(map(str, bad_day))}")

        if issues:
            print(f"  ✗ {row['ep']} {row['kw']}: " + "；".join(issues))
            fails += 1
        else:
            plan_text = ", ".join(f"{t}×{n}" for t, n in row["plan"])
            print(f"  ✓ {row['ep']} {row['kw']}: {plan_text} 共 {len(qs_ep)} 题，day {row['day']} 一致")

    fc_plan = sum(row["fc"] for row in rows)
    if fc_plan != len(flashcards):
        print(f"  ✗ 闪卡数对账: 表合计 {fc_plan}，实际 {len(flashcards)} 张")
        fails += 1
    else:
        print(f"  ✓ 闪卡数对账: 表合计 = 实际 = {len(flashcards)} 张")
    return fails


def check_flashcard_coverage(flashcards, coverage_items):
    """方向 3：考点应有 ≥1 张闪卡覆盖。coverage_items 为 (考点词, 是否声明 0 卡) 列表。"""
    print("\n方向 3 · 闪卡覆盖")
    fc_blob = "\n".join(
        c.get("front", "") + c.get("back", "") + c.get("topic", "")
        for c in flashcards
    )
    fails = 0
    for kw, declared_zero in coverage_items:
        if declared_zero:
            print(f"  ○ {kw}: 排布表声明 0 卡（了解级不配卡），跳过")
        elif kw.lower() not in fc_blob.lower():
            print(f"  ✗ {kw}: 无闪卡覆盖（建议加卡，或在排布表声明 0 卡）")
            fails += 1
        else:
            print(f"  ✓ {kw}: 闪卡已覆盖")
    return fails


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

    try:
        rows = parse_blueprint(theme_dir / "MISSION.md")
    except ValueError as e:
        print(f"  ✗ 排布表解析失败: {e}")
        sys.exit(1)

    fails = 0
    if rows:
        print(f"  考点排布表: {len(rows)} 个考点（契约模式）")
        concepts = [row["kw"] for row in rows]
        fails += check_quiz_to_course(courses, concepts)
        fails += check_blueprint_alignment(questions, flashcards, rows)
        fails += check_flashcard_coverage(flashcards, [(row["kw"], row["fc"] == 0) for row in rows])
    else:
        print("  ⚠ 未找到考点排布表（MISSION.md 的「## 考点排布表」节）——回退高频词模式")
        concepts = high_freq_concepts(questions)
        print(f"  高频考点（≥3 次）: {concepts}")
        fails += check_quiz_to_course(courses, concepts)
        fails += check_flashcard_coverage(flashcards, [(kw, False) for kw in concepts])

    if fails:
        print(f"\n结论: ✗ {fails} 处未对齐")
        sys.exit(1)
    print("\n结论: 全绿（△ 为略提警告，不算失败）")


if __name__ == "__main__":
    main()

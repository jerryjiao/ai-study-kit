# -*- coding: utf-8 -*-
"""
Parse 0417.xls (WPS/ET) into a unified question JSON.
Two sheets: 单选题 (single) and 多选题 (multi).
Columns: 0题目 1考核点 2难度 3试题解析 4正确答案 5..20 答案A..答案L
Output: scripts/_xls_questions.json
"""
import json
import os
import re
import xlrd

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LETTERS = 'ABCDEFGHIJKL'


def parse_sheet(sh, qtype):
    out = []
    for r in range(3, sh.nrows):
        question = str(sh.cell_value(r, 0)).strip()
        answer = str(sh.cell_value(r, 4)).strip()
        if not question or not answer or question == '题目：':
            continue
        exam_point = str(sh.cell_value(r, 1)).strip()
        difficulty = str(sh.cell_value(r, 2)).strip()
        analysis = str(sh.cell_value(r, 3)).strip()
        # options A..L = col 5..16
        options = {}
        for i, letter in enumerate(LETTERS):
            v = str(sh.cell_value(r, 5 + i)).strip()
            if v:
                options[letter] = v
        # normalize answer letters (strip whitespace, uppercase)
        ans_letters = [ch.upper() for ch in answer if ch.strip() and ch.upper() in LETTERS]
        # detect judge question (rare here, but be safe): options are 正确/错误
        is_judge = qtype == 'single' and set(
            re.sub(r'\s+', '', v) for v in options.values()
        ) <= {'正确', '错误'} and len(options) == 2
        final_type = 'judge' if is_judge else qtype
        out.append({
            'source': '0417题库',
            'topic': exam_point or '',
            'type': final_type,
            'question': question,
            'options': options,
            'answer': ans_letters,
            'difficulty': difficulty,
            'analysis': analysis,
            'examPoint': exam_point,
        })
    return out


def main():
    path = os.path.join(BASE, '0417.xls')
    wb = xlrd.open_workbook(path)
    allq = []
    n_single = n_multi = 0
    for sn in wb.sheet_names():
        sh = wb.sheet_by_name(sn)
        qtype = 'multi' if '多选' in sn else 'single'
        qs = parse_sheet(sh, qtype)
        for q in qs:
            allq.append(q)
            if q['type'] == 'multi':
                n_multi += 1
            else:
                n_single += 1
    # assign ids C-001..
    for n, q in enumerate(allq, 1):
        q['id'] = f'C-{n:03d}'
    out_path = os.path.join(BASE, 'scripts', '_xls_questions.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(allq, f, ensure_ascii=False, indent=2)
    print(f'0417.xls: 单选(含判断){n_single} + 多选{n_multi} = {len(allq)} 题')
    # sanity
    missing = [q['id'] for q in allq if not q['answer'] or len(q['options']) < 2]
    if missing:
        print(f'WARNING: {len(missing)} 题答案缺失或选项<2: {missing[:8]}')
    bad_ans = [q['id'] for q in allq if any(a not in q['options'] for a in q['answer'])]
    if bad_ans:
        print(f'WARNING: {len(bad_ans)} 题答案指向不存在的选项: {bad_ans[:8]}')
    from collections import Counter
    print(f'难度分布: {dict(Counter(q["difficulty"] for q in allq if q["difficulty"]))}')
    print(f'有考核点: {sum(1 for q in allq if q["examPoint"])}')
    print(f'Written -> {out_path}')


if __name__ == '__main__':
    main()

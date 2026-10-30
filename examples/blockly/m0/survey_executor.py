"""M0-U3-L04 survey executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '记录调查结果', focus concept '样本', generic
acceptance. All survey data are implementation choices, NOT
detailed-lesson values.
Model: a survey records answers from respondents. Each answer must be
one of the allowed options, and the recorded counts must match the
answers. The survey passes only if at least 3 respondents answered and
the most popular option can be identified.
Practice A: favourite fruit survey, 5 respondents: apple, banana, apple,
orange, apple -> counts apple 3, banana 1, orange 1, most popular apple.
Practice B: favourite colour survey, 4 respondents: red, blue, blue, red
-> counts red 2, blue 2, tie (different goal: tie handling, not a single
winner).
Fault: an answer outside the allowed options, or counts that do not
match the answers.
Extension: add one more respondent, counts update correctly.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class SurveyError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise SurveyError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise SurveyError("程序过长：超过40个积木")
    options = None
    answers = []
    claimed = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "options":
            options = b.get("values")
        elif bt == "answer":
            answers.append(b.get("value"))
        elif bt == "counts":
            claimed = {k: v for k, v in b.get("values").items()}
        else:
            raise SurveyError(f"不支持的积木类型：{bt}")
    if options is None:
        raise SurveyError("要先列出调查选项")
    for a in answers:
        if a not in options:
            raise SurveyError(f"无效的调查答案：{a}，不在选项 {options} 中")
    if len(answers) < 3:
        raise SurveyError("调查至少要有 3 名受访者")
    expected = {o: answers.count(o) for o in options}
    if claimed is None:
        raise SurveyError("要给出统计结果")
    if claimed != expected:
        raise SurveyError(f"统计结果错误：应为 {expected}，实际 {claimed}")
    max_count = max(expected.values())
    winners = [o for o, c in expected.items() if c == max_count]
    return {"status": "success", "respondents": len(answers), "counts": expected,
            "most_popular": winners}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "options", "values": ["apple", "banana", "orange"]},
        {"type": "answer", "value": "apple"},
        {"type": "answer", "value": "banana"},
        {"type": "answer", "value": "apple"},
        {"type": "answer", "value": "orange"},
        {"type": "answer", "value": "apple"},
        {"type": "counts", "values": {"apple": 3, "banana": 1, "orange": 1}},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

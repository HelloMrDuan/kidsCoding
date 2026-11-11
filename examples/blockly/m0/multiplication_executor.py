"""M0-U2-L02 multiplication game executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '制作九九乘法游戏', focus concept '模式', generic
acceptance. All questions and scores are implementation choices, NOT
detailed-lesson values.
Model: a multiplication game asks questions a x b, the player answers,
the score increases by 1 per correct answer. The game passes only if
all answers in a round are checked and at least one correct answer is
recorded.
Practice A: round with 3 questions (2x3=6, 3x4=12, 5x5=25), all correct.
Practice B: round with 2 questions (7x8=56, 9x9=81), one correct one wrong
(different goal: handling a wrong answer, score 1).
Fault: an answer that does not match a x b is counted wrong, not correct.
Extension: a bonus round with 9x9=81 correct adds a bonus point.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class MultiplicationError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise MultiplicationError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise MultiplicationError("程序过长：超过40个积木")
    score = 0
    asked = 0
    bonus = 0
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "ask":
            asked += 1
            if b.get("answer") == b.get("a") * b.get("b"):
                score += 1
        elif bt == "bonus":
            if b.get("answer") == b.get("a") * b.get("b"):
                bonus += 1
        else:
            raise MultiplicationError(f"不支持的积木类型：{bt}")
    if asked == 0:
        raise MultiplicationError("乘法游戏至少要出1道题")
    if score == 0:
        raise MultiplicationError("乘法游戏至少要答对1道题才算通过")
    return {"status": "success", "asked": asked, "score": score, "bonus": bonus}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "ask", "a": 2, "b": 3, "answer": 6},
        {"type": "ask", "a": 3, "b": 4, "answer": 12},
        {"type": "ask", "a": 5, "b": 5, "answer": 25},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

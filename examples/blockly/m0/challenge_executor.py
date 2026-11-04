"""M0-U2-L06 math pattern challenge executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '数学规律闯关', focus concept '递推', generic
acceptance. All levels and answers are implementation choices, NOT
detailed-lesson values.
Model: a challenge with 3 levels, each level asks for the next number in
a pattern. All 3 levels must be answered correctly to pass the challenge.
  Level 1: 2, 4, 6, ? -> 8 (add 2 each time).
  Level 2: 1, 1, 2, 3, 5, ? -> 8 (Fibonacci).
  Level 3: 1, 3, 6, 10, ? -> 15 (triangular numbers, differences 2,3,4,5).
Practice A: all 3 levels correct.
Practice B: levels 1 and 2 correct, level 3 wrong -> challenge fails
(different goal: partial progress is not a pass).
Fault: any wrong level answer fails the challenge.
Extension: bonus level 4: 1, 2, 4, 8, ? -> 16 (doubling).
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
LEVELS = {1: 8, 2: 8, 3: 15}
BONUS = {4: 16}

class ChallengeError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise ChallengeError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise ChallengeError("程序过长：超过40个积木")
    answers = {}
    bonus = {}
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "answer":
            answers[b.get("level")] = b.get("value")
        elif bt == "bonus_answer":
            bonus[b.get("level")] = b.get("value")
        else:
            raise ChallengeError(f"不支持的积木类型：{bt}")
    for level, expected in LEVELS.items():
        if answers.get(level) != expected:
            raise ChallengeError(f"第 {level} 关未通过：应为 {expected}，实际 {answers.get(level)}")
    result = {"status": "success", "levels_passed": 3}
    if bonus:
        if bonus != BONUS:
            raise ChallengeError(f"加分关错误：应为 {BONUS}，实际 {bonus}")
        result["bonus_passed"] = True
    return result

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "answer", "level": 1, "value": 8},
        {"type": "answer", "level": 2, "value": 8},
        {"type": "answer", "level": 3, "value": 15},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

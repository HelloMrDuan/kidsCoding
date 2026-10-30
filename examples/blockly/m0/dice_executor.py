"""M0-U3-L02 dice statistics executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '掷骰子统计', focus concept '随机', generic
acceptance. All roll outcomes are implementation choices, NOT
detailed-lesson values. This is a deterministic statistics model, not
a claim about real-world randomness.
Model: a dice roll result is an integer 1-6. A statistics run states
the rolls; it passes only if every roll is in 1-6 and the counts per
face add up to the total number of rolls.
Practice A: 12 rolls, counts {1:2, 2:2, 3:2, 4:2, 5:2, 6:2} (even spread).
Practice B: 6 rolls, counts {1:1, 2:0, 3:2, 4:1, 5:1, 6:1} (different goal:
uneven spread, including a zero face).
Fault: a roll of 7, or counts that do not add up to the roll total.
Extension: a second run of 6 rolls, also valid.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class DiceError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise DiceError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise DiceError("程序过长：超过40个积木")
    runs = []
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "roll_run":
            rolls = b.get("rolls")
            counts = {int(k): v for k, v in b.get("counts").items()}
            for r in rolls:
                if r not in (1, 2, 3, 4, 5, 6):
                    raise DiceError(f"无效的骰子点数：{r}，只能是 1 到 6")
            if sum(counts.values()) != len(rolls):
                raise DiceError("各点数次数之和必须等于掷骰子总次数")
            for face in (1, 2, 3, 4, 5, 6):
                if rolls.count(face) != counts.get(face, 0):
                    raise DiceError(f"点数 {face} 的统计次数错误")
            runs.append({"rolls": len(rolls), "counts": counts})
        else:
            raise DiceError(f"不支持的积木类型：{bt}")
    if not runs:
        raise DiceError("至少要统计一次掷骰子")
    return {"status": "success", "runs": runs}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "roll_run", "rolls": [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6],
         "counts": {1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2}},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

"""G1-U3-L03 score executor (first stage, not a web classroom).

Lesson: '记录得到的星星', age 6-9, engine blockly.
Required: score starts at 0; each new star picked adds 1; score is shown.
Verification: picking 3 different stars gives score=3.
Failure from the detailed lesson: touching the same star repeatedly
gives repeated points. This executor prevents that by marking each picked
star as collected; a repeated pick of the same star does not add again.
Extension: reaching 5 points unlocks an easter egg.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class ScoreError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise ScoreError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 30:
        raise ScoreError("程序过长：超过30个积木")
    score = 0
    collected = set()
    displayed = None
    for b in blocks[1:]:
        t = b.get("type")
        if t == "pick_star":
            sid = b.get("star_id")
            if sid not in collected:
                collected.add(sid)
                score += 1
        elif t == "show_score":
            displayed = score
        elif t == "set_score":
            raise ScoreError("分数必须来自拾取星星，不能直接设定分数")
        else:
            raise ScoreError(f"不支持的积木类型：{t}")
    return {"status": "success", "score": score, "collected": sorted(collected), "displayed": displayed, "easter_egg": score >= 5}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "pick_star", "star_id": "star1"},
        {"type": "pick_star", "star_id": "star2"},
        {"type": "pick_star", "star_id": "star3"},
        {"type": "show_score"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

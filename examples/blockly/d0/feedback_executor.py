"""D0-U3-L05 user feedback executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '观察用户反馈', focus concept '测试', generic
acceptance. All feedback items are implementation choices, NOT
detailed-lesson values.
Model: user feedback must be recorded with steps, expected, and actual
(three columns), and each feedback item must have a fix that references
its id. A feedback round passes only if at least 3 feedback items are
recorded, every item has all three columns non-empty, and at least one
fix references a recorded feedback id.
Practice A: 3 feedback items about a guide (wrong order, missing intro,
unclear sign), each with steps/expected/actual, plus fix for item 1.
Practice B: 3 feedback items about a signal (too short green, unclear
yellow, no red countdown), each complete, plus fix for item 2 (different
goal: different product, different fixed item).
Fault: only asking like/dislike with no reproduction steps, or a fix
that references an unknown feedback id, or fewer than 3 items.
Extension: a second round retests the fix and records "fixed" for item 1.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class FeedbackError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise FeedbackError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise FeedbackError("程序过长：超过60个积木")
    items = {}
    fixes = []
    retests = {}
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "feedback":
            items[b.get("id")] = b
        elif bt == "fix":
            fixes.append(b.get("feedback_id"))
        elif bt == "retest":
            retests[b.get("feedback_id")] = b.get("result")
        else:
            raise FeedbackError(f"不支持的积木类型：{bt}")
    if len(items) < 3:
        raise FeedbackError("用户反馈至少要记录 3 条")
    for fid, item in items.items():
        for col in ["steps", "expected", "actual"]:
            if not item.get(col):
                raise FeedbackError(f"反馈 {fid} 缺少 {col} 一栏")
    if not fixes:
        raise FeedbackError("至少要有一个针对反馈的修复")
    for fid in fixes:
        if fid not in items:
            raise FeedbackError(f"修复引用了未记录的反馈 {fid}")
    result = {"status": "success", "feedbacks": len(items), "fixes": fixes}
    if retests:
        result["retests"] = retests
    return result

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "feedback", "id": "f1", "steps": "走导览", "expected": "入口花园大厅", "actual": "入口大厅花园"},
        {"type": "feedback", "id": "f2", "steps": "听花园讲解", "expected": "有讲解", "actual": "无讲解"},
        {"type": "feedback", "id": "f3", "steps": "看指示牌", "expected": "清楚", "actual": "不清楚"},
        {"type": "fix", "feedback_id": "f1"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

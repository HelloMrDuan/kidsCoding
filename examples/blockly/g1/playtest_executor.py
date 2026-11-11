"""G1-U4-L05 playtest executor (first stage, not a web classroom).

Lesson: '邀请朋友试玩', age 6-9, engine blockly.
Required: a playtest checklist where a peer checks the trigger entry,
the dialogue, and the ending.
Verification: at least 3 feedback items recorded, plus one traceable fix.
Each feedback item must have three columns: steps, expected, actual.
Failure from the detailed lesson: only asking like/dislike, with no
reproduction of the problem.
Extension: a second friend retests the fix.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class PlaytestError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise PlaytestError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 30:
        raise PlaytestError("程序过长：超过30个积木")
    checklist = set()
    feedback = []
    fixes = []
    retest = False
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "checklist":
            checklist.add(b.get("item"))
        elif bt == "feedback":
            if not b.get("steps") or not b.get("expected") or not b.get("actual"):
                raise PlaytestError("只问喜欢不喜欢，却没有复现问题：为反馈写操作步骤、预期、实际三列")
            feedback.append(b.get("id"))
        elif bt == "fix":
            if b.get("feedback_id") not in feedback:
                raise PlaytestError("修复必须可追踪：修复要对应一条已记录的反馈")
            fixes.append(b.get("feedback_id"))
        elif bt == "retest":
            retest = True
        else:
            raise PlaytestError(f"不支持的积木类型：{bt}")
    if checklist != {"trigger", "dialogue", "ending"}:
        raise PlaytestError("试玩任务单要检查触发入口、对白和结尾")
    if len(feedback) < 3:
        raise PlaytestError("记录至少3条反馈和一次可追踪的修复")
    if not fixes:
        raise PlaytestError("记录至少3条反馈和一次可追踪的修复")
    return {"status": "success", "feedback_count": len(feedback), "fixes": fixes, "retest": retest}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "checklist", "item": "trigger"},
        {"type": "checklist", "item": "dialogue"},
        {"type": "checklist", "item": "ending"},
        {"type": "feedback", "id": "f1", "steps": "点击开始", "expected": "狐狸先说话", "actual": "兔子先说话"},
        {"type": "feedback", "id": "f2", "steps": "走到终点", "expected": "显示结局", "actual": "没有结局"},
        {"type": "feedback", "id": "f3", "steps": "点击宝箱", "expected": "宝箱打开", "actual": "宝箱没反应"},
        {"type": "fix", "feedback_id": "f1"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

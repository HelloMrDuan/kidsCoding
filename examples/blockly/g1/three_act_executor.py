"""G1-U4-L01 three-act executor (first stage, not a web classroom).

Lesson: '规划三幕故事', age 6-9, engine blockly.
Required: a timeline of three acts - beginning, conflict, resolution -
each with an identifiable event and a character goal.
Verification: all three acts are present in order, each with a non-empty
event and a non-empty goal.
Failure from the detailed lesson: only an opening, with no problem
(conflict) or resolution act.
Extension: one narration line per act does not break the pass.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
ACTS = ["beginning", "conflict", "resolution"]

class ThreeActError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise ThreeActError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 30:
        raise ThreeActError("程序过长：超过30个积木")
    acts = []
    for b in blocks[1:]:
        if b.get("type") == "act":
            if not b.get("event") or not b.get("goal"):
                raise ThreeActError("每幕有一条可辨识的事件与人物目标：事件与目标都不能为空")
            acts.append(b.get("name"))
        elif b.get("type") == "narration":
            pass
        else:
            raise ThreeActError(f"不支持的积木类型：{b.get('type')}")
    if acts != ACTS:
        raise ThreeActError("只有开场没有问题或解决段落：写下三幕各自发生的变化")
    return {"status": "success", "acts": acts}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "act", "name": "beginning", "event": "狐狸当上主持", "goal": "办一场森林剧场"},
        {"type": "act", "name": "conflict", "event": "路被大石头挡住", "goal": "找到去剧场的路"},
        {"type": "act", "name": "resolution", "event": "大家一起搬开石头", "goal": "准时开演"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

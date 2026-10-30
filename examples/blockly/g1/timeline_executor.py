"""G1-U4-L04 timeline executor (first stage, not a web classroom).

Lesson: '修复对白顺序', age 6-9, engine blockly.
Required: adjust events and wait times against a timeline so the fox
finishes speaking before the rabbit speaks, with no overlap.
Verification: fox line ends at or before rabbit line starts.
Failure from the detailed lesson: reducing the wait so the two lines overlap.
Durations used here are 2 seconds per line, an implementation choice
stated explicitly; the detailed lesson does not fix line durations.
Extension: the next segment is triggered only by an audience click -
modelled as a 'wait_for_click' block between the lines, which does not
break the pass.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class TimelineError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise TimelineError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 30:
        raise TimelineError("程序过长：超过30个积木")
    timeline = []
    t = 0
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "say_line":
            dur = b.get("duration", 2)
            timeline.append((b.get("actor"), t, t + dur))
            t += dur
        elif bt == "wait":
            t += b.get("seconds", 0)
        elif bt == "wait_for_click":
            pass
        elif bt == "say_together":
            raise TimelineError("减少等待导致两句重叠：狐狸说完之后兔子再说，不出现重叠")
        else:
            raise TimelineError(f"不支持的积木类型：{bt}")
    # check overlaps in timeline order
    for i in range(len(timeline)):
        for j in range(i + 1, len(timeline)):
            if timeline[i][1] < timeline[j][2] and timeline[j][1] < timeline[i][2]:
                raise TimelineError("减少等待导致两句重叠：狐狸说完之后兔子再说，不出现重叠")
    actors = [a for a, _, _ in timeline]
    if actors[:2] != ["fox", "rabbit"]:
        raise TimelineError("狐狸说完之后兔子再说")
    return {"status": "success", "timeline": timeline}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "say_line", "actor": "fox", "text": "欢迎来到森林剧场", "duration": 2},
        {"type": "wait", "seconds": 0},
        {"type": "say_line", "actor": "rabbit", "text": "很高兴见到你", "duration": 2},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

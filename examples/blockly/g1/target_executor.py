"""G1-U2-L02 target executor (first stage, not a web classroom).

Lesson: '移动到目标点', age 6-9, engine blockly.
Required: when_start -> set_position(-80, 20) for the rabbit.
Verification: final x=-80, y=20.
Failures from the detailed lesson:
  - Coordinate out of stage, or sign reversed (e.g. (80,-20)).
Stage bounds used here are the Scratch stage bounds x in [-240,240],
y in [-180,180], an implementation choice stated explicitly; the detailed
lesson only says '坐标超出舞台', without fixing numbers.
Extension: marking a second target point does not break the pass, provided
the final position remains the treasure point.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class TargetError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise TargetError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 20:
        raise TargetError("程序过长：超过20个积木")
    x = y = None
    for b in blocks[1:]:
        t = b.get("type")
        if t == "set_position":
            x, y = b.get("x"), b.get("y")
            if not (-240 <= x <= 240 and -180 <= y <= 180):
                raise TargetError("坐标超出舞台：对照地图的零点和负数方向")
        elif t == "mark_point":
            pass
        else:
            raise TargetError(f"不支持的积木类型：{t}")
    if (x, y) != (-80, 20):
        raise TargetError("精灵最终x=-80,y=20：对照地图的零点和负数方向")
    return {"status": "success", "final": (x, y)}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "set_position", "x": -80, "y": 20},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

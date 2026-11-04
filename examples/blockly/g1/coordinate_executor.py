"""G1-U2-L01 coordinate executor (first stage, not a web classroom).

Lesson: '认识舞台坐标', age 6-9, engine blockly.
Required: when_start -> goto(0,0) -> goto(60,0) -> goto(60,40).
Verification: final position is (60,40).
Failure from the detailed lesson: swapping x and y to end at (40,60).
Extension: marking top-left and bottom-right points. This executor uses
(-120,120) for top-left and (120,-120) for bottom-right as an implementation
example; the detailed lesson does not fix those values, and they must not be
claimed as detailed-lesson values.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class CoordinateError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise CoordinateError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 20:
        raise CoordinateError("程序过长：超过20个积木")
    positions = []
    x = y = None
    for b in blocks[1:]:
        t = b.get("type")
        if t == "goto":
            x, y = b.get("x"), b.get("y")
            positions.append((x, y))
        elif t == "mark_point":
            positions.append(("mark", b.get("x"), b.get("y")))
        else:
            raise CoordinateError(f"不支持的积木类型：{t}")
    goto_positions = [p for p in positions if len(p) == 2]
    if goto_positions[:3] != [(0, 0), (60, 0), (60, 40)]:
        raise CoordinateError("角色最终定位在(60,40)：必须依次经过(0,0)、(60,0)、(60,40)")
    if (x, y) != (60, 40):
        raise CoordinateError("角色最终定位在(60,40)")
    return {"status": "success", "final": (x, y), "positions": positions}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "goto", "x": 0, "y": 0},
        {"type": "goto", "x": 60, "y": 0},
        {"type": "goto", "x": 60, "y": 40},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

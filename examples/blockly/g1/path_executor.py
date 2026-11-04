"""G1-U2-L03 path executor (first stage, not a web classroom).

Lesson: '让角色沿路走', age 6-9, engine blockly.
Required: when_start -> move_right 80 -> move_up 40 -> move_right 20.
Verification: final displacement is (+100,+40).
Failure from the detailed lesson: missing the second segment, giving a
wrong target point.
Extension: an 'obstacle_detour' block (a marked zigzag around an obstacle)
may be added without changing the required displacement; it is recorded
but does not count toward the three required segments.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class PathError(Exception):
    pass

REQUIRED = [(80, 0), (0, 40), (20, 0)]

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise PathError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 20:
        raise PathError("程序过长：超过20个积木")
    segments = []
    for b in blocks[1:]:
        t = b.get("type")
        if t == "move_right":
            segments.append((b.get("steps", 0), 0))
        elif t == "move_up":
            segments.append((0, b.get("steps", 0)))
        elif t == "obstacle_detour":
            pass
        else:
            raise PathError(f"不支持的积木类型：{t}")
    if segments != REQUIRED:
        raise PathError("角色最终位移(+100,+40)：必须依次向右80、向上40、向右20，漏走第二段导致目标点错误")
    dx = sum(s[0] for s in segments)
    dy = sum(s[1] for s in segments)
    if (dx, dy) != (100, 40):
        raise PathError("角色最终位移(+100,+40)")
    return {"status": "success", "displacement": (dx, dy), "segments": segments}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "move_right", "steps": 80},
        {"type": "move_up", "steps": 40},
        {"type": "move_right", "steps": 20},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

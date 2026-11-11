"""G1-U2-L04 chase executor (first stage, not a web classroom).

Lesson: '快慢不同的追逐', age 6-9, engine blockly.
Required: when_start, both start at 0, fox speed 4 steps/frame,
rabbit speed 2 steps/frame.
Verification: after the same number of frames, fox displacement is
twice rabbit displacement. This executor runs 10 frames, an implementation
choice stated explicitly; the detailed lesson only requires '相同时间'.
Failures from the detailed lesson:
  - Changing only the fox start position while claiming faster speed.
  - Equal speeds, or wrong speeds.
Extension: an 'accelerate' block for the fox after the timed run does not
break the pass; the ratio is checked on the timed phase.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class ChaseError(Exception):
    pass

FRAMES = 10

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise ChaseError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 20:
        raise ChaseError("程序过长：超过20个积木")
    starts = {}
    speeds = {}
    for b in blocks[1:]:
        t = b.get("type")
        if t == "set_start":
            starts[b.get("actor")] = b.get("x", 0)
        elif t == "set_speed":
            speeds[b.get("actor")] = b.get("steps", 0)
        elif t == "accelerate":
            pass
        else:
            raise ChaseError(f"不支持的积木类型：{t}")
    if starts.get("fox", 0) != 0 or starts.get("rabbit", 0) != 0:
        raise ChaseError("只改变狐狸起点却声称速度更快：比较同一时间内的位移量，而非终点位置")
    if speeds.get("fox") != 4 or speeds.get("rabbit") != 2:
        raise ChaseError("给狐狸每帧移动4步、兔子每帧移动2步")
    fox_disp = speeds["fox"] * FRAMES
    rabbit_disp = speeds["rabbit"] * FRAMES
    if fox_disp != 2 * rabbit_disp:
        raise ChaseError("相同时间狐狸位移为兔子两倍")
    return {"status": "success", "frames": FRAMES, "fox_displacement": fox_disp, "rabbit_displacement": rabbit_disp}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "set_start", "actor": "fox", "x": 0},
        {"type": "set_start", "actor": "rabbit", "x": 0},
        {"type": "set_speed", "actor": "fox", "steps": 4},
        {"type": "set_speed", "actor": "rabbit", "steps": 2},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

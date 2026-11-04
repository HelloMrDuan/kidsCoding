"""G1-U3-L04 obstacle executor (first stage, not a web classroom).

Lesson: '碰到障碍停下来', age 6-9, engine blockly.
Required: touch detection; on touching an obstacle, speed becomes 0
and a warning plays.
Verification: without collision the turtle moves; after collision it
stays still.
Obstacle position used here is x=100, an implementation choice stated
explicitly; the detailed lesson does not fix an obstacle coordinate.
Failure from the detailed lesson: continuing to move after hitting the stone.
Extension: a second-level plan to go around the obstacle - modelled as a
'detour' block after the stop, which may move the turtle again only after
the warning has played.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
OBSTACLE_X = 100

class ObstacleError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise ObstacleError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 30:
        raise ObstacleError("程序过长：超过30个积木")
    has_handler = False
    moves = []
    detour = False
    for b in blocks[1:]:
        t = b.get("type")
        if t == "on_touch_stop":
            has_handler = True
        elif t == "move":
            moves.append(b.get("steps", 0))
        elif t == "detour":
            detour = True
        else:
            raise ObstacleError(f"不支持的积木类型：{t}")
    if not has_handler:
        raise ObstacleError("撞到石头之后仍继续移动：检查碰撞判断和停止动作是否放在同一控制路径")
    x = 0
    speed = None
    warned = False
    stopped = False
    for steps in moves:
        if stopped:
            break
        x += steps
        if x >= OBSTACLE_X:
            x = OBSTACLE_X
            speed = 0
            warned = True
            stopped = True
    return {"status": "success", "final_x": x, "speed": speed, "warned": warned, "stopped": stopped, "detour": detour}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "on_touch_stop"},
        {"type": "move", "steps": 50},
        {"type": "move", "steps": 60},
        {"type": "move", "steps": 50},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

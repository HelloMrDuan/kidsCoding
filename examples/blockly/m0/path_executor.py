"""M0-U4-L02 shortest path executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '选择最短寻路路线', focus concept '面积', generic
acceptance. All grid sizes and route lengths are implementation choices,
NOT detailed-lesson values.
Model: a grid map with a start (0,0) and a goal (3,2). A route is a list
of moves (right, up, left, down). The route passes only if it ends at
the goal, never steps on a blocked cell, and its length equals the
Manhattan distance (the shortest possible, 5 steps for this map).
Blocked cells (implementation choice): (1,1) and (2,1).
Practice A: right, right, right, up, up (5 steps, avoids blocks).
Practice B: up, up, right, right, right (5 steps, different route, same
shortest length).
Fault: a route that steps on (1,1), or a route longer than 5 steps that
still reaches the goal (not shortest).
Extension: a second map goal (4,0) with a 4-step route right x4.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
BLOCKED = {(1, 1), (2, 1)}
GOAL = (3, 2)

class PathError(Exception):
    pass

def run_program(blocks, goal=GOAL, blocked=BLOCKED):
    if not blocks or blocks[0].get("type") != "when_start":
        raise PathError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise PathError("程序过长：超过40个积木")
    x, y = 0, 0
    moves = []
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "move":
            d = b.get("direction")
            moves.append(d)
            if d == "right": x += 1
            elif d == "left": x -= 1
            elif d == "up": y += 1
            elif d == "down": y -= 1
            else: raise PathError(f"不支持的方向：{d}")
            if (x, y) in blocked:
                raise PathError(f"路线撞上障碍格 {(x, y)}")
        else:
            raise PathError(f"不支持的积木类型：{bt}")
    if (x, y) != goal:
        raise PathError(f"路线未到达目标 {goal}，实际终点 {(x, y)}")
    shortest = abs(goal[0]) + abs(goal[1])
    if len(moves) != shortest:
        raise PathError(f"路线不是最短：最短 {shortest} 步，实际 {len(moves)} 步")
    return {"status": "success", "goal": goal, "steps": len(moves), "moves": moves}

def correct_program():
    prog = [{"type": "when_start"}]
    for d in ["right", "right", "right", "up", "up"]:
        prog.append({"type": "move", "direction": d})
    return prog

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

"""M0-U4-L05 fewest-steps strategy executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '设计最省步数策略', focus concept '推理', generic
acceptance. All maps and step counts are implementation choices, NOT
detailed-lesson values.
Model: a strategy is a plan of moves on a grid from (0,0) to a goal.
The strategy passes only if the plan reaches the goal, avoids blocked
cells, and uses the fewest steps possible (Manhattan distance).
Practice A: goal (3,2), blocked (1,1),(2,1), plan right x3 + up x2 = 5
steps (fewest).
Practice B: goal (2,0), no blocks, plan right x2 = 2 steps (fewest,
different goal and shorter plan).
Fault: a plan that reaches the goal but takes extra steps (7 steps for
practice A), or a plan that steps on a blocked cell.
Extension: a second strategy for goal (3,2) with a different order
(up x2 + right x3) still 5 steps — proves order does not matter when the
count is fewest.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class StrategyError(Exception):
    pass

def run_program(blocks, goal=(3, 2), blocked=None):
    if blocked is None:
        blocked = {(1, 1), (2, 1)}
    if not blocks or blocks[0].get("type") != "when_start":
        raise StrategyError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise StrategyError("程序过长：超过40个积木")
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
            else: raise StrategyError(f"不支持的方向：{d}")
            if (x, y) in blocked:
                raise StrategyError(f"策略撞上障碍格 {(x, y)}")
        else:
            raise StrategyError(f"不支持的积木类型：{bt}")
    if (x, y) != goal:
        raise StrategyError(f"策略未到达目标 {goal}，实际终点 {(x, y)}")
    fewest = abs(goal[0]) + abs(goal[1])
    if len(moves) != fewest:
        raise StrategyError(f"策略不是最省步数：最少 {fewest} 步，实际 {len(moves)} 步")
    return {"status": "success", "goal": goal, "steps": len(moves), "moves": moves}

def correct_program():
    prog = [{"type": "when_start"}]
    for d in ["right", "right", "right", "up", "up"]:
        prog.append({"type": "move", "direction": d})
    return prog

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

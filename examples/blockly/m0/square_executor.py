"""M0-U1-L01 square executor (first stage, not a web classroom).

IMPORTANT PROVENANCE: there is NO detailed lesson file for M0 on main
(no track-m0-detailed-lessons file, 0 code hits for M0-U1-L01, and the
register marks detailAssetPresent=false). This package is built ONLY from
the register entry: title '用积木绘制方形', focus concept '角度', and the
generic acceptance (real executor, two hands-on practices with different
goals, one real fault/boundary test, tiered hints, creative work,
save-and-reopen). Every numeric value below is an implementation choice,
NOT a detailed-lesson value, and must not be quoted as one.
Required: repeat 4 times: move forward, turn 90 degrees. The path must
close (return to the start point).
Practice A: square with side 100. Practice B: square with side 60 from a
different start point (different goal: different size and position, same
geometry rule).
Fault: turning 80 degrees instead of 90 does not close the square.
Extension: draw a second square in a different colour.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class SquareError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise SquareError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 30:
        raise SquareError("程序过长：超过30个积木")
    # simulate a turtle: position (x,y), heading degrees (0=east, left turn +)
    import math
    x, y, heading = 0, 0, 0
    sides = 0
    turns = []
    start = (0, 0)
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "repeat":
            count = b.get("count", 0)
            if count != 4:
                raise SquareError("绘制方形需要重复4次")
            # body is given as separate move/turn blocks in this executor model;
            # repeat count is validated, execution is by the following blocks
            pass
        elif bt == "move":
            rad = math.radians(heading)
            x += b.get("steps", 0) * math.cos(rad)
            y += b.get("steps", 0) * math.sin(rad)
            sides += 1
        elif bt == "turn":
            heading = (heading + b.get("degrees", 0)) % 360
            turns.append(b.get("degrees", 0))
        elif bt == "set_color":
            pass
        elif bt == "set_start":
            x, y = b.get("x", 0), b.get("y", 0)
            start = (x, y)
        else:
            raise SquareError(f"不支持的积木类型：{bt}")
    if sides != 4:
        raise SquareError("方形需要4条边")
    if turns != [90, 90, 90, 90]:
        raise SquareError("角度错误：方形每个角转90度，80度转角画不出闭合方形")
    if abs(x - start[0]) > 0.01 or abs(y - start[1]) > 0.01:
        raise SquareError("方形未闭合：终点必须回到起点")
    return {"status": "success", "sides": sides, "turns": turns, "closed": True}

def correct_program(side=100):
    return [
        {"type": "when_start"},
        {"type": "repeat", "count": 4},
        {"type": "move", "steps": side},
        {"type": "turn", "degrees": 90},
        {"type": "move", "steps": side},
        {"type": "turn", "degrees": 90},
        {"type": "move", "steps": side},
        {"type": "turn", "degrees": 90},
        {"type": "move", "steps": side},
        {"type": "turn", "degrees": 90},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

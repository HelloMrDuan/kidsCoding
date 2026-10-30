"""M0-U1-L04 regular polygon executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '画出规则多边形', focus concept '坐标', generic
acceptance. All side counts, angles and step lengths are implementation
choices, NOT detailed-lesson values.
Model: a turtle draws a regular polygon with n sides: repeat n times,
move the same number of steps, turn 360/n degrees. The path must close
(return to the start) and all turns must be equal.
Practice A: pentagon, n=5, turn 72, side 50.
Practice B: hexagon, n=6, turn 60, side 40 (different goal: different polygon).
Fault: using a 90-degree turn for a pentagon does not close as a regular
pentagon.
Extension: draw a second polygon (triangle, n=3, turn 120) after the first.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
import math

class PolygonError(Exception):
    pass

def _draw(n, side, turn):
    x, y, heading = 0.0, 0.0, 0.0
    for _ in range(n):
        rad = math.radians(heading)
        x += side * math.cos(rad)
        y += side * math.sin(rad)
        heading = (heading + turn) % 360
    return x, y

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise PolygonError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise PolygonError("程序过长：超过40个积木")
    polygons = []
    current = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "polygon":
            current = {"n": b.get("sides"), "side": b.get("side"), "turn": b.get("turn")}
            polygons.append(current)
        else:
            raise PolygonError(f"不支持的积木类型：{bt}")
    if not polygons:
        raise PolygonError("至少要画一个规则多边形")
    for p in polygons:
        n, turn = p["n"], p["turn"]
        if n < 3:
            raise PolygonError("规则多边形至少3条边")
        if turn * n != 360:
            raise PolygonError(f"规则多边形转角错误：{n} 边形每角应转 {360//n} 度，不是 {turn} 度")
        x, y = _draw(n, p["side"], turn)
        if abs(x) > 0.01 or abs(y) > 0.01:
            raise PolygonError("多边形未闭合：终点必须回到起点")
    return {"status": "success", "polygons": polygons}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "polygon", "sides": 5, "side": 50, "turn": 72},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

"""M0-U1-L03 mirror flower executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '镜像对称小花', focus concept '坐标', generic
acceptance. All coordinates and petal positions are implementation choices,
NOT detailed-lesson values.
Model: a flower with petals at integer coordinates. Mirror axis is the
vertical line x=0. A petal at (x, y) must have a mirror petal at (-x, y).
The centre petal at x=0 mirrors itself.
Practice A: petals at (-2,1), (2,1), (-1,0), (1,0), (0,2) — symmetric.
Practice B: same flower shifted up by 1 in y — still symmetric, different
goal (position, not just the first flower).
Fault: a petal at (2,1) with no mirror at (-2,1).
Extension: add a second flower below, also symmetric.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class MirrorError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise MirrorError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise MirrorError("程序过长：超过40个积木")
    petals = set()
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "petal":
            petals.add((b.get("x"), b.get("y")))
        else:
            raise MirrorError(f"不支持的积木类型：{bt}")
    if not petals:
        raise MirrorError("小花至少要有一片花瓣")
    for (x, y) in petals:
        if (-x, y) not in petals:
            raise MirrorError(f"镜像对称失败：花瓣 ({x},{y}) 在 x=0 轴对面没有对应花瓣")
    return {"status": "success", "petals": sorted(petals)}

def correct_program():
    pts = [(-2,1),(2,1),(-1,0),(1,0),(0,2)]
    prog = [{"type": "when_start"}]
    for x, y in pts:
        prog.append({"type": "petal", "x": x, "y": y})
    return prog

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

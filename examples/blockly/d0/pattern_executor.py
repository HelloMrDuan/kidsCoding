"""D0-U1-L05 dynamic pattern executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '制作动态图案', focus concept '图形', generic
acceptance. All shapes, colours and frames are implementation choices,
NOT detailed-lesson values.
Model: a dynamic pattern is a sequence of frames. Each frame states a
shape and its colour. A pattern passes only if it has at least 3 frames,
the shape changes at least once across frames, and the colour changes
at least once across frames (a truly dynamic pattern, not a static one).
Practice A: circle red, square red, circle blue -> shape changes and
colour changes.
Practice B: triangle green, triangle yellow, square yellow -> shape
changes and colour changes (different goal: colour changes first, then
shape).
Fault: all frames identical (circle red x3, static), or shape never
changes, or colour never changes.
Extension: add a 4th frame (star purple) -> still dynamic.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class PatternError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise PatternError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise PatternError("程序过长：超过40个积木")
    frames = []
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "frame":
            frames.append((b.get("shape"), b.get("colour")))
        else:
            raise PatternError(f"不支持的积木类型：{bt}")
    if len(frames) < 3:
        raise PatternError("动态图案至少要有 3 帧")
    shapes = {s for s, _ in frames}
    colours = {c for _, c in frames}
    if len(shapes) < 2:
        raise PatternError("动态图案中形状至少要变化一次")
    if len(colours) < 2:
        raise PatternError("动态图案中颜色至少要变化一次")
    return {"status": "success", "frames": len(frames), "shapes": sorted(shapes),
            "colours": sorted(colours)}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "frame", "shape": "circle", "colour": "red"},
        {"type": "frame", "shape": "square", "colour": "red"},
        {"type": "frame", "shape": "circle", "colour": "blue"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

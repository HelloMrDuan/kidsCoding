"""D0-U1-L02 character palette executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '设计角色配色', focus concept '颜色', generic
acceptance. All colours are implementation choices, NOT detailed-lesson
values.
Model: a character palette assigns a colour to each part (body, ears,
belly). A palette passes only if every part has a colour, no two
adjacent parts share the same colour (body vs ears, body vs belly), and
at least 3 distinct colours are used.
Practice A: fox — body orange, ears brown, belly white (3 colours,
adjacent parts differ).
Practice B: rabbit — body grey, ears pink, belly white (different
character, different colours, same rule).
Fault: body and ears both orange (adjacent same colour), or a part
missing a colour.
Extension: add a tail colour (black) as a 4th part, still passing.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
ADJACENT = [("body", "ears"), ("body", "belly")]

class PaletteError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise PaletteError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise PaletteError("程序过长：超过40个积木")
    colours = {}
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "paint":
            colours[b.get("part")] = b.get("colour")
        else:
            raise PaletteError(f"不支持的积木类型：{bt}")
    for part in ["body", "ears", "belly"]:
        if part not in colours:
            raise PaletteError(f"角色部位 {part} 缺少配色")
    for a, b in ADJACENT:
        if colours[a] == colours[b]:
            raise PaletteError(f"相邻部位 {a} 与 {b} 颜色相同（{colours[a]}），需要区分")
    if len(set(colours.values())) < 3:
        raise PaletteError("角色配色至少要用 3 种不同颜色")
    return {"status": "success", "colours": colours, "distinct": len(set(colours.values()))}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "paint", "part": "body", "colour": "orange"},
        {"type": "paint", "part": "ears", "colour": "brown"},
        {"type": "paint", "part": "belly", "colour": "white"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

"""D0-U1-L01 rainbow executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main (see M0-U1-L01
LESSON-DESIGN.md for the check method and result). This package is built
ONLY from the register entry: title '用代码画彩虹', focus concept '颜色',
generic acceptance. Every colour value and band count below is an
implementation choice, NOT a detailed-lesson value.
Required: draw a rainbow with 7 colour bands in order, each band a
different colour, from outer to inner.
Implementation choice for band order: red, orange, yellow, green, cyan,
blue, purple.
Practice A: full 7-band rainbow. Practice B: rainbow with a different
starting position (same 7 colours, different goal: position, not colour).
Fault: two adjacent bands with the same colour, or bands out of order.
Extension: add a cloud at each end of the rainbow.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
RAINBOW = ["red", "orange", "yellow", "green", "cyan", "blue", "purple"]

class RainbowError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise RainbowError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 30:
        raise RainbowError("程序过长：超过30个积木")
    bands = []
    clouds = 0
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "draw_band":
            bands.append(b.get("color"))
        elif bt == "set_start":
            pass
        elif bt == "add_cloud":
            clouds += 1
        else:
            raise RainbowError(f"不支持的积木类型：{bt}")
    if bands != RAINBOW:
        raise RainbowError("彩虹需要7条不同颜色的色带，按红橙黄绿青蓝紫顺序排列")
    return {"status": "success", "bands": bands, "clouds": clouds}

def correct_program():
    prog = [{"type": "when_start"}]
    for c in RAINBOW:
        prog.append({"type": "draw_band", "color": c})
    return prog

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

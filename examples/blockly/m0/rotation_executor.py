"""M0-U1-L02 rotation executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '认识旋转角度', focus concept '角度', generic
acceptance. All angle values are implementation choices, NOT detailed-lesson
values.
Model: heading in degrees, 0 = initial direction, right turn adds,
left turn subtracts, normalised to 0-359. The caller states the target
heading; the program passes only if the final heading equals the target.
Practice A: turn right 90 to reach target 90.
Practice B: turn left 270 to reach the same target 90 by the other way.
Fault: turning right 80 does not reach target 90.
Extension: turn right 360 returns to the starting heading 0.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class RotationError(Exception):
    pass

def run_program(blocks, target=90):
    if not blocks or blocks[0].get("type") != "when_start":
        raise RotationError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 30:
        raise RotationError("程序过长：超过30个积木")
    heading = 0
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "turn_right":
            heading = (heading + b.get("degrees", 0)) % 360
        elif bt == "turn_left":
            heading = (heading - b.get("degrees", 0)) % 360
        else:
            raise RotationError(f"不支持的积木类型：{bt}")
    if heading != target:
        raise RotationError(f"旋转角度未达到目标：当前 {heading} 度，目标 {target} 度")
    return {"status": "success", "heading": heading, "target": target}

def correct_program():
    return [{"type": "when_start"}, {"type": "turn_right", "degrees": 90}]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

"""G1-U2-L05 direction executor (first stage, not a web classroom).

Lesson: '角色朝向与旋转', age 6-9, engine blockly.
Required: when_start, rabbit faces east, north, west, south in order,
then faces east again. Scratch directions used here: east 90, north 0,
west -90, south 180.
Interpretation stated explicitly: the initial direction is east, and
'四次转向后回到初始朝向' means four left turns east->north->west->south
->east. The detailed lesson lists the four directions in order and the
return-to-initial verification, but does not fix the numeric direction
values; those are the Scratch convention used by this executor.
Failure from the detailed lesson: position moves but direction never changes.
Extension: a 'spin_animation' block during a turn does not break the pass.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class DirectionError(Exception):
    pass

REQUIRED = [90, 0, -90, 180, 90]

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise DirectionError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 20:
        raise DirectionError("程序过长：超过20个积木")
    directions = []
    for b in blocks[1:]:
        t = b.get("type")
        if t == "face":
            directions.append(b.get("direction"))
        elif t == "move":
            pass
        elif t == "spin_animation":
            pass
        else:
            raise DirectionError(f"不支持的积木类型：{t}")
    if not directions:
        raise DirectionError("位置移动了但朝向未改变：分别观察位置和朝向两个属性")
    if directions != REQUIRED:
        raise DirectionError("四次转向后角色回到初始朝向：必须依次朝东、朝北、朝西、朝南，再回到朝东")
    return {"status": "success", "directions": directions, "final_direction": directions[-1]}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "face", "direction": 90},
        {"type": "move", "steps": 20},
        {"type": "face", "direction": 0},
        {"type": "move", "steps": 20},
        {"type": "face", "direction": -90},
        {"type": "move", "steps": 20},
        {"type": "face", "direction": 180},
        {"type": "move", "steps": 20},
        {"type": "face", "direction": 90},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

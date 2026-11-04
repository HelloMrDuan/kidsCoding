"""R0-U3-L04 obstacle detection and avoidance executor (first stage,
not a web classroom, NOT real hardware).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '检测并避开障碍', focus concept '反馈', generic
acceptance. All pins, distances and rules are implementation choices,
NOT detailed-lesson values.
Model: a simulated robot is valid when, after a start event:
  - a power block comes first with voltage exactly 5;
  - a sensor block with pin 9;
  - a motor block with pin 5;
  - at least 3 sense-action pairs, strictly alternating: a sense block
    with an integer distance in 2..400 cm, then an action block;
  - feedback rule for every pair: if the sensed distance is below 20
    cm, the action must be turn (avoid); if it is 20 cm or more, the
    action must be forward;
  - at least one forward action and at least one turn action overall;
  - exactly one finish block, after the last action;
  - at most 60 blocks.
Feedback lesson: the action is not planned in advance; it is decided
by the distance just sensed. Driving forward into a sensed obstacle,
or turning when the road is clear, both fail.
This is a SIMULATOR MODEL ONLY. It never drives a real robot and never
detects a real obstacle. Real robot work must be done with a teacher
or guardian, with the power off while wiring, only at the voltage the
real board specifies, in a clear space with no people, pets or fragile
objects in the way, and stopped at once if anything goes wrong.
Practice A: 100 -> forward, 15 -> turn, 80 -> forward, finish.
Practice B: 15 -> turn, 12 -> turn, 100 -> forward, finish (two
obstacles avoided).
Fault: forward with distance below 20; turn with distance 20 or more;
a sense outside 2..400; fewer than 3 pairs; two senses or two actions
in a row; missing finish; sensor pin outside {9}; motor pin outside
{5}; missing power/sensor/motor; missing start.
Extension: 100 -> forward, 18 -> turn, 90 -> forward, 14 -> turn,
120 -> forward, finish (two obstacles, five pairs).
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real hardware run or real measurement. Those remain missing.
"""

SENSOR_PINS = {9}
MOTOR_PINS = {5}
OBSTACLE = 20


class AvoidError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise AvoidError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise AvoidError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "power":
        raise AvoidError("缺少供电积木：供电必须是开始后的第一个积木")
    if rest[0].get("voltage") != 5:
        raise AvoidError(f"电压 {rest[0].get('voltage')}V 不对，必须是 5V")
    sensor_pin = None
    motor_pin = None
    pairs = []
    finished = False
    expect = None  # "sense" or "action" once setup is done
    last_distance = None
    for b in rest[1:]:
        if finished:
            raise AvoidError("结束之后不能再加积木")
        bt = b.get("type")
        if bt == "sensor":
            if sensor_pin is not None:
                raise AvoidError("测距传感器重复")
            if expect is not None:
                raise AvoidError("程序已经开始，不能再接传感器")
            if b.get("pin") not in SENSOR_PINS:
                raise AvoidError(f"传感器引脚 {b.get('pin')} 不是 9")
            sensor_pin = b["pin"]
        elif bt == "motor":
            if motor_pin is not None:
                raise AvoidError("电机重复")
            if expect is not None:
                raise AvoidError("程序已经开始，不能再接电机")
            if b.get("pin") not in MOTOR_PINS:
                raise AvoidError(f"电机引脚 {b.get('pin')} 不是 5")
            motor_pin = b["pin"]
        elif bt == "sense":
            if sensor_pin is None or motor_pin is None:
                raise AvoidError("先接传感器和电机，再检测")
            if expect == "action":
                raise AvoidError("检测之后必须先行动，不能连续检测两次")
            value = b.get("distance")
            if not isinstance(value, int) or isinstance(value, bool):
                raise AvoidError("距离必须是整数厘米")
            if value < 2 or value > 400:
                raise AvoidError(f"距离 {value} 超出 2..400 厘米")
            last_distance = value
            expect = "action"
        elif bt == "action":
            if expect != "action":
                raise AvoidError("行动之前必须先检测")
            action = b.get("action")
            if action not in ("forward", "turn"):
                raise AvoidError(f"行动 {action} 不在前进、转向中")
            expected = "turn" if last_distance < OBSTACLE else "forward"
            if action != expected:
                raise AvoidError(f"距离 {last_distance} 厘米时应该{expected}，却做了 {action}")
            pairs.append({"distance": last_distance, "action": action})
            expect = "sense"
        elif bt == "finish":
            if expect != "sense":
                raise AvoidError("结束之前必须完成一组检测和行动")
            if len(pairs) < 3:
                raise AvoidError("检测行动少于 3 组，不能结束")
            actions = [p["action"] for p in pairs]
            if "forward" not in actions or "turn" not in actions:
                raise AvoidError("程序里必须既有前进又有转向，才算检测并避开")
            finished = True
        else:
            raise AvoidError(f"不支持的积木类型：{bt}")
    if sensor_pin is None:
        raise AvoidError("缺少测距传感器")
    if motor_pin is None:
        raise AvoidError("缺少电机")
    if not finished:
        raise AvoidError("缺少结束积木")
    return {"status": "success", "voltage": 5, "sensor_pin": sensor_pin,
            "motor_pin": motor_pin, "pairs": pairs}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "power", "voltage": 5},
        {"type": "sensor", "pin": 9},
        {"type": "motor", "pin": 5},
        {"type": "sense", "distance": 100},
        {"type": "action", "action": "forward"},
        {"type": "sense", "distance": 15},
        {"type": "action", "action": "turn"},
        {"type": "sense", "distance": 80},
        {"type": "action", "action": "forward"},
        {"type": "finish"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

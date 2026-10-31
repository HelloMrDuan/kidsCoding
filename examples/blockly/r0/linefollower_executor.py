"""R0-U3-L06 mini line follower executor (first stage, not a web
classroom, NOT real hardware).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '制作迷你巡线车', focus concept 'PWM', generic
acceptance. All pins, sensor values and duty values are implementation
choices, NOT detailed-lesson values.
Model: a simulated line follower is valid when, after a start event:
  - a power block comes first with voltage exactly 5;
  - motor blocks for left pin 5 and right pin 6, each exactly once;
  - sensor blocks for left pin A0 and right pin A1, each exactly
    once;
  - at least 4 step blocks, each with left and right sensor values in
    {0, 1} (1 means on the line, 0 means off the line);
  - exactly one duties block, after the last step, whose pairs list
    equals the computed (left duty, right duty) pair for each step in
    order;
  - at least one straight step and at least one turn step overall;
  - at most 60 blocks.
PWM rule (implementation choice, 0-255 scale, differential steering):
  both sensors on the line (1, 1) -> straight: left 180, right 180;
  left on, right off (1, 0) -> turn left: left 90, right 180;
  left off, right on (0, 1) -> turn right: left 180, right 90;
  both off the line (0, 0) -> lost line, stop: left 0, right 0.
The slower wheel is on the side where the line is: the car turns
toward the line instead of driving away from it.
This is a SIMULATOR MODEL ONLY. It never drives a real car and never
outputs a real PWM signal. Real car work must be done with a teacher
or guardian, with the power off while wiring, only at the voltage the
real board specifies, in a clear space with no people, pets or fragile
objects in the way, and stopped at once if anything goes wrong.
Practice A: (1, 1), (1, 0), (1, 1), (0, 1), (1, 1) -> (180, 180),
(90, 180), (180, 180), (180, 90), (180, 180).
Practice B: (1, 1), (0, 0), (1, 0), (1, 1) -> (180, 180), (0, 0),
(90, 180), (180, 180) (lost line stops, then the line is found again).
Fault: a sensor value outside {0, 1}; fewer than 4 steps; a duties
list that does not match the computed pairs; no straight step; no
turn step; a motor or sensor pin mismatch; missing power/motors/
sensors/duties; missing start.
Extension: (0, 1), (1, 1), (1, 0), (0, 0), (1, 1) -> (180, 90),
(180, 180), (90, 180), (0, 0), (180, 180).
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real hardware run. Those remain missing.
"""

MOTOR_PINS = {"left": 5, "right": 6}
SENSOR_PINS = {"left": "A0", "right": "A1"}
DUTIES = {
    (1, 1): (180, 180),
    (1, 0): (90, 180),
    (0, 1): (180, 90),
    (0, 0): (0, 0),
}


class LineFollowerError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise LineFollowerError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise LineFollowerError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "power":
        raise LineFollowerError("缺少供电积木：供电必须是开始后的第一个积木")
    if rest[0].get("voltage") != 5:
        raise LineFollowerError(f"电压 {rest[0].get('voltage')}V 不对，必须是 5V")
    motors = {}
    sensors = {}
    steps = []
    duties = None
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "motor":
            side = b.get("side")
            if side not in MOTOR_PINS:
                raise LineFollowerError(f"电机一侧 {side} 不在左、右中")
            if side in motors:
                raise LineFollowerError(f"{side} 电机重复")
            if b.get("pin") != MOTOR_PINS[side]:
                raise LineFollowerError(f"{side} 电机引脚 {b.get('pin')} 不是 {MOTOR_PINS[side]}")
            motors[side] = b["pin"]
        elif bt == "sensor":
            side = b.get("side")
            if side not in SENSOR_PINS:
                raise LineFollowerError(f"传感器一侧 {side} 不在左、右中")
            if side in sensors:
                raise LineFollowerError(f"{side} 传感器重复")
            if b.get("pin") != SENSOR_PINS[side]:
                raise LineFollowerError(f"{side} 传感器引脚 {b.get('pin')} 不是 {SENSOR_PINS[side]}")
            sensors[side] = b["pin"]
        elif bt == "step":
            if set(motors) != set(MOTOR_PINS) or set(sensors) != set(SENSOR_PINS):
                raise LineFollowerError("两个电机和两个传感器都接好，才能走步骤")
            if duties is not None:
                raise LineFollowerError("占空比之后又走步骤，这些步骤没有占空比")
            left = b.get("left")
            right = b.get("right")
            if left not in (0, 1) or isinstance(left, bool):
                raise LineFollowerError(f"左传感器值 {left} 不在 0、1 中")
            if right not in (0, 1) or isinstance(right, bool):
                raise LineFollowerError(f"右传感器值 {right} 不在 0、1 中")
            steps.append((left, right))
        elif bt == "duties":
            if duties is not None:
                raise LineFollowerError("占空比重复")
            if set(motors) != set(MOTOR_PINS) or set(sensors) != set(SENSOR_PINS):
                raise LineFollowerError("没有接好电机和传感器，不能出占空比")
            if len(steps) < 4:
                raise LineFollowerError("步骤少于 4 个，不能出占空比")
            expected = [list(DUTIES[s]) for s in steps]
            if b.get("pairs") != expected:
                raise LineFollowerError(f"占空比 {b.get('pairs')} 与传感器算出的 {expected} 不一致")
            if (1, 1) not in steps:
                raise LineFollowerError("程序里没有直行步骤")
            if (1, 0) not in steps and (0, 1) not in steps:
                raise LineFollowerError("程序里没有转向步骤")
            duties = b["pairs"]
        else:
            raise LineFollowerError(f"不支持的积木类型：{bt}")
    if set(motors) != set(MOTOR_PINS):
        raise LineFollowerError("缺少左或右电机")
    if set(sensors) != set(SENSOR_PINS):
        raise LineFollowerError("缺少左或右传感器")
    if duties is None:
        raise LineFollowerError("缺少占空比积木")
    return {"status": "success", "voltage": 5, "motors": motors,
            "sensors": sensors, "steps": steps, "duties": duties}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "power", "voltage": 5},
        {"type": "motor", "side": "left", "pin": 5},
        {"type": "motor", "side": "right", "pin": 6},
        {"type": "sensor", "side": "left", "pin": "A0"},
        {"type": "sensor", "side": "right", "pin": "A1"},
        {"type": "step", "left": 1, "right": 1},
        {"type": "step", "left": 1, "right": 0},
        {"type": "step", "left": 1, "right": 1},
        {"type": "step", "left": 0, "right": 1},
        {"type": "step", "left": 1, "right": 1},
        {"type": "duties", "pairs": [[180, 180], [90, 180], [180, 180],
                                     [180, 90], [180, 180]]},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

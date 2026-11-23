"""R0-U3-L02 motor speed regulation executor (first stage, not a web
classroom, NOT real hardware).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '电机速度调节', focus concept '状态', generic
acceptance. All pins, speeds and commands are implementation choices,
NOT detailed-lesson values.
Model: a simulated motor is valid when, after a start event:
  - a power block comes first with voltage exactly 5;
  - a motor block with pin 5;
  - at least 3 command blocks, each with action in {up, down, stop};
  - exactly one speeds block, after the last command, whose speeds
    list equals the computed speed after each command in order;
  - at most 60 blocks.
State rule (implementation choice): speed starts at 0 (stopped) and
ranges 0-3 (0 stopped, 1 slow, 2 medium, 3 fast). up adds 1 up to a
maximum of 3 and stays at 3; down subtracts 1 down to a minimum of 0
and stays at 0; stop sets speed to 0. Clamping at the ends is not an
error: pressing up at full speed keeps full speed, pressing down at
stopped keeps stopped.
This is a SIMULATOR MODEL ONLY. It never drives a real motor. Real
motor work must be done with a teacher or guardian, with the power off
while wiring, only at the voltage the real board specifies, and never
with fingers, hair or loose clothing near moving parts.
Practice A: up, up, down, stop -> 1, 2, 1, 0.
Practice B: up, up, up, up, down -> 1, 2, 3, 3, 2 (up at full speed
stays at 3).
Fault: an action outside {up, down, stop}; fewer than 3 commands; a
speeds list that does not match the computed speeds; motor pin outside
{5}; missing power/motor/speeds; missing start.
Extension: up, down, down, up, stop -> 1, 0, 0, 1, 0 (down at stopped
stays at 0).
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real hardware run. Those remain missing.
"""

MOTOR_PINS = {5}
MAX_SPEED = 3


class MotorError(Exception):
    pass


def compute_speeds(commands):
    speeds = []
    speed = 0
    for action in commands:
        if action == "up":
            speed = min(MAX_SPEED, speed + 1)
        elif action == "down":
            speed = max(0, speed - 1)
        elif action == "stop":
            speed = 0
        speeds.append(speed)
    return speeds


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise MotorError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise MotorError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "power":
        raise MotorError("缺少供电积木：供电必须是开始后的第一个积木")
    if rest[0].get("voltage") != 5:
        raise MotorError(f"电压 {rest[0].get('voltage')}V 不对，必须是 5V")
    motor_pin = None
    commands = []
    speeds = None
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "motor":
            if motor_pin is not None:
                raise MotorError("电机重复")
            if b.get("pin") not in MOTOR_PINS:
                raise MotorError(f"电机引脚 {b.get('pin')} 不是 5")
            motor_pin = b["pin"]
        elif bt == "command":
            if motor_pin is None:
                raise MotorError("先接电机，再发命令")
            if speeds is not None:
                raise MotorError("速度之后又发命令，这些命令没有速度")
            action = b.get("action")
            if action not in ("up", "down", "stop"):
                raise MotorError(f"命令 {action} 不在加速、减速、停止中")
            commands.append(action)
        elif bt == "speeds":
            if speeds is not None:
                raise MotorError("速度重复")
            if motor_pin is None:
                raise MotorError("没有电机，不能出速度")
            if len(commands) < 3:
                raise MotorError("命令少于 3 个，不能出速度")
            expected = compute_speeds(commands)
            if b.get("speeds") != expected:
                raise MotorError(f"速度 {b.get('speeds')} 与命令算出的 {expected} 不一致")
            speeds = b["speeds"]
        else:
            raise MotorError(f"不支持的积木类型：{bt}")
    if motor_pin is None:
        raise MotorError("缺少电机")
    if speeds is None:
        raise MotorError("缺少速度积木")
    return {"status": "success", "voltage": 5, "motor_pin": motor_pin,
            "commands": commands, "speeds": speeds}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "power", "voltage": 5},
        {"type": "motor", "pin": 5},
        {"type": "command", "action": "up"},
        {"type": "command", "action": "up"},
        {"type": "command", "action": "down"},
        {"type": "command", "action": "stop"},
        {"type": "speeds", "speeds": [1, 2, 1, 0]},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

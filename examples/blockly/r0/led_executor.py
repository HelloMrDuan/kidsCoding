"""R0-U1-L02 LED executor (first stage, not a web classroom, NOT real hardware).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '点亮第一颗LED', focus concept '传感器', generic
acceptance. All voltages, pins, colours and sensor readings are
implementation choices, NOT detailed-lesson values.
Model: a simulated LED experiment is valid when, after a start event:
  - a power block comes first with voltage exactly 5 (less is
    insufficient, more is unsafe; both fail);
  - then one or more complete LED experiments, each in order:
    led block (pin in {11, 12, 13}, colour non-empty, pin not used by
    an earlier experiment), sensor_before block (reading 0-1023),
    switch_on block, sensor_after block (reading 0-1023 and greater
    than sensor_before, showing the light sensor detects the LED light);
  - at the end, at least 1 experiment is complete and none is left
    incomplete;
  - at most 60 blocks.
The sensor link: the focus concept is 传感器, so each experiment checks
that a light sensor reading rises after the LED is switched on. A rise
is the simulator's evidence that the LED lit; it is not a real hardware
measurement.
This is a SIMULATOR MODEL ONLY. It never powers, wires or lights a real
LED, never reads a real sensor, and must not be presented as a real
hardware run. Real wiring must be done with a teacher or guardian, with
the power off while wiring, and only at the voltage the real board
specifies.
Practice A: power 5V; LED red pin 13; sensor 200 -> 800 after switch on.
Practice B: power 5V; LED green pin 12; sensor 150 -> 700 after switch on.
Fault: voltage 3 or 9; pin outside {11, 12, 13}; sensor reading out of
range; sensor_after not greater than sensor_before; an incomplete
experiment; missing power; missing start.
Extension: two LEDs (red pin 13, then green pin 12), each with its own
sensor rise, pass.
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real hardware run. Those remain missing.
"""

PINS = {11, 12, 13}


class LedError(Exception):
    pass


def _reading(value, what):
    if not isinstance(value, int) or isinstance(value, bool):
        raise LedError(f"{what}读数必须是整数")
    if value < 0 or value > 1023:
        raise LedError(f"{what}读数 {value} 超出 0-1023")
    return value


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise LedError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise LedError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "power":
        raise LedError("缺少供电积木：供电必须是开始后的第一个积木")
    voltage = rest[0].get("voltage")
    if voltage != 5:
        if isinstance(voltage, (int, float)) and voltage < 5:
            raise LedError(f"电压 {voltage}V 不足，LED 点不亮")
        raise LedError(f"电压 {voltage}V 不安全，不能用这个电压")
    used_pins = set()
    completed = []
    current = None
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "led":
            if current is not None:
                raise LedError("上一颗 LED 的实验还没完成")
            pin, color = b.get("pin"), b.get("color")
            if pin not in PINS:
                raise LedError(f"引脚 {pin} 不在可用引脚 11、12、13 中")
            if pin in used_pins:
                raise LedError(f"引脚 {pin} 已被用过")
            if not color:
                raise LedError("LED 颜色不能为空")
            current = {"pin": pin, "color": color}
        elif bt == "sensor_before":
            if current is None or "before" in current:
                raise LedError("没有正在进行的 LED 实验可记录点亮前读数")
            current["before"] = _reading(b.get("reading"), "点亮前")
        elif bt == "switch_on":
            if current is None or "before" not in current or "on" in current:
                raise LedError("点亮顺序不对：先接 LED、再记点亮前读数、再开灯")
            current["on"] = True
        elif bt == "sensor_after":
            if current is None or "on" not in current:
                raise LedError("没有点亮的 LED 可记录点亮后读数")
            after = _reading(b.get("reading"), "点亮后")
            if after <= current["before"]:
                raise LedError("点亮后光敏读数没有上升，LED 没有被传感器检测到点亮")
            current["after"] = after
            used_pins.add(current["pin"])
            completed.append(current)
            current = None
        else:
            raise LedError(f"不支持的积木类型：{bt}")
    if current is not None:
        raise LedError("有 LED 实验没有完成")
    if not completed:
        raise LedError("没有完成任何一次点灯实验")
    return {"status": "success", "voltage": 5, "leds": completed}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "power", "voltage": 5},
        {"type": "led", "pin": 13, "color": "red"},
        {"type": "sensor_before", "reading": 200},
        {"type": "switch_on"},
        {"type": "sensor_after", "reading": 800},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

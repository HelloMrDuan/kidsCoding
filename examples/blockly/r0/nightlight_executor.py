"""R0-U3-L01 automatic night light executor (first stage, not a web
classroom, NOT real hardware).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '自动夜灯', focus concept '状态', generic
acceptance. All pins, readings and thresholds are implementation
choices, NOT detailed-lesson values.
Model: a simulated night light is valid when, after a start event:
  - a power block comes first with voltage exactly 5;
  - a sensor block with pin A0;
  - a led block with pin 13;
  - at least 3 read blocks, each with an integer reading in 0-1023;
  - exactly one states block, after the last read, whose states list
    equals the computed state sequence;
  - at most 60 blocks.
State rule (implementation choice, with hysteresis so the light does
not flicker): the light starts off. For each reading in order: if the
light is off and the reading is below 300, it turns on; if the light
is on and the reading is above 500, it turns off; otherwise it keeps
its previous state. So a reading between 300 and 500 changes nothing,
and the boundary readings 300 (from off) and 500 (from on) also change
nothing.
This is a SIMULATOR MODEL ONLY. It never reads a real light sensor and
never lights a real LED. Real sensor work must be done with a teacher
or guardian, with the power off while wiring, and only at the voltage
the real board specifies.
Practice A: readings 800, 200, 400, 600 -> off, on, on, off.
Practice B: readings 200, 350, 250, 600, 100 -> on, on, on, off, on
(350 keeps the light on; a single-threshold rule would wrongly turn
it off).
Fault: a reading outside 0-1023; fewer than 3 readings; a states list
that does not match the computed sequence; sensor pin outside {A0};
led pin outside {13}; missing power/sensor/led/states; missing start.
Extension: readings 900, 100, 450, 550, 200, 700 -> off, on, on, off,
on, off.
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real hardware run or real measurement. Those remain missing.
"""

SENSOR_PINS = {"A0"}
LED_PINS = {13}
ON_THRESHOLD = 300
OFF_THRESHOLD = 500


class NightlightError(Exception):
    pass


def compute_states(readings):
    states = []
    state = "off"
    for r in readings:
        if state == "off" and r < ON_THRESHOLD:
            state = "on"
        elif state == "on" and r > OFF_THRESHOLD:
            state = "off"
        states.append(state)
    return states


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise NightlightError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise NightlightError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "power":
        raise NightlightError("缺少供电积木：供电必须是开始后的第一个积木")
    if rest[0].get("voltage") != 5:
        raise NightlightError(f"电压 {rest[0].get('voltage')}V 不对，必须是 5V")
    sensor_pin = None
    led_pin = None
    readings = []
    states = None
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "sensor":
            if sensor_pin is not None:
                raise NightlightError("光敏传感器重复")
            if b.get("pin") not in SENSOR_PINS:
                raise NightlightError(f"传感器引脚 {b.get('pin')} 不是 A0")
            sensor_pin = b["pin"]
        elif bt == "led":
            if led_pin is not None:
                raise NightlightError("LED 重复")
            if b.get("pin") not in LED_PINS:
                raise NightlightError(f"LED 引脚 {b.get('pin')} 不是 13")
            led_pin = b["pin"]
        elif bt == "read":
            if sensor_pin is None or led_pin is None:
                raise NightlightError("先接传感器和 LED，再读数")
            if states is not None:
                raise NightlightError("状态之后又读数，这些读数没有状态")
            value = b.get("reading")
            if not isinstance(value, int) or isinstance(value, bool):
                raise NightlightError("读数必须是整数")
            if value < 0 or value > 1023:
                raise NightlightError(f"读数 {value} 超出 0-1023")
            readings.append(value)
        elif bt == "states":
            if states is not None:
                raise NightlightError("状态重复")
            if sensor_pin is None or led_pin is None:
                raise NightlightError("没有传感器和 LED，不能出状态")
            if len(readings) < 3:
                raise NightlightError("读数少于 3 个，不能出状态")
            expected = compute_states(readings)
            if b.get("states") != expected:
                raise NightlightError(f"状态 {b.get('states')} 与读数算出的 {expected} 不一致")
            states = b["states"]
        else:
            raise NightlightError(f"不支持的积木类型：{bt}")
    if sensor_pin is None:
        raise NightlightError("缺少光敏传感器")
    if led_pin is None:
        raise NightlightError("缺少 LED")
    if states is None:
        raise NightlightError("缺少状态积木")
    return {"status": "success", "voltage": 5, "sensor_pin": sensor_pin,
            "led_pin": led_pin, "readings": readings, "states": states}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "power", "voltage": 5},
        {"type": "sensor", "pin": "A0"},
        {"type": "led", "pin": 13},
        {"type": "read", "reading": 800},
        {"type": "read", "reading": 200},
        {"type": "read", "reading": 400},
        {"type": "read", "reading": 600},
        {"type": "states", "states": ["off", "on", "on", "off"]},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

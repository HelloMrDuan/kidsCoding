"""R0-U2-L01 light intensity reading executor (first stage, not a web
classroom, NOT real hardware).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '读取光线强度', focus concept '输入', generic
acceptance. All pins, readings and level thresholds are implementation
choices, NOT detailed-lesson values.
Model: a simulated light reading is valid when, after a start event:
  - a power block comes first with voltage exactly 5;
  - a sensor block with pin in {A0, A1};
  - at least 3 read blocks, each with an integer reading in 0-1023;
  - exactly one report block, after the last read, whose levels list
    equals the levels computed from the readings in order;
  - at most 60 blocks.
Level thresholds (implementation choices): reading < 300 is dark (暗),
300-700 is medium (中), > 700 is bright (亮). Boundaries 300 and 700
are medium. A report that does not match the computed levels fails:
the report must be read off the readings, not guessed.
This is a SIMULATOR MODEL ONLY. It never reads a real light sensor.
Real sensor work must be done with a teacher or guardian, with the
power off while wiring, and only at the voltage the real board
specifies.
Practice A: readings 100, 500, 900 -> levels dark, medium, bright.
Practice B: readings 250, 300, 701 -> levels dark, medium, bright
(300 and 701 test the boundaries).
Fault: voltage not 5; sensor pin outside {A0, A1}; a reading outside
0-1023; fewer than 3 readings; a report that does not match; missing
power/sensor/report; missing start.
Extension: 4 readings 50, 350, 700, 950 -> dark, medium, medium, bright.
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real hardware run. Those remain missing.
"""

SENSOR_PINS = {"A0", "A1"}


def level_of(reading):
    if reading < 300:
        return "dark"
    if reading <= 700:
        return "medium"
    return "bright"


class LightError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise LightError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise LightError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "power":
        raise LightError("缺少供电积木：供电必须是开始后的第一个积木")
    if rest[0].get("voltage") != 5:
        raise LightError(f"电压 {rest[0].get('voltage')}V 不对，必须是 5V")
    sensor_pin = None
    readings = []
    report = None
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "sensor":
            if sensor_pin is not None:
                raise LightError("光敏传感器重复")
            if b.get("pin") not in SENSOR_PINS:
                raise LightError(f"传感器引脚 {b.get('pin')} 不在 A0、A1 中")
            sensor_pin = b["pin"]
        elif bt == "read":
            if sensor_pin is None:
                raise LightError("先接传感器，再读数")
            if report is not None:
                raise LightError("报告之后又读数，这些读数没有报告")
            value = b.get("reading")
            if not isinstance(value, int) or isinstance(value, bool):
                raise LightError("读数必须是整数")
            if value < 0 or value > 1023:
                raise LightError(f"读数 {value} 超出 0-1023")
            readings.append(value)
        elif bt == "report":
            if report is not None:
                raise LightError("报告重复")
            if sensor_pin is None:
                raise LightError("没有传感器，不能报告")
            if len(readings) < 3:
                raise LightError("读数少于 3 个，不能报告")
            expected = [level_of(r) for r in readings]
            if b.get("levels") != expected:
                raise LightError(f"报告的级别 {b.get('levels')} 与读数算出的 {expected} 不一致")
            report = b["levels"]
        else:
            raise LightError(f"不支持的积木类型：{bt}")
    if sensor_pin is None:
        raise LightError("缺少光敏传感器")
    if report is None:
        raise LightError("缺少报告积木")
    return {"status": "success", "voltage": 5, "sensor_pin": sensor_pin,
            "readings": readings,
            "levels": [level_of(r) for r in readings]}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "power", "voltage": 5},
        {"type": "sensor", "pin": "A0"},
        {"type": "read", "reading": 100},
        {"type": "read", "reading": 500},
        {"type": "read", "reading": 900},
        {"type": "report", "levels": ["dark", "medium", "bright"]},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

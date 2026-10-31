"""R0-U2-L02 temperature and humidity display executor (first stage,
not a web classroom, NOT real hardware).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '温湿度显示', focus concept '输入', generic
acceptance. All pins, values and display formats are implementation
choices, NOT detailed-lesson values.
Model: a simulated climate display is valid when, after a start event:
  - a power block comes first with voltage exactly 5;
  - a sensor block with pin in {2, 3};
  - at least 2 read blocks, each with temp in -10..50 and humidity
    in 0..100 (both numbers);
  - exactly one display block, after the last read, whose lines list
    equals the formatted display for the readings in order, one line
    per reading: "温度{temp}℃ 湿度{humidity}%";
  - at most 60 blocks.
The display must be computed from the readings, not invented: a display
line that does not match its reading fails.
This is a SIMULATOR MODEL ONLY. It never reads a real temperature or
humidity sensor and never drives a real display. Real sensor work must
be done with a teacher or guardian, with the power off while wiring,
and only at the voltage the real board specifies.
Practice A: readings (25, 60), (26, 58) -> two display lines.
Practice B: readings (20, 80), (21, 75), (22, 70) -> three display lines.
Fault: temp outside -10..50; humidity outside 0..100; fewer than 2
readings; a display that does not match; sensor pin outside {2, 3};
missing power/sensor/display; missing start.
Extension: 4 readings pass.
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real hardware run or real measurement. Those remain missing.
"""

SENSOR_PINS = {2, 3}


def _number(value, what):
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise ClimateError(f"{what}必须是数字")
    return value


class ClimateError(Exception):
    pass


def _format(temp, humidity):
    return f"温度{temp}℃ 湿度{humidity}%"


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise ClimateError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise ClimateError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "power":
        raise ClimateError("缺少供电积木：供电必须是开始后的第一个积木")
    if rest[0].get("voltage") != 5:
        raise ClimateError(f"电压 {rest[0].get('voltage')}V 不对，必须是 5V")
    sensor_pin = None
    readings = []
    display = None
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "sensor":
            if sensor_pin is not None:
                raise ClimateError("温湿度传感器重复")
            if b.get("pin") not in SENSOR_PINS:
                raise ClimateError(f"传感器引脚 {b.get('pin')} 不在 2、3 中")
            sensor_pin = b["pin"]
        elif bt == "read":
            if sensor_pin is None:
                raise ClimateError("先接传感器，再读数")
            if display is not None:
                raise ClimateError("显示之后又读数，这些读数没有显示")
            temp = _number(b.get("temp"), "温度")
            humidity = _number(b.get("humidity"), "湿度")
            if temp < -10 or temp > 50:
                raise ClimateError(f"温度 {temp} 超出 -10..50")
            if humidity < 0 or humidity > 100:
                raise ClimateError(f"湿度 {humidity} 超出 0..100")
            readings.append({"temp": temp, "humidity": humidity})
        elif bt == "display":
            if display is not None:
                raise ClimateError("显示重复")
            if sensor_pin is None:
                raise ClimateError("没有传感器，不能显示")
            if len(readings) < 2:
                raise ClimateError("读数少于 2 个，不能显示")
            expected = [_format(r["temp"], r["humidity"]) for r in readings]
            if b.get("lines") != expected:
                raise ClimateError(f"显示内容 {b.get('lines')} 与读数算出的 {expected} 不一致")
            display = b["lines"]
        else:
            raise ClimateError(f"不支持的积木类型：{bt}")
    if sensor_pin is None:
        raise ClimateError("缺少温湿度传感器")
    if display is None:
        raise ClimateError("缺少显示积木")
    return {"status": "success", "voltage": 5, "sensor_pin": sensor_pin,
            "readings": readings, "display": display}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "power", "voltage": 5},
        {"type": "sensor", "pin": 2},
        {"type": "read", "temp": 25, "humidity": 60},
        {"type": "read", "temp": 26, "humidity": 58},
        {"type": "display", "lines": ["温度25℃ 湿度60%", "温度26℃ 湿度58%"]},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

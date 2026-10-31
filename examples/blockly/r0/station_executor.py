"""R0-U2-L06 desktop weather station executor (first stage, not a web
classroom, NOT real hardware).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '制作桌面气象站', focus concept '校准', generic
acceptance. All pins, values and formats are implementation choices, NOT
detailed-lesson values.
Model: a simulated weather station is valid when, in this order after
a start event:
  - a power block first with voltage exactly 5;
  - a station block with a non-empty name;
  - a sensor block with pin 2;
  - a reference block with true_temp in -10..50 and true_humidity in
    0..100;
  - at least 2 measure blocks, each with temp in -10..50 and humidity
    in 0..100;
  - exactly one compare block whose error_temp and error_humidity equal
    the mean absolute errors against the reference;
  - exactly one calibrate block whose temp_offset and humidity_offset
    make the corrected means equal the reference values;
  - exactly one display block whose lines equal the corrected readings
    in order, one line per reading: "温度{temp}℃ 湿度{humidity}%"
    with each reading corrected by its offset;
  - at most 60 blocks. Any block after display fails.
Calibration is the point of this capstone: the display shows corrected
values, not raw readings, and the offsets must be computed from the
measures and the reference, not guessed.
This is a SIMULATOR MODEL ONLY. It never reads a real sensor, never
calibrates real hardware, and never forecasts real weather. A simulator
pass does NOT mean a real station is accurate. Real sensor work must be
done with a teacher or guardian, with the power off while wiring, and
only at the voltage the real board specifies.
Practice A: station 森林气象站; reference 25, 60; measures (24, 58),
(26, 62); errors temp 1, humidity 2; offsets 0, 0; display shows the
same two lines, corrected.
Practice B: station 我们班气象站; reference 20, 50; measures (18, 46),
(20, 50); errors temp 1, humidity 2; offsets 1, 2; display shows
corrected lines (19, 48) and (21, 52).
Fault: sensor pin outside {2}; a measure outside its range; fewer than
2 measures; a compare errors mismatch; a calibrate offset mismatch; a
display mismatch; missing station/sensor/reference/compare/calibrate/
display; missing start.
Extension: 3 measures (22, 55), (19, 55), (22, 55) against reference
22, 55 pass with errors temp 1, humidity 0 and offsets 1, 0.
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real hardware run or real measurement. Those remain missing.
"""


class StationError(Exception):
    pass


def _number(value, what):
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise StationError(f"{what}必须是数字")
    return value


def _close(a, b):
    return abs(a - b) < 1e-9


def _format(temp, humidity):
    return f"温度{temp}℃ 湿度{humidity}%"


def _check_range(temp, humidity, what):
    if temp < -10 or temp > 50:
        raise StationError(f"{what}温度 {temp} 超出 -10..50")
    if humidity < 0 or humidity > 100:
        raise StationError(f"{what}湿度 {humidity} 超出 0..100")


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise StationError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise StationError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "power":
        raise StationError("缺少供电积木：供电必须是开始后的第一个积木")
    if rest[0].get("voltage") != 5:
        raise StationError(f"电压 {rest[0].get('voltage')}V 不对，必须是 5V")
    name = None
    sensor_pin = None
    reference = None
    measures = []
    compare = None
    calibrate = None
    display = None
    stage = 0  # 0 station, 1 sensor, 2 reference, 3 measures, 4 compare, 5 calibrate, 6 display, 7 done
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "station":
            if stage != 0:
                raise StationError("气象站名称必须在传感器之前")
            if not b.get("name"):
                raise StationError("气象站名称不能为空")
            name = b["name"]
            stage = 1
        elif bt == "sensor":
            if stage != 1:
                raise StationError("传感器必须在气象站名称之后、标准值之前")
            if b.get("pin") != 2:
                raise StationError(f"传感器引脚 {b.get('pin')} 不是 2")
            sensor_pin = b["pin"]
            stage = 2
        elif bt == "reference":
            if stage != 2:
                raise StationError("标准值必须在传感器之后、测量之前")
            true_temp = _number(b.get("true_temp"), "标准温度")
            true_humidity = _number(b.get("true_humidity"), "标准湿度")
            _check_range(true_temp, true_humidity, "标准值")
            reference = {"true_temp": true_temp, "true_humidity": true_humidity}
            stage = 3
        elif bt == "measure":
            if stage not in (3,):
                raise StationError("测量必须在标准值之后、比较之前")
            temp = _number(b.get("temp"), "温度")
            humidity = _number(b.get("humidity"), "湿度")
            _check_range(temp, humidity, "测量值")
            measures.append({"temp": temp, "humidity": humidity})
        elif bt == "compare":
            if stage != 3:
                raise StationError("比较必须在测量之后")
            if len(measures) < 2:
                raise StationError("测量少于 2 组，不能比较")
            error_temp = sum(abs(m["temp"] - reference["true_temp"]) for m in measures) / len(measures)
            error_humidity = sum(abs(m["humidity"] - reference["true_humidity"]) for m in measures) / len(measures)
            if not _close(b.get("error_temp", -1), error_temp) or not _close(b.get("error_humidity", -1), error_humidity):
                raise StationError(f"比较误差与算出的温度 {error_temp} 湿度 {error_humidity} 不一致")
            compare = {"error_temp": error_temp, "error_humidity": error_humidity}
            stage = 4
        elif bt == "calibrate":
            if stage != 4:
                raise StationError("校准必须在比较之后")
            temp_offset = _number(b.get("temp_offset"), "温度偏移")
            humidity_offset = _number(b.get("humidity_offset"), "湿度偏移")
            mean_temp = sum(m["temp"] for m in measures) / len(measures)
            mean_humidity = sum(m["humidity"] for m in measures) / len(measures)
            if not _close(mean_temp + temp_offset, reference["true_temp"]) or not _close(mean_humidity + humidity_offset, reference["true_humidity"]):
                raise StationError("校准后平均值不等于标准值")
            calibrate = {"temp_offset": temp_offset, "humidity_offset": humidity_offset}
            stage = 5
        elif bt == "display":
            if stage != 5:
                raise StationError("显示必须在校准之后")
            expected = [_format(m["temp"] + calibrate["temp_offset"],
                                m["humidity"] + calibrate["humidity_offset"]) for m in measures]
            if b.get("lines") != expected:
                raise StationError(f"显示内容 {b.get('lines')} 与校准后的 {expected} 不一致")
            display = b["lines"]
            stage = 6
        else:
            raise StationError(f"不支持的积木类型：{bt}")
    if name is None:
        raise StationError("缺少气象站名称")
    if sensor_pin is None:
        raise StationError("缺少传感器")
    if reference is None:
        raise StationError("缺少标准值")
    if compare is None:
        raise StationError("缺少比较积木")
    if calibrate is None:
        raise StationError("缺少校准积木")
    if display is None:
        raise StationError("缺少显示积木")
    return {"status": "success", "voltage": 5, "station": name,
            "sensor_pin": sensor_pin, "reference": reference,
            "measures": measures, "compare": compare,
            "calibrate": calibrate, "display": display}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "power", "voltage": 5},
        {"type": "station", "name": "森林气象站"},
        {"type": "sensor", "pin": 2},
        {"type": "reference", "true_temp": 25, "true_humidity": 60},
        {"type": "measure", "temp": 24, "humidity": 58},
        {"type": "measure", "temp": 26, "humidity": 62},
        {"type": "compare", "error_temp": 1, "error_humidity": 2},
        {"type": "calibrate", "temp_offset": 0, "humidity_offset": 0},
        {"type": "display", "lines": ["温度24℃ 湿度58%", "温度26℃ 湿度62%"]},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

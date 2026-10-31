"""R0-U2-L05 sensor error comparison executor (first stage, not a web
classroom, NOT real hardware).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '传感器误差比较', focus concept '校准', generic
acceptance. All pins, values and rules are implementation choices, NOT
detailed-lesson values.
Model: a simulated calibration is valid when, in this order after a
start event:
  - a power block first with voltage exactly 5;
  - a reference block with a true value in 2..400 cm;
  - exactly two sensor blocks, named A and B, with distinct pins in
    {9, 10};
  - measure blocks (sensor A or B, value in 2..400 cm), at least 2
    measures per sensor;
  - exactly one compare block whose better and errors match the
    computed values: error per sensor is the mean absolute error
    against the true value; better is the sensor with the smaller
    error, or "tie" when the errors are equal;
  - exactly one calibrate block whose sensor is the better sensor
    (either sensor when tied) and whose offset makes the corrected
    mean equal the true value: mean + offset == true value;
  - at most 60 blocks. Any block after calibrate fails.
This is a SIMULATOR MODEL ONLY. It never measures a real sensor and
never calibrates real hardware. A simulator pass does NOT mean a real
sensor is accurate. Real calibration must be done with a teacher or
guardian, with the power off while wiring, and only at the voltage the
real board specifies.
Practice A: true 100; A measures 98, 102 (error 2); B measures 90, 110
(error 10); better A; offset 0.
Practice B: true 100; A measures 95, 97 (error 4); B measures 104, 106
(error 5); better A; offset 4.
Fault: a sensor pin outside {9, 10} or repeated; a measure for an
undeclared sensor; fewer than 2 measures per sensor; a compare better
or errors mismatch; a calibrate offset mismatch; calibrating the worse
sensor; missing reference/sensors/compare/calibrate; missing start.
Extension: a tie (A 98, 102 and B 102, 98, both error 2) calibrating A
with offset 0 passes.
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real hardware run or real measurement. Those remain missing.
"""

SENSOR_PINS = {9, 10}


class CalibrateError(Exception):
    pass


def _mean(values):
    return sum(values) / len(values)


def _close(a, b):
    return abs(a - b) < 1e-9


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise CalibrateError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise CalibrateError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "power":
        raise CalibrateError("缺少供电积木：供电必须是开始后的第一个积木")
    if rest[0].get("voltage") != 5:
        raise CalibrateError(f"电压 {rest[0].get('voltage')}V 不对，必须是 5V")
    true_value = None
    sensors = {}
    measures = {"A": [], "B": []}
    compare = None
    calibrate = None
    stage = 0  # 0 reference, 1 sensors, 2 measures, 3 compare, 4 calibrate, 5 done
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "reference":
            if stage != 0:
                raise CalibrateError("标准值必须在传感器之前")
            value = b.get("true_value")
            if not isinstance(value, (int, float)) or isinstance(value, bool):
                raise CalibrateError("标准值必须是数字")
            if value < 2 or value > 400:
                raise CalibrateError(f"标准值 {value} 超出 2..400 厘米")
            true_value = value
            stage = 1
        elif bt == "sensor":
            if stage != 1:
                raise CalibrateError("传感器必须在标准值之后、测量之前")
            name = b.get("name")
            if name not in ("A", "B"):
                raise CalibrateError(f"传感器名 {name} 必须是 A 或 B")
            if name in sensors:
                raise CalibrateError(f"传感器 {name} 重复")
            if b.get("pin") not in SENSOR_PINS:
                raise CalibrateError(f"传感器引脚 {b.get('pin')} 不在 9、10 中")
            if b.get("pin") in sensors.values():
                raise CalibrateError("传感器引脚重复")
            sensors[name] = b["pin"]
        elif bt == "measure":
            if stage not in (1, 2):
                raise CalibrateError("测量必须在传感器之后、比较之前")
            if set(sensors) != {"A", "B"}:
                raise CalibrateError("两个传感器都接好，才能测量")
            name = b.get("sensor")
            if name not in measures:
                raise CalibrateError(f"测量用了未声明的传感器 {name}")
            value = b.get("value")
            if not isinstance(value, (int, float)) or isinstance(value, bool):
                raise CalibrateError("测量值必须是数字")
            if value < 2 or value > 400:
                raise CalibrateError(f"测量值 {value} 超出 2..400 厘米")
            measures[name].append(value)
            stage = 2
        elif bt == "compare":
            if stage != 2:
                raise CalibrateError("比较必须在测量之后")
            if len(measures["A"]) < 2 or len(measures["B"]) < 2:
                raise CalibrateError("每个传感器至少测 2 次，才能比较")
            error_a = _mean([abs(v - true_value) for v in measures["A"]])
            error_b = _mean([abs(v - true_value) for v in measures["B"]])
            if _close(error_a, error_b):
                better = "tie"
            elif error_a < error_b:
                better = "A"
            else:
                better = "B"
            if b.get("better") != better:
                raise CalibrateError(f"比较结果 {b.get('better')} 与算出的 {better} 不一致")
            if not _close(b.get("error_a", -1), error_a) or not _close(b.get("error_b", -1), error_b):
                raise CalibrateError(f"比较误差与算出的 A={error_a} B={error_b} 不一致")
            compare = {"better": better, "error_a": error_a, "error_b": error_b}
            stage = 3
        elif bt == "calibrate":
            if stage != 3:
                raise CalibrateError("校准必须在比较之后")
            name = b.get("sensor")
            if compare["better"] != "tie" and name != compare["better"]:
                raise CalibrateError(f"校准了误差更大的传感器 {name}，应该校准 {compare['better']}")
            if name not in measures:
                raise CalibrateError(f"校准用了未声明的传感器 {name}")
            offset = b.get("offset")
            if not isinstance(offset, (int, float)) or isinstance(offset, bool):
                raise CalibrateError("校准偏移必须是数字")
            if not _close(_mean(measures[name]) + offset, true_value):
                raise CalibrateError("校准后平均值不等于标准值")
            calibrate = {"sensor": name, "offset": offset}
            stage = 4
        else:
            raise CalibrateError(f"不支持的积木类型：{bt}")
    if true_value is None:
        raise CalibrateError("缺少标准值")
    if set(sensors) != {"A", "B"}:
        raise CalibrateError("缺少传感器 A 或 B")
    if compare is None:
        raise CalibrateError("缺少比较积木")
    if calibrate is None:
        raise CalibrateError("缺少校准积木")
    return {"status": "success", "voltage": 5, "true_value": true_value,
            "sensors": sensors, "measures": measures,
            "compare": compare, "calibrate": calibrate}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "power", "voltage": 5},
        {"type": "reference", "true_value": 100},
        {"type": "sensor", "name": "A", "pin": 9},
        {"type": "sensor", "name": "B", "pin": 10},
        {"type": "measure", "sensor": "A", "value": 98},
        {"type": "measure", "sensor": "A", "value": 102},
        {"type": "measure", "sensor": "B", "value": 90},
        {"type": "measure", "sensor": "B", "value": 110},
        {"type": "compare", "better": "A", "error_a": 2, "error_b": 10},
        {"type": "calibrate", "sensor": "A", "offset": 0},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

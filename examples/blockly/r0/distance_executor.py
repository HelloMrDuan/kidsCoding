"""R0-U2-L03 distance alarm executor (first stage, not a web classroom,
NOT real hardware).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '测距报警', focus concept '采样', generic
acceptance. All pins, ranges, thresholds and samples are implementation
choices, NOT detailed-lesson values.
Model: a simulated distance alarm is valid when, after a start event:
  - a power block comes first with voltage exactly 5;
  - a sensor block with pin in {9, 10};
  - at least 3 sample blocks, each with an integer distance in cm in
    2..400;
  - exactly one alarm block, after the last sample, whose state equals
    the computed alarm: True if and only if at least 2 samples are
    below 20 cm, otherwise False;
  - at most 60 blocks.
Sampling lesson: one low sample alone does NOT alarm. A single low
reading could be noise; only 2 or more low samples alarm. The alarm
block must be computed from the samples, not guessed.
This is a SIMULATOR MODEL ONLY. It never measures a real distance and
never sounds a real alarm. Real sensor work must be done with a teacher
or guardian, with the power off while wiring, and only at the voltage
the real board specifies. A real alarm is a warning to check with an
adult, not a toy to trigger on purpose.
Practice A: samples 100, 15, 12 -> 2 below 20 -> alarm True.
Practice B: samples 100, 15, 80 -> only 1 below 20 -> alarm False.
Fault: a sample outside 2..400; fewer than 3 samples; an alarm state
that does not match the samples; sensor pin outside {9, 10}; missing
power/sensor/alarm; missing start.
Extension: 5 samples 100, 15, 12, 90, 18 -> 3 below 20 -> alarm True.
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real hardware run or real measurement. Those remain missing.
"""

SENSOR_PINS = {9, 10}
THRESHOLD = 20


class DistanceError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise DistanceError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise DistanceError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "power":
        raise DistanceError("缺少供电积木：供电必须是开始后的第一个积木")
    if rest[0].get("voltage") != 5:
        raise DistanceError(f"电压 {rest[0].get('voltage')}V 不对，必须是 5V")
    sensor_pin = None
    samples = []
    alarm = None
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "sensor":
            if sensor_pin is not None:
                raise DistanceError("测距传感器重复")
            if b.get("pin") not in SENSOR_PINS:
                raise DistanceError(f"传感器引脚 {b.get('pin')} 不在 9、10 中")
            sensor_pin = b["pin"]
        elif bt == "sample":
            if sensor_pin is None:
                raise DistanceError("先接传感器，再采样")
            if alarm is not None:
                raise DistanceError("报警之后又采样，这些采样没有参与报警判断")
            value = b.get("distance")
            if not isinstance(value, int) or isinstance(value, bool):
                raise DistanceError("距离必须是整数厘米")
            if value < 2 or value > 400:
                raise DistanceError(f"距离 {value} 超出 2..400 厘米")
            samples.append(value)
        elif bt == "alarm":
            if alarm is not None:
                raise DistanceError("报警重复")
            if sensor_pin is None:
                raise DistanceError("没有传感器，不能报警")
            if len(samples) < 3:
                raise DistanceError("采样少于 3 个，不能报警判断")
            expected = sum(1 for s in samples if s < THRESHOLD) >= 2
            if b.get("state") is not expected:
                raise DistanceError(f"报警状态 {b.get('state')} 与采样算出的 {expected} 不一致")
            alarm = b["state"]
        else:
            raise DistanceError(f"不支持的积木类型：{bt}")
    if sensor_pin is None:
        raise DistanceError("缺少测距传感器")
    if alarm is None:
        raise DistanceError("缺少报警积木")
    return {"status": "success", "voltage": 5, "sensor_pin": sensor_pin,
            "samples": samples, "alarm": alarm}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "power", "voltage": 5},
        {"type": "sensor", "pin": 9},
        {"type": "sample", "distance": 100},
        {"type": "sample", "distance": 15},
        {"type": "sample", "distance": 12},
        {"type": "alarm", "state": True},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

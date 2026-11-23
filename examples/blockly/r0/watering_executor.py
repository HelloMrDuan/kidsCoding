"""R0-U4-L02 smart watering machine executor (first stage, not a web
classroom, NOT real hardware, NOT real plants).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '设计智慧浇水机', focus concept '迭代', generic
acceptance. All pins, thresholds and readings are implementation
choices, NOT detailed-lesson values.
Model: a simulated watering machine is valid when, in this order
after a start event:
  - a plant block with a non-empty name;
  - a sensor block with pin A0;
  - a test block with at least 3 readings, each an integer in
    0..100 (soil moisture: 0 dry, 100 wet, same test set for every
    version);
  - at least 2 version blocks, each with a threshold integer in
    0..100, and every version's threshold different from the previous
    version's threshold (iteration must change something);
  - exactly one result block, after the last version, whose correct
    list equals the computed correct-decision count per version;
  - at most 60 blocks.
Decision rule (implementation choice): the correct watering decision
for a reading is to water when moisture is below 40 and not to water
when it is 40 or more. A version waters when the reading is below its
threshold. Its correct count is the number of readings where its
decision matches the correct decision.
Iteration rule: correct counts must be non-decreasing across versions,
and the final version must be perfect (correct on every reading).
So the threshold is moved, version by version, until the machine
waters exactly when it should.
This is a SIMULATOR MODEL ONLY with fictional example plants and
readings. It never waters a real plant. Real plants must be watered
only with a teacher or guardian, with the power off while wiring, and
never with electrical parts in water.
Practice A: test readings 30, 45, 60, 20; thresholds 20, 30, 40 ->
correct counts 2, 3, 4 (perfect at the end).
Practice B: test readings 25, 50, 80; thresholds 60, 40 -> correct
counts 2, 3 (perfect at the end).
Fault: a reading or threshold outside 0..100; fewer than 3 readings;
fewer than 2 versions; a repeated threshold; correct counts that
decrease; a final version that is not perfect; a result list that
does not match; missing plant/sensor/test/result; missing start.
Extension: test readings 30, 45, 60, 20; thresholds 10, 25, 35, 40 ->
correct counts 2, 3, 4, 4 (perfect reached at version 3 and kept).
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real hardware run or real measurement. Those remain missing.
"""

SENSOR_PINS = {"A0"}
CORRECT_THRESHOLD = 40


class WateringError(Exception):
    pass


def _correct_count(threshold, readings):
    count = 0
    for r in readings:
        if (r < threshold) == (r < CORRECT_THRESHOLD):
            count += 1
    return count


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise WateringError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise WateringError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "plant":
        raise WateringError("缺少植物：植物必须是开始后的第一个积木")
    if not rest[0].get("name"):
        raise WateringError("植物名称不能为空")
    plant = rest[0]["name"]
    sensor_pin = None
    readings = None
    thresholds = []
    result = None
    stage = 0  # 0 sensor, 1 test, 2 versions, 3 result, 4 done
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "sensor":
            if stage != 0:
                raise WateringError("传感器必须在植物之后、测试之前")
            if b.get("pin") not in SENSOR_PINS:
                raise WateringError(f"传感器引脚 {b.get('pin')} 不是 A0")
            sensor_pin = b["pin"]
            stage = 1
        elif bt == "test":
            if stage != 1:
                raise WateringError("测试必须在传感器之后、版本之前")
            values = b.get("readings")
            if not isinstance(values, list) or len(values) < 3:
                raise WateringError("测试读数少于 3 个")
            for v in values:
                if not isinstance(v, int) or isinstance(v, bool):
                    raise WateringError("测试读数必须是整数")
                if v < 0 or v > 100:
                    raise WateringError(f"测试读数 {v} 超出 0..100")
            readings = values
            stage = 2
        elif bt == "version":
            if stage != 2:
                raise WateringError("版本必须在测试之后、结果之前")
            threshold = b.get("threshold")
            if not isinstance(threshold, int) or isinstance(threshold, bool):
                raise WateringError("阈值必须是整数")
            if threshold < 0 or threshold > 100:
                raise WateringError(f"阈值 {threshold} 超出 0..100")
            if thresholds and threshold == thresholds[-1]:
                raise WateringError("这一版阈值和上一版一样，迭代没有改动")
            thresholds.append(threshold)
        elif bt == "result":
            if stage != 2:
                raise WateringError("结果必须在版本之后")
            if len(thresholds) < 2:
                raise WateringError("版本少于 2 个，不能出结果")
            correct = [_correct_count(t, readings) for t in thresholds]
            for prev, cur in zip(correct, correct[1:]):
                if cur < prev:
                    raise WateringError("正确数下降了，迭代没有往好的方向走")
            if correct[-1] != len(readings):
                raise WateringError("最后一版没有全对，迭代没有完成")
            if b.get("correct") != correct:
                raise WateringError(f"结果 {b.get('correct')} 与算出的 {correct} 不一致")
            result = {"correct": correct}
            stage = 3
        else:
            raise WateringError(f"不支持的积木类型：{bt}")
    if sensor_pin is None:
        raise WateringError("缺少传感器")
    if readings is None:
        raise WateringError("缺少测试读数")
    if result is None:
        raise WateringError("缺少结果积木")
    return {"status": "success", "plant": plant, "sensor_pin": sensor_pin,
            "readings": readings, "thresholds": thresholds,
            "result": result}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "plant", "name": "小番茄"},
        {"type": "sensor", "pin": "A0"},
        {"type": "test", "readings": [30, 45, 60, 20]},
        {"type": "version", "threshold": 20},
        {"type": "version", "threshold": 30},
        {"type": "version", "threshold": 40},
        {"type": "result", "correct": [2, 3, 4]},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

"""M0-U2-L01 colour pattern executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '发现颜色序列', focus concept '模式', generic
acceptance. All colour sequences are implementation choices, NOT
detailed-lesson values.
Model: a repeating colour pattern has a unit that repeats. The program
states the unit and the full sequence; it passes only if the sequence
is exactly the unit repeated.
Practice A: unit [red, blue], sequence red, blue, red, blue.
Practice B: unit [red, yellow, green], sequence red, yellow, green, red,
yellow, green (different goal: 3-colour unit, not 2-colour).
Fault: sequence red, blue, red, yellow does not match unit [red, blue].
Extension: predict the next colour after the sequence (red for unit
[red, blue] after an even number of items).
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class PatternError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise PatternError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise PatternError("程序过长：超过40个积木")
    unit = None
    sequence = None
    prediction = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "unit":
            unit = b.get("colors")
        elif bt == "sequence":
            sequence = b.get("colors")
        elif bt == "predict_next":
            prediction = b.get("color")
        else:
            raise PatternError(f"不支持的积木类型：{bt}")
    if not unit or not sequence:
        raise PatternError("要先说出重复单元，再给出完整颜色序列")
    expected = [unit[i % len(unit)] for i in range(len(sequence))]
    if sequence != expected:
        raise PatternError(f"颜色序列不符合重复单元 {unit}：实际 {sequence}")
    result = {"status": "success", "unit": unit, "sequence": sequence}
    if prediction is not None:
        expected_next = unit[len(sequence) % len(unit)]
        if prediction != expected_next:
            raise PatternError(f"预测下一个颜色错误：应为 {expected_next}，实际 {prediction}")
        result["next"] = prediction
    return result

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "unit", "colors": ["red", "blue"]},
        {"type": "sequence", "colors": ["red", "blue", "red", "blue"]},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

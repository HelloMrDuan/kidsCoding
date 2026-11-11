"""D0-U4-L02 data-to-animation executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '把数据变成动画', focus concept '叙事', generic
acceptance. All data and animations are implementation choices, NOT
detailed-lesson values.
Model: a data animation has a dataset (at least 3 values, all >= 0)
and a frame for each value, where each frame's bar height must equal
its value, and the animation ends with a narration that names the
largest value. A program passes only if every frame matches its value,
the frame count equals the value count, and the final narration names
the largest value.
Practice A: values [3, 1, 2] -> frames heights 3, 1, 2, narration "最大是 3".
Practice B: values [5, 5, 2] -> frames heights 5, 5, 2, narration "最大是 5"
(different goal: tied largest values, either name accepted? No — the
narration must name the value 5, not a position).
Fault: a frame height that does not match its value, or a narration
that names the wrong largest value, or fewer than 3 values.
Extension: add a 4th value 4 -> frames 3, 1, 2, 4, narration "最大是 4".
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class DataAnimError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise DataAnimError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise DataAnimError("程序过长：超过60个积木")
    values = []
    frames = []
    narration = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "data":
            values = b.get("values")
        elif bt == "frame":
            frames.append(b.get("height"))
        elif bt == "narration":
            narration = b.get("text")
        else:
            raise DataAnimError(f"不支持的积木类型：{bt}")
    if len(values) < 3:
        raise DataAnimError("数据至少要包含 3 个值")
    if any(v < 0 for v in values):
        raise DataAnimError("数据值不能为负")
    if frames != values:
        raise DataAnimError(f"动画帧高度必须等于数据值：数据 {values}，帧 {frames}")
    if narration is None:
        raise DataAnimError("动画结尾需要旁白")
    largest = max(values)
    if str(largest) not in narration:
        raise DataAnimError(f"旁白必须说出最大值 {largest}，实际 {narration}")
    return {"status": "success", "values": values, "largest": largest}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "data", "values": [3, 1, 2]},
        {"type": "frame", "height": 3},
        {"type": "frame", "height": 1},
        {"type": "frame", "height": 2},
        {"type": "narration", "text": "最大是 3"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

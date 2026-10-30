"""M0-U3-L06 class data expo executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '制作班级数据展', focus concept '数据', generic
acceptance. All exhibits and data are implementation choices, NOT
detailed-lesson values.
Model: a class data expo must have a title and at least 3 exhibits.
Each exhibit is a chart (label -> height) plus one finding that must
match its chart (tallest, shortest, or equal, as in M0-U3-L05).
Practice A: expo with fruit chart, colour chart, and dice chart, each
with a correct finding.
Practice B: expo with a different set of 3 charts (coin, survey, fruit),
each with a correct finding.
Fault: an expo with only 2 exhibits, or with a finding that does not
match its chart.
Extension: add a 4th exhibit with a correct finding.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class ExpoError(Exception):
    pass

def _check_finding(bars, finding):
    kind = finding.get("kind")
    max_h = max(bars.values())
    min_h = min(bars.values())
    tallest = [k for k, v in bars.items() if v == max_h]
    shortest = [k for k, v in bars.items() if v == min_h]
    if kind == "tallest":
        if finding.get("label") not in tallest:
            raise ExpoError(f"发现错误：最高的不是 {finding.get('label')}，而是 {tallest}")
    elif kind == "shortest":
        if finding.get("label") not in shortest:
            raise ExpoError(f"发现错误：最矮的不是 {finding.get('label')}，而是 {shortest}")
    elif kind == "equal":
        labels = finding.get("labels", [])
        if len(labels) != 2 or bars.get(labels[0]) != bars.get(labels[1]):
            raise ExpoError(f"发现错误：{labels} 并不相等")
    else:
        raise ExpoError(f"不支持的发现类型：{kind}")

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise ExpoError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise ExpoError("程序过长：超过60个积木")
    title = None
    exhibits = []
    current = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "title":
            title = b.get("text")
        elif bt == "exhibit":
            current = {"name": b.get("name"), "bars": {}, "finding": None}
            exhibits.append(current)
        elif bt == "bar":
            if current is None:
                raise ExpoError("柱子必须属于一个展品")
            current["bars"][b.get("label")] = b.get("height")
        elif bt == "finding":
            if current is None:
                raise ExpoError("发现必须属于一个展品")
            current["finding"] = b
        else:
            raise ExpoError(f"不支持的积木类型：{bt}")
    if not title:
        raise ExpoError("班级数据展需要一个标题")
    if len(exhibits) < 3:
        raise ExpoError("班级数据展至少要展出 3 个图表")
    for e in exhibits:
        if not e["bars"]:
            raise ExpoError(f"展品 {e['name']} 没有图表数据")
        if e["finding"] is None:
            raise ExpoError(f"展品 {e['name']} 没有发现")
        _check_finding(e["bars"], e["finding"])
    return {"status": "success", "title": title,
            "exhibits": [e["name"] for e in exhibits]}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "title", "text": "班级数据展"},
        {"type": "exhibit", "name": "fruit"},
        {"type": "bar", "label": "apple", "height": 3},
        {"type": "bar", "label": "banana", "height": 1},
        {"type": "finding", "kind": "tallest", "label": "apple"},
        {"type": "exhibit", "name": "colour"},
        {"type": "bar", "label": "red", "height": 2},
        {"type": "bar", "label": "blue", "height": 2},
        {"type": "finding", "kind": "equal", "labels": ["red", "blue"]},
        {"type": "exhibit", "name": "dice"},
        {"type": "bar", "label": "1", "height": 2},
        {"type": "bar", "label": "6", "height": 1},
        {"type": "finding", "kind": "tallest", "label": "1"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

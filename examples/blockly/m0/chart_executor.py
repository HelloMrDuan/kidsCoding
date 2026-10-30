"""M0-U3-L05 chart explanation executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '用图表解释发现', focus concept '数据', generic
acceptance. All chart data and findings are implementation choices, NOT
detailed-lesson values.
Model: a chart has bars (label -> height). A finding is a sentence that
must match the chart: it names the tallest bar, or the shortest bar, or
a comparison between two bars. The executor checks the finding against
the actual chart data.
Practice A: fruit chart apple 3, banana 1, orange 1 -> finding "apple is
tallest" is correct.
Practice B: colour chart red 2, blue 2 -> finding "red and blue are equal"
is correct (different goal: tie, not a single tallest).
Fault: finding "banana is tallest" when apple is tallest.
Extension: add a second finding "orange is shortest" (tie with banana at 1,
so shortest is banana and orange — the executor accepts either name when
tied, but the test uses banana).
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class ChartError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise ChartError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise ChartError("程序过长：超过40个积木")
    bars = {}
    findings = []
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "bar":
            bars[b.get("label")] = b.get("height")
        elif bt == "finding":
            findings.append(b)
        else:
            raise ChartError(f"不支持的积木类型：{bt}")
    if not bars:
        raise ChartError("图表至少要有一条柱子")
    if not findings:
        raise ChartError("要给出至少一条图表发现")
    max_h = max(bars.values())
    min_h = min(bars.values())
    tallest = [k for k, v in bars.items() if v == max_h]
    shortest = [k for k, v in bars.items() if v == min_h]
    for f in findings:
        kind = f.get("kind")
        if kind == "tallest":
            if f.get("label") not in tallest:
                raise ChartError(f"图表发现错误：最高的不是 {f.get('label')}，而是 {tallest}")
        elif kind == "shortest":
            if f.get("label") not in shortest:
                raise ChartError(f"图表发现错误：最矮的不是 {f.get('label')}，而是 {shortest}")
        elif kind == "equal":
            labels = f.get("labels", [])
            if len(labels) != 2 or bars.get(labels[0]) != bars.get(labels[1]):
                raise ChartError(f"图表发现错误：{labels} 并不相等")
        else:
            raise ChartError(f"不支持的发现类型：{kind}")
    return {"status": "success", "bars": bars, "tallest": tallest, "shortest": shortest}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "bar", "label": "apple", "height": 3},
        {"type": "bar", "label": "banana", "height": 1},
        {"type": "bar", "label": "orange", "height": 1},
        {"type": "finding", "kind": "tallest", "label": "apple"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

"""D0-U3-L03 traffic signal executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '规划交通信号', focus concept '原型', generic
acceptance. All signal timings are implementation choices, NOT
detailed-lesson values.
Model: a traffic signal cycles green, yellow, red. Each phase lasts a
number of seconds. A plan passes only if phases are in cyclic order,
each phase lasts at least 3 seconds, green lasts longer than yellow,
and the total cycle equals the sum of phase durations.
Practice A: green 30, yellow 5, red 25 -> total 60.
Practice B: green 20, yellow 4, red 20 -> total 44 (different goal:
shorter cycle).
Fault: phases out of order (red before green), or yellow longer than
green, or a phase shorter than 3 seconds.
Extension: add a second cycle (repeat green 30, yellow 5, red 25) ->
total 120.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
ORDER = ["green", "yellow", "red"]

class SignalError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise SignalError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise SignalError("程序过长：超过60个积木")
    phases = []
    claimed = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "phase":
            phases.append((b.get("name"), b.get("seconds")))
        elif bt == "total":
            claimed = b.get("value")
        else:
            raise SignalError(f"不支持的积木类型：{bt}")
    names = [n for n, _ in phases]
    idx = {n: i for i, n in enumerate(ORDER)}
    for a, b in zip(names, names[1:]):
        if a not in idx or b not in idx or (idx[a] + 1) % 3 != idx[b]:
            raise SignalError(f"信号顺序错误：实际 {names}")
    if len(phases) < 3:
        raise SignalError("交通信号至少要包含绿、黄、红 3 个相位")
    for name, seconds in phases:
        if seconds < 3:
            raise SignalError(f"相位 {name} 至少 3 秒，实际 {seconds}")
    # green longer than yellow, checked per cycle (first green/yellow pair)
    greens = [s for n, s in phases if n == "green"]
    yellows = [s for n, s in phases if n == "yellow"]
    for g, y in zip(greens, yellows):
        if not (g > y):
            raise SignalError(f"绿灯 {g} 秒应长于黄灯 {y} 秒")
    total = sum(s for _, s in phases)
    if claimed is None:
        raise SignalError("要给出总周期")
    if claimed != total:
        raise SignalError(f"总周期错误：应为 {total}，实际 {claimed}")
    return {"status": "success", "phases": names, "total_seconds": total}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "phase", "name": "green", "seconds": 30},
        {"type": "phase", "name": "yellow", "seconds": 5},
        {"type": "phase", "name": "red", "seconds": 25},
        {"type": "total", "value": 60},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

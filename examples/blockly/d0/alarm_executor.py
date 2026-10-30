"""D0-U3-L02 flood alarm executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '设计防洪警报', focus concept '需求', generic
acceptance. All water levels and thresholds are implementation choices,
NOT detailed-lesson values.
Model: a flood alarm watches a water level. Thresholds: warning at 50,
danger at 80. The alarm state must match the level: below 50 -> safe,
50-79 -> warning, 80+ -> danger. A design passes only if every reading
gets the correct alarm state and at least one reading reaches warning
or danger (the alarm is actually tested).
Practice A: readings 30, 60, 90 -> safe, warning, danger.
Practice B: readings 45, 55, 75 -> safe, warning, warning (different
goal: no danger, two warnings).
Fault: reading 90 reported as warning (wrong state), or all readings
safe (alarm never tested).
Extension: add a reading 100 -> danger, still correct.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
def expected_state(level):
    if level >= 80: return "danger"
    if level >= 50: return "warning"
    return "safe"

class AlarmError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise AlarmError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise AlarmError("程序过长：超过40个积木")
    readings = []
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "reading":
            readings.append((b.get("level"), b.get("state")))
        else:
            raise AlarmError(f"不支持的积木类型：{bt}")
    if len(readings) < 3:
        raise AlarmError("防洪警报至少要测试 3 个水位读数")
    for level, state in readings:
        exp = expected_state(level)
        if state != exp:
            raise AlarmError(f"水位 {level} 警报状态错误：应为 {exp}，实际 {state}")
    if all(s == "safe" for _, s in readings):
        raise AlarmError("警报从未触发：至少要有一个 warning 或 danger 读数")
    return {"status": "success", "readings": len(readings),
            "states": [s for _, s in readings]}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "reading", "level": 30, "state": "safe"},
        {"type": "reading", "level": 60, "state": "warning"},
        {"type": "reading", "level": 90, "state": "danger"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

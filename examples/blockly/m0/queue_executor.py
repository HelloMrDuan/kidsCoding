"""M0-U4-L04 queue waiting executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '模拟排队等待', focus concept '路径', generic
acceptance. All queue data and service times are implementation choices,
NOT detailed-lesson values.
Model: a queue serves people in order, one at a time. Each person has a
service time. The total wait for person i is the sum of service times of
all people before them. A program states the queue and claimed waits; it
passes only if the waits are correct and order is first-come-first-served.
Practice A: A 2 min, B 3 min, C 1 min -> waits A 0, B 2, C 5.
Practice B: D 4 min, E 2 min -> waits D 0, E 4 (different goal: shorter
queue, different times).
Fault: waits computed as if everyone waits the full total, or order
reversed (C served first).
Extension: add a 4th person F 2 min after C -> wait 6.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class QueueError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise QueueError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise QueueError("程序过长：超过40个积木")
    people = []
    waits = {}
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "person":
            people.append((b.get("name"), b.get("service")))
        elif bt == "wait":
            waits[b.get("name")] = b.get("minutes")
        else:
            raise QueueError(f"不支持的积木类型：{bt}")
    if len(people) < 2:
        raise QueueError("排队至少要有 2 个人")
    expected = {}
    running = 0
    for name, service in people:
        expected[name] = running
        running += service
    if waits != expected:
        raise QueueError(f"等待时间错误：应为 {expected}，实际 {waits}")
    return {"status": "success", "order": [n for n, _ in people], "waits": expected,
            "total_service": running}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "person", "name": "A", "service": 2},
        {"type": "person", "name": "B", "service": 3},
        {"type": "person", "name": "C", "service": 1},
        {"type": "wait", "name": "A", "minutes": 0},
        {"type": "wait", "name": "B", "minutes": 2},
        {"type": "wait", "name": "C", "minutes": 5},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

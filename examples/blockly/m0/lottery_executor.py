"""M0-U3-L03 lottery fairness executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '设计抽奖公平性', focus concept '样本', generic
acceptance. All ticket counts are implementation choices, NOT
detailed-lesson values.
Model: a lottery is fair when every participant has the same number of
tickets. A design states tickets per participant; it passes only if
all participants have equal tickets and at least 2 participants exist.
Practice A: 4 participants, 2 tickets each (fair).
Practice B: 3 participants, 5 tickets each (fair, different goal:
different participant count and ticket count).
Fault: participants with unequal tickets (3, 3, 2) is unfair.
Extension: add a 5th participant with the same ticket count, still fair.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class LotteryError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise LotteryError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise LotteryError("程序过长：超过40个积木")
    tickets = {}
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "participant":
            tickets[b.get("name")] = b.get("tickets")
        else:
            raise LotteryError(f"不支持的积木类型：{bt}")
    if len(tickets) < 2:
        raise LotteryError("抽奖至少要有 2 名参与者")
    values = set(tickets.values())
    if len(values) != 1:
        raise LotteryError(f"抽奖不公平：每人票数不同 {tickets}")
    return {"status": "success", "fair": True, "participants": len(tickets),
            "tickets_each": values.pop()}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "participant", "name": "A", "tickets": 2},
        {"type": "participant", "name": "B", "tickets": 2},
        {"type": "participant", "name": "C", "tickets": 2},
        {"type": "participant", "name": "D", "tickets": 2},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

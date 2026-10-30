"""M0-U4-L06 community planner executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '社区小小规划师', focus concept '推理', generic
acceptance. All community plans are implementation choices, NOT
detailed-lesson values.
Model: a community plan must have a title, at least 3 projects, and each
project must state its reason (why it helps the community) and its
location. A plan passes only if all projects have a reason and a
location, and the total budget of all projects does not exceed 1000.
Practice A: park (reason: play, location: east, cost 300), library
(reason: read, location: west, cost 400), market (reason: shop,
location: south, cost 200) -> total 900, within budget.
Practice B: playground (reason: play, location: north, cost 500),
garden (reason: grow, location: east, cost 200), clinic (reason: health,
location: centre, cost 200) -> total 900, different projects, same total
by coincidence.
Fault: a plan with only 2 projects, or a project missing its reason, or
a total over budget (900 + 500 = 1400).
Extension: add a 4th project (bus stop, reason: travel, location: west,
cost 100) -> total 1000, exactly at budget.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
BUDGET = 1000

class PlannerError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise PlannerError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise PlannerError("程序过长：超过60个积木")
    title = None
    projects = []
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "title":
            title = b.get("text")
        elif bt == "project":
            if not b.get("reason"):
                raise PlannerError(f"项目 {b.get('name')} 缺少理由")
            if not b.get("location"):
                raise PlannerError(f"项目 {b.get('name')} 缺少位置")
            projects.append(b)
        else:
            raise PlannerError(f"不支持的积木类型：{bt}")
    if not title:
        raise PlannerError("社区规划需要一个标题")
    if len(projects) < 3:
        raise PlannerError("社区规划至少要包含 3 个项目")
    total = sum(p.get("cost", 0) for p in projects)
    if total > BUDGET:
        raise PlannerError(f"超出社区预算 {BUDGET}：实际总价 {total}")
    return {"status": "success", "title": title,
            "projects": [p.get("name") for p in projects], "total": total}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "title", "text": "社区小小规划师"},
        {"type": "project", "name": "park", "reason": "play", "location": "east", "cost": 300},
        {"type": "project", "name": "library", "reason": "read", "location": "west", "cost": 400},
        {"type": "project", "name": "market", "reason": "shop", "location": "south", "cost": 200},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

"""D0-U2-L01 plant growth simulation executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '模拟植物生长', focus concept '观察', generic
acceptance. All growth stages and day counts are implementation choices,
NOT detailed-lesson values.
Model: a plant grows through stages in order: seed, sprout, stem, flower.
Each stage takes a number of days. A simulation passes only if stages
are in order, each stage lasts at least 1 day, and the total days equal
the sum of stage days.
Practice A: seed 2 days, sprout 3 days, stem 4 days, flower 5 days ->
total 14 days.
Practice B: seed 1 day, sprout 2 days, stem 2 days, flower 3 days ->
total 8 days (different goal: faster growth, different totals).
Fault: stages out of order (flower before stem), or a stage lasting 0
days, or a claimed total that does not match the sum.
Extension: add a fruit stage after flower, 2 days -> total 16 days for
practice A.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
ORDER = ["seed", "sprout", "stem", "flower"]

class PlantError(Exception):
    pass

def run_program(blocks, extra_stages=None):
    allowed = ORDER + (extra_stages or [])
    if not blocks or blocks[0].get("type") != "when_start":
        raise PlantError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise PlantError("程序过长：超过40个积木")
    stages = []
    claimed = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "stage":
            stages.append((b.get("name"), b.get("days")))
        elif bt == "total":
            claimed = b.get("value")
        else:
            raise PlantError(f"不支持的积木类型：{bt}")
    names = [n for n, _ in stages]
    if names != allowed[:len(names)]:
        raise PlantError(f"生长阶段顺序错误：应为 {allowed} 的前缀，实际 {names}")
    for name, days in stages:
        if days < 1:
            raise PlantError(f"阶段 {name} 天数至少为 1，实际 {days}")
    if len(stages) < 4:
        raise PlantError("植物生长至少要包含种子、发芽、茎、花 4 个阶段")
    total = sum(d for _, d in stages)
    if claimed is None:
        raise PlantError("要给出总天数")
    if claimed != total:
        raise PlantError(f"总天数错误：应为 {total}，实际 {claimed}")
    return {"status": "success", "stages": names, "total_days": total}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "stage", "name": "seed", "days": 2},
        {"type": "stage", "name": "sprout", "days": 3},
        {"type": "stage", "name": "stem", "days": 4},
        {"type": "stage", "name": "flower", "days": 5},
        {"type": "total", "value": 14},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

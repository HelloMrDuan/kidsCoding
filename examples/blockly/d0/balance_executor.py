"""D0-U2-L04 ecosystem balance executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '认识生态平衡', focus concept '假设', generic
acceptance. All populations and food-chain links are implementation
choices, NOT detailed-lesson values.
Model: a food chain has producers, herbivores, and carnivores. Balance
means: producers > herbivores > carnivores (each level fewer than the
one below), and every level has at least 1 individual. A simulation
passes only if the chain is in balance after a change (e.g. adding or
removing individuals).
Practice A: grass 100, rabbit 20, fox 4 -> balanced (100 > 20 > 4).
Practice B: grass 50, deer 10, wolf 2 -> balanced (different chain,
same rule).
Fault: foxes outnumber rabbits (grass 100, rabbit 20, fox 30), or a
level with 0 individuals.
Extension: add 10 more grass (110) -> still balanced.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class BalanceError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise BalanceError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise BalanceError("程序过长：超过40个积木")
    counts = {}
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "population":
            counts[b.get("level")] = b.get("count")
        elif bt == "change":
            level = b.get("level")
            if level not in counts:
                raise BalanceError(f"变化的物种 {level} 不在食物链中")
            counts[level] += b.get("delta")
        else:
            raise BalanceError(f"不支持的积木类型：{bt}")
    for level in ["producer", "herbivore", "carnivore"]:
        if level not in counts:
            raise BalanceError(f"食物链缺少 {level} 一环")
        if counts[level] < 1:
            raise BalanceError(f"{level} 数量至少为 1，实际 {counts[level]}")
    if not (counts["producer"] > counts["herbivore"] > counts["carnivore"]):
        raise BalanceError(f"生态不平衡：生产者 {counts['producer']}、食草 {counts['herbivore']}、食肉 {counts['carnivore']}，应为递减")
    return {"status": "success", "balanced": True, "counts": counts}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "population", "level": "producer", "count": 100},
        {"type": "population", "level": "herbivore", "count": 20},
        {"type": "population", "level": "carnivore", "count": 4},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

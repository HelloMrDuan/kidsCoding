"""D0-U2-L03 waste sorting executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '垃圾分类路径', focus concept '假设', generic
acceptance. All waste items and bins are implementation choices, NOT
detailed-lesson values.
Model: waste items must be sorted into the correct bin. Bins: recyclable,
kitchen, harmful, other. Each item has one correct bin. A sorting run
passes only if every item goes to its correct bin, and the route visits
bins in an order that covers all used bins.
Practice A: bottle -> recyclable, banana peel -> kitchen, battery ->
harmful, tissue -> other (all 4 bins).
Practice B: newspaper -> recyclable, apple core -> kitchen, light bulb
-> harmful (3 items, 3 bins, different goal).
Fault: battery into recyclable (wrong bin), or an item with no bin.
Extension: add a second recyclable item (can -> recyclable) -> still
passes, recyclable count 2.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
CORRECT = {
    "bottle": "recyclable", "newspaper": "recyclable", "can": "recyclable",
    "banana_peel": "kitchen", "apple_core": "kitchen",
    "battery": "harmful", "light_bulb": "harmful",
    "tissue": "other",
}

class SortError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise SortError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise SortError("程序过长：超过40个积木")
    sorted_items = {}
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "sort":
            sorted_items[b.get("item")] = b.get("bin")
        else:
            raise SortError(f"不支持的积木类型：{bt}")
    if len(sorted_items) < 3:
        raise SortError("垃圾分类至少要分 3 件垃圾")
    for item, bin_name in sorted_items.items():
        if item not in CORRECT:
            raise SortError(f"未知垃圾：{item}")
        if CORRECT[item] != bin_name:
            raise SortError(f"垃圾 {item} 应分到 {CORRECT[item]}，实际分到 {bin_name}")
    counts = {}
    for bin_name in sorted_items.values():
        counts[bin_name] = counts.get(bin_name, 0) + 1
    return {"status": "success", "sorted": len(sorted_items), "counts": counts}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "sort", "item": "bottle", "bin": "recyclable"},
        {"type": "sort", "item": "banana_peel", "bin": "kitchen"},
        {"type": "sort", "item": "battery", "bin": "harmful"},
        {"type": "sort", "item": "tissue", "bin": "other"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

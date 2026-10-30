"""D0-U2-L05 simple energy statistics executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '简易能源统计', focus concept '模型', generic
acceptance. All energy data are implementation choices, NOT
detailed-lesson values.
Model: a household uses energy from sources: solar, wind, coal, gas.
Each source has a usage in kWh. A statistics run passes only if all
sources are listed, every usage is non-negative, the total equals the
sum of usages, and the renewable share (solar + wind) is reported.
Practice A: solar 30, wind 20, coal 40, gas 10 -> total 100, renewable
50%.
Practice B: solar 10, wind 10, coal 60, gas 20 -> total 100, renewable
20% (different goal: lower renewable share, same total).
Fault: a claimed total that does not match the sum, or a negative usage.
Extension: add a second household with solar 50, wind 30, coal 10, gas
10 -> total 100, renewable 80%.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
SOURCES = ["solar", "wind", "coal", "gas"]
RENEWABLE = ["solar", "wind"]

class EnergyError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise EnergyError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise EnergyError("程序过长：超过40个积木")
    usages = {}
    claimed = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "usage":
            usages[b.get("source")] = b.get("kwh")
        elif bt == "total":
            claimed = b.get("value")
        else:
            raise EnergyError(f"不支持的积木类型：{bt}")
    for s in SOURCES:
        if s not in usages:
            raise EnergyError(f"缺少能源 {s} 的用量")
    for s, v in usages.items():
        if v < 0:
            raise EnergyError(f"能源 {s} 用量不能为负，实际 {v}")
    total = sum(usages.values())
    if claimed is None:
        raise EnergyError("要给出总用量")
    if claimed != total:
        raise EnergyError(f"总用量错误：应为 {total}，实际 {claimed}")
    renewable = sum(usages[s] for s in RENEWABLE)
    share = renewable * 100 // total if total else 0
    return {"status": "success", "total": total, "renewable": renewable,
            "renewable_share_percent": share}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "usage", "source": "solar", "kwh": 30},
        {"type": "usage", "source": "wind", "kwh": 20},
        {"type": "usage", "source": "coal", "kwh": 40},
        {"type": "usage", "source": "gas", "kwh": 10},
        {"type": "total", "value": 100},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

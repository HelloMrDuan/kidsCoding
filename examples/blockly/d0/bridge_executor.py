"""D0-U3-L01 paper bridge load executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '纸桥承重模拟', focus concept '需求', generic
acceptance. All bridge designs and loads are implementation choices,
NOT detailed-lesson values.
Model: a paper bridge is built from layers and supports. Its capacity
is layers * 10 + supports * 5 (grams, implementation choice). A test
passes only if the claimed capacity equals the computed capacity and
the test load does not exceed the capacity.
Practice A: 3 layers, 2 supports -> capacity 40, test load 30 -> passes.
Practice B: 2 layers, 4 supports -> capacity 40, test load 40 -> passes
at exactly capacity (different goal: different design, same capacity).
Fault: claiming capacity 50 for practice A, or testing with load 50
over capacity 40.
Extension: 4 layers, 2 supports -> capacity 50, test load 45 -> passes.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class BridgeError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise BridgeError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise BridgeError("程序过长：超过40个积木")
    layers = None
    supports = None
    claimed = None
    load = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "layers":
            layers = b.get("count")
        elif bt == "supports":
            supports = b.get("count")
        elif bt == "capacity":
            claimed = b.get("value")
        elif bt == "test_load":
            load = b.get("value")
        else:
            raise BridgeError(f"不支持的积木类型：{bt}")
    if layers is None or supports is None:
        raise BridgeError("纸桥需要层数和支撑数")
    if layers < 1 or supports < 1:
        raise BridgeError("层数和支撑数至少为 1")
    expected = layers * 10 + supports * 5
    if claimed is None:
        raise BridgeError("要给出承重")
    if claimed != expected:
        raise BridgeError(f"承重错误：应为 {expected}，实际 {claimed}")
    if load is None:
        raise BridgeError("要给出测试载重")
    if load > expected:
        raise BridgeError(f"纸桥压垮：承重 {expected}，测试载重 {load}")
    return {"status": "success", "capacity": expected, "load": load,
            "margin": expected - load}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "layers", "count": 3},
        {"type": "supports", "count": 2},
        {"type": "capacity", "value": 40},
        {"type": "test_load", "value": 30},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

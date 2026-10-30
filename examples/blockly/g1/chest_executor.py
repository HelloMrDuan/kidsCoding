"""G1-U3-L01 chest executor (first stage, not a web classroom).

Lesson: '点击打开宝箱', age 6-9, engine blockly.
Required: bind a click event to the chest sprite; on click, the closed
costume becomes the open costume.
Verification: before any click the chest stays closed; after one click
on the chest it is open.
Failure from the detailed lesson: clicking the blank background also
opens the chest (event bound to the stage instead of the chest).
Extension: a one-time anti-repeat state - a second click on an already
open chest leaves it open, it does not toggle back to closed.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class ChestError(Exception):
    pass

def run_program(blocks, clicks):
    """blocks: program; clicks: list of targets clicked in order, e.g. ['chest']."""
    bound = None
    for b in blocks:
        if b.get("type") == "on_click":
            bound = b.get("target")
        elif b.get("type") == "when_start":
            pass
        else:
            raise ChestError(f"不支持的积木类型：{b.get('type')}")
    if bound != "chest":
        raise ChestError("核对事件究竟绑定哪个精灵：点击事件必须绑定宝箱")
    costume = "closed"
    opened = False
    for target in clicks:
        if target == "chest" and not opened:
            costume = "open"
            opened = True
    return {"status": "success", "costume": costume, "opened": opened}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "on_click", "target": "chest"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program(), []), ensure_ascii=False, indent=2))
    print(json.dumps(run_program(correct_program(), ["chest"]), ensure_ascii=False, indent=2))

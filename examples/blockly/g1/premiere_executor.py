"""G1-U4-L06 premiere executor (first stage, not a web classroom).

Lesson: '森林剧场首映', age 6-9, engine blockly, G1 track capstone.
Required: integrate script, animation, interaction, and two rounds of
testing, then show the work.
Verification: the work runs complete from the start, with character
behaviour matching the three-act goals (beginning, conflict, resolution).
Failure from the detailed lesson: the last act missing, or a trigger
event with no response.
Extension: an original promotional poster does not break the pass.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class PremiereError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise PremiereError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise PremiereError("程序过长：超过40个积木")
    acts = []
    components = set()
    trigger_responds = False
    poster = False
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "act":
            acts.append(b.get("name"))
            components.add("script")
        elif bt == "animation":
            components.add("animation")
        elif bt == "interaction":
            components.add("interaction")
            trigger_responds = bool(b.get("responds", False))
        elif bt == "test_round":
            components.add(f"test_{b.get('round')}")
        elif bt == "show":
            components.add("show")
        elif bt == "poster":
            poster = True
        else:
            raise PremiereError(f"不支持的积木类型：{bt}")
    if acts != ["beginning", "conflict", "resolution"]:
        raise PremiereError("最后一幕缺失：按开场-转折-结尾检查每幕验收清单")
    if "interaction" in components and not trigger_responds:
        raise PremiereError("一个触发事件没有响应：按开场-转折-结尾检查每幕验收清单")
    for needed in ("script", "animation", "interaction", "test_1", "test_2", "show"):
        if needed not in components:
            raise PremiereError(f"整合剧本、动画、交互和两轮测试后展示：缺少 {needed}")
    return {"status": "success", "acts": acts, "components": sorted(components), "poster": poster}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "act", "name": "beginning"},
        {"type": "act", "name": "conflict"},
        {"type": "act", "name": "resolution"},
        {"type": "animation"},
        {"type": "interaction", "responds": True},
        {"type": "test_round", "round": 1},
        {"type": "test_round", "round": 2},
        {"type": "show"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

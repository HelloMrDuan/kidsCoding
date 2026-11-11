"""G1-U1-L03 scene executor (first stage, not a web classroom).

Lesson: '设置故事背景', age 6-9, engine blockly.
Required sequence: when_start -> set_scene(day_forest) -> enter_treehouse
  -> switch_scene(night_forest).
Verification: first half is daytime forest, after transition is night forest.
Failures from the detailed lesson:
  - Starting with the ending background (night_forest first) is a failure.
  - Starting with snow mountain instead of forest is a failure.
  - No scene switch, or a switch before entering the treehouse, is a failure.
Extension: adding a third scene (sunset, drawn by the learner) after night_forest
does not break the pass.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
DAY_FOREST = "day_forest"
NIGHT_FOREST = "night_forest"
SNOW = "snow_mountain"

class SceneError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise SceneError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 20:
        raise SceneError("程序过长：超过20个积木")
    scenes = []
    entered_treehouse = False
    switched = False
    for b in blocks[1:]:
        t = b.get("type")
        if t == "set_scene":
            scene = b.get("scene")
            if not scenes and scene != DAY_FOREST:
                raise SceneError("一开始就显示结尾背景：开场必须使用白天森林")
            scenes.append(scene)
        elif t == "enter_treehouse":
            entered_treehouse = True
        elif t == "switch_scene":
            if not entered_treehouse:
                raise SceneError("场景切换在时间线中的位置错误：必须先走进树屋再切场景")
            scenes.append(b.get("scene"))
            switched = True
        else:
            raise SceneError(f"不支持的积木类型：{t}")
    if not scenes or scenes[0] != DAY_FOREST:
        raise SceneError("一开始就显示结尾背景：开场必须使用白天森林")
    if not switched or NIGHT_FOREST not in scenes[1:]:
        raise SceneError("前半段为白天森林，转场后为夜晚森林：缺少夜晚森林转场")
    return {"status": "success", "first_half": DAY_FOREST, "after_transition": NIGHT_FOREST, "scenes": scenes}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "set_scene", "scene": DAY_FOREST},
        {"type": "enter_treehouse"},
        {"type": "switch_scene", "scene": NIGHT_FOREST},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

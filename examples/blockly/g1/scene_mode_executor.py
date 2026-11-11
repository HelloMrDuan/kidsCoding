"""G1-U3-L05 scene toggle executor (first stage, not a web classroom).

Lesson: '按钮切换白天黑夜', age 6-9, engine blockly.
Required: a sceneMode variable toggling between day and night, with the
background selected to match the mode.
Verification: two consecutive clicks return to day, with the background
matching the mode at every step.
Failure from the detailed lesson: the mode variable toggles but the
background does not update.
Extension: a third dusk mode - the cycle becomes day->night->dusk->day.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class SceneError(Exception):
    pass

def run_program(blocks, clicks=2, modes=("day", "night")):
    if not blocks or blocks[0].get("type") != "when_start":
        raise SceneError("缺少开始事件：第一个积木必须是开始事件")
    update_bg = None
    for b in blocks[1:]:
        if b.get("type") == "toggle_scene":
            update_bg = b.get("update_background", True)
        else:
            raise SceneError(f"不支持的积木类型：{b.get('type')}")
    if update_bg is None:
        raise SceneError("缺少切换场景积木")
    scene_mode = "day"
    background = "day_bg"
    history = [(scene_mode, background)]
    for _ in range(clicks):
        idx = modes.index(scene_mode)
        scene_mode = modes[(idx + 1) % len(modes)]
        if update_bg:
            background = scene_mode + "_bg"
        history.append((scene_mode, background))
    for mode, bg in history:
        if bg != mode + "_bg":
            raise SceneError("模式变量切换了但背景没有更新：观察变量值与舞台背景是否同步")
    return {"status": "success", "sceneMode": scene_mode, "background": background, "history": history}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "toggle_scene", "update_background": True},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program(), clicks=2), ensure_ascii=False, indent=2))

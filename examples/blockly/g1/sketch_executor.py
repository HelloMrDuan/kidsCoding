"""G1-U4-L02 sketch executor (first stage, not a web classroom).

Lesson: '绘制场景草图', age 6-9, engine blockly.
Required: three storyboard sketches, each annotated with character,
background, trigger event, character position, and props.
Verification: each of the three sketches marks character, background,
and trigger event.
Failure from the detailed lesson: a pretty picture with no action or
trigger mark.
Extension: turning the sketches into a simple animation prototype -
modelled as an 'animate' block, which does not break the pass.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class SketchError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise SketchError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 30:
        raise SketchError("程序过长：超过30个积木")
    sketches = []
    animated = False
    for b in blocks[1:]:
        if b.get("type") == "sketch":
            for field in ("character", "background", "trigger", "position", "props"):
                if not b.get(field):
                    raise SketchError("每张草图标明角色、背景和触发事件：图画漂亮却没有动作或触发标记")
            sketches.append(b.get("id"))
        elif b.get("type") == "animate":
            animated = True
        else:
            raise SketchError(f"不支持的积木类型：{b.get('type')}")
    if len(sketches) != 3:
        raise SketchError("绘制三张分镜草图并标注角色位置与道具")
    return {"status": "success", "sketches": sketches, "animated": animated}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "sketch", "id": "s1", "character": "fox", "background": "forest", "trigger": "start", "position": "left", "props": "microphone"},
        {"type": "sketch", "id": "s2", "character": "rabbit", "background": "forest", "trigger": "meet", "position": "center", "props": "key"},
        {"type": "sketch", "id": "s3", "character": "fox", "background": "stage", "trigger": "finish", "position": "right", "props": "star"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

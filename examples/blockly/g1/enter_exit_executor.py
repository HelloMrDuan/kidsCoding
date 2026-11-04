"""G1-U1-L04 enter/exit executor (first stage, not a web classroom).

Lesson: '角色出场退场', age 6-9, engine blockly.
Required order: when_start -> enter_left -> say_line (any non-empty greeting)
  -> exit_right.
Verification: entrance and exit occur on the two sides of the dialogue.
The detailed lesson does not fix the exact greeting text for this lesson,
so any non-empty say_line while visible counts as the greeting; this is
stated explicitly and must not be claimed as a detailed-lesson text.
Failures:
  - Exit before greeting: audience never sees the character.
  - Greeting while offstage (before enter, or after exit).
  - Sudden disappearance: a hide block without an exit move.
  - Missing enter, greeting, or exit.
Extension: a second character (rabbit) entering from the other side after
the fox exits does not break the pass.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class StageError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise StageError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 20:
        raise StageError("程序过长：超过20个积木")
    events = []
    visible = False
    for b in blocks[1:]:
        t = b.get("type")
        if t == "enter_left":
            if visible:
                raise StageError("重复入场：角色已在舞台上")
            visible = True
            events.append("enter")
        elif t == "say_line":
            if not visible:
                raise StageError("退场先于问候，观众看不到角色：打招呼时角色必须在舞台上")
            if not (b.get("text") or "").strip():
                raise StageError("打招呼内容为空")
            events.append("say")
        elif t == "exit_right":
            if not visible:
                raise StageError("退场先于问候，观众看不到角色")
            visible = False
            events.append("exit")
        elif t == "hide":
            raise StageError("角色不可以突然消失：必须用向右退出来下台，不能直接隐藏")
        else:
            raise StageError(f"不支持的积木类型：{t}")
    if events != ["enter", "say", "exit"] and not (len(events) >= 3 and events[:3] == ["enter", "say", "exit"]):
        raise StageError("出场与退场发生在对白两侧：顺序必须是入场、打招呼、退场")
    return {"status": "success", "events": events, "visible_at_end": visible}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "enter_left"},
        {"type": "say_line", "actor": "fox", "text": "大家好！"},
        {"type": "exit_right"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

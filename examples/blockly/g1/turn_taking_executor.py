"""G1-U1-L02 turn-taking dialogue executor (first stage, not a web classroom).

Lesson: '与兔子轮流说话', age 6-9, engine blockly.
Required order: fox says '你好', then rabbit says '很高兴见到你'.
Rules from track-g1-detailed-lessons-v1.json G1-U1-L02:
  - Program must start with when_start.
  - The two lines must appear in fox -> rabbit order.
  - Simultaneous speech (a say_together block, or two lines in one step)
    is a failure: '两位角色同时说话造成重叠'.
  - Reversed order is a failure.
  - A third farewell line after the two required lines (extension) does not
    break the pass.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
FOX = "fox"
RABBIT = "rabbit"

class DialogueError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise DialogueError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 20:
        raise DialogueError("程序过长：超过20个积木")
    lines = []
    for b in blocks[1:]:
        if b.get("type") == "say_together":
            raise DialogueError("两位角色同时说话造成重叠：拆开两个角色的说话时机，逐句运行对照")
        if b.get("type") != "say_line":
            raise DialogueError(f"不支持的积木类型：{b.get('type')}")
        lines.append((b.get("actor"), b.get("text")))
    required = [(FOX, "你好"), (RABBIT, "很高兴见到你")]
    if lines[:2] != required:
        if len(lines) < 2:
            raise DialogueError("两句对白按狐狸→兔子的顺序出现：缺少对白")
        raise DialogueError("两句对白按狐狸→兔子的顺序出现：顺序或文本错误")
    return {"status": "success", "lines": lines, "log": [f"{a}说：{t}" for a, t in lines]}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "say_line", "actor": FOX, "text": "你好"},
        {"type": "say_line", "actor": RABBIT, "text": "很高兴见到你"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

"""G1-U1-L06 complete story executor (first stage, not a web classroom).

Lesson: '完整森林童话', age 6-9, engine blockly, unit capstone for G1-U1.
Required: four sections in order - opening, meeting, conflict, ending -
each containing at least one dialogue line, with at least fox and rabbit
both speaking different lines, and the whole work playable from start to end.
Failures from the detailed lesson:
  - Skipping the ending, or any section.
  - Dialogue order scrambled (sections out of order).
  - Only one character speaking.
Extension: two different endings - modelled as an optional second ending
section after the main ending; it does not break the pass.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
SECTIONS = ["opening", "meeting", "conflict", "ending"]

class StoryError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise StoryError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise StoryError("程序过长：超过40个积木")
    section_order = []
    dialogues = []  # (actor, text, section)
    current = None
    for b in blocks[1:]:
        t = b.get("type")
        if t == "section":
            name = b.get("name")
            if name not in SECTIONS and name != "ending_alt":
                raise StoryError(f"不支持的章节：{name}")
            current = name
            if name in SECTIONS:
                section_order.append(name)
        elif t == "say_line":
            if current is None:
                raise StoryError("对白必须在章节内：先开始一个章节再说话")
            dialogues.append((b.get("actor"), b.get("text"), current))
        else:
            raise StoryError(f"不支持的积木类型：{t}")
    if section_order != SECTIONS:
        raise StoryError("故事跳过结尾或对白顺序混乱：必须按开场、相遇、冲突、结尾顺序完整播放")
    actors = {a for a, _, _ in dialogues}
    if "fox" not in actors or "rabbit" not in actors:
        raise StoryError("作品可完整播放且至少两位角色有不同对白：狐狸和兔子都要说话")
    texts = {t for _, t, _ in dialogues}
    if len(texts) < 2:
        raise StoryError("至少两位角色有不同对白：对白文本不能全部相同")
    per_section = {}
    for _, _, s in dialogues:
        per_section[s] = per_section.get(s, 0) + 1
    for s in SECTIONS:
        if per_section.get(s, 0) < 1:
            raise StoryError(f"章节缺少对白：{s}")
    return {"status": "success", "sections": SECTIONS, "dialogues": dialogues}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "section", "name": "opening"},
        {"type": "say_line", "actor": "fox", "text": "欢迎来到森林剧场"},
        {"type": "section", "name": "meeting"},
        {"type": "say_line", "actor": "rabbit", "text": "很高兴见到你"},
        {"type": "section", "name": "conflict"},
        {"type": "say_line", "actor": "fox", "text": "可是路被大石头挡住了"},
        {"type": "section", "name": "ending"},
        {"type": "say_line", "actor": "rabbit", "text": "我们一起搬开它吧"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

"""G1-U1-L05 subtitle executor (first stage, not a web classroom).

Lesson: '字幕与旁白', age 6-9, engine blockly.
Required sequence: when_start -> show_title -> hide_title -> say_line.
Verification: character dialogue appears only after the title subtitle ends.
Story narration in the middle must be short: this executor defines short as
at most 20 characters, an implementation choice stated explicitly, not a
detailed-lesson value. The detailed lesson only requires '短旁白'.
Failures:
  - Dialogue before the title hides.
  - Title never hides (long subtitle blocks the character).
  - No title, or no dialogue.
Extension: an accessibility subtitle after the dialogue does not break the pass.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class SubtitleError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise SubtitleError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 20:
        raise SubtitleError("程序过长：超过20个积木")
    title_shown = False
    title_hidden = False
    dialogue_after_title = False
    for b in blocks[1:]:
        t = b.get("type")
        if t == "show_title":
            if not b.get("text"):
                raise SubtitleError("标题字幕内容为空")
            title_shown = True
        elif t == "hide_title":
            if not title_shown:
                raise SubtitleError("未显示标题字幕就隐藏")
            title_hidden = True
        elif t == "say_line":
            if not title_hidden:
                raise SubtitleError("长字幕一直不消失遮挡人物：片头字幕结束后才出现角色对白")
            dialogue_after_title = True
        elif t == "narration":
            text = b.get("text", "")
            if len(text) > 20:
                raise SubtitleError("剧情旁白过长：剧情中改用短旁白")
        else:
            raise SubtitleError(f"不支持的积木类型：{t}")
    if not title_shown:
        raise SubtitleError("缺少片头标题字幕")
    if not title_hidden:
        raise SubtitleError("长字幕一直不消失遮挡人物：标题字幕必须结束")
    if not dialogue_after_title:
        raise SubtitleError("片头字幕结束后才出现角色对白：缺少角色对白")
    return {"status": "success", "title_ended_before_dialogue": True}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "show_title", "text": "森林剧场"},
        {"type": "hide_title"},
        {"type": "narration", "text": "狐狸上台了。"},
        {"type": "say_line", "actor": "fox", "text": "大家好！"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

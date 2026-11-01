"""G1-U1-L01 dialogue executor (first stage, not a web classroom).

Models the Blockly program for '给狐狸一个开场' as a sequence of blocks:
  when_start, say_line(actor, text), move_right(actor), switch_character
Rules, taken from track-g1-detailed-lessons-v1.json G1-U1-L01:
  - Program must start with when_start.
  - The opening dialogue must be fox saying exactly '欢迎来到森林剧场',
    before any move, and after when_start.
  - After the greeting, fox must move at least once.
  - Move-only (no dialogue) is a failure, not a pass.
  - Dialogue by any actor other than fox is a failure ('对白给错人').
  - A second dialogue after the move (extension: ask the audience a question)
    does not break the pass, provided the opening dialogue above is correct.
Implementation choices, stated explicitly and not claimed from the detailed lesson:
  - One move_right moves the actor by 100, matching the repo duo-dialogue
    executor's step size. The detailed lesson only requires '再移动', not 100.
  - Maximum program length is 20 blocks; longer programs are rejected.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing and must not be claimed.
"""
import json

OPENING_TEXT = "欢迎来到森林剧场"
MOVE_STEP = 100
MAX_BLOCKS = 20
FOX = "fox"
AUDIENCE = "audience"


class DialogueError(Exception):
    pass


def run_program(blocks):
    """Run a program (list of block dicts). Returns a result dict."""
    if not isinstance(blocks, list) or not blocks:
        raise DialogueError("程序为空：缺少开始事件")
    if len(blocks) > MAX_BLOCKS:
        raise DialogueError("程序过长：超过20个积木")
    if blocks[0].get("type") != "when_start":
        raise DialogueError("缺少开始事件：第一个积木必须是开始事件")
    positions = {FOX: 0, AUDIENCE: 0}
    log = []
    greeting_done = False
    moved_after_greeting = False
    seen_say = False
    for block in blocks[1:]:
        btype = block.get("type")
        if btype == "say_line":
            seen_say = True
            actor = block.get("actor")
            text = block.get("text")
            if actor != FOX and not greeting_done:
                raise DialogueError("对白给错人：开场对白必须属于狐狸")
            if actor != FOX:
                # Extension dialogue by another actor after the opening is
                # recorded but does not count as the opening greeting.
                log.append(f"{actor}说：{text}")
                continue
            if not greeting_done and positions[FOX] != 0:
                raise DialogueError("先打招呼再移动：对白必须在移动之前")
            if not greeting_done:
                if text != OPENING_TEXT:
                    raise DialogueError("开场对白不是欢迎来到森林剧场")
                greeting_done = True
                log.append(f"狐狸说：{text}")
            else:
                log.append(f"狐狸说：{text}")
        elif btype == "move_right":
            actor = block.get("actor", FOX)
            if actor not in positions:
                positions[actor] = 0
            positions[actor] += MOVE_STEP
            if greeting_done:
                moved_after_greeting = True
            log.append(f"{actor}移动到{positions[actor]}")
        elif btype == "switch_character":
            log.append("切换角色")
        else:
            raise DialogueError(f"不支持的积木类型：{btype}")
    if not seen_say:
        raise DialogueError("只有移动没有对白时不能算完成")
    if not greeting_done:
        raise DialogueError("只有移动没有对白时不能算完成")
    if not moved_after_greeting:
        raise DialogueError("点击开始后狐狸先打招呼再移动：缺少移动")
    return {
        "status": "success",
        "fox_position": positions[FOX],
        "greeting": OPENING_TEXT,
        "log": log,
    }


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "say_line", "actor": FOX, "text": OPENING_TEXT},
        {"type": "move_right", "actor": FOX},
    ]


def save_program(blocks, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(blocks, f, ensure_ascii=False, indent=2)


def load_program(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


if __name__ == "__main__":
    result = run_program(correct_program())
    print(json.dumps(result, ensure_ascii=False, indent=2))

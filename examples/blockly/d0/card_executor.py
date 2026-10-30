"""D0-U1-L06 digital music card executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '发布数字音乐贺卡', focus concept '图形', generic
acceptance. All card contents are implementation choices, NOT
detailed-lesson values.
Model: a digital music card must have a greeting, a dynamic pattern
(at least 3 frames, shape and colour both change), and a beat loop
(pattern repeated at least 2 times). A card passes only if all three
parts are present and valid, and it is marked "published" only after all
parts pass.
Practice A: greeting "生日快乐", pattern circle red / square red /
circle blue, beat pattern [hit, rest, hit] x2.
Practice B: greeting "新年快乐", pattern triangle green / triangle
yellow / square yellow, beat pattern [hit, hit] x3 (different goal:
different greeting, pattern, and beat).
Fault: a card with no greeting, or a static pattern, or a beat loop
played only once.
Extension: add a second greeting line "天天开心" as a signature.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class CardError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise CardError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise CardError("程序过长：超过60个积木")
    greeting = None
    frames = []
    beat_pattern = None
    beat_repeats = None
    beat_played = None
    signature = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "greeting":
            greeting = b.get("text")
        elif bt == "frame":
            frames.append((b.get("shape"), b.get("colour")))
        elif bt == "beat_pattern":
            beat_pattern = b.get("beats")
        elif bt == "beat_repeat":
            beat_repeats = b.get("times")
        elif bt == "beat_play":
            beat_played = b.get("beats")
        elif bt == "signature":
            signature = b.get("text")
        else:
            raise CardError(f"不支持的积木类型：{bt}")
    if not greeting:
        raise CardError("音乐贺卡需要一句祝福语")
    if len(frames) < 3:
        raise CardError("贺卡图案至少要有 3 帧")
    if len({s for s, _ in frames}) < 2:
        raise CardError("贺卡图案中形状至少要变化一次")
    if len({c for _, c in frames}) < 2:
        raise CardError("贺卡图案中颜色至少要变化一次")
    if beat_pattern is None or len(beat_pattern) < 2:
        raise CardError("贺卡音乐需要至少 2 拍的节拍模式")
    if beat_repeats is None or beat_repeats < 2:
        raise CardError("贺卡音乐至少要循环 2 次")
    if beat_played != beat_pattern * beat_repeats:
        raise CardError(f"贺卡音乐循环错误：应为 {beat_pattern * beat_repeats}，实际 {beat_played}")
    result = {"status": "success", "greeting": greeting, "frames": len(frames),
              "beats": len(beat_played), "published": True}
    if signature:
        result["signature"] = signature
    return result

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "greeting", "text": "生日快乐"},
        {"type": "frame", "shape": "circle", "colour": "red"},
        {"type": "frame", "shape": "square", "colour": "red"},
        {"type": "frame", "shape": "circle", "colour": "blue"},
        {"type": "beat_pattern", "beats": ["hit", "rest", "hit"]},
        {"type": "beat_repeat", "times": 2},
        {"type": "beat_play", "beats": ["hit", "rest", "hit", "hit", "rest", "hit"]},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

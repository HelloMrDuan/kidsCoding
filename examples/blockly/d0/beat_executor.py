"""D0-U1-L03 beat loop executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '编写节拍循环', focus concept '节奏', generic
acceptance. All beats and tempos are implementation choices, NOT
detailed-lesson values.
Model: a beat loop repeats a pattern of beats. Each beat is either a
drum hit or a rest. A loop passes only if it has a pattern of at least
2 beats, repeats it exactly N times, and the total beat count equals
pattern length times N.
Practice A: pattern [hit, rest, hit] repeated 2 times -> 6 beats,
hits at positions 0, 2, 3, 5.
Practice B: pattern [hit, hit] repeated 3 times -> 6 beats, all hits
(different goal: shorter pattern, more repeats).
Fault: a loop that claims 2 repeats but plays the pattern only once,
or a pattern with only 1 beat.
Extension: pattern [hit, rest, hit, rest] repeated 2 times -> 8 beats.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class BeatError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise BeatError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise BeatError("程序过长：超过40个积木")
    pattern = None
    repeats = None
    played = []
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "pattern":
            pattern = b.get("beats")
        elif bt == "repeat":
            repeats = b.get("times")
        elif bt == "play":
            played = b.get("beats")
        else:
            raise BeatError(f"不支持的积木类型：{bt}")
    if pattern is None:
        raise BeatError("要先写出节拍模式")
    if len(pattern) < 2:
        raise BeatError("节拍模式至少要有 2 拍")
    if repeats is None or repeats < 1:
        raise BeatError("循环次数至少为 1")
    expected = pattern * repeats
    if played != expected:
        raise BeatError(f"节拍循环错误：应为 {expected}，实际 {played}")
    return {"status": "success", "pattern": pattern, "repeats": repeats,
            "total_beats": len(expected), "hits": expected.count("hit")}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "pattern", "beats": ["hit", "rest", "hit"]},
        {"type": "repeat", "times": 2},
        {"type": "play", "beats": ["hit", "rest", "hit", "hit", "rest", "hit"]},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

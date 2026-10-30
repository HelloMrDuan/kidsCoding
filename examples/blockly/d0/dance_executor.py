"""D0-U1-L04 shape dances to music executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '让形状跟着音乐跳', focus concept '节奏', generic
acceptance. All shapes, beats and moves are implementation choices, NOT
detailed-lesson values.
Model: a shape dances to a beat loop. Each beat must have exactly one
move, and the move must match the beat type: on a "hit" beat the shape
jumps, on a "rest" beat the shape stays still. A dance passes only if
every beat has a matching move and the dance has at least 4 beats.
Practice A: beats [hit, rest, hit, rest] -> moves [jump, still, jump,
still].
Practice B: beats [hit, hit, rest] repeated as [hit, hit, rest, hit,
hit, rest] -> moves [jump, jump, still, jump, jump, still] (different
goal: longer loop, two jumps in a row).
Fault: a jump on a rest beat, or a missing move for a beat.
Extension: add a spin move on the last hit beat (spin is allowed only on
a hit beat).
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class DanceError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise DanceError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise DanceError("程序过长：超过40个积木")
    beats = None
    moves = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "beats":
            beats = b.get("values")
        elif bt == "moves":
            moves = b.get("values")
        else:
            raise DanceError(f"不支持的积木类型：{bt}")
    if beats is None:
        raise DanceError("要先给出音乐节拍")
    if len(beats) < 4:
        raise DanceError("舞蹈至少要有 4 拍")
    if moves is None:
        raise DanceError("要给出形状动作")
    if len(moves) != len(beats):
        raise DanceError(f"动作数 {len(moves)} 与节拍数 {len(beats)} 不一致")
    for beat, move in zip(beats, moves):
        if beat == "hit" and move not in ("jump", "spin"):
            raise DanceError(f"击拍上动作错误：应为跳或转，实际 {move}")
        if beat == "rest" and move != "still":
            raise DanceError(f"空拍上动作错误：应为静止，实际 {move}")
    return {"status": "success", "beats": len(beats), "moves": moves}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "beats", "values": ["hit", "rest", "hit", "rest"]},
        {"type": "moves", "values": ["jump", "still", "jump", "still"]},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

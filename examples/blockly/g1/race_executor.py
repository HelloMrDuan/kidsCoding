"""G1-U2-L06 race executor (first stage, not a web classroom).

Lesson: '小兔子运动会', age 6-9, engine blockly, G1-U2 unit capstone.
Required: when_start -> start_race (timer reset) -> moves -> check_finish
-> announce_result.
Verification: timer changes after the race starts, and the result is
shown only after reaching the finish.
Finish line used here is x=200, an implementation choice stated explicitly;
the detailed lesson does not fix a finish coordinate.
Failures from the detailed lesson:
  - Announcing a win before starting, or before reaching the finish.
  - Timer never changing.
Extension: a second player's result (scoreboard) after the first result
does not break the pass.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
FINISH_X = 200

class RaceError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise RaceError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 30:
        raise RaceError("程序过长：超过30个积木")
    started = False
    timer = 0
    x = 0
    finished = False
    announced = False
    for b in blocks[1:]:
        t = b.get("type")
        if t == "start_race":
            started = True
            timer = 0
            x = 0
        elif t == "move":
            if not started:
                raise RaceError("未出发便显示胜利结果：竞赛开始后计时变化")
            x += b.get("steps", 0)
            timer += 1
        elif t == "check_finish":
            if not started:
                raise RaceError("未出发便显示胜利结果")
            if x >= FINISH_X:
                finished = True
        elif t == "announce_result":
            if not finished:
                raise RaceError("未出发便显示胜利结果：到达终点才显示结果")
            announced = True
        elif t == "scoreboard":
            if not announced:
                raise RaceError("成绩榜必须在结果播报之后")
        else:
            raise RaceError(f"不支持的积木类型：{t}")
    if not started:
        raise RaceError("缺少起跑事件")
    if timer == 0:
        raise RaceError("竞赛开始后计时变化：计时必须变化")
    if not finished:
        raise RaceError("到达终点才显示结果：未到达终点")
    if not announced:
        raise RaceError("到达终点才显示结果：缺少结果播报")
    return {"status": "success", "timer": timer, "final_x": x, "finished": finished}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "start_race"},
        {"type": "move", "steps": 100},
        {"type": "move", "steps": 100},
        {"type": "check_finish"},
        {"type": "announce_result", "text": "兔子获胜！"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

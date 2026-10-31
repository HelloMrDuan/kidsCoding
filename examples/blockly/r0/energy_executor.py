"""R0-U4-L01 campus energy observation executor (first stage, not a web
classroom, NOT real hardware, NOT real campus data).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '校园节能观察', focus concept '迭代', generic
acceptance. All places, counts and usages are implementation choices
and fictional classroom examples, NOT detailed-lesson values and NOT
real measurements.
Model: a simulated energy observation is valid when, after a start
event:
  - a site block with a non-empty name;
  - at least 2 round blocks, each with lights (an integer >= 0, the
    number of lights left on) and usage (a number >= 0, the energy
    used that round);
  - lights are non-increasing across rounds and usage is
    non-increasing across rounds;
  - the last usage is strictly less than the first usage (the
    iteration really saved energy);
  - exactly one summary block, after the last round, whose first,
    last and saved values equal the computed first usage, last usage
    and first minus last;
  - at most 60 blocks.
Iteration lesson: observe, improve, observe again. If usage goes up,
or never goes down, the iteration did not work and the program fails.
The summary must be computed from the rounds, not guessed.
This is a RECORD MODEL ONLY with fictional example numbers. It never
measures real energy. Real observation must be done with a teacher,
by looking and counting only, and children must never touch switches,
sockets or electrical equipment.
Practice A: rounds (10 lights, 50), (6, 35), (4, 28) -> saved 22.
Practice B: rounds (8, 40), (8, 36) -> saved 4 (lights unchanged, but
usage still improved by another saving action).
Fault: usage increases between rounds; lights increase between
rounds; usage never decreases overall; a summary that does not match;
fewer than 2 rounds; a negative lights or usage value; missing
site/summary; missing start.
Extension: 4 rounds (12, 60), (9, 48), (7, 42), (5, 35) -> saved 25.
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real measurement. Those remain missing.
"""


class EnergyError(Exception):
    pass


def _number(value, what):
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise EnergyError(f"{what}必须是数字")
    return value


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise EnergyError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise EnergyError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "site":
        raise EnergyError("缺少观察地点：地点必须是开始后的第一个积木")
    if not rest[0].get("name"):
        raise EnergyError("观察地点名称不能为空")
    site = rest[0]["name"]
    rounds = []
    summary = None
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "round":
            if summary is not None:
                raise EnergyError("总结之后又观察，这些观察没有总结")
            lights = b.get("lights")
            if not isinstance(lights, int) or isinstance(lights, bool):
                raise EnergyError("亮灯数必须是整数")
            usage = _number(b.get("usage"), "用电量")
            if lights < 0 or usage < 0:
                raise EnergyError("亮灯数和用电量不能是负数")
            if rounds and lights > rounds[-1]["lights"]:
                raise EnergyError("亮灯数增加了，迭代没有往节能方向走")
            if rounds and usage > rounds[-1]["usage"]:
                raise EnergyError("用电量增加了，迭代没有往节能方向走")
            rounds.append({"lights": lights, "usage": usage})
        elif bt == "summary":
            if summary is not None:
                raise EnergyError("总结重复")
            if len(rounds) < 2:
                raise EnergyError("观察少于 2 轮，不能总结")
            first = rounds[0]["usage"]
            last = rounds[-1]["usage"]
            if not last < first:
                raise EnergyError("用电量没有下降，迭代没有省下电")
            if (b.get("first") != first or b.get("last") != last
                    or b.get("saved") != first - last):
                raise EnergyError(f"总结与观察算出的 first={first} last={last} saved={first - last} 不一致")
            summary = {"first": first, "last": last, "saved": first - last}
        else:
            raise EnergyError(f"不支持的积木类型：{bt}")
    if summary is None:
        raise EnergyError("缺少总结积木")
    return {"status": "success", "site": site, "rounds": rounds,
            "summary": summary}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "site", "name": "教室"},
        {"type": "round", "lights": 10, "usage": 50},
        {"type": "round", "lights": 6, "usage": 35},
        {"type": "round", "lights": 4, "usage": 28},
        {"type": "summary", "first": 50, "last": 28, "saved": 22},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

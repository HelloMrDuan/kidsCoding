"""R0-U3-L03 traffic light executor (first stage, not a web classroom,
NOT real hardware).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '设计交通信号灯', focus concept '反馈', generic
acceptance. All pins, run lengths and rules are implementation choices,
NOT detailed-lesson values.
Model: a simulated traffic light is valid when, after a start event:
  - a power block comes first with voltage exactly 5;
  - led blocks for red pin 11, yellow pin 12 and green pin 13, each
    exactly once;
  - at least 5 step blocks, each with light in {red, yellow, green}
    and waiting a boolean (car-waiting feedback from the road);
  - the step sequence starts with red, only changes in the cycle
    order red -> green -> yellow -> red, and contains at least one
    complete red -> green -> yellow cycle;
  - every red run is at least 2 steps, every yellow run at least 1
    step;
  - feedback rule for every green run: if any step in the immediately
    preceding red run had waiting True, the green run is at least 4
    steps (extended green); otherwise the green run is exactly 2
    steps (short green);
  - at most 60 blocks.
Feedback lesson: the green length is not fixed in advance; it is
decided by the waiting feedback seen during red. Waiting cars extend
green; no waiting cars keep green short.
This is a SIMULATOR MODEL ONLY. It never lights a real signal and must
never be used to direct real traffic. Real traffic lights are real
safety equipment; children must always follow real signals and a
teacher or guardian, never a classroom simulation.
Practice A: red steps (waiting False, True), green 4 steps, yellow 1
step -> 1 cycle, extended green.
Practice B: red steps (waiting False, False), green 2 steps, yellow 1
step -> 1 cycle, short green.
Fault: a transition outside the cycle order; a red run shorter than 2;
a green run that is too short with waiting or too long without
waiting; fewer than 5 steps; no complete cycle; a step light outside
{red, yellow, green} or a waiting value that is not a boolean; a led
pin mismatch; missing power/leds; missing start.
Extension: two cycles, first with waiting (extended green 4), second
without waiting (short green 2).
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real hardware run. Those remain missing.
"""

LED_PINS = {"red": 11, "yellow": 12, "green": 13}
NEXT = {"red": "green", "green": "yellow", "yellow": "red"}


class TrafficError(Exception):
    pass


def _runs(steps):
    runs = []
    for s in steps:
        if runs and runs[-1]["light"] == s["light"]:
            runs[-1]["length"] += 1
            runs[-1]["waiting"] = runs[-1]["waiting"] or s["waiting"]
        else:
            runs.append({"light": s["light"], "length": 1,
                         "waiting": s["waiting"]})
    return runs


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise TrafficError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise TrafficError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "power":
        raise TrafficError("缺少供电积木：供电必须是开始后的第一个积木")
    if rest[0].get("voltage") != 5:
        raise TrafficError(f"电压 {rest[0].get('voltage')}V 不对，必须是 5V")
    leds = {}
    steps = []
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "led":
            color = b.get("color")
            if color not in LED_PINS:
                raise TrafficError(f"信号灯颜色 {color} 不在红、黄、绿中")
            if color in leds:
                raise TrafficError(f"{color} 灯重复")
            if b.get("pin") != LED_PINS[color]:
                raise TrafficError(f"{color} 灯引脚 {b.get('pin')} 不是 {LED_PINS[color]}")
            leds[color] = b["pin"]
        elif bt == "step":
            if set(leds) != set(LED_PINS):
                raise TrafficError("三盏灯都接好，才能走步骤")
            light = b.get("light")
            if light not in LED_PINS:
                raise TrafficError(f"步骤灯色 {light} 不在红、黄、绿中")
            if not isinstance(b.get("waiting"), bool):
                raise TrafficError("等待反馈必须是真或假")
            steps.append({"light": light, "waiting": b["waiting"]})
        else:
            raise TrafficError(f"不支持的积木类型：{bt}")
    if set(leds) != set(LED_PINS):
        raise TrafficError("缺少红、黄、绿灯中的一盏")
    if len(steps) < 5:
        raise TrafficError("步骤少于 5 个，不能完成一个周期")
    if steps[0]["light"] != "red":
        raise TrafficError("第一步必须是红灯")
    for prev, cur in zip(steps, steps[1:]):
        if cur["light"] != prev["light"] and NEXT[prev["light"]] != cur["light"]:
            raise TrafficError(f"灯色从 {prev['light']} 直接变成 {cur['light']}，不在红、绿、黄循环中")
    runs = _runs(steps)
    cycles = 0
    extended = False
    for i, run in enumerate(runs):
        if run["light"] == "red" and run["length"] < 2:
            raise TrafficError("红灯连续少于 2 步")
        if run["light"] == "yellow" and run["length"] < 1:
            raise TrafficError("黄灯连续少于 1 步")
        if run["light"] == "green":
            prev = runs[i - 1]
            if prev["waiting"]:
                if run["length"] < 4:
                    raise TrafficError("红灯时有车等待，绿灯却少于 4 步，没有延长")
                extended = True
            else:
                if run["length"] != 2:
                    raise TrafficError("红灯时没有车等待，绿灯必须是 2 步")
        if (run["light"] == "yellow" and i >= 2
                and runs[i - 1]["light"] == "green"
                and runs[i - 2]["light"] == "red"):
            cycles += 1
    if cycles < 1:
        raise TrafficError("没有完成一个红、绿、黄周期")
    return {"status": "success", "voltage": 5, "leds": leds,
            "steps": steps, "cycles": cycles, "extended": extended}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "power", "voltage": 5},
        {"type": "led", "color": "red", "pin": 11},
        {"type": "led", "color": "yellow", "pin": 12},
        {"type": "led", "color": "green", "pin": 13},
        {"type": "step", "light": "red", "waiting": False},
        {"type": "step", "light": "red", "waiting": True},
        {"type": "step", "light": "green", "waiting": False},
        {"type": "step", "light": "green", "waiting": False},
        {"type": "step", "light": "green", "waiting": False},
        {"type": "step", "light": "green", "waiting": False},
        {"type": "step", "light": "yellow", "waiting": False},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

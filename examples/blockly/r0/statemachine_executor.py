"""R0-U3-L05 state machine action executor (first stage, not a web
classroom, NOT real hardware).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '状态机控制动作', focus concept 'PWM', generic
acceptance. All pins, states, events and duty values are implementation
choices, NOT detailed-lesson values.
Model: a simulated state machine is valid when, after a start event:
  - a power block comes first with voltage exactly 5;
  - a motor block with pin 5;
  - at least 3 event blocks, each with event in {start, obstacle,
    clear, button_stop};
  - exactly one duties block, after the last event, whose duties list
    equals the PWM duty after each event in order;
  - at most 60 blocks.
State machine (implementation choice): the machine starts in idle.
Transitions:
  idle --start--> go; idle --button_stop--> stop;
  go --obstacle--> turn; go --button_stop--> stop;
  turn --clear--> go; turn --button_stop--> stop;
  stop --start--> go.
Any other event in a state is an illegal transition and fails.
PWM duty per state (implementation choice, 0-255 scale): idle 0,
go 180, turn 90, stop 0. The duty is the output of the state: a faster
action has a larger duty, a stopped action has duty 0. The duties
block must be computed from the states, not guessed.
This is a SIMULATOR MODEL ONLY. It never drives a real motor and never
outputs a real PWM signal. Real motor work must be done with a teacher
or guardian, with the power off while wiring, only at the voltage the
real board specifies, and never with fingers, hair or loose clothing
near moving parts.
Practice A: start, obstacle, clear, button_stop -> go, turn, go, stop
-> duties 180, 90, 180, 0.
Practice B: start, button_stop, start -> go, stop, go -> duties 180,
0, 180 (restart from stop).
Fault: an illegal transition; an event outside {start, obstacle,
clear, button_stop}; fewer than 3 events; a duties list that does not
match the computed duties; motor pin outside {5}; missing
power/motor/duties; missing start.
Extension: start, obstacle, button_stop, start, obstacle, clear ->
go, turn, stop, go, turn, go -> duties 180, 90, 0, 180, 90, 180.
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real hardware run. Those remain missing.
"""

MOTOR_PINS = {5}
TRANSITIONS = {
    ("idle", "start"): "go",
    ("idle", "button_stop"): "stop",
    ("go", "obstacle"): "turn",
    ("go", "button_stop"): "stop",
    ("turn", "clear"): "go",
    ("turn", "button_stop"): "stop",
    ("stop", "start"): "go",
}
DUTY = {"idle": 0, "go": 180, "turn": 90, "stop": 0}


class StateMachineError(Exception):
    pass


def compute_states(events):
    states = []
    state = "idle"
    for event in events:
        key = (state, event)
        if key not in TRANSITIONS:
            raise StateMachineError(f"状态 {state} 下事件 {event} 是非法转移")
        state = TRANSITIONS[key]
        states.append(state)
    return states


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise StateMachineError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise StateMachineError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "power":
        raise StateMachineError("缺少供电积木：供电必须是开始后的第一个积木")
    if rest[0].get("voltage") != 5:
        raise StateMachineError(f"电压 {rest[0].get('voltage')}V 不对，必须是 5V")
    motor_pin = None
    events = []
    duties = None
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "motor":
            if motor_pin is not None:
                raise StateMachineError("电机重复")
            if b.get("pin") not in MOTOR_PINS:
                raise StateMachineError(f"电机引脚 {b.get('pin')} 不是 5")
            motor_pin = b["pin"]
        elif bt == "event":
            if motor_pin is None:
                raise StateMachineError("先接电机，再发事件")
            if duties is not None:
                raise StateMachineError("占空比之后又发事件，这些事件没有占空比")
            event = b.get("event")
            if event not in ("start", "obstacle", "clear", "button_stop"):
                raise StateMachineError(f"事件 {event} 不在开始、障碍、清除、停止按钮中")
            events.append(event)
        elif bt == "duties":
            if duties is not None:
                raise StateMachineError("占空比重复")
            if motor_pin is None:
                raise StateMachineError("没有电机，不能出占空比")
            if len(events) < 3:
                raise StateMachineError("事件少于 3 个，不能出占空比")
            states = compute_states(events)
            expected = [DUTY[s] for s in states]
            if b.get("duties") != expected:
                raise StateMachineError(f"占空比 {b.get('duties')} 与状态算出的 {expected} 不一致")
            duties = b["duties"]
        else:
            raise StateMachineError(f"不支持的积木类型：{bt}")
    if motor_pin is None:
        raise StateMachineError("缺少电机")
    if duties is None:
        raise StateMachineError("缺少占空比积木")
    return {"status": "success", "voltage": 5, "motor_pin": motor_pin,
            "events": events, "states": compute_states(events),
            "duties": duties}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "power", "voltage": 5},
        {"type": "motor", "pin": 5},
        {"type": "event", "event": "start"},
        {"type": "event", "event": "obstacle"},
        {"type": "event", "event": "clear"},
        {"type": "event", "event": "button_stop"},
        {"type": "duties", "duties": [180, 90, 180, 0]},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

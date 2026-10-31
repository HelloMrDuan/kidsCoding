"""R0-U2-L04 button debounce executor (first stage, not a web classroom,
NOT real hardware).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '按键去抖动', focus concept '采样', generic
acceptance. All pins, sample values and the stable count are
implementation choices, NOT detailed-lesson values.
Model: a simulated button debounce is valid when, after a start event:
  - a power block comes first with voltage exactly 5;
  - a button block with pin in {2, 3};
  - at least 6 sample blocks, each with state 0 or 1;
  - exactly one count block, after the last sample, whose presses value
    equals the computed press count;
  - at most 60 blocks.
Debounce rule (implementation choice): a press counts only when state 1
is stable for at least 3 consecutive samples. Once counted, the button
stays counted until state 0 is stable for at least 3 consecutive
samples; rapid 1,0,1,0 bouncing in between counts as nothing extra.
So a clean press [0,0,0,1,1,1,0,0,0] counts 1, and a bouncing sequence
[0,1,0,1,1,1,0,1,0,0,0] also counts exactly 1.
This is a SIMULATOR MODEL ONLY. It never reads a real button and never
drives a real circuit. Real button work must be done with a teacher or
guardian, with the power off while wiring, and only at the voltage the
real board specifies.
Practice A: clean press, 1 press.
Practice B: bouncing press, still exactly 1 press.
Fault: a sample state outside {0, 1}; fewer than 6 samples; a count
that does not match the computed count; button pin outside {2, 3};
missing power/button/count; missing start.
Extension: two clean presses, 2 presses.
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real hardware run or real measurement. Those remain missing.
"""

BUTTON_PINS = {2, 3}
STABLE = 3


class DebounceError(Exception):
    pass


def count_presses(samples):
    presses = 0
    pressed = False
    run_value = None
    run_len = 0
    for s in samples:
        if s == run_value:
            run_len += 1
        else:
            run_value = s
            run_len = 1
        if not pressed and run_value == 1 and run_len >= STABLE:
            presses += 1
            pressed = True
        if pressed and run_value == 0 and run_len >= STABLE:
            pressed = False
    return presses


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise DebounceError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise DebounceError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "power":
        raise DebounceError("缺少供电积木：供电必须是开始后的第一个积木")
    if rest[0].get("voltage") != 5:
        raise DebounceError(f"电压 {rest[0].get('voltage')}V 不对，必须是 5V")
    button_pin = None
    samples = []
    count = None
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "button":
            if button_pin is not None:
                raise DebounceError("按键重复")
            if b.get("pin") not in BUTTON_PINS:
                raise DebounceError(f"按键引脚 {b.get('pin')} 不在 2、3 中")
            button_pin = b["pin"]
        elif bt == "sample":
            if button_pin is None:
                raise DebounceError("先接按键，再采样")
            if count is not None:
                raise DebounceError("计数之后又采样，这些采样没有参与计数")
            value = b.get("state")
            if value not in (0, 1) or isinstance(value, bool):
                raise DebounceError(f"采样状态 {value} 不在 0、1 中")
            samples.append(value)
        elif bt == "count":
            if count is not None:
                raise DebounceError("计数重复")
            if button_pin is None:
                raise DebounceError("没有按键，不能计数")
            if len(samples) < 6:
                raise DebounceError("采样少于 6 个，不能去抖计数")
            expected = count_presses(samples)
            if b.get("presses") != expected:
                raise DebounceError(f"计数 {b.get('presses')} 与采样算出的 {expected} 不一致")
            count = b["presses"]
        else:
            raise DebounceError(f"不支持的积木类型：{bt}")
    if button_pin is None:
        raise DebounceError("缺少按键")
    if count is None:
        raise DebounceError("缺少计数积木")
    return {"status": "success", "voltage": 5, "button_pin": button_pin,
            "samples": samples, "presses": count}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "power", "voltage": 5},
        {"type": "button", "pin": 2},
        {"type": "sample", "state": 0},
        {"type": "sample", "state": 0},
        {"type": "sample", "state": 0},
        {"type": "sample", "state": 1},
        {"type": "sample", "state": 1},
        {"type": "sample", "state": 1},
        {"type": "sample", "state": 0},
        {"type": "sample", "state": 0},
        {"type": "sample", "state": 0},
        {"type": "count", "presses": 1},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

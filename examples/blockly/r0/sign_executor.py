"""R0-U1-L06 electronic welcome sign executor (first stage, not a web
classroom, NOT real hardware, NO real sound).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '制作电子欢迎牌', focus concept '安全', generic
acceptance. All titles, pins, notes and safety items are implementation
choices, NOT detailed-lesson values.
Model: a welcome sign is valid when, after a start event:
  - all 5 safety checks pass exactly once: wiring_power_off,
    voltage_correct, wires_insulated, hands_dry, adult_present
    (any one False, missing, duplicate or unknown item fails);
  - a title block with non-empty text follows the safety checks;
  - at least 1 led block (pin in {11, 12, 13}, colour non-empty,
    pins distinct), 1 button block (pin in {2, 3}), 1 buzzer block
    (pin in {8, 9}), and at least 4 note blocks (note in
    C, D, E, F, G, A, B, rest; notes require the buzzer);
  - a press block (requires button and led, and the sign not already
    lit) lights the sign;
  - a show block, after the press, displays the sign (requires safety
    complete, title, led, button, buzzer, at least 4 notes, and press);
  - at most 60 blocks.
Order is enforced only where it matters for safety and for the show:
safety first, then title, then components, then press, then show.
This is a SIMULATOR MODEL ONLY. It never wires, powers, lights or
sounds a real sign. Real work must be supervised, done with the power
off while wiring, with dry hands, and only at the voltage the real
board specifies. Passing this simulator does NOT make a real circuit
safe.
Practice A: title 欢迎来到森林剧场; led red pin 13; button pin 2;
buzzer pin 8; notes C, E, G, C; press; show.
Practice B: title 欢迎来到我们班; led green pin 12; button pin 3;
buzzer pin 9; notes E, G, A, G; press; show.
Fault: a safety item False or missing; missing title; missing
led/button/buzzer; fewer than 4 notes; show without press; press
before button/led; missing show; missing start.
Extension: two LEDs (red pin 13 and green pin 12) in one sign pass.
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real hardware run or real sound. Those remain missing.
"""

SAFETY = {"wiring_power_off", "voltage_correct", "wires_insulated",
          "hands_dry", "adult_present"}
LED_PINS = {11, 12, 13}
BUTTON_PINS = {2, 3}
BUZZER_PINS = {8, 9}
NOTES = {"C", "D", "E", "F", "G", "A", "B", "rest"}


class SignError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise SignError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise SignError("程序过长：超过60个积木")
    safety = {}
    title = None
    leds = []
    button_pin = None
    buzzer_pin = None
    notes = []
    lit = False
    shown = False
    for b in blocks[1:]:
        bt = b.get("type")
        if shown:
            raise SignError("展示之后不能再加积木")
        if bt == "check":
            if title is not None:
                raise SignError("安全检查必须在标题之前完成")
            item = b.get("item")
            if item not in SAFETY:
                raise SignError(f"未知安全检查项 {item}")
            if item in safety:
                raise SignError(f"安全检查项 {item} 重复")
            if b.get("result") is not True:
                raise SignError(f"安全检查项 {item} 没有通过，停下来问大人")
            safety[item] = True
        elif bt == "title":
            if title is not None:
                raise SignError("标题重复")
            if set(safety) != SAFETY:
                raise SignError("安全检查没有全部通过，不能写标题")
            if not b.get("text"):
                raise SignError("欢迎牌标题不能为空")
            title = b["text"]
        elif bt == "led":
            if title is None:
                raise SignError("先通过安全检查并写标题，再接 LED")
            if b.get("pin") not in LED_PINS:
                raise SignError(f"LED 引脚 {b.get('pin')} 不在 11、12、13 中")
            if b["pin"] in [l["pin"] for l in leds]:
                raise SignError(f"LED 引脚 {b['pin']} 已被用过")
            if not b.get("color"):
                raise SignError("LED 颜色不能为空")
            leds.append({"pin": b["pin"], "color": b["color"]})
        elif bt == "button":
            if title is None:
                raise SignError("先通过安全检查并写标题，再接按钮")
            if button_pin is not None:
                raise SignError("按钮重复")
            if b.get("pin") not in BUTTON_PINS:
                raise SignError(f"按钮引脚 {b.get('pin')} 不在 2、3 中")
            button_pin = b["pin"]
        elif bt == "buzzer":
            if title is None:
                raise SignError("先通过安全检查并写标题，再接蜂鸣器")
            if buzzer_pin is not None:
                raise SignError("蜂鸣器重复")
            if b.get("pin") not in BUZZER_PINS:
                raise SignError(f"蜂鸣器引脚 {b.get('pin')} 不在 8、9 中")
            buzzer_pin = b["pin"]
        elif bt == "note":
            if buzzer_pin is None:
                raise SignError("先接蜂鸣器，再写音符")
            if b.get("note") not in NOTES:
                raise SignError(f"音符 {b.get('note')} 不在音阶中")
            notes.append(b["note"])
        elif bt == "press":
            if button_pin is None or not leds:
                raise SignError("按下前必须先接好按钮和 LED")
            if lit:
                raise SignError("欢迎牌已经亮着，不能重复按下")
            lit = True
        elif bt == "show":
            if not lit:
                raise SignError("没有按下按钮，欢迎牌没有亮，不能展示")
            if not leds or button_pin is None or buzzer_pin is None:
                raise SignError("欢迎牌缺少 LED、按钮或蜂鸣器")
            if len(notes) < 4:
                raise SignError("旋律至少要有 4 个音符")
            shown = True
        else:
            raise SignError(f"不支持的积木类型：{bt}")
    if set(safety) != SAFETY:
        raise SignError("安全检查没有全部通过")
    if title is None:
        raise SignError("缺少欢迎牌标题")
    if not shown:
        raise SignError("缺少展示积木")
    return {"status": "success", "title": title, "leds": leds,
            "button_pin": button_pin, "buzzer_pin": buzzer_pin,
            "notes": notes, "lit": True}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "check", "item": "wiring_power_off", "result": True},
        {"type": "check", "item": "voltage_correct", "result": True},
        {"type": "check", "item": "wires_insulated", "result": True},
        {"type": "check", "item": "hands_dry", "result": True},
        {"type": "check", "item": "adult_present", "result": True},
        {"type": "title", "text": "欢迎来到森林剧场"},
        {"type": "led", "pin": 13, "color": "red"},
        {"type": "button", "pin": 2},
        {"type": "buzzer", "pin": 8},
        {"type": "note", "note": "C"},
        {"type": "note", "note": "E"},
        {"type": "note", "note": "G"},
        {"type": "note", "note": "C"},
        {"type": "press"},
        {"type": "show"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

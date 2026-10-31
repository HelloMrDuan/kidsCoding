"""R0-U1-L03 button-controlled light executor (first stage, not a web
classroom, NOT real hardware).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '按钮控制灯光', focus concept '执行器', generic
acceptance. All voltages, pins, colours and press counts are implementation
choices, NOT detailed-lesson values.
Model: a simulated button control is valid when, after a start event:
  - a power block comes first with voltage exactly 5;
  - a button block with pin in {2, 3};
  - a led block with pin in {11, 12, 13} and a non-empty colour;
  - then press/release events in pairs: press turns the LED on (only
    when it is off), release turns it off (only when it is on);
  - at the end, at least 1 press-release pair is complete, the LED is
    off, and no press is left without a release;
  - at most 60 blocks.
This press-and-hold model is the lesson's implementation choice: holding
the button lights the LED, letting go turns it off. It is stated here so
a later detailed lesson can correct it if it specifies a toggle model
instead; the executor must not be presented as the detailed lesson's rule.
This is a SIMULATOR MODEL ONLY. It never wires, powers or reads a real
button or LED. Real wiring must be done with a teacher or guardian, with
the power off while wiring, and only at the voltage the real board
specifies.
Practice A: power 5V; button pin 2; red LED pin 13; press, release.
Practice B: power 5V; button pin 2; green LED pin 12;
press, release, press, release.
Fault: voltage not 5; button pin outside {2, 3}; LED pin outside
{11, 12, 13}; press before setup; press while already on; release
while already off; a press left without a release; missing start.
Extension: three press-release pairs pass.
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real hardware run. Those remain missing.
"""

BUTTON_PINS = {2, 3}
LED_PINS = {11, 12, 13}


class ButtonError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise ButtonError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise ButtonError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "power":
        raise ButtonError("缺少供电积木：供电必须是开始后的第一个积木")
    if rest[0].get("voltage") != 5:
        raise ButtonError(f"电压 {rest[0].get('voltage')}V 不对，必须是 5V")
    button_pin = None
    led = None
    led_on = False
    pairs = 0
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "button":
            if button_pin is not None:
                raise ButtonError("按钮重复")
            if b.get("pin") not in BUTTON_PINS:
                raise ButtonError(f"按钮引脚 {b.get('pin')} 不在 2、3 中")
            button_pin = b["pin"]
        elif bt == "led":
            if button_pin is None:
                raise ButtonError("先接按钮，再接 LED")
            if led is not None:
                raise ButtonError("LED 重复")
            if b.get("pin") not in LED_PINS:
                raise ButtonError(f"LED 引脚 {b.get('pin')} 不在 11、12、13 中")
            if not b.get("color"):
                raise ButtonError("LED 颜色不能为空")
            led = {"pin": b["pin"], "color": b["color"]}
        elif bt == "press":
            if button_pin is None or led is None:
                raise ButtonError("按下前必须先接好按钮和 LED")
            if led_on:
                raise ButtonError("灯已经亮着，不能重复按下")
            led_on = True
        elif bt == "release":
            if not led_on:
                raise ButtonError("灯没有亮着，不能松开")
            led_on = False
            pairs += 1
        else:
            raise ButtonError(f"不支持的积木类型：{bt}")
    if button_pin is None:
        raise ButtonError("缺少按钮")
    if led is None:
        raise ButtonError("缺少 LED")
    if led_on:
        raise ButtonError("按下后没有松开，实验没有完成")
    if pairs < 1:
        raise ButtonError("没有完成任何一次按下松开")
    return {"status": "success", "voltage": 5, "button_pin": button_pin,
            "led": led, "pairs": pairs, "led_on": False}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "power", "voltage": 5},
        {"type": "button", "pin": 2},
        {"type": "led", "pin": 13, "color": "red"},
        {"type": "press"},
        {"type": "release"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

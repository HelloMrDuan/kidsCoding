"""R0-U1-L01 development board executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for R0 on main (see M0-U1-L01
LESSON-DESIGN.md for the check method and result). This package is built
ONLY from the register entry: title '认识开发板与供电', focus concept '传感器',
generic acceptance. Every board part, voltage value and sensor reading below
is an implementation choice, NOT a detailed-lesson value.
Required: identify the development board parts and power supply, then show
a working result: board powered, sensor reading within range.
Implementation choices:
  parts: board, usb_cable, power, sensor
  power: 5V via USB, board LED on when powered
  sensor reading: must be between 0 and 1023 (10-bit range)
Practice A: connect power, LED on, sensor reads 512.
Practice B: connect power with a different sensor reading (800), still in range.
Fault: power not connected (LED off), or sensor reading out of range (2000).
Extension: add a second sensor reading, both in range.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing. It also does NOT prove real hardware:
it is a simulator model of the board, not a physical board run.
"""
class BoardError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise BoardError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 30:
        raise BoardError("程序过长：超过30个积木")
    parts = set()
    powered = False
    led = False
    readings = []
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "identify":
            parts.add(b.get("part"))
        elif bt == "connect_power":
            if b.get("voltage") != 5:
                raise BoardError("开发板供电为5V")
            powered = True
            led = True
        elif bt == "read_sensor":
            readings.append(b.get("value"))
        else:
            raise BoardError(f"不支持的积木类型：{bt}")
    if parts != {"board", "usb_cable", "power", "sensor"}:
        raise BoardError("认识开发板与供电：要认出开发板、USB线、电源、传感器")
    if not powered or not led:
        raise BoardError("未接通电源：开发板指示灯未亮")
    if not readings:
        raise BoardError("未读取传感器数值")
    for v in readings:
        if not (0 <= v <= 1023):
            raise BoardError("传感器数值超出范围：应在0到1023之间")
    return {"status": "success", "powered": powered, "led": led, "readings": readings}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "identify", "part": "board"},
        {"type": "identify", "part": "usb_cable"},
        {"type": "identify", "part": "power"},
        {"type": "identify", "part": "sensor"},
        {"type": "connect_power", "voltage": 5},
        {"type": "read_sensor", "value": 512},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

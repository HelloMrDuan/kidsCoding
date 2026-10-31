"""R0-U4-L03 parts assembly and safety executor (first stage, not a web
classroom, NOT real hardware).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '零件装配与安全', focus concept '工程', generic
acceptance. All parts, pins and the assembly order are implementation
choices, NOT detailed-lesson values.
Model: a simulated assembly is valid when, in this exact stage order
after a start event:
  1. exactly one safety block, with power_off, hands_dry and
     adult_present all True (assembly happens with the power off);
  2. part blocks in the order board, sensor (pin A0), motor (pin 5),
     led (pin 13), each exactly once; an optional buzzer block (pin 8)
     may come after the led and before the check;
  3. exactly one check block with all_connected True;
  4. exactly one power block with voltage exactly 5, only after the
     check;
  5. exactly one test block, after the power, with led_on True and a
     sensor reading integer in 0..1023;
  6. at most 60 blocks.
Engineering lesson: safety first, parts in a fixed order, check before
power, test after power. Power before the check, a part out of order,
or a missing safety item all fail.
This is a SIMULATOR MODEL ONLY. It never assembles real parts and
never powers a real circuit. Real assembly must be done with a
teacher or guardian, with the power off while wiring, only at the
voltage the real board specifies, with dry hands, and stopped at once
if anything is loose, hot or smells wrong.
Practice A: full correct sequence, sensor reading 512.
Practice B: same sequence, sensor reading 800 (the reading value may
vary, it only has to be in range).
Fault: a safety item False; a part missing or out of order; a wrong
pin; a check that is not True; power before the check; a wrong
voltage; a test reading outside 0..1023; missing safety/check/power/
test; missing start.
Extension: add a buzzer (pin 8) after the led and before the check;
the assembly still passes.
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real hardware run. Those remain missing.
"""

PART_ORDER = ["board", "sensor", "motor", "led"]
PART_PINS = {"sensor": "A0", "motor": 5, "led": 13, "buzzer": 8}
SAFETY_ITEMS = ["power_off", "hands_dry", "adult_present"]


class AssemblyError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise AssemblyError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise AssemblyError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "safety":
        raise AssemblyError("缺少安全检查：安全检查必须是开始后的第一个积木")
    safety = rest[0]
    for item in SAFETY_ITEMS:
        if safety.get(item) is not True:
            raise AssemblyError(f"安全项 {item} 不是 True，不能开始装配")
    parts = []
    buzzer = False
    checked = False
    powered = False
    tested = None
    stage = 1  # 1 parts, 2 check, 3 power, 4 test, 5 done
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "part":
            if stage != 1:
                raise AssemblyError("零件只能在安全检查之后、检查之前装配")
            name = b.get("name")
            if name == "buzzer":
                if parts != PART_ORDER:
                    raise AssemblyError("蜂鸣器只能在四个零件都装好之后加")
                if buzzer:
                    raise AssemblyError("蜂鸣器重复")
                if b.get("pin") != PART_PINS["buzzer"]:
                    raise AssemblyError(f"蜂鸣器引脚 {b.get('pin')} 不是 8")
                buzzer = True
                continue
            if name not in PART_ORDER:
                raise AssemblyError(f"不支持的零件：{name}")
            if len(parts) >= len(PART_ORDER) or PART_ORDER[len(parts)] != name:
                raise AssemblyError(f"零件 {name} 不在装配顺序的这个位置")
            if name != "board" and b.get("pin") != PART_PINS[name]:
                raise AssemblyError(f"{name} 引脚 {b.get('pin')} 不是 {PART_PINS[name]}")
            parts.append(name)
        elif bt == "check":
            if stage != 1:
                raise AssemblyError("检查只能出现一次")
            if parts != PART_ORDER:
                raise AssemblyError("四个零件没有装齐，不能检查")
            if b.get("all_connected") is not True:
                raise AssemblyError("检查没有通过，不能通电")
            checked = True
            stage = 2
        elif bt == "power":
            if stage != 2:
                raise AssemblyError("通电只能在检查通过之后")
            if b.get("voltage") != 5:
                raise AssemblyError(f"电压 {b.get('voltage')}V 不对，必须是 5V")
            powered = True
            stage = 3
        elif bt == "test":
            if stage != 3:
                raise AssemblyError("测试只能在通电之后")
            if b.get("led_on") is not True:
                raise AssemblyError("测试时灯没有亮")
            reading = b.get("sensor_reading")
            if not isinstance(reading, int) or isinstance(reading, bool):
                raise AssemblyError("传感器读数必须是整数")
            if reading < 0 or reading > 1023:
                raise AssemblyError(f"传感器读数 {reading} 超出 0..1023")
            tested = {"led_on": True, "sensor_reading": reading}
            stage = 4
        else:
            raise AssemblyError(f"不支持的积木类型：{bt}")
    if not checked:
        raise AssemblyError("缺少检查积木")
    if not powered:
        raise AssemblyError("缺少通电积木")
    if tested is None:
        raise AssemblyError("缺少测试积木")
    return {"status": "success", "safety": True, "parts": parts,
            "buzzer": buzzer, "checked": True, "voltage": 5,
            "test": tested}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "safety", "power_off": True, "hands_dry": True,
         "adult_present": True},
        {"type": "part", "name": "board"},
        {"type": "part", "name": "sensor", "pin": "A0"},
        {"type": "part", "name": "motor", "pin": 5},
        {"type": "part", "name": "led", "pin": 13},
        {"type": "check", "all_connected": True},
        {"type": "power", "voltage": 5},
        {"type": "test", "led_on": True, "sensor_reading": 512},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

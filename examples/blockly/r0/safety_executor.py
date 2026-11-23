"""R0-U1-L05 circuit safety checklist executor (first stage, not a web
classroom, NOT real hardware, NOT a safety certification).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '理解电路安全', focus concept '安全', generic
acceptance. All checklist items are implementation choices, NOT
detailed-lesson values.
Model: a safety checklist passes when, after a start event:
  - every required item is checked exactly once and passes (result True):
    wiring_power_off (接线时断电), voltage_correct (电压是 5V),
    wires_insulated (导线不裸露), hands_dry (手是干的),
    adult_present (有老师或监护人在场);
  - an optional extra item workspace_tidy (桌面整洁) may also be checked;
  - exactly one go block with non-empty text is present;
  - at most 60 blocks.
Any required check that is False fails immediately: the checklist does
not pass, work must stop, and the failing item is named. An unknown or
duplicate item also fails.
This checklist is a CLASSROOM TEACHING TOOL ONLY. Passing it in a
simulator does NOT make a real circuit safe, and it never replaces a
teacher or guardian. Real circuit work must always be supervised, done
with the power off while wiring, with dry hands, and only at the voltage
the real board specifies. If any real check fails, stop and ask an adult.
Practice A: all 5 required items pass, in listed order; go 开始动手.
Practice B: all 5 required items pass, in a different order;
go 请老师确认后开始.
Fault: one required item False; a required item missing; a duplicate
item; an unknown item; missing go; missing start.
Extension: the extra item workspace_tidy also passes.
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor real circuit safety. Those remain missing.
"""

REQUIRED = {"wiring_power_off", "voltage_correct", "wires_insulated",
            "hands_dry", "adult_present"}
EXTRA = {"workspace_tidy"}
ITEMS = REQUIRED | EXTRA


class SafetyError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise SafetyError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise SafetyError("程序过长：超过60个积木")
    checks = {}
    go = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "check":
            item = b.get("item")
            if item not in ITEMS:
                raise SafetyError(f"未知检查项 {item}")
            if item in checks:
                raise SafetyError(f"检查项 {item} 重复")
            if b.get("result") is not True:
                raise SafetyError(f"检查项 {item} 没有通过，停下来问大人")
            checks[item] = True
        elif bt == "go":
            if go is not None:
                raise SafetyError("开始记录重复")
            if not b.get("text"):
                raise SafetyError("开始记录不能为空")
            go = b["text"]
        else:
            raise SafetyError(f"不支持的积木类型：{bt}")
    missing = REQUIRED - set(checks)
    if missing:
        raise SafetyError(f"缺少必要检查项 {sorted(missing)[0]}")
    if go is None:
        raise SafetyError("缺少开始记录")
    return {"status": "success", "checks": sorted(checks), "go": go}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "check", "item": "wiring_power_off", "result": True},
        {"type": "check", "item": "voltage_correct", "result": True},
        {"type": "check", "item": "wires_insulated", "result": True},
        {"type": "check", "item": "hands_dry", "result": True},
        {"type": "check", "item": "adult_present", "result": True},
        {"type": "go", "text": "开始动手"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

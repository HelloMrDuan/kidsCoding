"""S0-U1-L01 computer parts executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main (see M0-U1-L01
LESSON-DESIGN.md for the check method and result). This package is built
ONLY from the register entry: title '认识计算机部件', focus concept '设备',
generic acceptance. Every part name and function below is an implementation
choice, NOT a detailed-lesson value.
Required: identify the main computer parts and match each part to its
function, then show a working result.
Implementation choice for parts (name -> function):
  screen -> display, keyboard -> input, mouse -> point, host -> compute, speaker -> sound
Practice A: match all 5 parts. Practice B: match the same 5 parts in a
different order (different goal: order independence, not memorised order).
Fault: matching a part to the wrong function, or missing a part.
Extension: add one more part (printer -> print) without breaking the base 5.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
PARTS = {"screen": "display", "keyboard": "input", "mouse": "point", "host": "compute", "speaker": "sound"}

class PartsError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise PartsError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 30:
        raise PartsError("程序过长：超过30个积木")
    matched = {}
    extra = {}
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "match":
            name, fn = b.get("part"), b.get("function")
            if name in PARTS:
                matched[name] = fn
            else:
                extra[name] = fn
        else:
            raise PartsError(f"不支持的积木类型：{bt}")
    if matched != PARTS:
        raise PartsError("部件与功能未全部正确配对：检查每个部件的功能")
    return {"status": "success", "parts": matched, "extra": extra}

def correct_program():
    prog = [{"type": "when_start"}]
    for name, fn in PARTS.items():
        prog.append({"type": "match", "part": name, "function": fn})
    return prog

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

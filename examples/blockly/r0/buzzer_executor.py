"""R0-U1-L04 buzzer melody executor (first stage, not a web classroom,
NOT real hardware, NO real sound).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '蜂鸣器播放旋律', focus concept '执行器', generic
acceptance. All pins, notes, beats and melodies are implementation
choices, NOT detailed-lesson values.
Model: a simulated buzzer melody is valid when, after a start event:
  - a power block comes first with voltage exactly 5;
  - a buzzer block with pin in {8, 9};
  - at least 4 note blocks, each with a note in
    (C, D, E, F, G, A, B, rest) and beats greater than 0;
  - exactly one play block, after the last note, which plays the notes
    in order (a note after play fails, as it would never be played);
  - at most 60 blocks.
Frequencies are the standard middle-octave approximations used only to
label each note in the simulated output: C 262, D 294, E 330, F 349,
G 392, A 440, B 494, rest 0. The executor produces a note list, not
sound; it must not be presented as playing a real buzzer.
This is a SIMULATOR MODEL ONLY. It never powers, wires or sounds a real
buzzer. Real wiring must be done with a teacher or guardian, with the
power off while wiring, and only at the voltage the real board specifies.
Practice A: C 1, E 1, G 1, C 1.
Practice B: E 1, G 1, A 2, G 1.
Fault: voltage not 5; buzzer pin outside {8, 9}; a note outside the
scale; beats not greater than 0; fewer than 4 notes; missing play;
a note after play; missing start.
Extension: a 6-note melody C, D, E, F, G, A passes.
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real hardware run or real sound. Those remain missing.
"""

BUZZER_PINS = {8, 9}
FREQUENCIES = {"C": 262, "D": 294, "E": 330, "F": 349,
               "G": 392, "A": 440, "B": 494, "rest": 0}


class BuzzerError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise BuzzerError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise BuzzerError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "power":
        raise BuzzerError("缺少供电积木：供电必须是开始后的第一个积木")
    if rest[0].get("voltage") != 5:
        raise BuzzerError(f"电压 {rest[0].get('voltage')}V 不对，必须是 5V")
    buzzer_pin = None
    notes = []
    played = None
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "buzzer":
            if buzzer_pin is not None:
                raise BuzzerError("蜂鸣器重复")
            if b.get("pin") not in BUZZER_PINS:
                raise BuzzerError(f"蜂鸣器引脚 {b.get('pin')} 不在 8、9 中")
            buzzer_pin = b["pin"]
        elif bt == "note":
            if buzzer_pin is None:
                raise BuzzerError("先接蜂鸣器，再写音符")
            if played is not None:
                raise BuzzerError("播放之后又加了音符，这些音符不会被播放")
            note, beats = b.get("note"), b.get("beats")
            if note not in FREQUENCIES:
                raise BuzzerError(f"音符 {note} 不在音阶中")
            if not isinstance(beats, (int, float)) or isinstance(beats, bool) or beats <= 0:
                raise BuzzerError(f"音符 {note} 的拍数必须大于 0")
            notes.append({"note": note, "beats": beats,
                          "frequency": FREQUENCIES[note]})
        elif bt == "play":
            if played is not None:
                raise BuzzerError("播放重复")
            if buzzer_pin is None:
                raise BuzzerError("没有蜂鸣器，不能播放")
            if len(notes) < 4:
                raise BuzzerError("旋律至少要有 4 个音符")
            played = list(notes)
        else:
            raise BuzzerError(f"不支持的积木类型：{bt}")
    if buzzer_pin is None:
        raise BuzzerError("缺少蜂鸣器")
    if played is None:
        raise BuzzerError("缺少播放积木")
    return {"status": "success", "voltage": 5, "buzzer_pin": buzzer_pin,
            "played": played, "total_beats": sum(n["beats"] for n in played)}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "power", "voltage": 5},
        {"type": "buzzer", "pin": 8},
        {"type": "note", "note": "C", "beats": 1},
        {"type": "note", "note": "E", "beats": 1},
        {"type": "note", "note": "G", "beats": 1},
        {"type": "note", "note": "C", "beats": 1},
        {"type": "play"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

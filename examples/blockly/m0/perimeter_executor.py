"""M0-U4-L01 playground perimeter executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '计算操场周长', focus concept '面积', generic
acceptance. All lengths are implementation choices, NOT detailed-lesson
values.
Model: a rectangular playground has length L and width W. Its perimeter
is 2*(L+W). A program states L and W and a claimed perimeter; it passes
only if the claim equals 2*(L+W).
Practice A: L=50, W=30 -> perimeter 160.
Practice B: L=40, W=40 (square playground) -> perimeter 160 (different
goal: square case, same perimeter by coincidence, different dimensions).
Fault: claiming perimeter = L+W (80 for practice A), or L*W (area, not
perimeter).
Extension: add a second playground (L=20, W=10 -> 60) and sum both
perimeters (220).
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class PerimeterError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise PerimeterError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise PerimeterError("程序过长：超过40个积木")
    fields = []
    total = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "field":
            L, W = b.get("length"), b.get("width")
            claimed = b.get("perimeter")
            expected = 2 * (L + W)
            if claimed != expected:
                raise PerimeterError(f"操场周长错误：长 {L}、宽 {W} 的周长应为 {expected}，实际 {claimed}")
            fields.append(expected)
        elif bt == "total":
            total = b.get("value")
        else:
            raise PerimeterError(f"不支持的积木类型：{bt}")
    if not fields:
        raise PerimeterError("至少要计算一个操场的周长")
    result = {"status": "success", "perimeters": fields}
    if total is not None:
        if total != sum(fields):
            raise PerimeterError(f"周长总和错误：应为 {sum(fields)}，实际 {total}")
        result["total"] = total
    return result

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "field", "length": 50, "width": 30, "perimeter": 160},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

"""M0-U2-L03 odd/even executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '寻找奇数偶数', focus concept '循环', generic
acceptance. All numbers are implementation choices, NOT detailed-lesson values.
Model: loop over a list of numbers, classify each as odd or even by
remainder modulo 2.
Practice A: loop over [1,2,3,4] -> odd [1,3], even [2,4].
Practice B: loop over [10,15,20] -> odd [15], even [10,20] (different goal:
two-digit numbers, not just 1-4).
Fault: classifying 3 as even, or 4 as odd.
Extension: count how many odds and evens (2 and 2 for practice A).
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class ParityError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise ParityError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise ParityError("程序过长：超过40个积木")
    numbers = None
    claimed = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "loop_numbers":
            numbers = b.get("numbers")
        elif bt == "classify":
            claimed = b.get("result")
        else:
            raise ParityError(f"不支持的积木类型：{bt}")
    if numbers is None:
        raise ParityError("要先循环遍历一组数字")
    if claimed is None:
        raise ParityError("要给出奇偶分类结果")
    expected = {"odd": [n for n in numbers if n % 2 == 1], "even": [n for n in numbers if n % 2 == 0]}
    if claimed != expected:
        raise ParityError(f"奇偶分类错误：应为 {expected}，实际 {claimed}")
    return {"status": "success", "odd": expected["odd"], "even": expected["even"],
            "odd_count": len(expected["odd"]), "even_count": len(expected["even"])}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "loop_numbers", "numbers": [1, 2, 3, 4]},
        {"type": "classify", "result": {"odd": [1, 3], "even": [2, 4]}},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

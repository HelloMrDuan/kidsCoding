"""M0-U2-L04 Fibonacci rabbit executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '斐波那契小兔子', focus concept '循环', generic
acceptance. All month counts are implementation choices, NOT detailed-lesson
values.
Model: Fibonacci rabbit pairs: month 1 = 1, month 2 = 1, each later month
= sum of the previous two months.
Practice A: first 6 months -> [1, 1, 2, 3, 5, 8].
Practice B: first 8 months -> [1, 1, 2, 3, 5, 8, 13, 21] (different goal:
longer sequence, not just the first 6).
Fault: a sequence that adds 1 each time, or that skips the second 1.
Extension: month 9 = 34.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class FibonacciError(Exception):
    pass

def fib_sequence(n):
    seq = []
    a, b = 1, 1
    for _ in range(n):
        seq.append(a)
        a, b = b, a + b
    return seq

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise FibonacciError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise FibonacciError("程序过长：超过40个积木")
    months = None
    claimed = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "months":
            months = b.get("count")
        elif bt == "sequence":
            claimed = b.get("values")
        else:
            raise FibonacciError(f"不支持的积木类型：{bt}")
    if months is None or claimed is None:
        raise FibonacciError("要先说出月份数，再给出兔子对数序列")
    expected = fib_sequence(months)
    if claimed != expected:
        raise FibonacciError(f"斐波那契序列错误：{months} 个月应为 {expected}，实际 {claimed}")
    return {"status": "success", "months": months, "sequence": expected}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "months", "count": 6},
        {"type": "sequence", "values": [1, 1, 2, 3, 5, 8]},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

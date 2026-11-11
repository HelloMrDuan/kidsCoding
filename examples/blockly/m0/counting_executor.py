"""M0-U2-L05 counting algorithms executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '比较两种计数算法', focus concept '递推', generic
acceptance. All numbers and step counts are implementation choices,
NOT detailed-lesson values.
Model: count from 1 to N by two algorithms and compare their step counts.
  Algorithm A (one by one): steps = N.
  Algorithm B (by twos, with a final single step when N is odd): steps =
  N//2 + (N % 2).
Both must give the same total count N; B must not use more steps than A.
Practice A: N=10 -> A 10 steps, B 5 steps.
Practice B: N=9 -> A 9 steps, B 5 steps (4 pairs + 1 single).
Fault: a counting method that reports the wrong total (e.g. 9 instead of 10),
or claims B uses more steps than A.
Extension: N=100 -> A 100 steps, B 50 steps.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class CountingError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise CountingError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise CountingError("程序过长：超过40个积木")
    n = None
    results = {}
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "count_to":
            n = b.get("n")
        elif bt == "method":
            name = b.get("name")
            results[name] = {"total": b.get("total"), "steps": b.get("steps")}
        else:
            raise CountingError(f"不支持的积木类型：{bt}")
    if n is None:
        raise CountingError("要先说出数到几")
    if "one_by_one" not in results or "by_twos" not in results:
        raise CountingError("要比较两种计数算法：一个一个数和两个两个数")
    a, b = results["one_by_one"], results["by_twos"]
    if a["total"] != n or b["total"] != n:
        raise CountingError(f"计数总数错误：数到 {n}，实际 {a['total']} / {b['total']}")
    if a["steps"] != n:
        raise CountingError(f"一个一个数到 {n} 需要 {n} 步，不是 {a['steps']} 步")
    expected_b = n // 2 + (n % 2)
    if b["steps"] != expected_b:
        raise CountingError(f"两个两个数到 {n} 需要 {expected_b} 步，不是 {b['steps']} 步")
    if b["steps"] > a["steps"]:
        raise CountingError("两个两个数不应比一个一个数步数更多")
    return {"status": "success", "n": n, "one_by_one_steps": a["steps"], "by_twos_steps": b["steps"]}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "count_to", "n": 10},
        {"type": "method", "name": "one_by_one", "total": 10, "steps": 10},
        {"type": "method", "name": "by_twos", "total": 10, "steps": 5},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

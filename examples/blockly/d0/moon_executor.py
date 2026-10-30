"""D0-U2-L02 moon phase executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '地球月相变化', focus concept '观察', generic
acceptance. All phases and day counts are implementation choices, NOT
detailed-lesson values.
Model: the moon cycles through phases in order: new, crescent, half,
gibbous, full, gibbous, half, crescent, then back to new. Each phase
lasts a number of days. A simulation passes only if phases are in
cyclic order, each phase lasts at least 1 day, and the total days equal
the sum of phase days.
Practice A: 8 phases, each 3 days -> total 24 days (simplified cycle).
Practice B: 4 phases (new, half, full, half) each 7 days -> total 28
days (different goal: coarser cycle, lunar month length).
Fault: phases out of order (full before half), or a phase lasting 0
days, or a claimed total that does not match the sum.
Extension: add a second cycle after the first (repeat the 8 phases) ->
total 48 days for practice A.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
ORDER = ["new", "crescent", "half", "gibbous", "full", "gibbous2", "half2", "crescent2"]

class MoonError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise MoonError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise MoonError("程序过长：超过60个积木")
    phases = []
    claimed = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "phase":
            phases.append((b.get("name"), b.get("days")))
        elif bt == "total":
            claimed = b.get("value")
        else:
            raise MoonError(f"不支持的积木类型：{bt}")
    names = [n for n, _ in phases]
    # cyclic order check: each consecutive pair must follow ORDER cyclically,
    # except the coarse 4-phase practice B which uses a separate allowed order
    coarse = ["new", "half", "full", "half2"]
    def follows_order(seq, order):
        idx = {n: i for i, n in enumerate(order)}
        for a, b in zip(seq, seq[1:]):
            if a not in idx or b not in idx:
                return False
            if (idx[a] + 1) % len(order) != idx[b]:
                return False
        return True
    if not (follows_order(names, ORDER) or follows_order(names, coarse)):
        raise MoonError(f"月相顺序错误：实际 {names}")
    for name, days in phases:
        if days < 1:
            raise MoonError(f"月相 {name} 天数至少为 1，实际 {days}")
    if len(phases) < 4:
        raise MoonError("月相模拟至少要包含 4 个月相")
    total = sum(d for _, d in phases)
    if claimed is None:
        raise MoonError("要给出总天数")
    if claimed != total:
        raise MoonError(f"总天数错误：应为 {total}，实际 {claimed}")
    return {"status": "success", "phases": names, "total_days": total}

def correct_program():
    prog = [{"type": "when_start"}]
    for name in ORDER:
        prog.append({"type": "phase", "name": name, "days": 3})
    prog.append({"type": "total", "value": 24})
    return prog

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

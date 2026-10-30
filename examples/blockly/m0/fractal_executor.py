"""M0-U1-L05 fractal tree executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '分形树木图案', focus concept '对称', generic
acceptance. All branch counts, angles and lengths are implementation choices,
NOT detailed-lesson values.
Model: a fractal tree of depth d: at each level, a branch splits into two
branches, one turning left 30 degrees and one turning right 30 degrees,
each shorter than its parent (length * 0.7, rounded to 1 decimal).
Total branches = 2^d - 1 for a tree rooted at depth d (root counts as 1).
Practice A: depth 2 tree (3 branches). Practice B: depth 3 tree (7 branches,
different goal: deeper recursion, not just the first tree).
Fault: branches that do not split symmetrically (only one side) fail.
Extension: depth 4 tree (15 branches).
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class FractalError(Exception):
    pass

def build_tree(depth):
    # returns list of branches: (level, side, length, angle)
    branches = []
    def rec(level, length, angle, side):
        if level > depth:
            return
        branches.append((level, side, round(length, 1), angle))
        if level < depth:
            rec(level+1, length*0.7, angle-30, "left")
            rec(level+1, length*0.7, angle+30, "right")
    rec(1, 100.0, 90, "root")
    return branches

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise FractalError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 30:
        raise FractalError("程序过长：超过30个积木")
    depth = None
    symmetric = True
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "tree":
            depth = b.get("depth")
            symmetric = b.get("symmetric", True)
        else:
            raise FractalError(f"不支持的积木类型：{bt}")
    if depth is None or depth < 1:
        raise FractalError("至少要画一层分形树")
    if not symmetric:
        raise FractalError("分形树左右要对称分叉：只分一边不对称")
    branches = build_tree(depth)
    expected = 2**depth - 1
    if len(branches) != expected:
        raise FractalError(f"分形树分支数错误：深度 {depth} 应有 {expected} 条分支")
    return {"status": "success", "depth": depth, "branches": len(branches), "symmetric": symmetric}

def correct_program():
    return [{"type": "when_start"}, {"type": "tree", "depth": 2, "symmetric": True}]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

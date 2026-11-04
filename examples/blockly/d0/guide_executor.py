"""D0-U3-L04 smart guide executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '制作智能导览', focus concept '原型', generic
acceptance. All exhibits and routes are implementation choices, NOT
detailed-lesson values.
Model: a smart guide has a route of exhibits in order, and each exhibit
has a spoken introduction. A guide passes only if the route has at least
3 exhibits, every exhibit has a non-empty introduction, and the route
order matches the planned order (no exhibit skipped or reordered).
Practice A: route [entrance, garden, hall], introductions for all three.
Practice B: route [hall, garden, entrance] is a different planned order
(reversed), with introductions for all three (different goal: different
route, same rule).
Fault: a route missing an introduction, or a route that skips an exhibit
(entrance, hall without garden), or a route in the wrong order.
Extension: add a 4th exhibit (shop) at the end with its introduction.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class GuideError(Exception):
    pass

def run_program(blocks, planned=None):
    if planned is None:
        planned = ["entrance", "garden", "hall"]
    if not blocks or blocks[0].get("type") != "when_start":
        raise GuideError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise GuideError("程序过长：超过60个积木")
    route = []
    intros = {}
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "stop":
            route.append(b.get("name"))
        elif bt == "intro":
            intros[b.get("name")] = b.get("text")
        else:
            raise GuideError(f"不支持的积木类型：{bt}")
    if len(route) < 3:
        raise GuideError("智能导览至少要包含 3 个展点")
    if route != planned[:len(route)] and route != planned:
        # allow extension: route must start with planned order
        if route[:len(planned)] != planned:
            raise GuideError(f"导览路线顺序错误：规划为 {planned}，实际 {route}")
    if route[:len(planned)] != planned and route != planned:
        raise GuideError(f"导览路线顺序错误：规划为 {planned}，实际 {route}")
    for name in route:
        if not intros.get(name):
            raise GuideError(f"展点 {name} 缺少讲解")
    return {"status": "success", "route": route, "stops": len(route)}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "stop", "name": "entrance"},
        {"type": "intro", "name": "entrance", "text": "欢迎来到展馆"},
        {"type": "stop", "name": "garden"},
        {"type": "intro", "name": "garden", "text": "这里是花园"},
        {"type": "stop", "name": "hall"},
        {"type": "intro", "name": "hall", "text": "这里是大厅"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

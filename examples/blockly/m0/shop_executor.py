"""M0-U4-L03 budget shopping executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '预算购物小游戏', focus concept '路径', generic
acceptance. All prices and budget are implementation choices, NOT
detailed-lesson values.
Model: a shopping list has items with prices. The total must not exceed
the budget (100). A program states items and a claimed total; it passes
only if the claimed total equals the sum of prices and the sum is within
budget.
Practice A: pencil 10, notebook 20, eraser 5 -> total 35, within budget.
Practice B: book 50, pen 15, ruler 10 -> total 75, within budget
(different goal: different items, closer to budget).
Fault: claiming a wrong total, or buying items that exceed budget
(toy 80 + book 50 = 130 > 100).
Extension: add a sticker 5 to practice A -> total 40, still within budget.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
BUDGET = 100

class ShopError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise ShopError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise ShopError("程序过长：超过40个积木")
    items = []
    claimed = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "item":
            items.append((b.get("name"), b.get("price")))
        elif bt == "total":
            claimed = b.get("value")
        else:
            raise ShopError(f"不支持的积木类型：{bt}")
    if not items:
        raise ShopError("购物清单至少要有一件商品")
    expected = sum(p for _, p in items)
    if claimed is None:
        raise ShopError("要给出购物总价")
    if claimed != expected:
        raise ShopError(f"购物总价错误：应为 {expected}，实际 {claimed}")
    if expected > BUDGET:
        raise ShopError(f"超出预算 {BUDGET}：实际总价 {expected}")
    return {"status": "success", "items": items, "total": expected, "remaining": BUDGET - expected}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "item", "name": "pencil", "price": 10},
        {"type": "item", "name": "notebook", "price": 20},
        {"type": "item", "name": "eraser", "price": 5},
        {"type": "total", "value": 35},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

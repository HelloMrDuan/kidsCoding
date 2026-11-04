"""S0-U2-L03 privacy executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '保护个人隐私信息', focus concept '隐私', generic
acceptance. All categories are implementation choices, NOT detailed-lesson
values, and NO real personal information is used anywhere in this file:
only category names (e.g. 姓名, 家庭住址) appear, never values.
Fixed table (implementation choices):
  private (must be kept, action keep): 姓名, 家庭住址, 电话号码, 密码, 生日
  shareable in this classification exercise (action share):
    喜欢的颜色, 喜欢的动物, 喜欢的运动, 喜欢的书
Model: after a start event, at least 2 private items kept and at least 2
shareable items shared; every item must be in the table and its action must
match the table; no item twice; at most 60 blocks.
HONESTY NOTE: in this exercise, share means "this type is not private",
not an instruction to post it. In real life, even a shareable item is
only shared with a guardian's permission, and keeping it is always safe.
Practice A: 姓名 keep, 家庭住址 keep, 喜欢的颜色 share, 喜欢的动物 share.
Practice B: 电话号码 keep, 密码 keep, 喜欢的运动 share, 喜欢的书 share.
Fault: a private item shared; a shareable item kept (classification
mismatch in this exercise); an unknown item; only private items;
a duplicate item.
Extension: a 5th item, 生日 keep, passes.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""

TABLE = {
    "姓名": "keep", "家庭住址": "keep", "电话号码": "keep",
    "密码": "keep", "生日": "keep",
    "喜欢的颜色": "share", "喜欢的动物": "share",
    "喜欢的运动": "share", "喜欢的书": "share",
}


class PrivacyError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise PrivacyError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise PrivacyError("程序过长：超过60个积木")
    seen = {}
    for b in blocks[1:]:
        if b.get("type") != "item":
            raise PrivacyError(f"不支持的积木类型：{b.get('type')}")
        name = b.get("name")
        action = b.get("action")
        if name not in TABLE:
            raise PrivacyError(f"未知项目 {name}")
        if TABLE[name] != action:
            raise PrivacyError(f"{name} 应为 {TABLE[name]}，不是 {action}")
        if name in seen:
            raise PrivacyError(f"项目 {name} 重复")
        seen[name] = action
    kept = [n for n, a in seen.items() if a == "keep"]
    shared = [n for n, a in seen.items() if a == "share"]
    if len(kept) < 2:
        raise PrivacyError("至少要留出 2 项隐私信息不分享")
    if len(shared) < 2:
        raise PrivacyError("至少要列出 2 项可分享类型")
    return {"status": "success", "kept": sorted(kept), "shared": sorted(shared)}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "item", "name": "姓名", "action": "keep"},
        {"type": "item", "name": "家庭住址", "action": "keep"},
        {"type": "item", "name": "喜欢的颜色", "action": "share"},
        {"type": "item", "name": "喜欢的动物", "action": "share"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

"""S0-U3-L03 creator license executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '尊重创作者授权', focus concept '信息素养', generic
acceptance. All works and licenses are fictional implementation choices,
NOT detailed-lesson values, and NO real work is used here.
License -> required action:
  free_use -> use (may be used freely)
  with_credit -> use_with_credit (may be used only with credit)
  ask_permission -> ask_first (must ask before using, never use directly)
  not_allowed -> skip (must not be used)
Model: after a start event, at least 4 works, including at least 1
ask_first and at least 1 skip; every action must match its license;
no work id twice; at most 60 blocks.
Practice A: 故事A free_use -> use; 歌曲B with_credit -> use_with_credit;
图片C ask_permission -> ask_first; 故事D not_allowed -> skip.
Practice B: 歌曲E free_use -> use; 图片F with_credit -> use_with_credit;
故事G ask_permission -> ask_first; 歌曲H not_allowed -> skip.
Fault: an ask_permission work used directly; a not_allowed work used;
a with_credit work used without credit; a duplicate work id;
only 3 works.
Extension: a 5th work, 图片I free_use -> use, passes.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""

REQUIRED = {
    "free_use": "use",
    "with_credit": "use_with_credit",
    "ask_permission": "ask_first",
    "not_allowed": "skip",
}


class LicenseError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise LicenseError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise LicenseError("程序过长：超过60个积木")
    seen = {}
    for b in blocks[1:]:
        if b.get("type") != "work":
            raise LicenseError(f"不支持的积木类型：{b.get('type')}")
        wid = b.get("id")
        lic = b.get("license")
        action = b.get("action")
        if not wid:
            raise LicenseError("作品缺少编号")
        if wid in seen:
            raise LicenseError(f"作品 {wid} 重复")
        if lic not in REQUIRED:
            raise LicenseError(f"作品 {wid} 的许可类型未知")
        if action != REQUIRED[lic]:
            raise LicenseError(
                f"作品 {wid} 的许可为 {lic}，应为 {REQUIRED[lic]}，不是 {action}")
        seen[wid] = action
    if len(seen) < 4:
        raise LicenseError("至少要处理 4 件作品")
    if "ask_first" not in seen.values():
        raise LicenseError("至少要包含 1 件先获许可的作品")
    if "skip" not in seen.values():
        raise LicenseError("至少要包含 1 件不使用的作品")
    return {"status": "success", "actions": seen}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "work", "id": "故事A", "license": "free_use", "action": "use"},
        {"type": "work", "id": "歌曲B", "license": "with_credit",
         "action": "use_with_credit"},
        {"type": "work", "id": "图片C", "license": "ask_permission",
         "action": "ask_first"},
        {"type": "work", "id": "故事D", "license": "not_allowed", "action": "skip"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

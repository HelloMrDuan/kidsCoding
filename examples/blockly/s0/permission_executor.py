"""S0-U2-L05 app permission executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '设置应用权限', focus concept '安全', generic
acceptance. All apps, permissions and needs are implementation choices,
NOT detailed-lesson values.
SAFETY: this is a SIMULATION. In class, learners do not change real
device permissions; changing a real permission needs a guardian.
Rule (implementation choices): a permission an app needs to work must
be allowed; any other permission must be denied.
Needs table:
  画图应用: 相册
  地图应用: 位置
  录音应用: 麦克风
  拍照应用: 相机
Known permissions: 相册, 位置, 通讯录, 麦克风, 相机.
Model: after a start event, at least 4 settings, covering at least 2
apps, including at least 1 allow and at least 1 deny; every setting
must match the needs table; no app+permission twice; at most 60 blocks.
Practice A: 画图应用 相册 allow, 画图应用 位置 deny,
地图应用 位置 allow, 地图应用 通讯录 deny.
Practice B: 录音应用 麦克风 allow, 录音应用 通讯录 deny,
拍照应用 相机 allow, 拍照应用 位置 deny.
Fault: a needed permission denied; an unneeded permission allowed;
an unknown app; only allows; a duplicate setting.
Extension: a 5th setting, 拍照应用 通讯录 deny, passes.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""

NEEDS = {
    "画图应用": {"相册"},
    "地图应用": {"位置"},
    "录音应用": {"麦克风"},
    "拍照应用": {"相机"},
}
KNOWN_PERMISSIONS = {"相册", "位置", "通讯录", "麦克风", "相机"}


class PermissionError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise PermissionError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise PermissionError("程序过长：超过60个积木")
    seen = {}
    for b in blocks[1:]:
        if b.get("type") != "setting":
            raise PermissionError(f"不支持的积木类型：{b.get('type')}")
        app = b.get("app")
        perm = b.get("permission")
        decision = b.get("decision")
        if app not in NEEDS:
            raise PermissionError(f"未知应用 {app}")
        if perm not in KNOWN_PERMISSIONS:
            raise PermissionError(f"未知权限 {perm}")
        if decision not in ("allow", "deny"):
            raise PermissionError(f"应用 {app} 的权限 {perm} 必须是 allow 或 deny")
        key = (app, perm)
        if key in seen:
            raise PermissionError(f"应用 {app} 的权限 {perm} 重复设置")
        expected = "allow" if perm in NEEDS[app] else "deny"
        if decision != expected:
            raise PermissionError(
                f"应用 {app} 的权限 {perm} 应为 {expected}，不是 {decision}")
        seen[key] = decision
    if len(seen) < 4:
        raise PermissionError("设置应用权限至少要设置 4 项")
    apps = {app for app, _ in seen}
    if len(apps) < 2:
        raise PermissionError("至少要设置 2 个应用的权限")
    if "allow" not in seen.values():
        raise PermissionError("至少要允许 1 项必需权限")
    if "deny" not in seen.values():
        raise PermissionError("至少要拒绝 1 项非必需权限")
    return {"status": "success", "settings": {f"{a}:{p}": d for (a, p), d in seen.items()}}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "setting", "app": "画图应用", "permission": "相册", "decision": "allow"},
        {"type": "setting", "app": "画图应用", "permission": "位置", "decision": "deny"},
        {"type": "setting", "app": "地图应用", "permission": "位置", "decision": "allow"},
        {"type": "setting", "app": "地图应用", "permission": "通讯录", "decision": "deny"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

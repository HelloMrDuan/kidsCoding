"""S0-U4-L02 software update executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '认识软件更新', focus concept '威胁建模', generic
acceptance. All app names, versions, sources and fixes are implementation
choices, NOT detailed-lesson values.
Model: a software update is valid when, after a start event:
  - an app block gives a non-empty app name and a current version;
  - at least 1 update block, each with a newer version than the previous
    one, source exactly 'official', and a non-empty fix description;
  - a verify block whose version equals the last update version and
    whose works flag is True;
  - at most 60 blocks.
Threat-model link: an old version can carry a known weakness; an official
update fixes it, which closes that threat. An update from an unknown source
is itself a new threat and is rejected here.
This is a classroom simulation only. It never installs, downloads or changes
real software. A real update must be checked with a teacher or guardian and
must come only from the official source.
Practice A: app 画图应用 1.0 -> 1.1, source official,
fix 修补画笔闪退漏洞, verify 1.1 works.
Practice B: app 音乐应用 2.0 -> 2.1, source official,
fix 修补播放卡顿漏洞, verify 2.1 works.
Fault: unknown source; same or older version; missing fix;
verify version mismatch; verify works False; missing app/update/verify/start.
Extension: two sequential updates 1.0 -> 1.1 -> 1.2 pass.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""


class UpdateError(Exception):
    pass


def _version_tuple(version):
    try:
        parts = tuple(int(p) for p in str(version).split("."))
    except ValueError:
        raise UpdateError(f"版本号格式不对：{version}")
    if not parts:
        raise UpdateError(f"版本号格式不对：{version}")
    return parts


def _newer(new, old):
    n, o = _version_tuple(new), _version_tuple(old)
    length = max(len(n), len(o))
    n = n + (0,) * (length - len(n))
    o = o + (0,) * (length - len(o))
    return n > o


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise UpdateError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise UpdateError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "app":
        raise UpdateError("缺少应用积木")
    if not rest[0].get("name") or not rest[0].get("version"):
        raise UpdateError("应用名称和当前版本不能为空")
    name = rest[0]["name"]
    current = rest[0]["version"]
    updates = []
    verify = None
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "update":
            if verify is not None:
                raise UpdateError("检查之后不能再更新")
            to_version = b.get("to_version")
            if not to_version:
                raise UpdateError("更新目标版本不能为空")
            if not _newer(to_version, current):
                raise UpdateError(f"更新版本 {to_version} 没有比当前版本 {current} 更新")
            if b.get("source") != "official":
                raise UpdateError("更新来源不是官方来源")
            if not b.get("fixes"):
                raise UpdateError("更新必须说明修补了什么问题")
            updates.append({"to_version": to_version, "source": b["source"],
                            "fixes": b["fixes"]})
            current = to_version
        elif bt == "verify":
            if verify is not None:
                raise UpdateError("检查记录重复")
            if b.get("version") != current:
                raise UpdateError("检查版本与最后更新版本不一致")
            if b.get("works") is not True:
                raise UpdateError("更新后应用不能正常打开，更新失败")
            verify = {"version": b["version"], "works": True}
        else:
            raise UpdateError(f"不支持的积木类型：{bt}")
    if not updates:
        raise UpdateError("缺少更新积木")
    if verify is None:
        raise UpdateError("缺少更新后检查")
    return {"status": "success", "app": name, "updates": updates,
            "version": current, "verify": verify}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "app", "name": "画图应用", "version": "1.0"},
        {"type": "update", "to_version": "1.1", "source": "official",
         "fixes": "修补画笔闪退漏洞"},
        {"type": "verify", "version": "1.1", "works": True},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

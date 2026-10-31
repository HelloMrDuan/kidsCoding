"""D0-U4-L06 maker fair executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '举办小小创客博览会', focus concept '协作', generic
acceptance. All counts and rules are implementation choices, NOT
detailed-lesson values.
Model: a maker fair is held when:
  - the program starts with a start event, then a non-empty fair title;
  - at least 3 projects are exhibited, each with a non-empty name,
    a collaborator, a piece of feedback and a revision made from it;
  - project names are distinct;
  - feedback comes from at least 2 distinct collaborators
    (collaboration, not a solo show);
  - at most 60 blocks.
Practice A: 3 projects, collaborators 小狐 / 小兔 / 小狐, each with
feedback then a revision.
Practice B: 3 projects, collaborators 小兔 / 小龟 / 小兔, different
projects, same structure.
Fault: fewer than 3 projects; a project without feedback or without a
revision; feedback from only one collaborator; no title; duplicate
project names.
Extension: a 4th project passes.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""


class FairError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise FairError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise FairError("程序过长：超过60个积木")
    title = None
    projects = []
    collaborators = set()
    names = set()
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "title":
            if title is not None:
                raise FairError("博览会标题重复")
            if not b.get("text"):
                raise FairError("博览会标题不能为空")
            title = b["text"]
        elif bt == "project":
            name = b.get("name")
            if not name:
                raise FairError("作品名称不能为空")
            if name in names:
                raise FairError(f"作品 {name} 重复")
            if not b.get("collaborator"):
                raise FairError(f"{name} 缺少协作者")
            if not b.get("feedback"):
                raise FairError(f"{name} 缺少协作者反馈")
            if not b.get("revision"):
                raise FairError(f"{name} 有反馈但没有修改")
            names.add(name)
            collaborators.add(b["collaborator"])
            projects.append(name)
        else:
            raise FairError(f"不支持的积木类型：{bt}")
    if title is None:
        raise FairError("缺少博览会标题")
    if len(projects) < 3:
        raise FairError("小小创客博览会至少要展出 3 件作品")
    if len(collaborators) < 2:
        raise FairError("协作博览会至少需要 2 位不同协作者")
    return {"status": "success", "title": title, "projects": projects,
            "collaborators": sorted(collaborators)}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "title", "text": "小小创客博览会"},
        {"type": "project", "name": "纸桥", "collaborator": "小狐",
         "feedback": "桥面可以再宽一点", "revision": "桥面加宽一格"},
        {"type": "project", "name": "节拍器", "collaborator": "小兔",
         "feedback": "节奏可以再稳一点", "revision": "节拍间隔改成均匀"},
        {"type": "project", "name": "彩虹画", "collaborator": "小狐",
         "feedback": "颜色顺序可以再对一点", "revision": "按红橙黄绿青蓝紫重排"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

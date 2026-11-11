"""S0-U3-L05 safe collaboration executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '安全地与同伴协作', focus concept '协作', generic
acceptance. All projects, members and tasks are fictional implementation
choices, NOT detailed-lesson values.
Model: a safe collaboration is valid when, after a start event:
  - a title block gives a non-empty project title;
  - at least 2 distinct members;
  - every member has at least 1 task with non-empty work, and every task
    belongs to a listed member;
  - at least 1 share block, and every share block is public (kind public);
    a private share fails;
  - a review block is present;
  - at most 60 blocks.
Practice A: title 森林海报; members 小狐, 小兔;
tasks 小狐/画画, 小兔/写字; share 画稿 public; review.
Practice B: title 班级故事; members 小龟, 小鸟;
tasks 小龟/讲故事, 小鸟/配音; share 故事稿 public; review.
Fault: only 1 member; a member without a task; a private share;
missing review; a duplicate member.
Extension: a 3rd member with a task and a share passes.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""


class CollabError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise CollabError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise CollabError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "title" or not rest[0].get("text"):
        raise CollabError("缺少协作项目标题")
    title = rest[0]["text"]
    members = []
    tasks = {}
    shares = []
    review = False
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "member":
            name = b.get("name")
            if not name:
                raise CollabError("成员名称不能为空")
            if name in members:
                raise CollabError(f"成员 {name} 重复")
            members.append(name)
        elif bt == "task":
            member = b.get("member")
            work = b.get("work")
            if member not in members:
                raise CollabError(f"任务的成员 {member} 不在成员名单中")
            if not work:
                raise CollabError(f"成员 {member} 的任务内容不能为空")
            tasks.setdefault(member, []).append(work)
        elif bt == "share":
            if b.get("kind") != "public":
                raise CollabError("协作中只能分享公开作品，不能分享隐私内容")
            if not b.get("item"):
                raise CollabError("分享内容不能为空")
            shares.append(b["item"])
        elif bt == "review":
            review = True
        else:
            raise CollabError(f"不支持的积木类型：{bt}")
    if len(members) < 2:
        raise CollabError("协作至少要有 2 名成员")
    for member in members:
        if member not in tasks:
            raise CollabError(f"成员 {member} 没有任务")
    if not shares:
        raise CollabError("协作至少要分享 1 件公开作品")
    if not review:
        raise CollabError("协作缺少互查环节")
    return {"status": "success", "title": title, "members": members,
            "tasks": tasks, "shares": shares}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "title", "text": "森林海报"},
        {"type": "member", "name": "小狐"},
        {"type": "member", "name": "小兔"},
        {"type": "task", "member": "小狐", "work": "画画"},
        {"type": "task", "member": "小兔", "work": "写字"},
        {"type": "share", "item": "画稿", "kind": "public"},
        {"type": "review"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

"""S0-U1-L06 digital organizing plan executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '设计个人数字整理计划', focus concept '网络', generic
acceptance. All titles, categories, folders and rules are implementation
choices, NOT detailed-lesson values.
Model: a personal digital organizing plan is valid when, after a start event:
  - a title block gives a non-empty plan title;
  - at least 3 category blocks follow, each with a non-empty category name,
    a folder name, and a non-empty rule;
  - folder names are non-empty, at most 20 characters, do not start or end
    with a space, and contain none of / \\ : * ? " < > |;
  - category names are distinct and folder names are distinct;
  - a final review block gives a period of weekly or monthly;
  - at most 60 blocks.
Practice A: title 我的数字整理计划; categories 学习/作业/每周整理,
照片/图片/每月整理, 音乐/音乐/每月整理; review weekly.
Practice B: title 我的文件小管家; categories 作品/作品/每周整理,
阅读/图书/每月整理, 游戏/存档/每月整理; review monthly.
Fault: only 2 categories; missing title; a duplicate category;
an illegal folder name; missing review.
Extension: a 4th category passes.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""

ILLEGAL = set('/\\:*?"<>|')


class PlanError(Exception):
    pass


def _check_folder(name):
    if not name:
        raise PlanError("文件夹名称不能为空")
    if len(name) > 20:
        raise PlanError(f"文件夹名称 {name} 过长")
    if name != name.strip():
        raise PlanError(f"文件夹名称 {name} 首尾不能有空格")
    if any(c in ILLEGAL for c in name):
        raise PlanError(f"文件夹名称 {name} 含有非法字符")


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise PlanError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise PlanError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "title" or not rest[0].get("text"):
        raise PlanError("缺少整理计划标题")
    title = rest[0]["text"]
    categories = []
    review = None
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "category":
            name = b.get("name")
            folder = b.get("folder")
            rule = b.get("rule")
            if not name:
                raise PlanError("分类名称不能为空")
            if not rule:
                raise PlanError(f"分类 {name} 缺少整理规则")
            _check_folder(folder)
            if name in [c["name"] for c in categories]:
                raise PlanError(f"分类 {name} 重复")
            if folder in [c["folder"] for c in categories]:
                raise PlanError(f"文件夹 {folder} 重复")
            categories.append({"name": name, "folder": folder, "rule": rule})
        elif bt == "review":
            if review is not None:
                raise PlanError("复查安排重复")
            if b.get("period") not in ("weekly", "monthly"):
                raise PlanError("复查周期必须是每周或每月")
            review = b["period"]
        else:
            raise PlanError(f"不支持的积木类型：{bt}")
    if len(categories) < 3:
        raise PlanError("整理计划至少要包含 3 个分类")
    if review is None:
        raise PlanError("整理计划缺少复查安排")
    return {"status": "success", "title": title,
            "categories": categories, "review": review}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "title", "text": "我的数字整理计划"},
        {"type": "category", "name": "学习", "folder": "作业", "rule": "每周整理"},
        {"type": "category", "name": "照片", "folder": "图片", "rule": "每月整理"},
        {"type": "category", "name": "音乐", "folder": "音乐", "rule": "每月整理"},
        {"type": "review", "period": "weekly"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

"""S0-U1-L02 folder executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '创建规范文件夹', focus concept '设备', generic
acceptance. All folder names and rules are implementation choices, NOT
detailed-lesson values.
Model: a standard folder set is created when:
  - the program starts with a start event;
  - at least 3 top-level folders are created;
  - at least 1 subfolder is created under an existing top-level folder;
  - every folder name is non-empty, at most 20 characters, does not start
    or end with a space, and contains none of / \\ : * ? " < > |;
  - top-level folder names are distinct, and subfolder names are distinct
    within the same parent;
  - at most 60 blocks.
Practice A: folders 作业 / 图片 / 音乐, subfolder 数学 under 作业.
Practice B: folders 作品 / 照片 / 文档, subfolder 语文 under 作品.
Fault: fewer than 3 top folders; an illegal folder name; a duplicate
top folder; a subfolder whose parent does not exist; no subfolder.
Extension: a 4th top folder plus a second subfolder passes.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""

ILLEGAL = set('/\\:*?"<>|')


class FolderError(Exception):
    pass


def _check_name(name):
    if not name:
        raise FolderError("文件夹名称不能为空")
    if len(name) > 20:
        raise FolderError(f"文件夹名称 {name} 过长")
    if name != name.strip():
        raise FolderError(f"文件夹名称 {name} 首尾不能有空格")
    if any(c in ILLEGAL for c in name):
        raise FolderError(f"文件夹名称 {name} 含有非法字符")


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise FolderError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise FolderError("程序过长：超过60个积木")
    folders = set()
    subfolders = {}
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "folder":
            name = b.get("name")
            _check_name(name)
            if name in folders:
                raise FolderError(f"文件夹 {name} 重复")
            folders.add(name)
        elif bt == "subfolder":
            parent = b.get("parent")
            name = b.get("name")
            _check_name(name)
            if parent not in folders:
                raise FolderError(f"子文件夹 {name} 的父文件夹 {parent} 不存在")
            if name in subfolders.get(parent, set()):
                raise FolderError(f"{parent} 下的子文件夹 {name} 重复")
            subfolders.setdefault(parent, set()).add(name)
        else:
            raise FolderError(f"不支持的积木类型：{bt}")
    if len(folders) < 3:
        raise FolderError("规范文件夹至少要创建 3 个顶级文件夹")
    if not subfolders:
        raise FolderError("规范文件夹至少要创建 1 个子文件夹")
    return {"status": "success", "folders": sorted(folders),
            "subfolders": {k: sorted(v) for k, v in subfolders.items()}}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "folder", "name": "作业"},
        {"type": "folder", "name": "图片"},
        {"type": "folder", "name": "音乐"},
        {"type": "subfolder", "parent": "作业", "name": "数学"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

"""S0-U4-L03 backup executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '备份作品文件', focus concept '备份', generic
acceptance. All file names, contents and backup places are implementation
choices, NOT detailed-lesson values.
Model: a backup is valid when, after a start event:
  - at least 2 file blocks, each with a distinct non-empty name and
    non-empty content;
  - every file has exactly one backup block, whose name matches the file,
    whose content equals the file content, and whose copy_to place is
    non-empty;
  - a check block with non-empty text is present;
  - at most 60 blocks.
A backup in the same place as the original is not a backup: copy_to must
be non-empty and different from the file name itself. Content equality is
also checked.
This is a classroom simulation only. It never copies, moves or deletes real
files. A real backup must be done with a teacher or guardian, and the copy
must be checked by opening it.
Practice A: files 森林画稿/画了小狐, 故事稿/写了森林故事;
backups to U盘 and 云盘 with identical contents; check 已核对两份备份.
Practice B: files 音乐稿/编了小调, 海报稿/画了安全海报;
backups to 云盘 and U盘 with identical contents; check 已核对两份备份.
Fault: only 1 file; backup content mismatch; backup for an unknown file;
a file with no backup; a duplicate backup; missing check; missing start.
Extension: a 3rd file with its backup passes.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""


class BackupError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise BackupError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise BackupError("程序过长：超过60个积木")
    files = {}
    backups = {}
    check = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "file":
            name, content = b.get("name"), b.get("content")
            if not name or not content:
                raise BackupError("作品名称和内容不能为空")
            if name in files:
                raise BackupError(f"作品 {name} 重复")
            files[name] = content
        elif bt == "backup":
            name = b.get("name")
            if name not in files:
                raise BackupError(f"备份的作品 {name} 不存在")
            if name in backups:
                raise BackupError(f"作品 {name} 的备份重复")
            if not b.get("copy_to"):
                raise BackupError(f"作品 {name} 的备份地点不能为空")
            if b.get("copy_to") == name:
                raise BackupError(f"作品 {name} 的备份地点不能就是原件本身")
            if b.get("content") != files[name]:
                raise BackupError(f"作品 {name} 的备份内容与原件不一致")
            backups[name] = {"copy_to": b["copy_to"], "content": b["content"]}
        elif bt == "check":
            if check is not None:
                raise BackupError("检查记录重复")
            if not b.get("text"):
                raise BackupError("检查记录不能为空")
            check = b["text"]
        else:
            raise BackupError(f"不支持的积木类型：{bt}")
    if len(files) < 2:
        raise BackupError("至少要备份 2 份作品")
    missing = [n for n in files if n not in backups]
    if missing:
        raise BackupError(f"作品 {missing[0]} 没有备份")
    if check is None:
        raise BackupError("缺少备份检查记录")
    return {"status": "success", "files": files, "backups": backups,
            "check": check}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "file", "name": "森林画稿", "content": "画了小狐"},
        {"type": "file", "name": "故事稿", "content": "写了森林故事"},
        {"type": "backup", "name": "森林画稿", "copy_to": "U盘",
         "content": "画了小狐"},
        {"type": "backup", "name": "故事稿", "copy_to": "云盘",
         "content": "写了森林故事"},
        {"type": "check", "text": "已核对两份备份"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

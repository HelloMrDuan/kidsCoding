"""S0-U4-L04 simulated accidental-deletion recovery executor (first stage,
not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '模拟误删恢复', focus concept '备份', generic
acceptance. All file names, contents and backup places are implementation
choices, NOT detailed-lesson values.
Model: a recovery is valid when, after a start event, in block order:
  - a file block creates a file with a non-empty name and content;
  - a backup block copies it (name must exist and be present, content must
    equal the file content, copy_to non-empty and different from the name);
  - a delete block removes a present file that has a backup (deleting
    without a backup fails: there would be nothing to recover from);
  - a restore block brings a deleted file back, with content equal to its
    backup content;
  - a verify block checks a restored file, with content equal to the
    restored content;
  - at the end, at least 1 file has been restored and verified, and no
    file is left deleted without being restored;
  - at most 60 blocks.
This is a classroom simulation only. It never deletes, copies or restores
real files. A real recovery must be done with a teacher or guardian, must
never delete on purpose to test it, and must check the restored file by
opening it.
Practice A: file 森林画稿/画了小狐 -> backup to U盘 -> delete ->
restore -> verify 画了小狐.
Practice B: file 故事稿/写了森林故事 -> backup to 云盘 -> delete ->
restore -> verify 写了森林故事.
Fault: delete without backup; restore without delete; restore content
mismatch; verify content mismatch; a deleted file never restored;
missing start.
Extension: two files, both deleted and restored, pass.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""


class RecoveryError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise RecoveryError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise RecoveryError("程序过长：超过60个积木")
    present = {}
    backups = {}
    deleted = set()
    restored = []
    verified = []
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "file":
            name, content = b.get("name"), b.get("content")
            if not name or not content:
                raise RecoveryError("作品名称和内容不能为空")
            if name in present or name in deleted:
                raise RecoveryError(f"作品 {name} 已存在")
            present[name] = content
        elif bt == "backup":
            name = b.get("name")
            if name not in present:
                raise RecoveryError(f"备份的作品 {name} 不存在或已被删除")
            if name in backups:
                raise RecoveryError(f"作品 {name} 的备份重复")
            if not b.get("copy_to") or b.get("copy_to") == name:
                raise RecoveryError(f"作品 {name} 的备份地点不对")
            if b.get("content") != present[name]:
                raise RecoveryError(f"作品 {name} 的备份内容与原件不一致")
            backups[name] = {"copy_to": b["copy_to"], "content": b["content"]}
        elif bt == "delete":
            name = b.get("name")
            if name not in present:
                raise RecoveryError(f"删除的作品 {name} 不存在")
            if name not in backups:
                raise RecoveryError(f"作品 {name} 没有备份，不能删除")
            del present[name]
            deleted.add(name)
        elif bt == "restore":
            name = b.get("name")
            if name not in deleted:
                raise RecoveryError(f"作品 {name} 没有被删除，不能恢复")
            if b.get("content") != backups[name]["content"]:
                raise RecoveryError(f"作品 {name} 的恢复内容与备份不一致")
            present[name] = backups[name]["content"]
            deleted.remove(name)
            restored.append(name)
        elif bt == "verify":
            name = b.get("name")
            if name not in restored:
                raise RecoveryError(f"作品 {name} 没有经过恢复，不能检查")
            if b.get("content") != present.get(name):
                raise RecoveryError(f"作品 {name} 的检查内容与恢复后内容不一致")
            verified.append(name)
        else:
            raise RecoveryError(f"不支持的积木类型：{bt}")
    if not restored:
        raise RecoveryError("没有完成任何一次恢复")
    if deleted:
        raise RecoveryError(f"作品 {sorted(deleted)[0]} 被删除后没有恢复")
    if not verified:
        raise RecoveryError("缺少恢复后检查")
    return {"status": "success", "present": present, "backups": backups,
            "restored": restored, "verified": verified}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "file", "name": "森林画稿", "content": "画了小狐"},
        {"type": "backup", "name": "森林画稿", "copy_to": "U盘",
         "content": "画了小狐"},
        {"type": "delete", "name": "森林画稿"},
        {"type": "restore", "name": "森林画稿", "content": "画了小狐"},
        {"type": "verify", "name": "森林画稿", "content": "画了小狐"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))

import json
import unittest

from backup_executor import BackupError, correct_program, run_program


def file(name, content):
    return {"type": "file", "name": name, "content": content}


def backup(name, copy_to, content):
    return {"type": "backup", "name": name, "copy_to": copy_to,
            "content": content}


def base(files, backups, check="已核对两份备份"):
    prog = [{"type": "when_start"}] + files + backups
    if check is not None:
        prog.append({"type": "check", "text": check})
    return prog


class TestS0U4L03(unittest.TestCase):
    def test_correct_backup(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(len(r["files"]), 2)
        self.assertEqual(len(r["backups"]), 2)

    def test_practice_b_different_files(self):
        r = run_program(base(
            [file("音乐稿", "编了小调"), file("海报稿", "画了安全海报")],
            [backup("音乐稿", "云盘", "编了小调"),
             backup("海报稿", "U盘", "画了安全海报")]))
        self.assertEqual(r["status"], "success")

    def test_only_one_file_fails(self):
        with self.assertRaises(BackupError):
            run_program(base(
                [file("森林画稿", "画了小狐")],
                [backup("森林画稿", "U盘", "画了小狐")]))

    def test_content_mismatch_fails(self):
        with self.assertRaises(BackupError):
            run_program(base(
                [file("森林画稿", "画了小狐"), file("故事稿", "写了森林故事")],
                [backup("森林画稿", "U盘", "画了小兔"),
                 backup("故事稿", "云盘", "写了森林故事")]))

    def test_unknown_file_backup_fails(self):
        with self.assertRaises(BackupError):
            run_program(base(
                [file("森林画稿", "画了小狐"), file("故事稿", "写了森林故事")],
                [backup("森林画稿", "U盘", "画了小狐"),
                 backup("音乐稿", "云盘", "编了小调")]))

    def test_missing_backup_fails(self):
        with self.assertRaises(BackupError):
            run_program(base(
                [file("森林画稿", "画了小狐"), file("故事稿", "写了森林故事")],
                [backup("森林画稿", "U盘", "画了小狐")]))

    def test_duplicate_backup_fails(self):
        with self.assertRaises(BackupError):
            run_program(base(
                [file("森林画稿", "画了小狐"), file("故事稿", "写了森林故事")],
                [backup("森林画稿", "U盘", "画了小狐"),
                 backup("森林画稿", "云盘", "画了小狐"),
                 backup("故事稿", "云盘", "写了森林故事")]))

    def test_missing_check_fails(self):
        with self.assertRaises(BackupError):
            run_program(base(
                [file("森林画稿", "画了小狐"), file("故事稿", "写了森林故事")],
                [backup("森林画稿", "U盘", "画了小狐"),
                 backup("故事稿", "云盘", "写了森林故事")],
                check=None))

    def test_extension_third_file_passes(self):
        r = run_program(base(
            [file("森林画稿", "画了小狐"), file("故事稿", "写了森林故事"),
             file("音乐稿", "编了小调")],
            [backup("森林画稿", "U盘", "画了小狐"),
             backup("故事稿", "云盘", "写了森林故事"),
             backup("音乐稿", "U盘", "编了小调")],
            check="已核对三份备份"))
        self.assertEqual(len(r["backups"]), 3)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(BackupError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

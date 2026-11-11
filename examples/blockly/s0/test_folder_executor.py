import json
import unittest

from folder_executor import FolderError, correct_program, run_program


def folders(*names):
    return [{"type": "folder", "name": n} for n in names]


def base(top, subs):
    prog = [{"type": "when_start"}] + folders(*top)
    prog += [{"type": "subfolder", "parent": p, "name": n} for p, n in subs]
    return prog


class TestS0U1L02(unittest.TestCase):
    def test_correct_folders(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["folders"], ["作业", "图片", "音乐"])

    def test_practice_b_different_names(self):
        r = run_program(base(["作品", "照片", "文档"], [("作品", "语文")]))
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["subfolders"], {"作品": ["语文"]})

    def test_only_two_folders_fails(self):
        with self.assertRaises(FolderError):
            run_program(base(["作业", "图片"], [("作业", "数学")]))

    def test_illegal_name_fails(self):
        with self.assertRaises(FolderError):
            run_program(base(["作业", "图/片", "音乐"], [("作业", "数学")]))

    def test_duplicate_folder_fails(self):
        with self.assertRaises(FolderError):
            run_program(base(["作业", "作业", "音乐"], [("作业", "数学")]))

    def test_orphan_subfolder_fails(self):
        with self.assertRaises(FolderError):
            run_program(base(["作业", "图片", "音乐"], [("不存在", "数学")]))

    def test_no_subfolder_fails(self):
        with self.assertRaises(FolderError):
            run_program([{"type": "when_start"}] + folders("作业", "图片", "音乐"))

    def test_extension_fourth_folder_passes(self):
        r = run_program(base(["作业", "图片", "音乐", "视频"],
                             [("作业", "数学"), ("图片", "风景")]))
        self.assertEqual(len(r["folders"]), 4)

    def test_save_reopen_reruns_identically(self):
        prog = correct_program()
        first = run_program(prog)
        reopened = json.loads(json.dumps(prog))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(FolderError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

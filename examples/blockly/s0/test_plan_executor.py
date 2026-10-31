import json
import unittest

from plan_executor import PlanError, correct_program, run_program


def cat(name, folder, rule):
    return {"type": "category", "name": name, "folder": folder, "rule": rule}


def base(title, categories, review="weekly"):
    prog = [{"type": "when_start"}, {"type": "title", "text": title}] + categories
    if review is not None:
        prog.append({"type": "review", "period": review})
    return prog


class TestS0U1L06(unittest.TestCase):
    def test_correct_plan(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(len(r["categories"]), 3)

    def test_practice_b_different_plan(self):
        r = run_program(base("我的文件小管家", [
            cat("作品", "作品", "每周整理"),
            cat("阅读", "图书", "每月整理"),
            cat("游戏", "存档", "每月整理"),
        ], review="monthly"))
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["review"], "monthly")

    def test_only_two_categories_fails(self):
        with self.assertRaises(PlanError):
            run_program(base("我的数字整理计划", [
                cat("学习", "作业", "每周整理"),
                cat("照片", "图片", "每月整理"),
            ]))

    def test_missing_title_fails(self):
        with self.assertRaises(PlanError):
            run_program([{"type": "when_start"}] + correct_program()[2:])

    def test_duplicate_category_fails(self):
        with self.assertRaises(PlanError):
            run_program(base("我的数字整理计划", [
                cat("学习", "作业", "每周整理"),
                cat("学习", "图片", "每月整理"),
                cat("音乐", "音乐", "每月整理"),
            ]))

    def test_illegal_folder_fails(self):
        with self.assertRaises(PlanError):
            run_program(base("我的数字整理计划", [
                cat("学习", "作/业", "每周整理"),
                cat("照片", "图片", "每月整理"),
                cat("音乐", "音乐", "每月整理"),
            ]))

    def test_missing_review_fails(self):
        with self.assertRaises(PlanError):
            run_program(base("我的数字整理计划", [
                cat("学习", "作业", "每周整理"),
                cat("照片", "图片", "每月整理"),
                cat("音乐", "音乐", "每月整理"),
            ], review=None))

    def test_extension_fourth_category_passes(self):
        r = run_program(correct_program()[:-1] + [
            cat("视频", "视频", "每月整理"),
            {"type": "review", "period": "weekly"},
        ])
        self.assertEqual(len(r["categories"]), 4)

    def test_save_reopen_reruns_identically(self):
        prog = correct_program()
        first = run_program(prog)
        reopened = json.loads(json.dumps(prog))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(PlanError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

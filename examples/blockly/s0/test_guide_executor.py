import json
import unittest

from guide_executor import GuideError, correct_program, run_program


def section(topic, text):
    return {"type": "section", "topic": topic, "text": text}


def contributor(name):
    return {"type": "contributor", "name": name}


def base(title, sections, contributors, check="请老师检查"):
    prog = [{"type": "when_start"}, {"type": "title", "text": title}] + sections
    prog += [contributor(c) for c in contributors]
    if check is not None:
        prog.append({"type": "check", "text": check})
    return prog


class TestS0U4L06(unittest.TestCase):
    def test_correct_guide(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(len(r["sections"]), 4)

    def test_practice_b_different_guide(self):
        r = run_program(base("我们班的安全小手册", [
            section("update", "只用官方更新"),
            section("backup", "备份完要打开核对"),
            section("recovery", "恢复后检查内容"),
            section("log", "异常要照抄日志内容"),
        ], ["小龟", "小鸟"], check="全班一起读一遍"))
        self.assertEqual(r["status"], "success")

    def test_only_three_sections_fails(self):
        with self.assertRaises(GuideError):
            run_program(base("班级数字安全指南", [
                section("threat", "先想威胁再想防护"),
                section("backup", "每份作品都备份"),
                section("recovery", "删了从备份恢复并核对"),
            ], ["小狐", "小兔"]))

    def test_duplicate_topic_fails(self):
        with self.assertRaises(GuideError):
            run_program(base("班级数字安全指南", [
                section("threat", "先想威胁再想防护"),
                section("threat", "再想一次威胁"),
                section("backup", "每份作品都备份"),
                section("recovery", "删了从备份恢复并核对"),
            ], ["小狐", "小兔"]))

    def test_missing_recovery_fails(self):
        with self.assertRaises(GuideError):
            run_program(base("班级数字安全指南", [
                section("threat", "先想威胁再想防护"),
                section("backup", "每份作品都备份"),
                section("update", "只用官方更新"),
                section("log", "看日志找异常请老师"),
            ], ["小狐", "小兔"]))

    def test_only_one_contributor_fails(self):
        with self.assertRaises(GuideError):
            run_program(base("班级数字安全指南", [
                section("threat", "先想威胁再想防护"),
                section("backup", "每份作品都备份"),
                section("recovery", "删了从备份恢复并核对"),
                section("log", "看日志找异常请老师"),
            ], ["小狐"]))

    def test_missing_check_fails(self):
        with self.assertRaises(GuideError):
            run_program(base("班级数字安全指南", [
                section("threat", "先想威胁再想防护"),
                section("backup", "每份作品都备份"),
                section("recovery", "删了从备份恢复并核对"),
                section("log", "看日志找异常请老师"),
            ], ["小狐", "小兔"], check=None))

    def test_extension_fifth_section_passes(self):
        r = run_program(base("班级数字安全指南", [
            section("threat", "先想威胁再想防护"),
            section("backup", "每份作品都备份"),
            section("recovery", "删了从备份恢复并核对"),
            section("log", "看日志找异常请老师"),
            section("update", "只用官方更新"),
        ], ["小狐", "小兔"]))
        self.assertEqual(len(r["sections"]), 5)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(GuideError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

import json
import unittest

from fair_executor import FairError, correct_program, run_program


def project(name, collaborator, feedback="意见", revision="已改"):
    return {"type": "project", "name": name, "collaborator": collaborator,
            "feedback": feedback, "revision": revision}


def base(projects):
    return [{"type": "when_start"},
            {"type": "title", "text": "小小创客博览会"}] + projects


class TestD0U4L06(unittest.TestCase):
    def test_correct_fair(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["projects"], ["纸桥", "节拍器", "彩虹画"])

    def test_practice_b_different_projects(self):
        r = run_program(base([
            project("植物生长", "小兔"),
            project("月相灯", "小龟"),
            project("垃圾分类", "小兔"),
        ]))
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["collaborators"], ["小兔", "小龟"])

    def test_only_two_projects_fails(self):
        with self.assertRaises(FairError):
            run_program(base([project("纸桥", "小狐"),
                              project("节拍器", "小兔")]))

    def test_project_without_feedback_fails(self):
        bad = project("纸桥", "小狐")
        bad["feedback"] = ""
        with self.assertRaises(FairError):
            run_program(base([bad, project("节拍器", "小兔"),
                              project("彩虹画", "小狐")]))

    def test_single_collaborator_fails(self):
        with self.assertRaises(FairError):
            run_program(base([project("纸桥", "小狐"),
                              project("节拍器", "小狐"),
                              project("彩虹画", "小狐")]))

    def test_no_title_fails(self):
        with self.assertRaises(FairError):
            run_program([{"type": "when_start"}] + [
                project("纸桥", "小狐"), project("节拍器", "小兔"),
                project("彩虹画", "小狐")])

    def test_extension_fourth_project_passes(self):
        r = run_program(base([
            project("纸桥", "小狐"), project("节拍器", "小兔"),
            project("彩虹画", "小狐"), project("小花园", "小龟"),
        ]))
        self.assertEqual(len(r["projects"]), 4)

    def test_save_reopen_reruns_identically(self):
        prog = correct_program()
        first = run_program(prog)
        reopened = json.loads(json.dumps(prog))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(FairError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

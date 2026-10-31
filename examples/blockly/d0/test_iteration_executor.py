import unittest, json
from iteration_executor import run_program, correct_program


class TestD0U4L05(unittest.TestCase):
    def test_correct_three_rounds(self):
        r = run_program(correct_program())
        self.assertEqual(r["rounds"][:3], ["round1", "round2", "round3"])
        self.assertEqual(r["status"], "success")

    def test_practice_b_different_reviewers(self):
        prog = [{"type": "when_start"},
                {"type": "round", "name": "round1"},
                {"type": "feedback", "reviewer": "小兔", "text": "标题太长"},
                {"type": "revise", "change": "标题改短"},
                {"type": "round", "name": "round2"},
                {"type": "feedback", "reviewer": "小龟", "text": "少了配图说明"},
                {"type": "revise", "change": "补配图说明"},
                {"type": "round", "name": "round3"},
                {"type": "feedback", "reviewer": "小兔", "text": "结尾重复了"},
                {"type": "revise", "change": "删掉重复结尾"},
                {"type": "approve"}]
        r = run_program(prog)
        self.assertIn("小龟", r["reviewers"])

    def test_only_two_rounds_fails(self):
        prog = correct_program()
        # drop round3 blocks (last 4 entries: round, feedback, revise, approve)
        with self.assertRaises(Exception) as cm:
            run_program(prog[:-4])
        self.assertIn("round3", str(cm.exception))

    def test_round_without_feedback_fails(self):
        prog = [{"type": "when_start"},
                {"type": "round", "name": "round1"},
                {"type": "revise", "change": "自己改了一下"}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("反馈", str(cm.exception))

    def test_feedback_without_revise_fails(self):
        prog = correct_program()
        # remove round2's revise block
        prog = [b for b in prog if not (b.get("type") == "revise"
                                        and b.get("change") == "中间加一个森林例子")]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("没有修改", str(cm.exception))

    def test_final_round_not_approved_fails(self):
        prog = correct_program()[:-1]  # drop approve
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("通过", str(cm.exception))

    def test_single_reviewer_fails(self):
        prog = [{"type": "when_start"},
                {"type": "round", "name": "round1"},
                {"type": "feedback", "reviewer": "小狐", "text": "a"},
                {"type": "revise", "change": "改a"},
                {"type": "round", "name": "round2"},
                {"type": "feedback", "reviewer": "小狐", "text": "b"},
                {"type": "revise", "change": "改b"},
                {"type": "round", "name": "round3"},
                {"type": "feedback", "reviewer": "小狐", "text": "c"},
                {"type": "revise", "change": "改c"},
                {"type": "approve"}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("2 位", str(cm.exception))

    def test_extension_fourth_round_passes(self):
        prog = correct_program() + [
            {"type": "round", "name": "round4"},
            {"type": "feedback", "reviewer": "小龟", "text": "再加一句邀请"},
            {"type": "revise", "change": "加一句邀请大家来展出"},
            {"type": "approve"}]
        r = run_program(prog)
        self.assertEqual(len(r["rounds"]), 4)

    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["rounds"][:3], ["round1", "round2", "round3"])

    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main(verbosity=2)

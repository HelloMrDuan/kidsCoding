import unittest, json
from feedback_executor import run_program, correct_program

class TestD0U3L05(unittest.TestCase):
    def test_correct_feedback(self):
        r = run_program(correct_program())
        self.assertEqual(r["feedbacks"], 3)
    def test_practice_b_signal(self):
        prog = [{"type": "when_start"},
                {"type": "feedback", "id": "s1", "steps": "等绿灯", "expected": "绿灯30秒", "actual": "绿灯10秒"},
                {"type": "feedback", "id": "s2", "steps": "看黄灯", "expected": "黄灯清楚", "actual": "黄灯不清楚"},
                {"type": "feedback", "id": "s3", "steps": "看红灯", "expected": "有倒计时", "actual": "无倒计时"},
                {"type": "fix", "feedback_id": "s2"}]
        r = run_program(prog)
        self.assertEqual(r["fixes"], ["s2"])
    def test_like_only_fails(self):
        prog = [{"type": "when_start"},
                {"type": "feedback", "id": "f1", "steps": "", "expected": "", "actual": "不喜欢"},
                {"type": "feedback", "id": "f2", "steps": "走导览", "expected": "有讲解", "actual": "无讲解"},
                {"type": "feedback", "id": "f3", "steps": "看指示牌", "expected": "清楚", "actual": "不清楚"},
                {"type": "fix", "feedback_id": "f1"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_unknown_fix_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "fix", "feedback_id": "f9"}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("未记录", str(cm.exception))
    def test_too_few_fails(self):
        prog = correct_program()[:3]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_retest_passes(self):
        prog = correct_program() + [{"type": "retest", "feedback_id": "f1", "result": "fixed"}]
        r = run_program(prog)
        self.assertEqual(r["retests"]["f1"], "fixed")
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["feedbacks"], 3)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

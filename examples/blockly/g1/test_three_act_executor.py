import unittest
from three_act_executor import run_program, correct_program

class TestG1U4L01(unittest.TestCase):
    def test_correct_timeline(self):
        r = run_program(correct_program())
        self.assertEqual(r["acts"], ["beginning", "conflict", "resolution"])
    def test_only_opening_fails(self):
        prog = [{"type": "when_start"}, {"type": "act", "name": "beginning", "event": "狐狸当上主持", "goal": "办一场森林剧场"}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("只有开场", str(cm.exception))
    def test_missing_goal_fails(self):
        prog = correct_program()
        prog[2] = dict(prog[2], goal="")
        with self.assertRaises(Exception):
            run_program(prog)
    def test_wrong_order_fails(self):
        prog = correct_program()
        prog = [prog[0], prog[2], prog[1], prog[3]]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_narration_per_act_passes(self):
        prog = correct_program() + [{"type": "narration", "text": "故事开始了。"}]
        r = run_program(prog)
        self.assertEqual(r["status"], "success")
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

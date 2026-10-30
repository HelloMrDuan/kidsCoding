import unittest
from enter_exit_executor import run_program, correct_program

class TestG1U1L04(unittest.TestCase):
    def test_correct_order(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["events"], ["enter", "say", "exit"])
        self.assertFalse(r["visible_at_end"])
    def test_exit_before_greeting_fails(self):
        prog = [{"type": "when_start"}, {"type": "enter_left"}, {"type": "exit_right"}, {"type": "say_line", "actor": "fox", "text": "大家好！"}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("观众看不到角色", str(cm.exception))
    def test_greeting_before_enter_fails(self):
        prog = [{"type": "when_start"}, {"type": "say_line", "actor": "fox", "text": "大家好！"}, {"type": "enter_left"}, {"type": "exit_right"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_sudden_hide_fails(self):
        prog = [{"type": "when_start"}, {"type": "enter_left"}, {"type": "say_line", "actor": "fox", "text": "大家好！"}, {"type": "hide"}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("突然消失", str(cm.exception))
    def test_missing_exit_fails(self):
        prog = [{"type": "when_start"}, {"type": "enter_left"}, {"type": "say_line", "actor": "fox", "text": "大家好！"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_rabbit_enters_after_fails_not(self):
        prog = correct_program() + [{"type": "enter_left"}, {"type": "say_line", "actor": "rabbit", "text": "轮到我啦！"}, {"type": "exit_right"}]
        r = run_program(prog)
        self.assertEqual(r["status"], "success")
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

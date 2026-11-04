import unittest
from key_executor import run_program, correct_program

class TestG1U3L02(unittest.TestCase):
    def test_true_pass_false_blocked(self):
        r = run_program(correct_program())
        self.assertEqual(r["outcomes"], ["blocked_with_prompt", "pass"])
    def test_false_blocked_with_prompt(self):
        prog = [{"type": "when_start"}, {"type": "set_key", "value": False}, {"type": "try_open", "check": True}]
        r = run_program(prog)
        self.assertEqual(r["outcomes"], ["blocked_with_prompt"])
    def test_open_without_check_fails(self):
        prog = [{"type": "when_start"}, {"type": "try_open", "check": False}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("判断条件内", str(cm.exception))
    def test_pick_key_then_pass(self):
        prog = [{"type": "when_start"}, {"type": "pick_key"}, {"type": "try_open", "check": True}]
        r = run_program(prog)
        self.assertEqual(r["outcomes"], ["pass"])
    def test_extension_silver_gold_keys_pass(self):
        prog = correct_program() + [{"type": "set_silver_key", "value": True}, {"type": "set_gold_key", "value": True}]
        r = run_program(prog)
        self.assertEqual(r["status"], "success")
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

import unittest
from turn_taking_executor import run_program, correct_program

class TestG1U1L02(unittest.TestCase):
    def test_correct_order(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["lines"][0], ("fox", "你好"))
        self.assertEqual(r["lines"][1], ("rabbit", "很高兴见到你"))
    def test_reversed_order_fails(self):
        prog = [{"type": "when_start"}, {"type": "say_line", "actor": "rabbit", "text": "很高兴见到你"}, {"type": "say_line", "actor": "fox", "text": "你好"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_simultaneous_fails(self):
        prog = [{"type": "when_start"}, {"type": "say_together", "actor": "fox", "text": "你好"}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("同时说话", str(cm.exception))
    def test_missing_second_line_fails(self):
        prog = [{"type": "when_start"}, {"type": "say_line", "actor": "fox", "text": "你好"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_farewell_passes(self):
        prog = correct_program() + [{"type": "say_line", "actor": "fox", "text": "再见，下次再玩！"}]
        r = run_program(prog)
        self.assertEqual(r["status"], "success")
        self.assertEqual(len(r["lines"]), 3)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

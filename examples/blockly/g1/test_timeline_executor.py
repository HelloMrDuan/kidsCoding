import unittest
from timeline_executor import run_program, correct_program

class TestG1U4L04(unittest.TestCase):
    def test_correct_order_no_overlap(self):
        r = run_program(correct_program())
        self.assertEqual(r["timeline"][0][0], "fox")
        self.assertEqual(r["timeline"][1][0], "rabbit")
        self.assertTrue(r["timeline"][0][2] <= r["timeline"][1][1])
    def test_reversed_order_fails(self):
        prog = [{"type": "when_start"}, {"type": "say_line", "actor": "rabbit", "text": "很高兴见到你", "duration": 2}, {"type": "say_line", "actor": "fox", "text": "欢迎来到森林剧场", "duration": 2}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_simultaneous_fails(self):
        prog = [{"type": "when_start"}, {"type": "say_together"}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("重叠", str(cm.exception))
    def test_negative_wait_overlap_fails(self):
        # a wait of -1 second makes rabbit start before fox ends
        prog = [{"type": "when_start"}, {"type": "say_line", "actor": "fox", "text": "欢迎来到森林剧场", "duration": 2}, {"type": "wait", "seconds": -1}, {"type": "say_line", "actor": "rabbit", "text": "很高兴见到你", "duration": 2}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_click_trigger_passes(self):
        prog = [{"type": "when_start"}, {"type": "say_line", "actor": "fox", "text": "欢迎来到森林剧场", "duration": 2}, {"type": "wait_for_click"}, {"type": "say_line", "actor": "rabbit", "text": "很高兴见到你", "duration": 2}]
        r = run_program(prog)
        self.assertEqual(r["status"], "success")
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

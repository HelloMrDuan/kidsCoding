import unittest
from race_executor import run_program, correct_program

class TestG1U2L06(unittest.TestCase):
    def test_correct_race(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["timer"], 2)
        self.assertEqual(r["final_x"], 200)
    def test_announce_before_finish_fails(self):
        prog = [{"type": "when_start"}, {"type": "start_race"}, {"type": "move", "steps": 50}, {"type": "announce_result", "text": "兔子获胜！"}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("到达终点才显示结果", str(cm.exception))
    def test_announce_before_start_fails(self):
        prog = [{"type": "when_start"}, {"type": "announce_result", "text": "兔子获胜！"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_timer_never_changes_fails(self):
        prog = [{"type": "when_start"}, {"type": "start_race"}, {"type": "check_finish"}, {"type": "announce_result", "text": "兔子获胜！"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_scoreboard_passes(self):
        prog = correct_program() + [{"type": "scoreboard", "actor": "fox", "time": 3}]
        r = run_program(prog)
        self.assertEqual(r["status"], "success")
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

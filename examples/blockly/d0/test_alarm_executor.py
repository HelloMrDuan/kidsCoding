import unittest, json
from alarm_executor import run_program, correct_program

class TestD0U3L02(unittest.TestCase):
    def test_correct_alarm(self):
        r = run_program(correct_program())
        self.assertEqual(r["states"], ["safe", "warning", "danger"])
    def test_practice_b_no_danger(self):
        prog = [{"type": "when_start"},
                {"type": "reading", "level": 45, "state": "safe"},
                {"type": "reading", "level": 55, "state": "warning"},
                {"type": "reading", "level": 75, "state": "warning"}]
        r = run_program(prog)
        self.assertEqual(r["states"].count("warning"), 2)
    def test_wrong_state_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "reading", "level": 90, "state": "warning"}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("警报状态错误", str(cm.exception))
    def test_never_triggered_fails(self):
        prog = [{"type": "when_start"},
                {"type": "reading", "level": 10, "state": "safe"},
                {"type": "reading", "level": 20, "state": "safe"},
                {"type": "reading", "level": 30, "state": "safe"}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("从未触发", str(cm.exception))
    def test_too_few_readings_fails(self):
        prog = correct_program()[:-1]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_extreme_passes(self):
        prog = correct_program() + [{"type": "reading", "level": 100, "state": "danger"}]
        r = run_program(prog)
        self.assertEqual(r["readings"], 4)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["states"], ["safe", "warning", "danger"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

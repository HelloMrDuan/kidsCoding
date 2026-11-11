import unittest, json
from signal_executor import run_program, correct_program

class TestD0U3L03(unittest.TestCase):
    def test_correct_signal(self):
        r = run_program(correct_program())
        self.assertEqual(r["total_seconds"], 60)
    def test_practice_b_shorter(self):
        prog = [{"type": "when_start"},
                {"type": "phase", "name": "green", "seconds": 20},
                {"type": "phase", "name": "yellow", "seconds": 4},
                {"type": "phase", "name": "red", "seconds": 20},
                {"type": "total", "value": 44}]
        r = run_program(prog)
        self.assertEqual(r["total_seconds"], 44)
    def test_out_of_order_fails(self):
        prog = correct_program()
        prog[1], prog[3] = prog[3], prog[1]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("顺序错误", str(cm.exception))
    def test_yellow_longer_fails(self):
        prog = [{"type": "when_start"},
                {"type": "phase", "name": "green", "seconds": 5},
                {"type": "phase", "name": "yellow", "seconds": 10},
                {"type": "phase", "name": "red", "seconds": 25},
                {"type": "total", "value": 40}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_too_short_phase_fails(self):
        prog = correct_program()
        prog[2] = {"type": "phase", "name": "yellow", "seconds": 2}
        prog[-1] = {"type": "total", "value": 57}
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_second_cycle_passes(self):
        prog = correct_program()
        prog = prog[:-1] + [
            {"type": "phase", "name": "green", "seconds": 30},
            {"type": "phase", "name": "yellow", "seconds": 5},
            {"type": "phase", "name": "red", "seconds": 25},
            {"type": "total", "value": 120}]
        r = run_program(prog)
        self.assertEqual(r["total_seconds"], 120)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["total_seconds"], 60)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

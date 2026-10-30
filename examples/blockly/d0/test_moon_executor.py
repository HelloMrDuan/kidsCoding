import unittest, json
from moon_executor import run_program, correct_program

class TestD0U2L02(unittest.TestCase):
    def test_correct_cycle(self):
        r = run_program(correct_program())
        self.assertEqual(r["total_days"], 24)
    def test_practice_b_coarse(self):
        prog = [{"type": "when_start"},
                {"type": "phase", "name": "new", "days": 7},
                {"type": "phase", "name": "half", "days": 7},
                {"type": "phase", "name": "full", "days": 7},
                {"type": "phase", "name": "half2", "days": 7},
                {"type": "total", "value": 28}]
        r = run_program(prog)
        self.assertEqual(r["total_days"], 28)
    def test_out_of_order_fails(self):
        prog = correct_program()
        prog[1], prog[2] = prog[2], prog[1]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("顺序错误", str(cm.exception))
    def test_zero_days_fails(self):
        prog = correct_program()
        prog[1] = {"type": "phase", "name": "new", "days": 0}
        prog[-1] = {"type": "total", "value": 21}
        with self.assertRaises(Exception):
            run_program(prog)
    def test_wrong_total_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "total", "value": 25}
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_second_cycle_passes(self):
        from moon_executor import ORDER
        prog = [{"type": "when_start"}]
        for name in ORDER * 2:
            prog.append({"type": "phase", "name": name, "days": 3})
        prog.append({"type": "total", "value": 48})
        r = run_program(prog)
        self.assertEqual(r["total_days"], 48)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["total_days"], 24)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

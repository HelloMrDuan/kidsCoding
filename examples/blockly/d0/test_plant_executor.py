import unittest, json
from plant_executor import run_program, correct_program

class TestD0U2L01(unittest.TestCase):
    def test_correct_growth(self):
        r = run_program(correct_program())
        self.assertEqual(r["total_days"], 14)
    def test_practice_b_faster(self):
        prog = [{"type": "when_start"},
                {"type": "stage", "name": "seed", "days": 1},
                {"type": "stage", "name": "sprout", "days": 2},
                {"type": "stage", "name": "stem", "days": 2},
                {"type": "stage", "name": "flower", "days": 3},
                {"type": "total", "value": 8}]
        r = run_program(prog)
        self.assertEqual(r["total_days"], 8)
    def test_out_of_order_fails(self):
        prog = correct_program()
        prog[2], prog[3] = prog[3], prog[2]
        # fix total still 14 but order is wrong
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("顺序错误", str(cm.exception))
    def test_zero_days_fails(self):
        prog = correct_program()
        prog[1] = {"type": "stage", "name": "seed", "days": 0}
        prog[-1] = {"type": "total", "value": 12}
        with self.assertRaises(Exception):
            run_program(prog)
    def test_wrong_total_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "total", "value": 15}
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_fruit_passes(self):
        prog = correct_program()
        prog = prog[:-1] + [{"type": "stage", "name": "fruit", "days": 2},
                {"type": "total", "value": 16}]
        r = run_program(prog, extra_stages=["fruit"])
        self.assertEqual(r["total_days"], 16)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["total_days"], 14)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

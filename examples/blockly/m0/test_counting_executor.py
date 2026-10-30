import unittest, json
from counting_executor import run_program, correct_program

class TestM0U2L05(unittest.TestCase):
    def test_correct_comparison(self):
        r = run_program(correct_program())
        self.assertEqual((r["one_by_one_steps"], r["by_twos_steps"]), (10, 5))
    def test_practice_b_odd_n(self):
        prog = [{"type": "when_start"}, {"type": "count_to", "n": 9},
                {"type": "method", "name": "one_by_one", "total": 9, "steps": 9},
                {"type": "method", "name": "by_twos", "total": 9, "steps": 5}]
        r = run_program(prog)
        self.assertEqual(r["by_twos_steps"], 5)
    def test_wrong_total_fails(self):
        prog = [{"type": "when_start"}, {"type": "count_to", "n": 10},
                {"type": "method", "name": "one_by_one", "total": 9, "steps": 9},
                {"type": "method", "name": "by_twos", "total": 10, "steps": 5}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("总数错误", str(cm.exception))
    def test_missing_method_fails(self):
        prog = [{"type": "when_start"}, {"type": "count_to", "n": 10},
                {"type": "method", "name": "one_by_one", "total": 10, "steps": 10}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_wrong_by_twos_steps_fails(self):
        prog = [{"type": "when_start"}, {"type": "count_to", "n": 10},
                {"type": "method", "name": "one_by_one", "total": 10, "steps": 10},
                {"type": "method", "name": "by_twos", "total": 10, "steps": 10}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_n100_passes(self):
        prog = [{"type": "when_start"}, {"type": "count_to", "n": 100},
                {"type": "method", "name": "one_by_one", "total": 100, "steps": 100},
                {"type": "method", "name": "by_twos", "total": 100, "steps": 50}]
        r = run_program(prog)
        self.assertEqual(r["by_twos_steps"], 50)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["n"], 10)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

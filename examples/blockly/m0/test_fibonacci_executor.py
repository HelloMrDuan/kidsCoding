import unittest, json
from fibonacci_executor import run_program, correct_program, fib_sequence

class TestM0U2L04(unittest.TestCase):
    def test_correct_fibonacci(self):
        r = run_program(correct_program())
        self.assertEqual(r["sequence"], [1, 1, 2, 3, 5, 8])
    def test_practice_b_eight_months(self):
        prog = [{"type": "when_start"}, {"type": "months", "count": 8},
                {"type": "sequence", "values": [1, 1, 2, 3, 5, 8, 13, 21]}]
        r = run_program(prog)
        self.assertEqual(r["sequence"][-1], 21)
    def test_wrong_sequence_fails(self):
        prog = [{"type": "when_start"}, {"type": "months", "count": 6},
                {"type": "sequence", "values": [1, 2, 3, 4, 5, 6]}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("序列错误", str(cm.exception))
    def test_missing_months_fails(self):
        prog = [{"type": "when_start"}, {"type": "sequence", "values": [1, 1, 2]}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_month9_passes(self):
        self.assertEqual(fib_sequence(9)[-1], 34)
        prog = [{"type": "when_start"}, {"type": "months", "count": 9},
                {"type": "sequence", "values": [1, 1, 2, 3, 5, 8, 13, 21, 34]}]
        r = run_program(prog)
        self.assertEqual(r["sequence"][-1], 34)
    def test_first_two_months_both_one(self):
        self.assertEqual(fib_sequence(2), [1, 1])
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["sequence"], [1, 1, 2, 3, 5, 8])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

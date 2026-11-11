import unittest, json
from parity_executor import run_program, correct_program

class TestM0U2L03(unittest.TestCase):
    def test_correct_parity(self):
        r = run_program(correct_program())
        self.assertEqual(r["odd"], [1, 3])
        self.assertEqual(r["even"], [2, 4])
    def test_practice_b_two_digit(self):
        prog = [{"type": "when_start"},
                {"type": "loop_numbers", "numbers": [10, 15, 20]},
                {"type": "classify", "result": {"odd": [15], "even": [10, 20]}}]
        r = run_program(prog)
        self.assertEqual(r["odd_count"], 1)
    def test_wrong_classification_fails(self):
        prog = [{"type": "when_start"},
                {"type": "loop_numbers", "numbers": [1, 2, 3, 4]},
                {"type": "classify", "result": {"odd": [1, 3, 4], "even": [2]}}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("分类错误", str(cm.exception))
    def test_missing_loop_fails(self):
        prog = [{"type": "when_start"},
                {"type": "classify", "result": {"odd": [1, 3], "even": [2, 4]}}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_missing_result_fails(self):
        prog = [{"type": "when_start"}, {"type": "loop_numbers", "numbers": [1, 2]}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_counts_pass(self):
        r = run_program(correct_program())
        self.assertEqual((r["odd_count"], r["even_count"]), (2, 2))
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["odd"], [1, 3])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

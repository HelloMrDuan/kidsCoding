import unittest, json
from coin_executor import run_program, correct_program

class TestM0U3L01(unittest.TestCase):
    def test_correct_run(self):
        r = run_program(correct_program())
        self.assertEqual(r["runs"][0], {"count": 10, "heads": 6, "tails": 4})
    def test_practice_b_small_run(self):
        prog = [{"type": "when_start"},
                {"type": "toss_run", "count": 4, "results": ["heads", "tails", "heads", "tails"]}]
        r = run_program(prog)
        self.assertEqual(r["runs"][0], {"count": 4, "heads": 2, "tails": 2})
    def test_count_mismatch_fails(self):
        prog = [{"type": "when_start"},
                {"type": "toss_run", "count": 10, "results": ["heads", "tails"]}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("不符", str(cm.exception))
    def test_invalid_side_fails(self):
        prog = [{"type": "when_start"},
                {"type": "toss_run", "count": 2, "results": ["heads", "edge"]}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_no_run_fails(self):
        prog = [{"type": "when_start"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_second_run_passes(self):
        prog = correct_program() + [{"type": "toss_run", "count": 10,
            "results": ["tails"] * 10}]
        r = run_program(prog)
        self.assertEqual(len(r["runs"]), 2)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["runs"][0]["heads"], 6)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

import unittest, json
from pattern_executor import run_program, correct_program

class TestM0U2L01(unittest.TestCase):
    def test_correct_pattern(self):
        r = run_program(correct_program())
        self.assertEqual(r["unit"], ["red", "blue"])
    def test_practice_b_three_colours(self):
        prog = [{"type": "when_start"},
                {"type": "unit", "colors": ["red", "yellow", "green"]},
                {"type": "sequence", "colors": ["red", "yellow", "green", "red", "yellow", "green"]}]
        r = run_program(prog)
        self.assertEqual(len(r["sequence"]), 6)
    def test_broken_pattern_fails(self):
        prog = [{"type": "when_start"},
                {"type": "unit", "colors": ["red", "blue"]},
                {"type": "sequence", "colors": ["red", "blue", "red", "yellow"]}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("不符合", str(cm.exception))
    def test_missing_unit_fails(self):
        prog = [{"type": "when_start"},
                {"type": "sequence", "colors": ["red", "blue"]}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_predict_next_passes(self):
        prog = correct_program() + [{"type": "predict_next", "color": "red"}]
        r = run_program(prog)
        self.assertEqual(r["next"], "red")
    def test_wrong_prediction_fails(self):
        prog = correct_program() + [{"type": "predict_next", "color": "blue"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["unit"], ["red", "blue"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

import unittest, json
from dice_executor import run_program, correct_program

class TestM0U3L02(unittest.TestCase):
    def test_correct_run(self):
        r = run_program(correct_program())
        self.assertEqual(r["runs"][0]["rolls"], 12)
    def test_practice_b_uneven(self):
        prog = [{"type": "when_start"},
                {"type": "roll_run", "rolls": [3, 1, 3, 4, 5, 6],
                 "counts": {1: 1, 2: 0, 3: 2, 4: 1, 5: 1, 6: 1}}]
        r = run_program(prog)
        self.assertEqual(r["runs"][0]["counts"][2], 0)
    def test_invalid_face_fails(self):
        prog = [{"type": "when_start"},
                {"type": "roll_run", "rolls": [1, 7], "counts": {1: 1, 7: 1}}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("无效", str(cm.exception))
    def test_count_sum_fails(self):
        prog = [{"type": "when_start"},
                {"type": "roll_run", "rolls": [1, 2, 3], "counts": {1: 1, 2: 1, 3: 1, 4: 1}}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_wrong_face_count_fails(self):
        prog = [{"type": "when_start"},
                {"type": "roll_run", "rolls": [1, 1, 2], "counts": {1: 1, 2: 2}}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_second_run_passes(self):
        prog = correct_program() + [{"type": "roll_run", "rolls": [6, 6, 6],
            "counts": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 3}}]
        r = run_program(prog)
        self.assertEqual(len(r["runs"]), 2)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["runs"][0]["rolls"], 12)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

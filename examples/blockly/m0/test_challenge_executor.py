import unittest, json
from challenge_executor import run_program, correct_program

class TestM0U2L06(unittest.TestCase):
    def test_correct_challenge(self):
        r = run_program(correct_program())
        self.assertEqual(r["levels_passed"], 3)
    def test_practice_b_partial_fails(self):
        prog = [{"type": "when_start"},
                {"type": "answer", "level": 1, "value": 8},
                {"type": "answer", "level": 2, "value": 8},
                {"type": "answer", "level": 3, "value": 14}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("第 3 关", str(cm.exception))
    def test_missing_level_fails(self):
        prog = correct_program()[:-1]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_wrong_level1_fails(self):
        prog = correct_program()
        prog[1] = {"type": "answer", "level": 1, "value": 7}
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_bonus_passes(self):
        prog = correct_program() + [{"type": "bonus_answer", "level": 4, "value": 16}]
        r = run_program(prog)
        self.assertTrue(r["bonus_passed"])
    def test_wrong_bonus_fails(self):
        prog = correct_program() + [{"type": "bonus_answer", "level": 4, "value": 15}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["levels_passed"], 3)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

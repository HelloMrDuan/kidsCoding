import unittest, json
from multiplication_executor import run_program, correct_program

class TestM0U2L02(unittest.TestCase):
    def test_correct_game(self):
        r = run_program(correct_program())
        self.assertEqual(r["score"], 3)
        self.assertEqual(r["asked"], 3)
    def test_practice_b_one_wrong(self):
        prog = [{"type": "when_start"},
                {"type": "ask", "a": 7, "b": 8, "answer": 56},
                {"type": "ask", "a": 9, "b": 9, "answer": 80}]
        r = run_program(prog)
        self.assertEqual(r["score"], 1)
    def test_all_wrong_fails(self):
        prog = [{"type": "when_start"}, {"type": "ask", "a": 2, "b": 3, "answer": 5}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("答对", str(cm.exception))
    def test_no_question_fails(self):
        prog = [{"type": "when_start"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_bonus_passes(self):
        prog = correct_program() + [{"type": "bonus", "a": 9, "b": 9, "answer": 81}]
        r = run_program(prog)
        self.assertEqual(r["bonus"], 1)
    def test_wrong_bonus_no_point(self):
        prog = correct_program() + [{"type": "bonus", "a": 9, "b": 9, "answer": 80}]
        r = run_program(prog)
        self.assertEqual(r["bonus"], 0)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["score"], 3)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

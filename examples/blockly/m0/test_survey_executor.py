import unittest, json
from survey_executor import run_program, correct_program

class TestM0U3L04(unittest.TestCase):
    def test_correct_survey(self):
        r = run_program(correct_program())
        self.assertEqual(r["most_popular"], ["apple"])
        self.assertEqual(r["respondents"], 5)
    def test_practice_b_tie(self):
        prog = [{"type": "when_start"}, {"type": "options", "values": ["red", "blue"]},
                {"type": "answer", "value": "red"}, {"type": "answer", "value": "blue"},
                {"type": "answer", "value": "blue"}, {"type": "answer", "value": "red"},
                {"type": "counts", "values": {"red": 2, "blue": 2}}]
        r = run_program(prog)
        self.assertEqual(r["most_popular"], ["red", "blue"])
    def test_invalid_answer_fails(self):
        prog = correct_program()
        prog[2] = {"type": "answer", "value": "grape"}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("无效", str(cm.exception))
    def test_wrong_counts_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "counts", "values": {"apple": 2, "banana": 1, "orange": 1}}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("统计结果错误", str(cm.exception))
    def test_too_few_respondents_fails(self):
        prog = [{"type": "when_start"}, {"type": "options", "values": ["apple", "banana"]},
                {"type": "answer", "value": "apple"}, {"type": "answer", "value": "banana"},
                {"type": "counts", "values": {"apple": 1, "banana": 1}}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_extra_respondent_passes(self):
        prog = correct_program()
        prog = prog[:-1] + [{"type": "answer", "value": "banana"},
                {"type": "counts", "values": {"apple": 3, "banana": 2, "orange": 1}}]
        r = run_program(prog)
        self.assertEqual(r["respondents"], 6)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["most_popular"], ["apple"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

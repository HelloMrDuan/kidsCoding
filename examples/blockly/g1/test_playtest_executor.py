import unittest
from playtest_executor import run_program, correct_program

class TestG1U4L05(unittest.TestCase):
    def test_correct_playtest(self):
        r = run_program(correct_program())
        self.assertEqual(r["feedback_count"], 3)
        self.assertEqual(r["fixes"], ["f1"])
    def test_only_two_feedback_fails(self):
        prog = correct_program()[:-2]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_feedback_without_columns_fails(self):
        prog = correct_program()
        prog[4] = {"type": "feedback", "id": "f1", "steps": "", "expected": "", "actual": ""}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("三列", str(cm.exception))
    def test_missing_checklist_item_fails(self):
        prog = [b for b in correct_program() if not (b.get("type") == "checklist" and b.get("item") == "ending")]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_fix_without_feedback_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "fix", "feedback_id": "f99"}
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_second_friend_retest_passes(self):
        prog = correct_program() + [{"type": "retest", "friend": "second"}]
        r = run_program(prog)
        self.assertTrue(r["retest"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

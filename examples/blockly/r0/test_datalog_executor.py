import json
import unittest

from datalog_executor import DataLogError, correct_program, run_program


def base(old, new, fixed, summary_block=True):
    prog = [{"type": "when_start"},
            {"type": "old", "records": old},
            {"type": "new", "records": new}]
    if summary_block:
        prog.append({"type": "summary", "fixed": fixed})
    return prog


OLD_A = [["上午", 512, "lx"], ["中午", 2000, ""], ["下午", 300, "lx"]]
NEW_A = [["上午", 512, "lx"], ["中午", 800, "lx"], ["下午", 300, "lx"]]


class TestR0U4L04(unittest.TestCase):
    def test_correct_improvement(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["fixed"], 1)

    def test_practice_b_unit_only_fix(self):
        old = [["上午", 100, "lx"], ["中午", 200, ""], ["下午", 300, "lx"]]
        new = [["上午", 100, "lx"], ["中午", 200, "lx"], ["下午", 300, "lx"]]
        r = run_program(base(old, new, 1))
        self.assertEqual(r["fixed"], 1)

    def test_change_good_value_fails(self):
        new = [["上午", 600, "lx"], ["中午", 800, "lx"], ["下午", 300, "lx"]]
        with self.assertRaises(DataLogError):
            run_program(base(OLD_A, new, 2))

    def test_keep_bad_value_fails(self):
        new = [["上午", 512, "lx"], ["中午", 2000, "lx"], ["下午", 300, "lx"]]
        with self.assertRaises(DataLogError):
            run_program(base(OLD_A, new, 1))

    def test_keep_empty_unit_fails(self):
        new = [["上午", 512, "lx"], ["中午", 800, ""], ["下午", 300, "lx"]]
        with self.assertRaises(DataLogError):
            run_program(base(OLD_A, new, 1))

    def test_invent_time_fails(self):
        new = [["上午", 512, "lx"], ["晚上", 800, "lx"], ["下午", 300, "lx"]]
        with self.assertRaises(DataLogError):
            run_program(base(OLD_A, new, 1))

    def test_fixed_mismatch_fails(self):
        with self.assertRaises(DataLogError):
            run_program(base(OLD_A, NEW_A, 2))

    def test_no_fix_fails(self):
        old = [["上午", 512, "lx"], ["中午", 800, "lx"], ["下午", 300, "lx"]]
        with self.assertRaises(DataLogError):
            run_program(base(old, old, 0))

    def test_too_few_records_fails(self):
        old = [["上午", 512, "lx"], ["中午", 2000, ""]]
        new = [["上午", 512, "lx"], ["中午", 800, "lx"]]
        with self.assertRaises(DataLogError):
            run_program(base(old, new, 1))

    def test_missing_summary_fails(self):
        with self.assertRaises(DataLogError):
            run_program(base(OLD_A, NEW_A, 1, summary_block=False))

    def test_extension_four_records_pass(self):
        old = [["上午", 512, "lx"], ["中午", 2000, ""],
               ["下午", 300, "lx"], ["晚上", 100, ""]]
        new = [["上午", 512, "lx"], ["中午", 800, "lx"],
               ["下午", 300, "lx"], ["晚上", 100, "lx"]]
        r = run_program(base(old, new, 2))
        self.assertEqual(r["fixed"], 2)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(DataLogError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

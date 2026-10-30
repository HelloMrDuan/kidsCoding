import unittest
from coordinate_executor import run_program, correct_program

class TestG1U2L01(unittest.TestCase):
    def test_correct_path(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["final"], (60, 40))
    def test_swapped_xy_fails(self):
        prog = [{"type": "when_start"}, {"type": "goto", "x": 0, "y": 0}, {"type": "goto", "x": 0, "y": 60}, {"type": "goto", "x": 40, "y": 60}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("(60,40)", str(cm.exception))
    def test_skip_middle_point_fails(self):
        prog = [{"type": "when_start"}, {"type": "goto", "x": 0, "y": 0}, {"type": "goto", "x": 60, "y": 40}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_wrong_final_fails(self):
        prog = [{"type": "when_start"}, {"type": "goto", "x": 0, "y": 0}, {"type": "goto", "x": 60, "y": 0}, {"type": "goto", "x": 60, "y": 30}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_marks_pass(self):
        prog = correct_program() + [{"type": "mark_point", "x": -120, "y": 120}, {"type": "mark_point", "x": 120, "y": -120}]
        r = run_program(prog)
        self.assertEqual(r["status"], "success")
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

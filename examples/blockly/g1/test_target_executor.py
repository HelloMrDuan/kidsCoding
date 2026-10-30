import unittest
from target_executor import run_program, correct_program

class TestG1U2L02(unittest.TestCase):
    def test_correct_target(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["final"], (-80, 20))
    def test_sign_reversed_fails(self):
        prog = [{"type": "when_start"}, {"type": "set_position", "x": 80, "y": -20}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_out_of_stage_fails(self):
        prog = [{"type": "when_start"}, {"type": "set_position", "x": -300, "y": 20}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("超出舞台", str(cm.exception))
    def test_wrong_target_fails(self):
        prog = [{"type": "when_start"}, {"type": "set_position", "x": -80, "y": 30}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_second_target_mark_passes(self):
        prog = correct_program() + [{"type": "mark_point", "x": 100, "y": 100}]
        r = run_program(prog)
        self.assertEqual(r["status"], "success")
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

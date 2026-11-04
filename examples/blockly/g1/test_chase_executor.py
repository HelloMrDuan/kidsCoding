import unittest
from chase_executor import run_program, correct_program

class TestG1U2L04(unittest.TestCase):
    def test_correct_chase(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["fox_displacement"], 40)
        self.assertEqual(r["rabbit_displacement"], 20)
    def test_fox_start_offset_fails(self):
        prog = [{"type": "when_start"}, {"type": "set_start", "actor": "fox", "x": 20}, {"type": "set_start", "actor": "rabbit", "x": 0}, {"type": "set_speed", "actor": "fox", "steps": 2}, {"type": "set_speed", "actor": "rabbit", "steps": 2}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("起点", str(cm.exception))
    def test_equal_speeds_fails(self):
        prog = correct_program()
        prog = [dict(b, steps=2) if b.get("type") == "set_speed" and b.get("actor") == "fox" else b for b in prog]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_wrong_speed_fails(self):
        prog = correct_program()
        prog = [dict(b, steps=3) if b.get("type") == "set_speed" and b.get("actor") == "fox" else b for b in prog]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_accelerate_passes(self):
        prog = correct_program() + [{"type": "accelerate", "actor": "fox", "steps": 6}]
        r = run_program(prog)
        self.assertEqual(r["status"], "success")
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

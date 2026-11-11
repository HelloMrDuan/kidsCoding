import unittest
from path_executor import run_program, correct_program

class TestG1U2L03(unittest.TestCase):
    def test_correct_path(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["displacement"], (100, 40))
    def test_missing_second_segment_fails(self):
        prog = [{"type": "when_start"}, {"type": "move_right", "steps": 80}, {"type": "move_right", "steps": 20}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("漏走第二段", str(cm.exception))
    def test_wrong_order_fails(self):
        prog = [{"type": "when_start"}, {"type": "move_up", "steps": 40}, {"type": "move_right", "steps": 80}, {"type": "move_right", "steps": 20}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_wrong_distance_fails(self):
        prog = [{"type": "when_start"}, {"type": "move_right", "steps": 80}, {"type": "move_up", "steps": 30}, {"type": "move_right", "steps": 20}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_obstacle_detour_passes(self):
        prog = correct_program() + [{"type": "obstacle_detour"}]
        r = run_program(prog)
        self.assertEqual(r["status"], "success")
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

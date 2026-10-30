import unittest
from obstacle_executor import run_program, correct_program

class TestG1U3L04(unittest.TestCase):
    def test_collision_stops(self):
        r = run_program(correct_program())
        self.assertEqual(r["final_x"], 100)
        self.assertEqual(r["speed"], 0)
        self.assertTrue(r["warned"])
        self.assertTrue(r["stopped"])
    def test_before_collision_moves(self):
        prog = [{"type": "when_start"}, {"type": "on_touch_stop"}, {"type": "move", "steps": 50}]
        r = run_program(prog)
        self.assertEqual(r["final_x"], 50)
        self.assertFalse(r["stopped"])
    def test_no_handler_fails(self):
        prog = [{"type": "when_start"}, {"type": "move", "steps": 150}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("仍继续移动", str(cm.exception))
    def test_exact_obstacle_stops(self):
        prog = [{"type": "when_start"}, {"type": "on_touch_stop"}, {"type": "move", "steps": 100}]
        r = run_program(prog)
        self.assertTrue(r["stopped"])
    def test_extension_detour_passes(self):
        prog = correct_program() + [{"type": "detour"}]
        r = run_program(prog)
        self.assertEqual(r["status"], "success")
        self.assertTrue(r["detour"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

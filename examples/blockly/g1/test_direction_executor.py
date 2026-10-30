import unittest
from direction_executor import run_program, correct_program

class TestG1U2L05(unittest.TestCase):
    def test_correct_directions(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["final_direction"], 90)
    def test_move_without_facing_fails(self):
        prog = [{"type": "when_start"}, {"type": "move", "steps": 20}, {"type": "move", "steps": 20}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("朝向未改变", str(cm.exception))
    def test_wrong_order_fails(self):
        prog = [{"type": "when_start"}, {"type": "face", "direction": 90}, {"type": "face", "direction": -90}, {"type": "face", "direction": 0}, {"type": "face", "direction": 180}, {"type": "face", "direction": 90}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_missing_return_fails(self):
        prog = correct_program()[:-1]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_spin_animation_passes(self):
        prog = correct_program()
        prog = prog[:3] + [{"type": "spin_animation"}] + prog[3:]
        r = run_program(prog)
        self.assertEqual(r["status"], "success")
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

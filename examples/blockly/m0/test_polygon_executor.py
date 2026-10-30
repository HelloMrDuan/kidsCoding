import unittest, json
from polygon_executor import run_program, correct_program

class TestM0U1L04(unittest.TestCase):
    def test_correct_pentagon(self):
        r = run_program(correct_program())
        self.assertEqual(r["polygons"][0]["n"], 5)
    def test_practice_b_hexagon(self):
        prog = [{"type": "when_start"}, {"type": "polygon", "sides": 6, "side": 40, "turn": 60}]
        r = run_program(prog)
        self.assertEqual(r["polygons"][0]["n"], 6)
    def test_wrong_turn_fails(self):
        prog = [{"type": "when_start"}, {"type": "polygon", "sides": 5, "side": 50, "turn": 90}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("转角错误", str(cm.exception))
    def test_two_sides_fails(self):
        prog = [{"type": "when_start"}, {"type": "polygon", "sides": 2, "side": 50, "turn": 180}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_second_polygon_passes(self):
        prog = correct_program() + [{"type": "polygon", "sides": 3, "side": 60, "turn": 120}]
        r = run_program(prog)
        self.assertEqual(len(r["polygons"]), 2)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["polygons"][0]["n"], 5)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

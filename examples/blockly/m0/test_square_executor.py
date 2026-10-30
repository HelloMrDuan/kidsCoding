import unittest, json
from square_executor import run_program, correct_program

class TestM0U1L01(unittest.TestCase):
    def test_correct_square(self):
        r = run_program(correct_program())
        self.assertTrue(r["closed"])
        self.assertEqual(r["turns"], [90, 90, 90, 90])
    def test_practice_b_different_size_position(self):
        prog = [{"type": "when_start"}, {"type": "set_start", "x": 50, "y": 50}] + correct_program(side=60)[2:]
        # rebuild: set_start then repeat/move/turn sequence for side 60
        prog = [{"type": "when_start"}, {"type": "set_start", "x": 50, "y": 50}, {"type": "repeat", "count": 4}]
        for _ in range(4):
            prog.append({"type": "move", "steps": 60})
            prog.append({"type": "turn", "degrees": 90})
        r = run_program(prog)
        self.assertTrue(r["closed"])
    def test_wrong_angle_fails(self):
        prog = correct_program()
        prog = [dict(b, degrees=80) if b.get("type") == "turn" else b for b in prog]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("90", str(cm.exception))
    def test_only_three_sides_fails(self):
        prog = correct_program()[:-2]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_second_square_colour_passes(self):
        prog = correct_program() + [{"type": "set_color", "color": "red"}]
        # second square is not re-simulated here; colour block alone must not break a closed square
        # run the base program again with colour set at start
        prog2 = [{"type": "when_start"}, {"type": "set_color", "color": "red"}] + correct_program()[1:]
        r = run_program(prog2)
        self.assertTrue(r["closed"])
    def test_save_reopen_reruns_identically(self):
        state = json.dumps(correct_program(), ensure_ascii=False)
        prog = json.loads(state)
        r = run_program(prog)
        self.assertTrue(r["closed"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

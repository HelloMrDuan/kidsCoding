import unittest, json
from rainbow_executor import run_program, correct_program, RAINBOW

class TestD0U1L01(unittest.TestCase):
    def test_correct_rainbow(self):
        r = run_program(correct_program())
        self.assertEqual(r["bands"], RAINBOW)
    def test_practice_b_different_start(self):
        prog = [{"type": "when_start"}, {"type": "set_start", "x": 20, "y": 30}] + correct_program()[1:]
        r = run_program(prog)
        self.assertEqual(r["bands"], RAINBOW)
    def test_wrong_order_fails(self):
        prog = correct_program()
        prog[1], prog[2] = prog[2], prog[1]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_duplicate_colour_fails(self):
        prog = correct_program()
        prog[2] = {"type": "draw_band", "color": "red"}
        with self.assertRaises(Exception):
            run_program(prog)
    def test_missing_band_fails(self):
        prog = correct_program()[:-1]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_clouds_pass(self):
        prog = correct_program() + [{"type": "add_cloud"}, {"type": "add_cloud"}]
        r = run_program(prog)
        self.assertEqual(r["clouds"], 2)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["bands"], RAINBOW)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

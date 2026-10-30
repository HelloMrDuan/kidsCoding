import unittest, json
from palette_executor import run_program, correct_program

class TestD0U1L02(unittest.TestCase):
    def test_correct_palette(self):
        r = run_program(correct_program())
        self.assertEqual(r["distinct"], 3)
    def test_practice_b_rabbit(self):
        prog = [{"type": "when_start"},
                {"type": "paint", "part": "body", "colour": "grey"},
                {"type": "paint", "part": "ears", "colour": "pink"},
                {"type": "paint", "part": "belly", "colour": "white"}]
        r = run_program(prog)
        self.assertEqual(r["distinct"], 3)
    def test_adjacent_same_fails(self):
        prog = correct_program()
        prog[2] = {"type": "paint", "part": "ears", "colour": "orange"}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("颜色相同", str(cm.exception))
    def test_missing_part_fails(self):
        prog = correct_program()[:-1]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_too_few_colours_fails(self):
        prog = [{"type": "when_start"},
                {"type": "paint", "part": "body", "colour": "orange"},
                {"type": "paint", "part": "ears", "colour": "brown"},
                {"type": "paint", "part": "belly", "colour": "orange"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_tail_passes(self):
        prog = correct_program() + [{"type": "paint", "part": "tail", "colour": "black"}]
        r = run_program(prog)
        self.assertEqual(r["distinct"], 4)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["distinct"], 3)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

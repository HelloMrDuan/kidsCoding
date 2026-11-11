import unittest
from sketch_executor import run_program, correct_program

class TestG1U4L02(unittest.TestCase):
    def test_correct_sketches(self):
        r = run_program(correct_program())
        self.assertEqual(r["sketches"], ["s1", "s2", "s3"])
    def test_missing_trigger_fails(self):
        prog = correct_program()
        prog[1] = dict(prog[1], trigger="")
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("触发", str(cm.exception))
    def test_only_two_sketches_fails(self):
        prog = correct_program()[:-1]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_missing_character_fails(self):
        prog = correct_program()
        prog[2] = dict(prog[2], character="")
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_animation_passes(self):
        prog = correct_program() + [{"type": "animate"}]
        r = run_program(prog)
        self.assertTrue(r["animated"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

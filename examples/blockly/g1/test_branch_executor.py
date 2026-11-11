import unittest
from branch_executor import run_program, correct_program

class TestG1U3L06(unittest.TestCase):
    def test_river_ending(self):
        r = run_program(correct_program(), "river")
        self.assertEqual(r["ending"], "河边")
    def test_hill_ending(self):
        r = run_program(correct_program(), "hill")
        self.assertEqual(r["ending"], "山坡")
    def test_same_scene_fails(self):
        prog = [{"type": "when_start"}, {"type": "branch", "choice": "river", "ending": "河边"}, {"type": "branch", "choice": "hill", "ending": "河边"}]
        with self.assertRaises(Exception) as cm:
            run_program(prog, "hill")
        self.assertIn("相同场景", str(cm.exception))
    def test_missing_branch_fails(self):
        prog = [{"type": "when_start"}, {"type": "branch", "choice": "river", "ending": "河边"}]
        with self.assertRaises(Exception):
            run_program(prog, "hill")
    def test_extension_hidden_third_ending(self):
        prog = correct_program() + [{"type": "branch", "choice": "forest", "ending": "森林"}]
        r = run_program(prog, "forest")
        self.assertEqual(r["ending"], "森林")
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:], "river")

if __name__ == "__main__":
    unittest.main(verbosity=2)

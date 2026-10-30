import unittest, json
from fractal_executor import run_program, correct_program, build_tree

class TestM0U1L05(unittest.TestCase):
    def test_correct_tree(self):
        r = run_program(correct_program())
        self.assertEqual(r["branches"], 3)
        self.assertTrue(r["symmetric"])
    def test_practice_b_deeper(self):
        prog = [{"type": "when_start"}, {"type": "tree", "depth": 3, "symmetric": True}]
        r = run_program(prog)
        self.assertEqual(r["branches"], 7)
    def test_asymmetric_fails(self):
        prog = [{"type": "when_start"}, {"type": "tree", "depth": 2, "symmetric": False}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("对称", str(cm.exception))
    def test_no_tree_fails(self):
        prog = [{"type": "when_start"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_depth4_passes(self):
        prog = [{"type": "when_start"}, {"type": "tree", "depth": 4, "symmetric": True}]
        r = run_program(prog)
        self.assertEqual(r["branches"], 15)
    def test_build_tree_lengths_shrink(self):
        branches = build_tree(2)
        self.assertEqual(branches[0][2], 100.0)
        self.assertEqual(branches[1][2], 70.0)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["branches"], 3)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

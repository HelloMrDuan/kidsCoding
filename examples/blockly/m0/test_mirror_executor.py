import unittest, json
from mirror_executor import run_program, correct_program

class TestM0U1L03(unittest.TestCase):
    def test_correct_flower(self):
        r = run_program(correct_program())
        self.assertEqual(len(r["petals"]), 5)
    def test_practice_b_shifted_up(self):
        prog = [{"type": "when_start"}]
        for x, y in [(-2,2),(2,2),(-1,1),(1,1),(0,3)]:
            prog.append({"type": "petal", "x": x, "y": y})
        r = run_program(prog)
        self.assertEqual(len(r["petals"]), 5)
    def test_missing_mirror_fails(self):
        prog = [b for b in correct_program() if not (b.get("type") == "petal" and b.get("x") == -2)]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("镜像对称失败", str(cm.exception))
    def test_single_centre_petal_passes(self):
        prog = [{"type": "when_start"}, {"type": "petal", "x": 0, "y": 0}]
        r = run_program(prog)
        self.assertEqual(r["petals"], [(0, 0)])
    def test_extension_second_flower_passes(self):
        prog = correct_program()
        for x, y in [(-1,-1),(1,-1),(0,-2)]:
            prog.append({"type": "petal", "x": x, "y": y})
        r = run_program(prog)
        self.assertEqual(len(r["petals"]), 8)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(len(r["petals"]), 5)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

import unittest, json
from gallery_executor import run_program, correct_program

class TestM0U1L06(unittest.TestCase):
    def test_correct_gallery(self):
        r = run_program(correct_program())
        self.assertEqual(len(r["exhibits"]), 3)
        self.assertEqual(r["title"], "几何艺术馆")
    def test_practice_b_different_selection(self):
        prog = [{"type": "when_start"}, {"type": "title", "text": "几何艺术馆"},
                {"type": "exhibit", "work": "hexagon"},
                {"type": "exhibit", "work": "fractal_tree"},
                {"type": "exhibit", "work": "mirror_flower"}]
        r = run_program(prog)
        self.assertEqual(len(r["exhibits"]), 3)
    def test_too_few_exhibits_fails(self):
        prog = correct_program()[:-1]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("3件", str(cm.exception))
    def test_asymmetric_work_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "exhibit", "work": "broken_shape"}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("不对称", str(cm.exception))
    def test_missing_title_fails(self):
        prog = [b for b in correct_program() if b.get("type") != "title"]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_fourth_exhibit_passes(self):
        prog = correct_program() + [{"type": "exhibit", "work": "fractal_tree"}]
        r = run_program(prog)
        self.assertEqual(len(r["exhibits"]), 4)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(len(r["exhibits"]), 3)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

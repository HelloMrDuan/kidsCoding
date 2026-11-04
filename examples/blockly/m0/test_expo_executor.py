import unittest, json
from expo_executor import run_program, correct_program

class TestM0U3L06(unittest.TestCase):
    def test_correct_expo(self):
        r = run_program(correct_program())
        self.assertEqual(r["exhibits"], ["fruit", "colour", "dice"])
    def test_practice_b_different_set(self):
        prog = [{"type": "when_start"}, {"type": "title", "text": "班级数据展"},
                {"type": "exhibit", "name": "coin"},
                {"type": "bar", "label": "heads", "height": 6},
                {"type": "bar", "label": "tails", "height": 4},
                {"type": "finding", "kind": "tallest", "label": "heads"},
                {"type": "exhibit", "name": "survey"},
                {"type": "bar", "label": "apple", "height": 3},
                {"type": "bar", "label": "banana", "height": 1},
                {"type": "finding", "kind": "tallest", "label": "apple"},
                {"type": "exhibit", "name": "fruit"},
                {"type": "bar", "label": "apple", "height": 3},
                {"type": "bar", "label": "orange", "height": 1},
                {"type": "finding", "kind": "shortest", "label": "orange"}]
        r = run_program(prog)
        self.assertEqual(len(r["exhibits"]), 3)
    def test_too_few_exhibits_fails(self):
        prog = correct_program()
        # keep only first exhibit (up to before second exhibit block)
        idx = next(i for i, b in enumerate(prog) if b.get("type") == "exhibit" and b.get("name") == "colour")
        prog = prog[:idx]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("3 个", str(cm.exception))
    def test_wrong_finding_fails(self):
        prog = correct_program()
        prog[5] = {"type": "finding", "kind": "tallest", "label": "banana"}
        with self.assertRaises(Exception):
            run_program(prog)
    def test_missing_title_fails(self):
        prog = [b for b in correct_program() if b.get("type") != "title"]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_fourth_passes(self):
        prog = correct_program() + [
            {"type": "exhibit", "name": "coin"},
            {"type": "bar", "label": "heads", "height": 6},
            {"type": "bar", "label": "tails", "height": 4},
            {"type": "finding", "kind": "tallest", "label": "heads"}]
        r = run_program(prog)
        self.assertEqual(len(r["exhibits"]), 4)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["exhibits"], ["fruit", "colour", "dice"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

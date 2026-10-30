import unittest, json
from chart_executor import run_program, correct_program

class TestM0U3L05(unittest.TestCase):
    def test_correct_chart(self):
        r = run_program(correct_program())
        self.assertEqual(r["tallest"], ["apple"])
    def test_practice_b_equal(self):
        prog = [{"type": "when_start"},
                {"type": "bar", "label": "red", "height": 2},
                {"type": "bar", "label": "blue", "height": 2},
                {"type": "finding", "kind": "equal", "labels": ["red", "blue"]}]
        r = run_program(prog)
        self.assertEqual(r["tallest"], ["red", "blue"])
    def test_wrong_tallest_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "finding", "kind": "tallest", "label": "banana"}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("最高的不是", str(cm.exception))
    def test_wrong_equal_fails(self):
        prog = [{"type": "when_start"},
                {"type": "bar", "label": "red", "height": 2},
                {"type": "bar", "label": "blue", "height": 1},
                {"type": "finding", "kind": "equal", "labels": ["red", "blue"]}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_no_finding_fails(self):
        prog = correct_program()[:-1]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_shortest_passes(self):
        prog = correct_program() + [{"type": "finding", "kind": "shortest", "label": "banana"}]
        r = run_program(prog)
        self.assertIn("banana", r["shortest"])
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["tallest"], ["apple"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

import unittest, json
from sort_executor import run_program, correct_program

class TestD0U2L03(unittest.TestCase):
    def test_correct_sorting(self):
        r = run_program(correct_program())
        self.assertEqual(r["sorted"], 4)
    def test_practice_b_three_items(self):
        prog = [{"type": "when_start"},
                {"type": "sort", "item": "newspaper", "bin": "recyclable"},
                {"type": "sort", "item": "apple_core", "bin": "kitchen"},
                {"type": "sort", "item": "light_bulb", "bin": "harmful"}]
        r = run_program(prog)
        self.assertEqual(r["sorted"], 3)
    def test_wrong_bin_fails(self):
        prog = correct_program()
        prog[3] = {"type": "sort", "item": "battery", "bin": "recyclable"}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("应分到", str(cm.exception))
    def test_unknown_item_fails(self):
        prog = correct_program() + [{"type": "sort", "item": "rocket", "bin": "other"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_too_few_items_fails(self):
        prog = correct_program()[:3]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_second_recyclable_passes(self):
        prog = correct_program() + [{"type": "sort", "item": "can", "bin": "recyclable"}]
        r = run_program(prog)
        self.assertEqual(r["counts"]["recyclable"], 2)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["sorted"], 4)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

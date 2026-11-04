import unittest, json
from museum_executor import run_program, correct_program

class TestD0U4L03(unittest.TestCase):
    def test_correct_guide(self):
        r = run_program(correct_program())
        self.assertEqual(r["oldest"], "stone")
    def test_practice_b_other_exhibits(self):
        prog = [{"type": "when_start"},
                {"type": "exhibit", "name": "pottery"},
                {"type": "year", "value": 1200},
                {"type": "fact", "text": "陶器可以装水"},
                {"type": "exhibit", "name": "silk"},
                {"type": "year", "value": 1600},
                {"type": "fact", "text": "丝绸很柔软"},
                {"type": "exhibit", "name": "porcelain"},
                {"type": "year", "value": 1800},
                {"type": "fact", "text": "瓷器很精美"},
                {"type": "summary", "oldest": "pottery"}]
        r = run_program(prog)
        self.assertEqual(r["oldest"], "pottery")
    def test_out_of_order_fails(self):
        prog = correct_program()
        prog[2], prog[5] = prog[5], prog[2]
        # years swapped: stone 1500, bronze 1000 -> out of order
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("从早到晚", str(cm.exception))
    def test_missing_fact_fails(self):
        prog = correct_program()
        del prog[9]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("缺少讲解", str(cm.exception))
    def test_wrong_oldest_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "summary", "oldest": "paper"}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("最早", str(cm.exception))
    def test_extension_fourth_passes(self):
        prog = correct_program()[:-1] + [
            {"type": "exhibit", "name": "glass"},
            {"type": "year", "value": 2100},
            {"type": "fact", "text": "玻璃很透明"},
            {"type": "summary", "oldest": "stone"}]
        r = run_program(prog)
        self.assertEqual(len(r["exhibits"]), 4)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["exhibits"], ["stone", "bronze", "paper"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

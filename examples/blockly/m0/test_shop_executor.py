import unittest, json
from shop_executor import run_program, correct_program

class TestM0U4L03(unittest.TestCase):
    def test_correct_shopping(self):
        r = run_program(correct_program())
        self.assertEqual(r["total"], 35)
        self.assertEqual(r["remaining"], 65)
    def test_practice_b_different_items(self):
        prog = [{"type": "when_start"},
                {"type": "item", "name": "book", "price": 50},
                {"type": "item", "name": "pen", "price": 15},
                {"type": "item", "name": "ruler", "price": 10},
                {"type": "total", "value": 75}]
        r = run_program(prog)
        self.assertEqual(r["remaining"], 25)
    def test_wrong_total_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "total", "value": 30}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("总价错误", str(cm.exception))
    def test_over_budget_fails(self):
        prog = [{"type": "when_start"},
                {"type": "item", "name": "toy", "price": 80},
                {"type": "item", "name": "book", "price": 50},
                {"type": "total", "value": 130}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("超出预算", str(cm.exception))
    def test_no_item_fails(self):
        prog = [{"type": "when_start"}, {"type": "total", "value": 0}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_extra_item_passes(self):
        prog = correct_program()
        prog = prog[:-1] + [{"type": "item", "name": "sticker", "price": 5},
                {"type": "total", "value": 40}]
        r = run_program(prog)
        self.assertEqual(r["total"], 40)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["total"], 35)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

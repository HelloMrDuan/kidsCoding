import unittest, json
from balance_executor import run_program, correct_program

class TestD0U2L04(unittest.TestCase):
    def test_correct_balance(self):
        r = run_program(correct_program())
        self.assertTrue(r["balanced"])
    def test_practice_b_different_chain(self):
        prog = [{"type": "when_start"},
                {"type": "population", "level": "producer", "count": 50},
                {"type": "population", "level": "herbivore", "count": 10},
                {"type": "population", "level": "carnivore", "count": 2}]
        r = run_program(prog)
        self.assertTrue(r["balanced"])
    def test_carnivore_too_many_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "population", "level": "carnivore", "count": 30}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("不平衡", str(cm.exception))
    def test_zero_level_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "population", "level": "carnivore", "count": 0}
        with self.assertRaises(Exception):
            run_program(prog)
    def test_missing_level_fails(self):
        prog = correct_program()[:-1]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_more_producers_passes(self):
        prog = correct_program() + [{"type": "change", "level": "producer", "delta": 10}]
        r = run_program(prog)
        self.assertEqual(r["counts"]["producer"], 110)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertTrue(r["balanced"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

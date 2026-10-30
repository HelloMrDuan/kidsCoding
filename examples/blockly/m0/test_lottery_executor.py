import unittest, json
from lottery_executor import run_program, correct_program

class TestM0U3L03(unittest.TestCase):
    def test_correct_lottery(self):
        r = run_program(correct_program())
        self.assertTrue(r["fair"])
        self.assertEqual(r["participants"], 4)
    def test_practice_b_different_size(self):
        prog = [{"type": "when_start"},
                {"type": "participant", "name": "A", "tickets": 5},
                {"type": "participant", "name": "B", "tickets": 5},
                {"type": "participant", "name": "C", "tickets": 5}]
        r = run_program(prog)
        self.assertEqual(r["tickets_each"], 5)
    def test_unfair_fails(self):
        prog = [{"type": "when_start"},
                {"type": "participant", "name": "A", "tickets": 3},
                {"type": "participant", "name": "B", "tickets": 3},
                {"type": "participant", "name": "C", "tickets": 2}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("不公平", str(cm.exception))
    def test_single_participant_fails(self):
        prog = [{"type": "when_start"}, {"type": "participant", "name": "A", "tickets": 2}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_no_participant_fails(self):
        prog = [{"type": "when_start"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_fifth_passes(self):
        prog = correct_program() + [{"type": "participant", "name": "E", "tickets": 2}]
        r = run_program(prog)
        self.assertEqual(r["participants"], 5)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertTrue(r["fair"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

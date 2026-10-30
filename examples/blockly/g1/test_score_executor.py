import unittest
from score_executor import run_program, correct_program

class TestG1U3L03(unittest.TestCase):
    def test_three_distinct_stars(self):
        r = run_program(correct_program())
        self.assertEqual(r["score"], 3)
        self.assertEqual(r["displayed"], 3)
    def test_same_star_repeated_no_double_count(self):
        prog = [{"type": "when_start"}, {"type": "pick_star", "star_id": "star1"}, {"type": "pick_star", "star_id": "star1"}, {"type": "pick_star", "star_id": "star1"}, {"type": "show_score"}]
        r = run_program(prog)
        self.assertEqual(r["score"], 1)
    def test_initial_score_zero(self):
        prog = [{"type": "when_start"}, {"type": "show_score"}]
        r = run_program(prog)
        self.assertEqual(r["score"], 0)
    def test_direct_set_score_fails(self):
        prog = [{"type": "when_start"}, {"type": "set_score", "value": 3}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_five_unlocks_egg(self):
        prog = [{"type": "when_start"}] + [{"type": "pick_star", "star_id": f"star{i}"} for i in range(1, 6)] + [{"type": "show_score"}]
        r = run_program(prog)
        self.assertEqual(r["score"], 5)
        self.assertTrue(r["easter_egg"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

import unittest, json
from beat_executor import run_program, correct_program

class TestD0U1L03(unittest.TestCase):
    def test_correct_loop(self):
        r = run_program(correct_program())
        self.assertEqual(r["total_beats"], 6)
        self.assertEqual(r["hits"], 4)
    def test_practice_b_short_pattern(self):
        prog = [{"type": "when_start"},
                {"type": "pattern", "beats": ["hit", "hit"]},
                {"type": "repeat", "times": 3},
                {"type": "play", "beats": ["hit"] * 6}]
        r = run_program(prog)
        self.assertEqual(r["repeats"], 3)
    def test_wrong_repeat_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "play", "beats": ["hit", "rest", "hit"]}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("节拍循环错误", str(cm.exception))
    def test_single_beat_pattern_fails(self):
        prog = [{"type": "when_start"},
                {"type": "pattern", "beats": ["hit"]},
                {"type": "repeat", "times": 2},
                {"type": "play", "beats": ["hit", "hit"]}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_no_pattern_fails(self):
        prog = [{"type": "when_start"}, {"type": "repeat", "times": 2},
                {"type": "play", "beats": []}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_longer_pattern_passes(self):
        prog = [{"type": "when_start"},
                {"type": "pattern", "beats": ["hit", "rest", "hit", "rest"]},
                {"type": "repeat", "times": 2},
                {"type": "play", "beats": ["hit", "rest", "hit", "rest"] * 2}]
        r = run_program(prog)
        self.assertEqual(r["total_beats"], 8)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["total_beats"], 6)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

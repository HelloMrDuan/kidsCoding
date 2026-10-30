import unittest, json
from dance_executor import run_program, correct_program

class TestD0U1L04(unittest.TestCase):
    def test_correct_dance(self):
        r = run_program(correct_program())
        self.assertEqual(r["beats"], 4)
    def test_practice_b_longer_loop(self):
        prog = [{"type": "when_start"},
                {"type": "beats", "values": ["hit", "hit", "rest"] * 2},
                {"type": "moves", "values": ["jump", "jump", "still"] * 2}]
        r = run_program(prog)
        self.assertEqual(r["beats"], 6)
    def test_jump_on_rest_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "moves", "values": ["jump", "jump", "jump", "still"]}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("空拍", str(cm.exception))
    def test_missing_move_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "moves", "values": ["jump", "still", "jump"]}
        with self.assertRaises(Exception):
            run_program(prog)
    def test_too_short_fails(self):
        prog = [{"type": "when_start"},
                {"type": "beats", "values": ["hit", "rest"]},
                {"type": "moves", "values": ["jump", "still"]}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_spin_passes(self):
        prog = correct_program()
        prog[-1] = {"type": "moves", "values": ["jump", "still", "jump", "spin"]}
        # last beat is rest, so spin is wrong there; use a hit-ending variant instead
        prog2 = [{"type": "when_start"},
                 {"type": "beats", "values": ["hit", "rest", "hit", "hit"]},
                 {"type": "moves", "values": ["jump", "still", "jump", "spin"]}]
        r = run_program(prog2)
        self.assertEqual(r["moves"][-1], "spin")
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["beats"], 4)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

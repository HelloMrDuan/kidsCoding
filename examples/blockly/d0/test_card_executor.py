import unittest, json
from card_executor import run_program, correct_program

class TestD0U1L06(unittest.TestCase):
    def test_correct_card(self):
        r = run_program(correct_program())
        self.assertTrue(r["published"])
        self.assertEqual(r["beats"], 6)
    def test_practice_b_different_card(self):
        prog = [{"type": "when_start"},
                {"type": "greeting", "text": "新年快乐"},
                {"type": "frame", "shape": "triangle", "colour": "green"},
                {"type": "frame", "shape": "triangle", "colour": "yellow"},
                {"type": "frame", "shape": "square", "colour": "yellow"},
                {"type": "beat_pattern", "beats": ["hit", "hit"]},
                {"type": "beat_repeat", "times": 3},
                {"type": "beat_play", "beats": ["hit"] * 6}]
        r = run_program(prog)
        self.assertTrue(r["published"])
    def test_no_greeting_fails(self):
        prog = [b for b in correct_program() if b.get("type") != "greeting"]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("祝福语", str(cm.exception))
    def test_static_pattern_fails(self):
        prog = correct_program()
        prog[2] = {"type": "frame", "shape": "circle", "colour": "red"}
        prog[3] = {"type": "frame", "shape": "circle", "colour": "red"}
        prog[4] = {"type": "frame", "shape": "circle", "colour": "red"}
        with self.assertRaises(Exception):
            run_program(prog)
    def test_single_beat_repeat_fails(self):
        prog = correct_program()
        prog[6] = {"type": "beat_repeat", "times": 1}
        prog[7] = {"type": "beat_play", "beats": ["hit", "rest", "hit"]}
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_signature_passes(self):
        prog = correct_program() + [{"type": "signature", "text": "天天开心"}]
        r = run_program(prog)
        self.assertEqual(r["signature"], "天天开心")
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertTrue(r["published"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

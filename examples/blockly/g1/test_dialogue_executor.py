import json, tempfile, os, unittest
from dialogue_executor import run_program, correct_program, save_program, load_program, OPENING_TEXT

class TestG1U1L01(unittest.TestCase):
    def test_correct_greets_first_then_moves(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["fox_position"], 100)
        self.assertEqual(r["log"][0], f"狐狸说：{OPENING_TEXT}")
        self.assertTrue(any("移动到100" in x for x in r["log"]))
    def test_move_only_fails(self):
        with self.assertRaises(Exception) as cm:
            run_program([{"type": "when_start"}, {"type": "move_right", "actor": "fox"}])
        self.assertIn("只有移动没有对白", str(cm.exception))
    def test_wrong_actor_fails(self):
        with self.assertRaises(Exception) as cm:
            run_program([{"type": "when_start"}, {"type": "say_line", "actor": "bear", "text": OPENING_TEXT}, {"type": "move_right", "actor": "fox"}])
        self.assertIn("对白给错人", str(cm.exception))
    def test_greeting_after_move_fails(self):
        with self.assertRaises(Exception) as cm:
            run_program([{"type": "when_start"}, {"type": "move_right", "actor": "fox"}, {"type": "say_line", "actor": "fox", "text": OPENING_TEXT}])
        self.assertIn("先打招呼再移动", str(cm.exception))
    def test_wrong_text_fails(self):
        with self.assertRaises(Exception) as cm:
            run_program([{"type": "when_start"}, {"type": "say_line", "actor": "fox", "text": "你好"}, {"type": "move_right", "actor": "fox"}])
        self.assertIn("开场对白不是", str(cm.exception))
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program([{"type": "say_line", "actor": "fox", "text": OPENING_TEXT}])
    def test_extension_question_after_move_passes(self):
        prog = correct_program() + [{"type": "say_line", "actor": "fox", "text": "你们准备好了吗？"}]
        r = run_program(prog)
        self.assertEqual(r["status"], "success")
        self.assertTrue(any("你们准备好了吗" in x for x in r["log"]))
    def test_save_reopen_reruns_identically(self):
        with tempfile.TemporaryDirectory() as td:
            p = os.path.join(td, "prog.json")
            save_program(correct_program(), p)
            r1 = run_program(correct_program())
            r2 = run_program(load_program(p))
            self.assertEqual(r1, r2)

if __name__ == "__main__":
    unittest.main(verbosity=2)

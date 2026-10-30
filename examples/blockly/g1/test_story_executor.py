import unittest
from story_executor import run_program, correct_program

class TestG1U1L06(unittest.TestCase):
    def test_correct_story(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["sections"], ["opening", "meeting", "conflict", "ending"])
    def test_skip_ending_fails(self):
        prog = [b for b in correct_program() if not (b.get("type") == "section" and b.get("name") == "ending")]
        # also remove ending dialogue (last block)
        prog = prog[:-1]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("跳过结尾", str(cm.exception))
    def test_scrambled_order_fails(self):
        prog = correct_program()
        # swap meeting and conflict sections (indices 3 and 5 in list, simplified: rebuild scrambled)
        prog = [{"type": "when_start"}, {"type": "section", "name": "opening"}, {"type": "say_line", "actor": "fox", "text": "欢迎来到森林剧场"}, {"type": "section", "name": "conflict"}, {"type": "say_line", "actor": "fox", "text": "可是路被大石头挡住了"}, {"type": "section", "name": "meeting"}, {"type": "say_line", "actor": "rabbit", "text": "很高兴见到你"}, {"type": "section", "name": "ending"}, {"type": "say_line", "actor": "rabbit", "text": "我们一起搬开它吧"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_only_one_character_fails(self):
        prog = [{"type": "when_start"}, {"type": "section", "name": "opening"}, {"type": "say_line", "actor": "fox", "text": "开场"}, {"type": "section", "name": "meeting"}, {"type": "say_line", "actor": "fox", "text": "相遇"}, {"type": "section", "name": "conflict"}, {"type": "say_line", "actor": "fox", "text": "冲突"}, {"type": "section", "name": "ending"}, {"type": "say_line", "actor": "fox", "text": "结尾"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_second_ending_passes(self):
        prog = correct_program() + [{"type": "section", "name": "ending_alt"}, {"type": "say_line", "actor": "fox", "text": "或者我们绕路走"}]
        r = run_program(prog)
        self.assertEqual(r["status"], "success")
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])
    def test_dialogue_outside_section_fails(self):
        prog = [{"type": "when_start"}, {"type": "say_line", "actor": "fox", "text": "欢迎来到森林剧场"}]
        with self.assertRaises(Exception):
            run_program(prog)

if __name__ == "__main__":
    unittest.main(verbosity=2)

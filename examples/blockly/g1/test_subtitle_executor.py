import unittest
from subtitle_executor import run_program, correct_program

class TestG1U1L05(unittest.TestCase):
    def test_correct_sequence(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertTrue(r["title_ended_before_dialogue"])
    def test_dialogue_before_title_hides_fails(self):
        prog = [{"type": "when_start"}, {"type": "show_title", "text": "森林剧场"}, {"type": "say_line", "actor": "fox", "text": "大家好！"}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("遮挡人物", str(cm.exception))
    def test_title_never_hides_fails(self):
        prog = [{"type": "when_start"}, {"type": "show_title", "text": "森林剧场"}, {"type": "narration", "text": "狐狸上台了。"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_long_narration_fails(self):
        prog = [{"type": "when_start"}, {"type": "show_title", "text": "森林剧场"}, {"type": "hide_title"}, {"type": "narration", "text": "这是一段非常非常非常长的旁白文字超过二十字"}, {"type": "say_line", "actor": "fox", "text": "大家好！"}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("短旁白", str(cm.exception))
    def test_missing_title_fails(self):
        prog = [{"type": "when_start"}, {"type": "say_line", "actor": "fox", "text": "大家好！"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_accessibility_subtitle_passes(self):
        prog = correct_program() + [{"type": "show_title", "text": "无障碍：狐狸在微笑。"}]
        r = run_program(prog)
        self.assertEqual(r["status"], "success")
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

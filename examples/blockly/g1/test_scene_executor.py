import unittest
from scene_executor import run_program, correct_program, DAY_FOREST, NIGHT_FOREST, SNOW

class TestG1U1L03(unittest.TestCase):
    def test_correct_sequence(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["first_half"], DAY_FOREST)
        self.assertEqual(r["after_transition"], NIGHT_FOREST)
    def test_start_with_ending_background_fails(self):
        prog = [{"type": "when_start"}, {"type": "set_scene", "scene": NIGHT_FOREST}, {"type": "enter_treehouse"}, {"type": "switch_scene", "scene": NIGHT_FOREST}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("一开始就显示结尾背景", str(cm.exception))
    def test_start_with_snow_fails(self):
        prog = [{"type": "when_start"}, {"type": "set_scene", "scene": SNOW}, {"type": "enter_treehouse"}, {"type": "switch_scene", "scene": NIGHT_FOREST}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_switch_before_treehouse_fails(self):
        prog = [{"type": "when_start"}, {"type": "set_scene", "scene": DAY_FOREST}, {"type": "switch_scene", "scene": NIGHT_FOREST}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("时间线", str(cm.exception))
    def test_no_switch_fails(self):
        prog = [{"type": "when_start"}, {"type": "set_scene", "scene": DAY_FOREST}, {"type": "enter_treehouse"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_sunset_after_night_passes(self):
        prog = correct_program() + [{"type": "switch_scene", "scene": "sunset"}]
        r = run_program(prog)
        self.assertEqual(r["status"], "success")
        self.assertIn("sunset", r["scenes"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

import unittest
from scene_mode_executor import run_program, correct_program

class TestG1U3L05(unittest.TestCase):
    def test_two_clicks_back_to_day(self):
        r = run_program(correct_program(), clicks=2)
        self.assertEqual(r["sceneMode"], "day")
        self.assertEqual(r["background"], "day_bg")
    def test_one_click_night(self):
        r = run_program(correct_program(), clicks=1)
        self.assertEqual(r["sceneMode"], "night")
        self.assertEqual(r["background"], "night_bg")
    def test_background_not_updated_fails(self):
        prog = [{"type": "when_start"}, {"type": "toggle_scene", "update_background": False}]
        with self.assertRaises(Exception) as cm:
            run_program(prog, clicks=1)
        self.assertIn("背景没有更新", str(cm.exception))
    def test_missing_toggle_fails(self):
        with self.assertRaises(Exception):
            run_program([{"type": "when_start"}], clicks=1)
    def test_extension_dusk_third_mode(self):
        r = run_program(correct_program(), clicks=3, modes=("day", "night", "dusk"))
        self.assertEqual(r["sceneMode"], "day")
        self.assertEqual(r["background"], "day_bg")
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:], clicks=1)

if __name__ == "__main__":
    unittest.main(verbosity=2)

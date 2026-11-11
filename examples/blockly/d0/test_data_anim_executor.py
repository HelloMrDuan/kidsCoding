import unittest, json
from data_anim_executor import run_program, correct_program

class TestD0U4L02(unittest.TestCase):
    def test_correct_animation(self):
        r = run_program(correct_program())
        self.assertEqual(r["largest"], 3)
    def test_practice_b_tied_largest(self):
        prog = [{"type": "when_start"},
                {"type": "data", "values": [5, 5, 2]},
                {"type": "frame", "height": 5},
                {"type": "frame", "height": 5},
                {"type": "frame", "height": 2},
                {"type": "narration", "text": "最大是 5"}]
        r = run_program(prog)
        self.assertEqual(r["largest"], 5)
    def test_wrong_frame_fails(self):
        prog = correct_program()
        prog[3] = {"type": "frame", "height": 2}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("必须等于数据值", str(cm.exception))
    def test_wrong_largest_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "narration", "text": "最大是 2"}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("最大值", str(cm.exception))
    def test_too_few_values_fails(self):
        prog = [{"type": "when_start"},
                {"type": "data", "values": [3, 1]},
                {"type": "frame", "height": 3},
                {"type": "frame", "height": 1},
                {"type": "narration", "text": "最大是 3"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_fourth_passes(self):
        prog = [{"type": "when_start"},
                {"type": "data", "values": [3, 1, 2, 4]},
                {"type": "frame", "height": 3},
                {"type": "frame", "height": 1},
                {"type": "frame", "height": 2},
                {"type": "frame", "height": 4},
                {"type": "narration", "text": "最大是 4"}]
        r = run_program(prog)
        self.assertEqual(r["largest"], 4)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["values"], [3, 1, 2])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

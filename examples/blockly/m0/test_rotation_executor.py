import unittest, json
from rotation_executor import run_program, correct_program

class TestM0U1L02(unittest.TestCase):
    def test_correct_rotation(self):
        r = run_program(correct_program(), target=90)
        self.assertEqual(r["heading"], 90)
    def test_practice_b_other_way(self):
        prog = [{"type": "when_start"}, {"type": "turn_left", "degrees": 270}]
        r = run_program(prog, target=90)
        self.assertEqual(r["heading"], 90)
    def test_wrong_angle_fails(self):
        prog = [{"type": "when_start"}, {"type": "turn_right", "degrees": 80}]
        with self.assertRaises(Exception) as cm:
            run_program(prog, target=90)
        self.assertIn("目标", str(cm.exception))
    def test_two_turns_to_180(self):
        prog = [{"type": "when_start"}, {"type": "turn_right", "degrees": 90}, {"type": "turn_right", "degrees": 90}]
        r = run_program(prog, target=180)
        self.assertEqual(r["heading"], 180)
    def test_extension_full_spin_returns(self):
        prog = [{"type": "when_start"}, {"type": "turn_right", "degrees": 360}]
        r = run_program(prog, target=0)
        self.assertEqual(r["heading"], 0)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog, target=90)
        self.assertEqual(r["heading"], 90)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:], target=90)

if __name__ == "__main__":
    unittest.main(verbosity=2)

import unittest
from assign_executor import run_program, correct_program

class TestG1U4L03(unittest.TestCase):
    def test_correct_assignment(self):
        r = run_program(correct_program())
        self.assertEqual(r["tasks"], {"fox": "drive", "rabbit": "prompt_and_timer"})
    def test_both_drive_fails(self):
        prog = [{"type": "when_start"}, {"type": "assign", "actor": "fox", "task": "drive"}, {"type": "assign", "actor": "rabbit", "task": "drive"}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("抖动", str(cm.exception))
    def test_swapped_tasks_fails(self):
        prog = [{"type": "when_start"}, {"type": "assign", "actor": "fox", "task": "prompt_and_timer"}, {"type": "assign", "actor": "rabbit", "task": "drive"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_missing_rabbit_task_fails(self):
        prog = [{"type": "when_start"}, {"type": "assign", "actor": "fox", "task": "drive"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_third_recorder_passes(self):
        prog = correct_program() + [{"type": "assign", "actor": "turtle", "task": "record"}]
        r = run_program(prog)
        self.assertEqual(r["tasks"]["turtle"], "record")
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

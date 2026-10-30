import unittest, json
from strategy_executor import run_program, correct_program

class TestM0U4L05(unittest.TestCase):
    def test_correct_strategy(self):
        r = run_program(correct_program())
        self.assertEqual(r["steps"], 5)
    def test_practice_b_shorter_goal(self):
        prog = [{"type": "when_start"}]
        for d in ["right", "right"]:
            prog.append({"type": "move", "direction": d})
        r = run_program(prog, goal=(2, 0), blocked=set())
        self.assertEqual(r["steps"], 2)
    def test_extra_steps_fails(self):
        prog = [{"type": "when_start"}]
        for d in ["right", "right", "right", "up", "down", "up", "up"]:
            prog.append({"type": "move", "direction": d})
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("最省步数", str(cm.exception))
    def test_blocked_cell_fails(self):
        prog = [{"type": "when_start"}]
        for d in ["right", "up", "right", "right", "up"]:
            prog.append({"type": "move", "direction": d})
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("障碍", str(cm.exception))
    def test_not_reaching_goal_fails(self):
        prog = [{"type": "when_start"}]
        for d in ["right", "right"]:
            prog.append({"type": "move", "direction": d})
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_other_order_passes(self):
        prog = [{"type": "when_start"}]
        for d in ["up", "up", "right", "right", "right"]:
            prog.append({"type": "move", "direction": d})
        r = run_program(prog)
        self.assertEqual(r["steps"], 5)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["steps"], 5)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

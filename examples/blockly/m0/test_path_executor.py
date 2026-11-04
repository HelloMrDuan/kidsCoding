import unittest, json
from path_executor import run_program, correct_program

class TestM0U4L02(unittest.TestCase):
    def test_correct_path(self):
        r = run_program(correct_program())
        self.assertEqual(r["steps"], 5)
    def test_practice_b_other_route(self):
        prog = [{"type": "when_start"}]
        for d in ["up", "up", "right", "right", "right"]:
            prog.append({"type": "move", "direction": d})
        r = run_program(prog)
        self.assertEqual(r["steps"], 5)
    def test_blocked_cell_fails(self):
        prog = [{"type": "when_start"}]
        for d in ["right", "up", "right", "right", "up"]:
            prog.append({"type": "move", "direction": d})
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("障碍", str(cm.exception))
    def test_longer_route_fails(self):
        prog = [{"type": "when_start"}]
        for d in ["right", "right", "right", "up", "down", "up", "up"]:
            prog.append({"type": "move", "direction": d})
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("最短", str(cm.exception))
    def test_not_reaching_goal_fails(self):
        prog = [{"type": "when_start"}]
        for d in ["right", "right"]:
            prog.append({"type": "move", "direction": d})
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_second_map_passes(self):
        prog = [{"type": "when_start"}]
        for d in ["right", "right", "right", "right"]:
            prog.append({"type": "move", "direction": d})
        r = run_program(prog, goal=(4, 0), blocked=set())
        self.assertEqual(r["steps"], 4)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["steps"], 5)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

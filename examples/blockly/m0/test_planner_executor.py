import unittest, json
from planner_executor import run_program, correct_program

class TestM0U4L06(unittest.TestCase):
    def test_correct_plan(self):
        r = run_program(correct_program())
        self.assertEqual(r["total"], 900)
        self.assertEqual(r["projects"], ["park", "library", "market"])
    def test_practice_b_different_projects(self):
        prog = [{"type": "when_start"}, {"type": "title", "text": "社区小小规划师"},
                {"type": "project", "name": "playground", "reason": "play", "location": "north", "cost": 500},
                {"type": "project", "name": "garden", "reason": "grow", "location": "east", "cost": 200},
                {"type": "project", "name": "clinic", "reason": "health", "location": "centre", "cost": 200}]
        r = run_program(prog)
        self.assertEqual(r["total"], 900)
    def test_too_few_projects_fails(self):
        prog = correct_program()[:3]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("3 个", str(cm.exception))
    def test_missing_reason_fails(self):
        prog = correct_program()
        prog[2] = {"type": "project", "name": "park", "reason": "", "location": "east", "cost": 300}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("缺少理由", str(cm.exception))
    def test_over_budget_fails(self):
        prog = correct_program() + [{"type": "project", "name": "mall", "reason": "shop", "location": "north", "cost": 500}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("超出社区预算", str(cm.exception))
    def test_extension_fourth_at_budget_passes(self):
        prog = correct_program() + [{"type": "project", "name": "bus_stop", "reason": "travel", "location": "west", "cost": 100}]
        r = run_program(prog)
        self.assertEqual(r["total"], 1000)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["total"], 900)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

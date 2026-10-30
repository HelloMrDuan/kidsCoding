import unittest, json
from showcase_executor import run_program, correct_program

class TestD0U3L06(unittest.TestCase):
    def test_correct_showcase(self):
        r = run_program(correct_program())
        self.assertEqual(r["projects"], ["bridge", "alarm", "signal"])
    def test_practice_b_with_fix(self):
        prog = [{"type": "when_start"}, {"type": "title", "text": "工程挑战成果展"},
                {"type": "project", "name": "guide"},
                {"type": "problem", "text": "路线不清"},
                {"type": "solution", "text": "加指示牌"},
                {"type": "test", "result": "pass"},
                {"type": "project", "name": "sorting"},
                {"type": "problem", "text": "分错桶"},
                {"type": "solution", "text": "加标签"},
                {"type": "test", "result": "pass"},
                {"type": "project", "name": "energy"},
                {"type": "problem", "text": "煤太多"},
                {"type": "solution", "text": "多种太阳能"},
                {"type": "test", "result": "pass"},
                {"type": "fix", "project": "sorting"}]
        r = run_program(prog)
        self.assertEqual(len(r["projects"]), 3)
    def test_missing_test_fails(self):
        prog = correct_program()
        prog = [b for b in prog if not (b.get("type") == "test" and b.get("result") == "pass")][:10]
        # simpler: remove one test block
        prog2 = correct_program()
        del prog2[5]
        with self.assertRaises(Exception):
            run_program(prog2)
    def test_too_few_projects_fails(self):
        prog = correct_program()
        idx = next(i for i, b in enumerate(prog) if b.get("type") == "project" and b.get("name") == "alarm")
        prog = prog[:idx] + [prog[-1]]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("3 个", str(cm.exception))
    def test_no_iteration_fails(self):
        prog = [b for b in correct_program() if b.get("type") != "fix"]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("改进", str(cm.exception))
    def test_extension_fourth_passes(self):
        prog = correct_program()[:-1] + [
            {"type": "project", "name": "plant"},
            {"type": "problem", "text": "长得慢"},
            {"type": "solution", "text": "多光照"},
            {"type": "test", "result": "pass"},
            {"type": "fix", "project": "signal"}]
        r = run_program(prog)
        self.assertEqual(len(r["projects"]), 4)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["projects"], ["bridge", "alarm", "signal"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

import unittest, json
from story_executor import run_program, correct_program

class TestD0U4L01(unittest.TestCase):
    def test_correct_story(self):
        r = run_program(correct_program())
        self.assertEqual(r["scenes"], ["question", "experiment", "conclusion"])
    def test_practice_b_leaves(self):
        prog = [{"type": "when_start"},
                {"type": "scene", "name": "question"},
                {"type": "narration", "text": "叶子为什么是绿的？"},
                {"type": "fact", "text": "叶子有叶绿素"},
                {"type": "scene", "name": "observation"},
                {"type": "narration", "text": "观察叶子是绿色的"},
                {"type": "fact", "text": "叶绿素是绿色的"},
                {"type": "scene", "name": "conclusion"},
                {"type": "narration", "text": "原来叶子绿是因为叶绿素"},
                {"type": "fact", "text": "叶子有叶绿素"}]
        r = run_program(prog)
        self.assertEqual(r["scenes"][-1], "conclusion")
    def test_missing_fact_fails(self):
        prog = correct_program()
        del prog[6]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("缺少科普点", str(cm.exception))
    def test_duplicate_fact_fails(self):
        # Two non-conclusion scenes sharing the same fact must fail.
        prog = correct_program()
        prog[6] = {"type": "fact", "text": "水可以变成水蒸气"}
        prog[-1] = {"type": "fact", "text": "水可以变成水蒸气"}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("不能重复", str(cm.exception))
    def test_no_conclusion_fails(self):
        prog = correct_program()
        prog[-3] = {"type": "scene", "name": "ending"}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("结论", str(cm.exception))
    def test_extension_application_passes(self):
        prog = correct_program()[:-3] + [
            {"type": "scene", "name": "application"},
            {"type": "narration", "text": "水蒸气可以驱动小船"},
            {"type": "fact", "text": "水蒸气有力量"},
            {"type": "scene", "name": "conclusion"},
            {"type": "narration", "text": "原来水加热会变成水蒸气"},
            {"type": "fact", "text": "水加热变成水蒸气"}]
        r = run_program(prog)
        self.assertEqual(len(r["scenes"]), 4)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["scenes"], ["question", "experiment", "conclusion"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

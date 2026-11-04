import unittest
from premiere_executor import run_program, correct_program

class TestG1U4L06(unittest.TestCase):
    def test_correct_premiere(self):
        r = run_program(correct_program())
        self.assertEqual(r["acts"], ["beginning", "conflict", "resolution"])
        self.assertIn("show", r["components"])
    def test_missing_last_act_fails(self):
        prog = [b for b in correct_program() if not (b.get("type") == "act" and b.get("name") == "resolution")]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("最后一幕缺失", str(cm.exception))
    def test_trigger_no_response_fails(self):
        prog = correct_program()
        prog = [dict(b, responds=False) if b.get("type") == "interaction" else b for b in prog]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("没有响应", str(cm.exception))
    def test_missing_second_test_fails(self):
        prog = [b for b in correct_program() if not (b.get("type") == "test_round" and b.get("round") == 2)]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_poster_passes(self):
        prog = correct_program() + [{"type": "poster"}]
        r = run_program(prog)
        self.assertTrue(r["poster"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

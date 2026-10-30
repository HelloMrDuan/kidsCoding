import unittest, json
from guide_executor import run_program, correct_program

class TestD0U3L04(unittest.TestCase):
    def test_correct_guide(self):
        r = run_program(correct_program())
        self.assertEqual(r["route"], ["entrance", "garden", "hall"])
    def test_practice_b_reversed_route(self):
        prog = [{"type": "when_start"},
                {"type": "stop", "name": "hall"},
                {"type": "intro", "name": "hall", "text": "这里是大厅"},
                {"type": "stop", "name": "garden"},
                {"type": "intro", "name": "garden", "text": "这里是花园"},
                {"type": "stop", "name": "entrance"},
                {"type": "intro", "name": "entrance", "text": "欢迎来到展馆"}]
        r = run_program(prog, planned=["hall", "garden", "entrance"])
        self.assertEqual(r["stops"], 3)
    def test_missing_intro_fails(self):
        prog = [b for b in correct_program() if not (b.get("type") == "intro" and b.get("name") == "garden")]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("缺少讲解", str(cm.exception))
    def test_skipped_stop_fails(self):
        prog = [{"type": "when_start"},
                {"type": "stop", "name": "entrance"},
                {"type": "intro", "name": "entrance", "text": "欢迎来到展馆"},
                {"type": "stop", "name": "hall"},
                {"type": "intro", "name": "hall", "text": "这里是大厅"},
                {"type": "stop", "name": "garden"},
                {"type": "intro", "name": "garden", "text": "这里是花园"}]
        # route entrance, hall, garden is wrong order vs planned
        with self.assertRaises(Exception):
            run_program(prog)
    def test_too_few_stops_fails(self):
        prog = correct_program()[:4]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_fourth_passes(self):
        prog = correct_program() + [
            {"type": "stop", "name": "shop"},
            {"type": "intro", "name": "shop", "text": "这里是商店"}]
        r = run_program(prog)
        self.assertEqual(r["stops"], 4)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["route"], ["entrance", "garden", "hall"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

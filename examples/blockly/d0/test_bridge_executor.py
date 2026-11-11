import unittest, json
from bridge_executor import run_program, correct_program

class TestD0U3L01(unittest.TestCase):
    def test_correct_bridge(self):
        r = run_program(correct_program())
        self.assertEqual(r["capacity"], 40)
        self.assertEqual(r["margin"], 10)
    def test_practice_b_exact_capacity(self):
        prog = [{"type": "when_start"},
                {"type": "layers", "count": 2},
                {"type": "supports", "count": 4},
                {"type": "capacity", "value": 40},
                {"type": "test_load", "value": 40}]
        r = run_program(prog)
        self.assertEqual(r["margin"], 0)
    def test_wrong_capacity_fails(self):
        prog = correct_program()
        prog[3] = {"type": "capacity", "value": 50}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("承重错误", str(cm.exception))
    def test_overload_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "test_load", "value": 50}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("压垮", str(cm.exception))
    def test_missing_supports_fails(self):
        prog = [b for b in correct_program() if b.get("type") != "supports"]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_stronger_passes(self):
        prog = [{"type": "when_start"},
                {"type": "layers", "count": 4},
                {"type": "supports", "count": 2},
                {"type": "capacity", "value": 50},
                {"type": "test_load", "value": 45}]
        r = run_program(prog)
        self.assertEqual(r["capacity"], 50)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["capacity"], 40)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

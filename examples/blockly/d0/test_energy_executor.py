import unittest, json
from energy_executor import run_program, correct_program

class TestD0U2L05(unittest.TestCase):
    def test_correct_stats(self):
        r = run_program(correct_program())
        self.assertEqual(r["total"], 100)
        self.assertEqual(r["renewable_share_percent"], 50)
    def test_practice_b_lower_renewable(self):
        prog = [{"type": "when_start"},
                {"type": "usage", "source": "solar", "kwh": 10},
                {"type": "usage", "source": "wind", "kwh": 10},
                {"type": "usage", "source": "coal", "kwh": 60},
                {"type": "usage", "source": "gas", "kwh": 20},
                {"type": "total", "value": 100}]
        r = run_program(prog)
        self.assertEqual(r["renewable_share_percent"], 20)
    def test_wrong_total_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "total", "value": 90}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("总用量错误", str(cm.exception))
    def test_negative_usage_fails(self):
        prog = correct_program()
        prog[1] = {"type": "usage", "source": "solar", "kwh": -10}
        prog[-1] = {"type": "total", "value": 60}
        with self.assertRaises(Exception):
            run_program(prog)
    def test_missing_source_fails(self):
        prog = correct_program()[:-1]
        prog = [b for b in prog if b.get("source") != "gas"]
        prog.append({"type": "total", "value": 90})
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_second_household_passes(self):
        prog = [{"type": "when_start"},
                {"type": "usage", "source": "solar", "kwh": 50},
                {"type": "usage", "source": "wind", "kwh": 30},
                {"type": "usage", "source": "coal", "kwh": 10},
                {"type": "usage", "source": "gas", "kwh": 10},
                {"type": "total", "value": 100}]
        r = run_program(prog)
        self.assertEqual(r["renewable_share_percent"], 80)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["total"], 100)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

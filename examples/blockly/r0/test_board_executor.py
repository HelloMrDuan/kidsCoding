import unittest, json
from board_executor import run_program, correct_program

class TestR0U1L01(unittest.TestCase):
    def test_correct_board(self):
        r = run_program(correct_program())
        self.assertTrue(r["powered"] and r["led"])
        self.assertEqual(r["readings"], [512])
    def test_practice_b_different_reading(self):
        prog = correct_program()
        prog[-1] = {"type": "read_sensor", "value": 800}
        r = run_program(prog)
        self.assertEqual(r["readings"], [800])
    def test_no_power_fails(self):
        prog = [b for b in correct_program() if b.get("type") != "connect_power"]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("电源", str(cm.exception))
    def test_out_of_range_reading_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "read_sensor", "value": 2000}
        with self.assertRaises(Exception):
            run_program(prog)
    def test_missing_part_fails(self):
        prog = [b for b in correct_program() if not (b.get("type") == "identify" and b.get("part") == "sensor")]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_second_sensor_passes(self):
        prog = correct_program() + [{"type": "read_sensor", "value": 300}]
        r = run_program(prog)
        self.assertEqual(r["readings"], [512, 300])
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertTrue(r["powered"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

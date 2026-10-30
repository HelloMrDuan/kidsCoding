import unittest, json
from perimeter_executor import run_program, correct_program

class TestM0U4L01(unittest.TestCase):
    def test_correct_perimeter(self):
        r = run_program(correct_program())
        self.assertEqual(r["perimeters"], [160])
    def test_practice_b_square(self):
        prog = [{"type": "when_start"}, {"type": "field", "length": 40, "width": 40, "perimeter": 160}]
        r = run_program(prog)
        self.assertEqual(r["perimeters"], [160])
    def test_length_plus_width_fails(self):
        prog = [{"type": "when_start"}, {"type": "field", "length": 50, "width": 30, "perimeter": 80}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("周长错误", str(cm.exception))
    def test_area_instead_fails(self):
        prog = [{"type": "when_start"}, {"type": "field", "length": 50, "width": 30, "perimeter": 1500}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_no_field_fails(self):
        prog = [{"type": "when_start"}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_two_fields_total(self):
        prog = correct_program() + [{"type": "field", "length": 20, "width": 10, "perimeter": 60},
                {"type": "total", "value": 220}]
        r = run_program(prog)
        self.assertEqual(r["total"], 220)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["perimeters"], [160])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)

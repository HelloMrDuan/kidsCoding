import json
import unittest

from light_executor import LightError, correct_program, run_program


def base(voltage=5, pin="A0", readings=None, levels=None,
         report=True):
    prog = [{"type": "when_start"}, {"type": "power", "voltage": voltage}]
    if pin is not None:
        prog.append({"type": "sensor", "pin": pin})
    for r in (readings if readings is not None else []):
        prog.append({"type": "read", "reading": r})
    if report:
        prog.append({"type": "report", "levels": levels})
    return prog


class TestR0U2L01(unittest.TestCase):
    def test_correct_reading(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["levels"], ["dark", "medium", "bright"])

    def test_practice_b_boundaries(self):
        r = run_program(base(readings=[250, 300, 701],
                             levels=["dark", "medium", "bright"]))
        self.assertEqual(r["status"], "success")

    def test_reading_out_of_range_fails(self):
        with self.assertRaises(LightError):
            run_program(base(readings=[100, 500, 1200],
                             levels=["dark", "medium", "bright"]))

    def test_too_few_readings_fails(self):
        with self.assertRaises(LightError):
            run_program(base(readings=[100, 500],
                             levels=["dark", "medium"]))

    def test_report_mismatch_fails(self):
        with self.assertRaises(LightError):
            run_program(base(readings=[100, 500, 900],
                             levels=["bright", "medium", "dark"]))

    def test_wrong_pin_fails(self):
        with self.assertRaises(LightError):
            run_program(base(pin="A5", readings=[100, 500, 900],
                             levels=["dark", "medium", "bright"]))

    def test_missing_report_fails(self):
        with self.assertRaises(LightError):
            run_program(base(readings=[100, 500, 900], report=False))

    def test_missing_power_fails(self):
        with self.assertRaises(LightError):
            run_program([{"type": "when_start"}] + correct_program()[2:])

    def test_extension_four_readings_pass(self):
        r = run_program(base(readings=[50, 350, 700, 950],
                             levels=["dark", "medium", "medium", "bright"]))
        self.assertEqual(len(r["readings"]), 4)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(LightError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

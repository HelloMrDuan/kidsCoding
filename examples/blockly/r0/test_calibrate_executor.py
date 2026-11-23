import json
import unittest

from calibrate_executor import CalibrateError, correct_program, run_program


def head(true_value=100):
    return [{"type": "when_start"}, {"type": "power", "voltage": 5},
            {"type": "reference", "true_value": true_value},
            {"type": "sensor", "name": "A", "pin": 9},
            {"type": "sensor", "name": "B", "pin": 10}]


def measure(sensor, value):
    return {"type": "measure", "sensor": sensor, "value": value}


def tail(better, error_a, error_b, sensor, offset):
    return [{"type": "compare", "better": better,
             "error_a": error_a, "error_b": error_b},
            {"type": "calibrate", "sensor": sensor, "offset": offset}]


class TestR0U2L05(unittest.TestCase):
    def test_correct_calibration(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["compare"]["better"], "A")

    def test_practice_b_offset_calibration(self):
        r = run_program(head() + [
            measure("A", 95), measure("A", 97),
            measure("B", 104), measure("B", 106),
        ] + tail("A", 4, 5, "A", 4))
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["calibrate"]["offset"], 4)

    def test_wrong_pin_fails(self):
        prog = head()
        prog[3] = {"type": "sensor", "name": "A", "pin": 5}
        with self.assertRaises(CalibrateError):
            run_program(prog + [measure("A", 98), measure("A", 102),
                                measure("B", 90), measure("B", 110)] +
                        tail("A", 2, 10, "A", 0))

    def test_undeclared_sensor_measure_fails(self):
        with self.assertRaises(CalibrateError):
            run_program(head() + [measure("C", 98), measure("A", 102),
                                  measure("B", 90), measure("B", 110)] +
                        tail("A", 2, 10, "A", 0))

    def test_too_few_measures_fails(self):
        with self.assertRaises(CalibrateError):
            run_program(head() + [measure("A", 98),
                                  measure("B", 90), measure("B", 110)] +
                        tail("A", 2, 10, "A", 0))

    def test_better_mismatch_fails(self):
        with self.assertRaises(CalibrateError):
            run_program(head() + [
                measure("A", 98), measure("A", 102),
                measure("B", 90), measure("B", 110),
            ] + tail("B", 2, 10, "B", 0))

    def test_errors_mismatch_fails(self):
        with self.assertRaises(CalibrateError):
            run_program(head() + [
                measure("A", 98), measure("A", 102),
                measure("B", 90), measure("B", 110),
            ] + tail("A", 3, 10, "A", 0))

    def test_offset_mismatch_fails(self):
        with self.assertRaises(CalibrateError):
            run_program(head() + [
                measure("A", 95), measure("A", 97),
                measure("B", 104), measure("B", 106),
            ] + tail("A", 4, 5, "A", 2))

    def test_calibrate_worse_sensor_fails(self):
        with self.assertRaises(CalibrateError):
            run_program(head() + [
                measure("A", 98), measure("A", 102),
                measure("B", 90), measure("B", 110),
            ] + tail("A", 2, 10, "B", 0))

    def test_missing_compare_fails(self):
        with self.assertRaises(CalibrateError):
            run_program(head() + [
                measure("A", 98), measure("A", 102),
                measure("B", 90), measure("B", 110),
                {"type": "calibrate", "sensor": "A", "offset": 0},
            ])

    def test_extension_tie_calibration_pass(self):
        r = run_program(head() + [
            measure("A", 98), measure("A", 102),
            measure("B", 102), measure("B", 98),
        ] + tail("tie", 2, 2, "A", 0))
        self.assertEqual(r["compare"]["better"], "tie")

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(CalibrateError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

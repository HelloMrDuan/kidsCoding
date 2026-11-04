import json
import unittest

from watering_executor import WateringError, correct_program, run_program


def head(readings, plant="小番茄", pin="A0"):
    return [{"type": "when_start"},
            {"type": "plant", "name": plant},
            {"type": "sensor", "pin": pin},
            {"type": "test", "readings": readings}]


def version(threshold):
    return {"type": "version", "threshold": threshold}


def result(correct):
    return {"type": "result", "correct": correct}


class TestR0U4L02(unittest.TestCase):
    def test_correct_watering(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["result"]["correct"], [2, 3, 4])

    def test_practice_b_two_versions(self):
        r = run_program(head([25, 50, 80]) + [version(60), version(40),
                                              result([2, 3])])
        self.assertEqual(r["status"], "success")

    def test_threshold_out_of_range_fails(self):
        with self.assertRaises(WateringError):
            run_program(head([30, 45, 60, 20]) + [version(120),
                                                  version(40),
                                                  result([2, 4])])

    def test_reading_out_of_range_fails(self):
        with self.assertRaises(WateringError):
            run_program(head([30, 150, 60, 20]) + [version(20),
                                                   version(40),
                                                   result([2, 4])])

    def test_too_few_versions_fails(self):
        with self.assertRaises(WateringError):
            run_program(head([30, 45, 60, 20]) + [version(40),
                                                  result([4])])

    def test_repeated_threshold_fails(self):
        with self.assertRaises(WateringError):
            run_program(head([30, 45, 60, 20]) + [version(20),
                                                  version(20),
                                                  version(40),
                                                  result([2, 2, 4])])

    def test_correct_decrease_fails(self):
        with self.assertRaises(WateringError):
            run_program(head([30, 45, 60, 20]) + [version(40),
                                                  version(20),
                                                  result([4, 2])])

    def test_final_not_perfect_fails(self):
        with self.assertRaises(WateringError):
            run_program(head([30, 45, 60, 20]) + [version(20),
                                                  version(30),
                                                  result([2, 3])])

    def test_result_mismatch_fails(self):
        with self.assertRaises(WateringError):
            run_program(head([30, 45, 60, 20]) + [version(20),
                                                  version(30),
                                                  version(40),
                                                  result([2, 4, 4])])

    def test_missing_result_fails(self):
        with self.assertRaises(WateringError):
            run_program(head([30, 45, 60, 20]) + [version(20),
                                                  version(30),
                                                  version(40)])

    def test_extension_four_versions_pass(self):
        r = run_program(head([30, 45, 60, 20]) + [
            version(10), version(25), version(35), version(40),
            result([2, 3, 4, 4])])
        self.assertEqual(r["thresholds"], [10, 25, 35, 40])

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(WateringError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

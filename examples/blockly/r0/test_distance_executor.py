import json
import unittest

from distance_executor import DistanceError, correct_program, run_program


def sample(distance):
    return {"type": "sample", "distance": distance}


def base(voltage=5, pin=9, samples=None, alarm=None, alarm_block=True):
    prog = [{"type": "when_start"}, {"type": "power", "voltage": voltage}]
    if pin is not None:
        prog.append({"type": "sensor", "pin": pin})
    for s in (samples or []):
        prog.append(s)
    if alarm_block:
        prog.append({"type": "alarm", "state": alarm})
    return prog


class TestR0U2L03(unittest.TestCase):
    def test_correct_alarm(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertTrue(r["alarm"])

    def test_practice_b_single_low_no_alarm(self):
        r = run_program(base(samples=[sample(100), sample(15),
                                      sample(80)], alarm=False))
        self.assertEqual(r["status"], "success")
        self.assertFalse(r["alarm"])

    def test_sample_out_of_range_fails(self):
        with self.assertRaises(DistanceError):
            run_program(base(samples=[sample(100), sample(15),
                                      sample(500)], alarm=True))

    def test_too_few_samples_fails(self):
        with self.assertRaises(DistanceError):
            run_program(base(samples=[sample(100), sample(15)],
                             alarm=False))

    def test_alarm_true_mismatch_fails(self):
        with self.assertRaises(DistanceError):
            run_program(base(samples=[sample(100), sample(15),
                                      sample(80)], alarm=True))

    def test_alarm_false_mismatch_fails(self):
        with self.assertRaises(DistanceError):
            run_program(base(samples=[sample(100), sample(15),
                                      sample(12)], alarm=False))

    def test_wrong_pin_fails(self):
        with self.assertRaises(DistanceError):
            run_program(base(pin=5, samples=[sample(100), sample(15),
                                             sample(12)], alarm=True))

    def test_missing_alarm_fails(self):
        with self.assertRaises(DistanceError):
            run_program(base(samples=[sample(100), sample(15),
                                      sample(12)], alarm_block=False))

    def test_missing_power_fails(self):
        with self.assertRaises(DistanceError):
            run_program([{"type": "when_start"}] + correct_program()[2:])

    def test_extension_five_samples_pass(self):
        r = run_program(base(samples=[sample(100), sample(15),
                                      sample(12), sample(90),
                                      sample(18)], alarm=True))
        self.assertEqual(len(r["samples"]), 5)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(DistanceError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

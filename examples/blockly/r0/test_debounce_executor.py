import json
import unittest

from debounce_executor import DebounceError, correct_program, run_program


def samples(states):
    return [{"type": "sample", "state": s} for s in states]


def base(voltage=5, pin=2, states=None, presses=None, count_block=True):
    prog = [{"type": "when_start"}, {"type": "power", "voltage": voltage}]
    if pin is not None:
        prog.append({"type": "button", "pin": pin})
    prog += samples(states or [])
    if count_block:
        prog.append({"type": "count", "presses": presses})
    return prog


BOUNCE = [0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0]
CLEAN = [0, 0, 0, 1, 1, 1, 0, 0, 0]


class TestR0U2L04(unittest.TestCase):
    def test_correct_clean_press(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["presses"], 1)

    def test_practice_b_bounce_counts_once(self):
        r = run_program(base(states=BOUNCE, presses=1))
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["presses"], 1)

    def test_invalid_sample_state_fails(self):
        with self.assertRaises(DebounceError):
            run_program(base(states=[0, 0, 0, 1, 2, 1, 0, 0, 0],
                             presses=1))

    def test_too_few_samples_fails(self):
        with self.assertRaises(DebounceError):
            run_program(base(states=[0, 1, 1, 1, 0], presses=1))

    def test_count_too_high_fails(self):
        with self.assertRaises(DebounceError):
            run_program(base(states=BOUNCE, presses=2))

    def test_count_too_low_fails(self):
        with self.assertRaises(DebounceError):
            run_program(base(states=CLEAN, presses=0))

    def test_wrong_pin_fails(self):
        with self.assertRaises(DebounceError):
            run_program(base(pin=7, states=CLEAN, presses=1))

    def test_missing_count_fails(self):
        with self.assertRaises(DebounceError):
            run_program(base(states=CLEAN, count_block=False))

    def test_missing_power_fails(self):
        with self.assertRaises(DebounceError):
            run_program([{"type": "when_start"}] + correct_program()[2:])

    def test_extension_two_presses_pass(self):
        r = run_program(base(
            states=[0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0],
            presses=2))
        self.assertEqual(r["presses"], 2)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(DebounceError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

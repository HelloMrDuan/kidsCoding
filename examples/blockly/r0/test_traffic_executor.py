import json
import unittest

from traffic_executor import TrafficError, correct_program, run_program


def step(light, waiting=False):
    return {"type": "step", "light": light, "waiting": waiting}


def base(leds=None, steps=None):
    prog = [{"type": "when_start"}, {"type": "power", "voltage": 5}]
    for color, pin in (leds if leds is not None else
                       [("red", 11), ("yellow", 12), ("green", 13)]):
        prog.append({"type": "led", "color": color, "pin": pin})
    prog += steps or []
    return prog


def red(waitings):
    return [step("red", w) for w in waitings]


def green(n):
    return [step("green") for _ in range(n)]


def yellow(n=1):
    return [step("yellow") for _ in range(n)]


class TestR0U3L03(unittest.TestCase):
    def test_correct_traffic(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["cycles"], 1)
        self.assertTrue(r["extended"])

    def test_practice_b_short_green(self):
        r = run_program(base(steps=red([False, False]) + green(2) + yellow()))
        self.assertEqual(r["status"], "success")
        self.assertFalse(r["extended"])

    def test_invalid_transition_fails(self):
        with self.assertRaises(TrafficError):
            run_program(base(steps=red([False, False]) + yellow() +
                        green(2)))

    def test_green_too_short_with_waiting_fails(self):
        with self.assertRaises(TrafficError):
            run_program(base(steps=red([False, True]) + green(2) + yellow()))

    def test_green_too_long_without_waiting_fails(self):
        with self.assertRaises(TrafficError):
            run_program(base(steps=red([False, False]) + green(4) + yellow()))

    def test_too_few_steps_fails(self):
        with self.assertRaises(TrafficError):
            run_program(base(steps=red([False, False]) + green(2)))

    def test_incomplete_cycle_fails(self):
        with self.assertRaises(TrafficError):
            run_program(base(steps=red([False, False]) + green(2) +
                        red([False, False])))

    def test_wrong_led_pin_fails(self):
        with self.assertRaises(TrafficError):
            run_program(base(leds=[("red", 10), ("yellow", 12),
                                   ("green", 13)],
                             steps=red([False, True]) + green(4) + yellow()))

    def test_missing_led_fails(self):
        with self.assertRaises(TrafficError):
            run_program(base(leds=[("red", 11), ("yellow", 12)],
                             steps=red([False, True]) + green(4) + yellow()))

    def test_extension_two_cycles_pass(self):
        r = run_program(base(steps=red([False, True]) + green(4) + yellow() +
                        red([False, False]) + green(2) + yellow()))
        self.assertEqual(r["cycles"], 2)
        self.assertTrue(r["extended"])

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(TrafficError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

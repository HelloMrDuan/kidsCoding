import json
import unittest

from button_executor import ButtonError, correct_program, run_program


def base(voltage=5, button_pin=2, led_pin=13, color="red", events=None):
    prog = [{"type": "when_start"}, {"type": "power", "voltage": voltage}]
    if button_pin is not None:
        prog.append({"type": "button", "pin": button_pin})
    if led_pin is not None:
        prog.append({"type": "led", "pin": led_pin, "color": color})
    prog += [{"type": e} for e in (events or [])]
    return prog


class TestR0U1L03(unittest.TestCase):
    def test_correct_button_control(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["pairs"], 1)
        self.assertFalse(r["led_on"])

    def test_practice_b_two_pairs(self):
        r = run_program(base(led_pin=12, color="green",
                             events=["press", "release", "press", "release"]))
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["pairs"], 2)

    def test_press_before_setup_fails(self):
        with self.assertRaises(ButtonError):
            run_program(base(button_pin=None, led_pin=None,
                             events=["press", "release"]))

    def test_double_press_fails(self):
        with self.assertRaises(ButtonError):
            run_program(base(events=["press", "press", "release"]))

    def test_release_without_press_fails(self):
        with self.assertRaises(ButtonError):
            run_program(base(events=["release"]))

    def test_press_without_release_fails(self):
        with self.assertRaises(ButtonError):
            run_program(base(events=["press"]))

    def test_wrong_button_pin_fails(self):
        with self.assertRaises(ButtonError):
            run_program(base(button_pin=7, events=["press", "release"]))

    def test_wrong_voltage_fails(self):
        with self.assertRaises(ButtonError):
            run_program(base(voltage=3, events=["press", "release"]))

    def test_extension_three_pairs_pass(self):
        r = run_program(base(events=["press", "release"] * 3))
        self.assertEqual(r["pairs"], 3)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(ButtonError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

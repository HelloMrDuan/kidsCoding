import json
import unittest

from led_executor import LedError, correct_program, run_program


def experiment(pin, color, before, after):
    return [
        {"type": "led", "pin": pin, "color": color},
        {"type": "sensor_before", "reading": before},
        {"type": "switch_on"},
        {"type": "sensor_after", "reading": after},
    ]


def base(voltage, experiments):
    prog = [{"type": "when_start"}, {"type": "power", "voltage": voltage}]
    for e in experiments:
        prog += e
    return prog


class TestR0U1L02(unittest.TestCase):
    def test_correct_led(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(len(r["leds"]), 1)

    def test_practice_b_green_led(self):
        r = run_program(base(5, [experiment(12, "green", 150, 700)]))
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["leds"][0]["color"], "green")

    def test_low_voltage_fails(self):
        with self.assertRaises(LedError):
            run_program(base(3, [experiment(13, "red", 200, 800)]))

    def test_high_voltage_fails(self):
        with self.assertRaises(LedError):
            run_program(base(9, [experiment(13, "red", 200, 800)]))

    def test_wrong_pin_fails(self):
        with self.assertRaises(LedError):
            run_program(base(5, [experiment(5, "red", 200, 800)]))

    def test_sensor_not_rising_fails(self):
        with self.assertRaises(LedError):
            run_program(base(5, [experiment(13, "red", 200, 150)]))

    def test_sensor_out_of_range_fails(self):
        with self.assertRaises(LedError):
            run_program(base(5, [experiment(13, "red", 200, 1200)]))

    def test_missing_power_fails(self):
        with self.assertRaises(LedError):
            run_program([{"type": "when_start"}] + correct_program()[2:])

    def test_extension_two_leds_pass(self):
        r = run_program(base(5, [
            experiment(13, "red", 200, 800),
            experiment(12, "green", 150, 700),
        ]))
        self.assertEqual(len(r["leds"]), 2)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(LedError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

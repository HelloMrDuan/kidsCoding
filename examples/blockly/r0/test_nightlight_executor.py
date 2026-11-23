import json
import unittest

from nightlight_executor import NightlightError, correct_program, run_program


def base(sensor="A0", led=13, readings=None, states=None,
         states_block=True):
    prog = [{"type": "when_start"}, {"type": "power", "voltage": 5}]
    if sensor is not None:
        prog.append({"type": "sensor", "pin": sensor})
    if led is not None:
        prog.append({"type": "led", "pin": led})
    for r in (readings or []):
        prog.append({"type": "read", "reading": r})
    if states_block:
        prog.append({"type": "states", "states": states})
    return prog


class TestR0U3L01(unittest.TestCase):
    def test_correct_nightlight(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["states"], ["off", "on", "on", "off"])

    def test_practice_b_hysteresis_keeps_on(self):
        r = run_program(base(readings=[200, 350, 250, 600, 100],
                             states=["on", "on", "on", "off", "on"]))
        self.assertEqual(r["status"], "success")

    def test_boundaries_change_nothing(self):
        r = run_program(base(readings=[200, 500, 300],
                             states=["on", "on", "on"]))
        self.assertEqual(r["states"], ["on", "on", "on"])
        r2 = run_program(base(readings=[300, 500, 200],
                              states=["off", "off", "on"]))
        self.assertEqual(r2["states"], ["off", "off", "on"])

    def test_reading_out_of_range_fails(self):
        with self.assertRaises(NightlightError):
            run_program(base(readings=[800, 200, 1200],
                             states=["off", "on", "on"]))

    def test_too_few_readings_fails(self):
        with self.assertRaises(NightlightError):
            run_program(base(readings=[800, 200],
                             states=["off", "on"]))

    def test_states_mismatch_fails(self):
        with self.assertRaises(NightlightError):
            run_program(base(readings=[800, 200, 400, 600],
                             states=["off", "on", "off", "off"]))

    def test_wrong_sensor_pin_fails(self):
        with self.assertRaises(NightlightError):
            run_program(base(sensor="A1", readings=[800, 200, 400, 600],
                             states=["off", "on", "on", "off"]))

    def test_wrong_led_pin_fails(self):
        with self.assertRaises(NightlightError):
            run_program(base(led=12, readings=[800, 200, 400, 600],
                             states=["off", "on", "on", "off"]))

    def test_missing_states_fails(self):
        with self.assertRaises(NightlightError):
            run_program(base(readings=[800, 200, 400, 600],
                             states_block=False))

    def test_extension_long_sequence_pass(self):
        r = run_program(base(readings=[900, 100, 450, 550, 200, 700],
                             states=["off", "on", "on", "off", "on", "off"]))
        self.assertEqual(len(r["readings"]), 6)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(NightlightError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

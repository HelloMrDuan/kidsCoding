import json
import unittest

from climate_executor import ClimateError, correct_program, run_program


def read(temp, humidity):
    return {"type": "read", "temp": temp, "humidity": humidity}


def base(voltage=5, pin=2, readings=None, lines=None, display=True):
    prog = [{"type": "when_start"}, {"type": "power", "voltage": voltage}]
    if pin is not None:
        prog.append({"type": "sensor", "pin": pin})
    for r in (readings or []):
        prog.append(r)
    if display:
        prog.append({"type": "display", "lines": lines})
    return prog


class TestR0U2L02(unittest.TestCase):
    def test_correct_display(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["display"],
                         ["温度25℃ 湿度60%", "温度26℃ 湿度58%"])

    def test_practice_b_three_readings(self):
        r = run_program(base(
            readings=[read(20, 80), read(21, 75), read(22, 70)],
            lines=["温度20℃ 湿度80%", "温度21℃ 湿度75%",
                   "温度22℃ 湿度70%"]))
        self.assertEqual(r["status"], "success")
        self.assertEqual(len(r["readings"]), 3)

    def test_temp_out_of_range_fails(self):
        with self.assertRaises(ClimateError):
            run_program(base(readings=[read(25, 60), read(60, 58)],
                             lines=["温度25℃ 湿度60%",
                                    "温度60℃ 湿度58%"]))

    def test_humidity_out_of_range_fails(self):
        with self.assertRaises(ClimateError):
            run_program(base(readings=[read(25, 60), read(26, 120)],
                             lines=["温度25℃ 湿度60%",
                                    "温度26℃ 湿度120%"]))

    def test_too_few_readings_fails(self):
        with self.assertRaises(ClimateError):
            run_program(base(readings=[read(25, 60)],
                             lines=["温度25℃ 湿度60%"]))

    def test_display_mismatch_fails(self):
        with self.assertRaises(ClimateError):
            run_program(base(readings=[read(25, 60), read(26, 58)],
                             lines=["温度25℃ 湿度60%",
                                    "温度27℃ 湿度58%"]))

    def test_wrong_pin_fails(self):
        with self.assertRaises(ClimateError):
            run_program(base(pin=7,
                             readings=[read(25, 60), read(26, 58)],
                             lines=["温度25℃ 湿度60%",
                                    "温度26℃ 湿度58%"]))

    def test_missing_display_fails(self):
        with self.assertRaises(ClimateError):
            run_program(base(readings=[read(25, 60), read(26, 58)],
                             display=False))

    def test_extension_four_readings_pass(self):
        r = run_program(base(
            readings=[read(24, 55), read(25, 60), read(26, 58),
                      read(27, 50)],
            lines=["温度24℃ 湿度55%", "温度25℃ 湿度60%",
                   "温度26℃ 湿度58%", "温度27℃ 湿度50%"]))
        self.assertEqual(len(r["readings"]), 4)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(ClimateError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

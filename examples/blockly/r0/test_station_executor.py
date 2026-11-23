import json
import unittest

from station_executor import StationError, correct_program, run_program


def head(name="森林气象站", pin=2, true_temp=25, true_humidity=60):
    return [{"type": "when_start"}, {"type": "power", "voltage": 5},
            {"type": "station", "name": name},
            {"type": "sensor", "pin": pin},
            {"type": "reference", "true_temp": true_temp,
             "true_humidity": true_humidity}]


def measure(temp, humidity):
    return {"type": "measure", "temp": temp, "humidity": humidity}


def tail(error_temp, error_humidity, temp_offset, humidity_offset, lines):
    return [{"type": "compare", "error_temp": error_temp,
             "error_humidity": error_humidity},
            {"type": "calibrate", "temp_offset": temp_offset,
             "humidity_offset": humidity_offset},
            {"type": "display", "lines": lines}]


class TestR0U2L06(unittest.TestCase):
    def test_correct_station(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["station"], "森林气象站")

    def test_practice_b_offset_display(self):
        r = run_program(head(name="我们班气象站", true_temp=20,
                             true_humidity=50) + [
            measure(18, 46), measure(20, 50),
        ] + tail(1, 2, 1, 2, ["温度19℃ 湿度48%",
                              "温度21℃ 湿度52%"]))
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["display"][0], "温度19℃ 湿度48%")

    def test_measure_out_of_range_fails(self):
        with self.assertRaises(StationError):
            run_program(head() + [measure(24, 58), measure(60, 62)] +
                        tail(1, 2, 0, 0, ["温度24℃ 湿度58%",
                                          "温度60℃ 湿度62%"]))

    def test_too_few_measures_fails(self):
        with self.assertRaises(StationError):
            run_program(head() + [measure(24, 58)] +
                        tail(1, 2, 0, 0, ["温度24℃ 湿度58%"]))

    def test_compare_mismatch_fails(self):
        with self.assertRaises(StationError):
            run_program(head() + [measure(24, 58), measure(26, 62)] +
                        tail(2, 2, 0, 0, ["温度24℃ 湿度58%",
                                          "温度26℃ 湿度62%"]))

    def test_calibrate_mismatch_fails(self):
        with self.assertRaises(StationError):
            run_program(head(name="我们班气象站", true_temp=20,
                             true_humidity=50) + [
                measure(18, 46), measure(20, 50),
            ] + tail(1, 2, 0, 0, ["温度18℃ 湿度46%",
                                  "温度20℃ 湿度50%"]))

    def test_display_mismatch_fails(self):
        with self.assertRaises(StationError):
            run_program(head(name="我们班气象站", true_temp=20,
                             true_humidity=50) + [
                measure(18, 46), measure(20, 50),
            ] + tail(1, 2, 1, 2, ["温度18℃ 湿度46%",
                                  "温度20℃ 湿度50%"]))

    def test_wrong_pin_fails(self):
        with self.assertRaises(StationError):
            run_program(head(pin=7) + [measure(24, 58),
                                       measure(26, 62)] +
                        tail(1, 2, 0, 0, ["温度24℃ 湿度58%",
                                          "温度26℃ 湿度62%"]))

    def test_missing_display_fails(self):
        with self.assertRaises(StationError):
            run_program(head() + [measure(24, 58), measure(26, 62),
                                  {"type": "compare", "error_temp": 1,
                                   "error_humidity": 2},
                                  {"type": "calibrate", "temp_offset": 0,
                                   "humidity_offset": 0}])

    def test_extension_three_measures_pass(self):
        r = run_program(head(true_temp=22, true_humidity=55) + [
            measure(22, 55), measure(19, 55), measure(22, 55),
        ] + tail(1, 0, 1, 0, ["温度23℃ 湿度55%",
                              "温度20℃ 湿度55%",
                              "温度23℃ 湿度55%"]))
        self.assertEqual(len(r["measures"]), 3)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(StationError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

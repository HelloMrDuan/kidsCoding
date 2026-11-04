import json
import unittest

from assembly_executor import AssemblyError, correct_program, run_program


def safety(power_off=True, hands_dry=True, adult_present=True):
    return {"type": "safety", "power_off": power_off,
            "hands_dry": hands_dry, "adult_present": adult_present}


def part(name, pin=None):
    b = {"type": "part", "name": name}
    if pin is not None:
        b["pin"] = pin
    return b


def base(parts, safety_block=None, check=True, voltage=5, reading=512,
         test_block=True):
    prog = [{"type": "when_start"},
            safety_block if safety_block is not None else safety()]
    prog += parts
    if check:
        prog.append({"type": "check", "all_connected": True})
    prog.append({"type": "power", "voltage": voltage})
    if test_block:
        prog.append({"type": "test", "led_on": True,
                     "sensor_reading": reading})
    return prog


def full_parts():
    return [part("board"), part("sensor", "A0"), part("motor", 5),
            part("led", 13)]


class TestR0U4L03(unittest.TestCase):
    def test_correct_assembly(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["parts"], ["board", "sensor", "motor", "led"])

    def test_practice_b_other_reading(self):
        r = run_program(base(full_parts(), reading=800))
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["test"]["sensor_reading"], 800)

    def test_power_before_check_fails(self):
        prog = [{"type": "when_start"}, safety()] + full_parts()
        prog.append({"type": "power", "voltage": 5})
        prog.append({"type": "check", "all_connected": True})
        prog.append({"type": "test", "led_on": True, "sensor_reading": 512})
        with self.assertRaises(AssemblyError):
            run_program(prog)

    def test_part_out_of_order_fails(self):
        parts = [part("sensor", "A0"), part("board"), part("motor", 5),
                 part("led", 13)]
        with self.assertRaises(AssemblyError):
            run_program(base(parts))

    def test_missing_part_fails(self):
        parts = [part("board"), part("sensor", "A0"), part("led", 13)]
        with self.assertRaises(AssemblyError):
            run_program(base(parts))

    def test_safety_false_fails(self):
        with self.assertRaises(AssemblyError):
            run_program(base(full_parts(),
                             safety_block=safety(power_off=False)))

    def test_check_false_fails(self):
        prog = [{"type": "when_start"}, safety()] + full_parts()
        prog.append({"type": "check", "all_connected": False})
        prog.append({"type": "power", "voltage": 5})
        prog.append({"type": "test", "led_on": True, "sensor_reading": 512})
        with self.assertRaises(AssemblyError):
            run_program(prog)

    def test_wrong_voltage_fails(self):
        with self.assertRaises(AssemblyError):
            run_program(base(full_parts(), voltage=9))

    def test_reading_out_of_range_fails(self):
        with self.assertRaises(AssemblyError):
            run_program(base(full_parts(), reading=2000))

    def test_missing_test_fails(self):
        with self.assertRaises(AssemblyError):
            run_program(base(full_parts(), test_block=False))

    def test_extension_buzzer_pass(self):
        parts = full_parts() + [part("buzzer", 8)]
        r = run_program(base(parts))
        self.assertTrue(r["buzzer"])

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(AssemblyError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

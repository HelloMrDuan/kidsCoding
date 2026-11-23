import json
import unittest

from motor_executor import MotorError, correct_program, run_program


def command(action):
    return {"type": "command", "action": action}


def base(pin=5, actions=None, speeds=None, speeds_block=True):
    prog = [{"type": "when_start"}, {"type": "power", "voltage": 5}]
    if pin is not None:
        prog.append({"type": "motor", "pin": pin})
    for a in (actions or []):
        prog.append(command(a))
    if speeds_block:
        prog.append({"type": "speeds", "speeds": speeds})
    return prog


class TestR0U3L02(unittest.TestCase):
    def test_correct_motor(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["speeds"], [1, 2, 1, 0])

    def test_practice_b_clamp_at_max(self):
        r = run_program(base(actions=["up", "up", "up", "up", "down"],
                             speeds=[1, 2, 3, 3, 2]))
        self.assertEqual(r["status"], "success")

    def test_invalid_action_fails(self):
        with self.assertRaises(MotorError):
            run_program(base(actions=["up", "turbo", "down"],
                             speeds=[1, 2, 1]))

    def test_too_few_commands_fails(self):
        with self.assertRaises(MotorError):
            run_program(base(actions=["up", "up"], speeds=[1, 2]))

    def test_speeds_mismatch_fails(self):
        with self.assertRaises(MotorError):
            run_program(base(actions=["up", "up", "down", "stop"],
                             speeds=[1, 2, 2, 0]))

    def test_wrong_pin_fails(self):
        with self.assertRaises(MotorError):
            run_program(base(pin=6, actions=["up", "up", "down", "stop"],
                             speeds=[1, 2, 1, 0]))

    def test_missing_motor_fails(self):
        with self.assertRaises(MotorError):
            run_program(base(pin=None, actions=["up", "up", "down"],
                             speeds=[1, 2, 1]))

    def test_missing_speeds_fails(self):
        with self.assertRaises(MotorError):
            run_program(base(actions=["up", "up", "down"],
                             speeds_block=False))

    def test_extension_down_at_zero_stays_zero(self):
        r = run_program(base(actions=["up", "down", "down", "up", "stop"],
                             speeds=[1, 0, 0, 1, 0]))
        self.assertEqual(r["speeds"], [1, 0, 0, 1, 0])

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(MotorError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

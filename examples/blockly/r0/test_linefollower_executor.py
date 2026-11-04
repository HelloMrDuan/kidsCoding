import json
import unittest

from linefollower_executor import (LineFollowerError, correct_program,
                                  run_program)


def step(left, right):
    return {"type": "step", "left": left, "right": right}


def setup(motors=None, sensors=None):
    prog = [{"type": "when_start"}, {"type": "power", "voltage": 5}]
    for side, pin in (motors if motors is not None else
                      [("left", 5), ("right", 6)]):
        prog.append({"type": "motor", "side": side, "pin": pin})
    for side, pin in (sensors if sensors is not None else
                      [("left", "A0"), ("right", "A1")]):
        prog.append({"type": "sensor", "side": side, "pin": pin})
    return prog


def base(steps, pairs, motors=None, sensors=None, duties_block=True):
    prog = setup(motors, sensors) + steps
    if duties_block:
        prog.append({"type": "duties", "pairs": pairs})
    return prog


class TestR0U3L06(unittest.TestCase):
    def test_correct_line_follower(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["duties"][1], [90, 180])

    def test_practice_b_lost_and_found(self):
        r = run_program(base(
            [step(1, 1), step(0, 0), step(1, 0), step(1, 1)],
            [[180, 180], [0, 0], [90, 180], [180, 180]]))
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["duties"][1], [0, 0])

    def test_invalid_sensor_value_fails(self):
        with self.assertRaises(LineFollowerError):
            run_program(base(
                [step(1, 1), step(2, 0), step(1, 1), step(0, 1)],
                [[180, 180], [90, 180], [180, 180], [180, 90]]))

    def test_too_few_steps_fails(self):
        with self.assertRaises(LineFollowerError):
            run_program(base([step(1, 1), step(1, 0), step(1, 1)],
                             [[180, 180], [90, 180], [180, 180]]))

    def test_duties_mismatch_fails(self):
        with self.assertRaises(LineFollowerError):
            run_program(base(
                [step(1, 1), step(1, 0), step(1, 1), step(0, 1),
                 step(1, 1)],
                [[180, 180], [180, 180], [180, 180], [180, 90],
                 [180, 180]]))

    def test_no_straight_fails(self):
        with self.assertRaises(LineFollowerError):
            run_program(base(
                [step(1, 0), step(0, 1), step(1, 0), step(0, 1)],
                [[90, 180], [180, 90], [90, 180], [180, 90]]))

    def test_no_turn_fails(self):
        with self.assertRaises(LineFollowerError):
            run_program(base(
                [step(1, 1), step(1, 1), step(1, 1), step(1, 1)],
                [[180, 180]] * 4))

    def test_wrong_motor_pin_fails(self):
        with self.assertRaises(LineFollowerError):
            run_program(base(
                [step(1, 1), step(1, 0), step(1, 1), step(0, 1),
                 step(1, 1)],
                [[180, 180], [90, 180], [180, 180], [180, 90],
                 [180, 180]],
                motors=[("left", 5), ("right", 7)]))

    def test_wrong_sensor_pin_fails(self):
        with self.assertRaises(LineFollowerError):
            run_program(base(
                [step(1, 1), step(1, 0), step(1, 1), step(0, 1),
                 step(1, 1)],
                [[180, 180], [90, 180], [180, 180], [180, 90],
                 [180, 180]],
                sensors=[("left", "A0"), ("right", "A2")]))

    def test_missing_duties_fails(self):
        with self.assertRaises(LineFollowerError):
            run_program(base(
                [step(1, 1), step(1, 0), step(1, 1), step(0, 1),
                 step(1, 1)], None, duties_block=False))

    def test_extension_all_cases_pass(self):
        r = run_program(base(
            [step(0, 1), step(1, 1), step(1, 0), step(0, 0),
             step(1, 1)],
            [[180, 90], [180, 180], [90, 180], [0, 0], [180, 180]]))
        self.assertEqual(len(r["steps"]), 5)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(LineFollowerError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

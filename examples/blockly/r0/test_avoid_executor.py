import json
import unittest

from avoid_executor import AvoidError, correct_program, run_program


def sense(distance):
    return {"type": "sense", "distance": distance}


def action(name):
    return {"type": "action", "action": name}


def base(sensor=9, motor=5, body=None, finish=True):
    prog = [{"type": "when_start"}, {"type": "power", "voltage": 5}]
    if sensor is not None:
        prog.append({"type": "sensor", "pin": sensor})
    if motor is not None:
        prog.append({"type": "motor", "pin": motor})
    prog += body or []
    if finish:
        prog.append({"type": "finish"})
    return prog


class TestR0U3L04(unittest.TestCase):
    def test_correct_avoidance(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(len(r["pairs"]), 3)

    def test_practice_b_two_obstacles(self):
        r = run_program(base(body=[sense(15), action("turn"),
                                   sense(12), action("turn"),
                                   sense(100), action("forward")]))
        self.assertEqual(r["status"], "success")
        self.assertEqual([p["action"] for p in r["pairs"]],
                         ["turn", "turn", "forward"])

    def test_forward_into_obstacle_fails(self):
        with self.assertRaises(AvoidError):
            run_program(base(body=[sense(15), action("forward"),
                                   sense(80), action("forward"),
                                   sense(100), action("forward")]))

    def test_turn_with_clear_road_fails(self):
        with self.assertRaises(AvoidError):
            run_program(base(body=[sense(100), action("turn"),
                                   sense(15), action("turn"),
                                   sense(80), action("forward")]))

    def test_sense_out_of_range_fails(self):
        with self.assertRaises(AvoidError):
            run_program(base(body=[sense(100), action("forward"),
                                   sense(500), action("forward"),
                                   sense(80), action("forward")]))

    def test_too_few_pairs_fails(self):
        with self.assertRaises(AvoidError):
            run_program(base(body=[sense(100), action("forward"),
                                   sense(15), action("turn")]))

    def test_missing_finish_fails(self):
        with self.assertRaises(AvoidError):
            run_program(base(body=[sense(100), action("forward"),
                                   sense(15), action("turn"),
                                   sense(80), action("forward")],
                             finish=False))

    def test_wrong_sensor_pin_fails(self):
        with self.assertRaises(AvoidError):
            run_program(base(sensor=10,
                             body=[sense(100), action("forward"),
                                   sense(15), action("turn"),
                                   sense(80), action("forward")]))

    def test_wrong_motor_pin_fails(self):
        with self.assertRaises(AvoidError):
            run_program(base(motor=6,
                             body=[sense(100), action("forward"),
                                   sense(15), action("turn"),
                                   sense(80), action("forward")]))

    def test_two_senses_in_a_row_fails(self):
        with self.assertRaises(AvoidError):
            run_program(base(body=[sense(100), sense(80),
                                   action("forward"),
                                   sense(15), action("turn")]))

    def test_extension_five_pairs_pass(self):
        r = run_program(base(body=[sense(100), action("forward"),
                                   sense(18), action("turn"),
                                   sense(90), action("forward"),
                                   sense(14), action("turn"),
                                   sense(120), action("forward")]))
        self.assertEqual(len(r["pairs"]), 5)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(AvoidError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

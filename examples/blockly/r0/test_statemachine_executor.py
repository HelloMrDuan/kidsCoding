import json
import unittest

from statemachine_executor import (StateMachineError, correct_program,
                                  run_program)


def event(name):
    return {"type": "event", "event": name}


def base(pin=5, events=None, duties=None, duties_block=True):
    prog = [{"type": "when_start"}, {"type": "power", "voltage": 5}]
    if pin is not None:
        prog.append({"type": "motor", "pin": pin})
    for e in (events or []):
        prog.append(event(e))
    if duties_block:
        prog.append({"type": "duties", "duties": duties})
    return prog


class TestR0U3L05(unittest.TestCase):
    def test_correct_state_machine(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["states"], ["go", "turn", "go", "stop"])
        self.assertEqual(r["duties"], [180, 90, 180, 0])

    def test_practice_b_restart_from_stop(self):
        r = run_program(base(events=["start", "button_stop", "start"],
                             duties=[180, 0, 180]))
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["states"], ["go", "stop", "go"])

    def test_illegal_transition_fails(self):
        with self.assertRaises(StateMachineError):
            run_program(base(events=["obstacle", "clear", "start"],
                             duties=[90, 180, 180]))

    def test_invalid_event_fails(self):
        with self.assertRaises(StateMachineError):
            run_program(base(events=["start", "jump", "clear"],
                             duties=[180, 90, 180]))

    def test_too_few_events_fails(self):
        with self.assertRaises(StateMachineError):
            run_program(base(events=["start", "obstacle"],
                             duties=[180, 90]))

    def test_duties_mismatch_fails(self):
        with self.assertRaises(StateMachineError):
            run_program(base(events=["start", "obstacle", "clear",
                                     "button_stop"],
                             duties=[180, 180, 180, 0]))

    def test_wrong_pin_fails(self):
        with self.assertRaises(StateMachineError):
            run_program(base(pin=6,
                             events=["start", "obstacle", "clear",
                                     "button_stop"],
                             duties=[180, 90, 180, 0]))

    def test_missing_duties_fails(self):
        with self.assertRaises(StateMachineError):
            run_program(base(events=["start", "obstacle", "clear"],
                             duties_block=False))

    def test_missing_motor_fails(self):
        with self.assertRaises(StateMachineError):
            run_program(base(pin=None,
                             events=["start", "obstacle", "clear"],
                             duties=[180, 90, 180]))

    def test_extension_long_sequence_pass(self):
        r = run_program(base(events=["start", "obstacle", "button_stop",
                                     "start", "obstacle", "clear"],
                             duties=[180, 90, 0, 180, 90, 180]))
        self.assertEqual(r["states"],
                         ["go", "turn", "stop", "go", "turn", "go"])

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(StateMachineError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()

import json
import unittest

from safety_executor import SafetyError, correct_program, run_program


def check(item, result=True):
    return {"type": "check", "item": item, "result": result}


def base(checks, go="开始动手"):
    prog = [{"type": "when_start"}] + checks
    if go is not None:
        prog.append({"type": "go", "text": go})
    return prog


ALL = ["wiring_power_off", "voltage_correct", "wires_insulated",
       "hands_dry", "adult_present"]


class TestR0U1L05(unittest.TestCase):
    def test_correct_checklist(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(len(r["checks"]), 5)

    def test_practice_b_different_order(self):
        r = run_program(base([check(i) for i in reversed(ALL)],
                             go="请老师确认后开始"))
        self.assertEqual(r["status"], "success")

    def test_one_item_fails(self):
        with self.assertRaises(SafetyError):
            run_program(base([check("wiring_power_off", False)] +
                             [check(i) for i in ALL[1:]]))

    def test_missing_item_fails(self):
        with self.assertRaises(SafetyError):
            run_program(base([check(i) for i in ALL[:-1]]))

    def test_duplicate_item_fails(self):
        with self.assertRaises(SafetyError):
            run_program(base([check(i) for i in ALL] +
                             [check("hands_dry")]))

    def test_unknown_item_fails(self):
        with self.assertRaises(SafetyError):
            run_program(base([check(i) for i in ALL] +
                             [check("wear_gloves")]))

    def test_missing_go_fails(self):
        with self.assertRaises(SafetyError):
            run_program(base([check(i) for i in ALL], go=None))

    def test_extension_extra_item_passes(self):
        r = run_program(base([check(i) for i in ALL] +
                             [check("workspace_tidy")]))
        self.assertEqual(len(r["checks"]), 6)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(SafetyError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
